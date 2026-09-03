"""
ReVault Sequence Scheduler
==========================
Background APScheduler daemon that closes all four deferred-execution loops
that were architecturally designed but previously never fired at runtime:

  Job 1 — abandonment_tier_scheduler  (every 15 min)
      Fires Abandonment Hunter Tier 2 (2hr personalized+discount nudge)
      and Tier 3 (24hr final nudge) for orders that were initially handled
      by Tier 1 but haven't converted yet.

  Job 2 — winback_scheduler           (every 15 min)
      Executes Subscription Win-back steps Day 2 (WhatsApp), Day 5 (Voice),
      Day 7 (HITL escalation), Day 10 (final WhatsApp offer) for halted
      subscriptions whose Day 0 contact was already sent.

  Job 3 — retry_executor              (every 5 min)
      Scans retry_schedules WHERE status='SCHEDULED' AND next_retry_at <= NOW()
      and fires the actual WhatsApp/payment-link outreach for each due retry.

  Job 4 — ptp_followup                (every hour)
      Scans ptp_records WHERE status='ACTIVE' AND promised_date < CURRENT_DATE,
      sends a follow-up WhatsApp, and marks the record as BROKEN for audit.

State storage:
  - Abandonment sequences tracked in Redis: revault:abandon_seq:{order_id}
  - Win-back sequences tracked in Redis:    revault:winback_seq:{subscription_id}
  - Retry schedules tracked in Supabase:    retry_schedules table
  - PTP records tracked in Supabase:        ptp_records table
"""
import json
import logging
from datetime import datetime, timezone, timedelta

import redis.asyncio as aioredis
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

# Win-back steps fired AFTER the initial Day 0 contact.
# (day_offset_from_initiation, channel, label)
_WIN_BACK_STEPS = [
    (2,  "whatsapp", "day_2_reminder"),
    (5,  "voice",    "day_5_voice_call"),
    (7,  "hitl",     "day_7_human_escalation"),
    (10, "whatsapp", "day_10_final_offer"),
]

# Abandonment tiers fired AFTER the initial Tier 1 contact.
# (delay_from_prev_minutes, template_label, include_discount)
_ABANDONMENT_TIERS = [
    (120,  "personalized_nudge", True),   # Tier 2: 2-hour, 10% discount
    (1440, "final_nudge",        False),  # Tier 3: 24-hour, final push
]


class SequenceScheduler:
    """
    Starts four APScheduler async jobs that advance all deferred sequences.
    Instantiated once in main.py lifespan and stopped on shutdown.
    """

    def __init__(self, redis_client: aioredis.Redis) -> None:
        self._redis = redis_client
        self._scheduler = AsyncIOScheduler()

    def start(self) -> None:
        self._scheduler.add_job(
            self._run_abandonment_tiers,
            "interval", minutes=15,
            id="abandonment_tier_scheduler",
            replace_existing=True,
        )
        self._scheduler.add_job(
            self._run_winback_sequence,
            "interval", minutes=15,
            id="winback_scheduler",
            replace_existing=True,
        )
        self._scheduler.add_job(
            self._run_retry_executor,
            "interval", minutes=5,
            id="retry_executor",
            replace_existing=True,
        )
        self._scheduler.add_job(
            self._run_ptp_followup,
            "interval", hours=1,
            id="ptp_followup",
            replace_existing=True,
        )
        self._scheduler.start()
        logger.info(
            "SequenceScheduler started — 4 background jobs: "
            "abandonment_tiers(15m), winback(15m), retry_executor(5m), ptp_followup(1h)"
        )

    def stop(self) -> None:
        self._scheduler.shutdown(wait=False)
        logger.info("SequenceScheduler stopped.")

    # ─────────────────────────────────────────────────────────────
    # Job 1: Abandonment Tier 2/3 re-contact
    # ─────────────────────────────────────────────────────────────
    async def _run_abandonment_tiers(self) -> None:
        logger.info("SequenceScheduler[abandonment]: scanning for due tier re-contacts...")
        now = datetime.now(timezone.utc)

        try:
            keys = [k async for k in self._redis.scan_iter(b"revault:abandon_seq:*")]
        except Exception as exc:
            logger.error("Failed to scan abandonment keys: %s", exc)
            return

        fired = 0
        for key in keys:
            try:
                raw = await self._redis.get(key)
                if not raw:
                    continue

                state = json.loads(raw)
                next_fire_at = datetime.fromisoformat(state["next_fire_at"])
                if next_fire_at > now:
                    continue

                tier_index = state.get("tier_index", 0)
                if tier_index >= len(_ABANDONMENT_TIERS):
                    await self._redis.delete(key)
                    continue

                delay_min, label, include_discount = _ABANDONMENT_TIERS[tier_index]
                tier_num = tier_index + 2  # Tier 2 or Tier 3

                order_id = state.get("order_id", "unknown")
                amount = state.get("amount", 0)
                phone = state.get("customer_phone", "")
                name = state.get("customer_name", "Customer")
                email = state.get("customer_email", "")

                if phone:
                    await self._send_abandonment_tier(
                        tier_num=tier_num,
                        order_id=order_id,
                        amount=amount,
                        phone=phone,
                        name=name,
                        email=email,
                        include_discount=include_discount,
                    )
                    fired += 1

                # Advance to next tier or clean up
                next_index = tier_index + 1
                if next_index < len(_ABANDONMENT_TIERS):
                    next_delay = _ABANDONMENT_TIERS[next_index][0]
                    state["tier_index"] = next_index
                    state["next_fire_at"] = (now + timedelta(minutes=next_delay)).isoformat()
                    await self._redis.set(key, json.dumps(state), ex=86_400 * 3)
                else:
                    await self._redis.delete(key)
                    logger.info("Abandonment sequence fully completed for order %s", order_id)

            except Exception as exc:
                logger.error("Error in abandonment key %s: %s", key, exc)

        logger.info("SequenceScheduler[abandonment]: fired %d tier re-contacts.", fired)

    async def _send_abandonment_tier(
        self,
        tier_num: int,
        order_id: str,
        amount: int,
        phone: str,
        name: str,
        email: str,
        include_discount: bool,
    ) -> None:
        from tools.payment_links import create_recovery_link
        from tools.whatsapp_sender import send_whatsapp_text

        discount_clause = " Plus, get 10% off if you complete now!" if include_discount else ""
        try:
            link = await create_recovery_link(
                order_id=order_id,
                amount=amount,
                customer_name=name,
                customer_email=email,
                customer_phone=phone,
                description=f"Complete your order #{order_id}{discount_clause}",
            )
            body = (
                f"Hi {name}! 👋 Your order of ₹{amount / 100:,.0f} is still waiting for you."
                f"{discount_clause} Tap here to finish it: {link.short_url}"
            )
        except Exception:
            # Payment link failed — send nudge without link
            body = (
                f"Hi {name}! Your pending order of ₹{amount / 100:,.0f} is almost yours."
                f"{discount_clause} Complete your payment to avoid losing your cart."
            )
            logger.warning("Payment link creation failed for abandonment tier %d, order %s", tier_num, order_id)

        try:
            await send_whatsapp_text(to_phone=phone, body=body)
            logger.info("Abandonment Tier %d re-contact sent for order %s", tier_num, order_id)
        except Exception as exc:
            logger.error("WhatsApp send failed for abandonment tier %d, order %s: %s", tier_num, order_id, exc)

    # ─────────────────────────────────────────────────────────────
    # Job 2: Subscription Win-back Day 2 / 5 / 7 / 10
    # ─────────────────────────────────────────────────────────────
    async def _run_winback_sequence(self) -> None:
        logger.info("SequenceScheduler[winback]: scanning for due win-back steps...")
        now = datetime.now(timezone.utc)

        try:
            keys = [k async for k in self._redis.scan_iter(b"revault:winback_seq:*")]
        except Exception as exc:
            logger.error("Failed to scan winback keys: %s", exc)
            return

        fired = 0
        for key in keys:
            try:
                raw = await self._redis.get(key)
                if not raw:
                    continue

                state = json.loads(raw)
                next_fire_at = datetime.fromisoformat(state["next_fire_at"])
                if next_fire_at > now:
                    continue

                step_index = state.get("step_index", 0)
                if step_index >= len(_WIN_BACK_STEPS):
                    await self._redis.delete(key)
                    continue

                day_offset, channel, label = _WIN_BACK_STEPS[step_index]
                subscription_id = state.get("subscription_id", "unknown")
                phone = state.get("customer_phone", "")
                name = state.get("customer_name", "Customer")
                amount = state.get("amount", 0)

                logger.info(
                    "Win-back Day %d (%s) firing for subscription %s",
                    day_offset, channel, subscription_id,
                )

                if channel == "whatsapp" and phone:
                    await self._winback_whatsapp(name, phone, amount, subscription_id, day_offset)
                elif channel == "voice" and phone:
                    await self._winback_voice(name, phone, amount, subscription_id, day_offset)
                elif channel == "hitl":
                    await self._winback_hitl(name, subscription_id, day_offset)

                fired += 1

                # Advance to next step
                next_step = step_index + 1
                if next_step < len(_WIN_BACK_STEPS):
                    current_day = _WIN_BACK_STEPS[step_index][0]
                    next_day = _WIN_BACK_STEPS[next_step][0]
                    gap_days = next_day - current_day
                    state["step_index"] = next_step
                    state["next_fire_at"] = (now + timedelta(days=gap_days)).isoformat()
                    await self._redis.set(key, json.dumps(state), ex=86_400 * 15)
                else:
                    await self._redis.delete(key)
                    logger.info("Win-back sequence fully completed for sub %s", subscription_id)

            except Exception as exc:
                logger.error("Error in winback key %s: %s", key, exc)

        logger.info("SequenceScheduler[winback]: fired %d win-back steps.", fired)

    async def _winback_whatsapp(
        self, name: str, phone: str, amount: int, sub_id: str, day: int
    ) -> None:
        from tools.whatsapp_sender import send_whatsapp_text
        from tools.payment_links import create_recovery_link

        body = (
            f"Hi {name}! We miss you 💙 Your subscription payment of "
            f"₹{amount / 100:,.0f} is still pending. Renew now to keep your service active."
        )
        try:
            link = await create_recovery_link(
                order_id=sub_id,
                amount=amount,
                customer_name=name,
                customer_email="",
                customer_phone=phone,
                description="Renew your subscription",
            )
            body += f" Tap here: {link.short_url}"
        except Exception:
            pass  # Send without link if creation fails

        try:
            await send_whatsapp_text(to_phone=phone, body=body)
            logger.info("Win-back Day %d WhatsApp sent for sub %s", day, sub_id)
        except Exception as exc:
            logger.error("Win-back WhatsApp failed for sub %s day %d: %s", sub_id, day, exc)

    async def _winback_voice(
        self, name: str, phone: str, amount: int, sub_id: str, day: int
    ) -> None:
        import os
        import tempfile
        from agents.voice_agent import VoiceAgent

        agent = VoiceAgent()
        try:
            script_data = await agent.generate_script(
                name=name,
                amount=amount,
                reason="subscription renewal overdue",
                contact_history=f"Day {day} win-back contact",
            )
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                audio_path = tmp.name
            await agent.synthesize_audio(script_data["script"], audio_path)
            await agent.initiate_call(name, phone, script_data["script"])
            try:
                os.unlink(audio_path)
            except OSError:
                pass
            logger.info("Win-back Day %d Voice call initiated for sub %s", day, sub_id)
        except Exception as exc:
            logger.error("Win-back Voice failed for sub %s day %d: %s", sub_id, day, exc)

    async def _winback_hitl(self, name: str, sub_id: str, day: int) -> None:
        """Human-in-the-loop escalation: log to audit trail and flag for human review."""
        logger.warning(
            "WIN-BACK Day %d HITL ESCALATION required — subscription %s (customer: %s). "
            "Automated contact limit reached. Please review manually.",
            day, sub_id, name,
        )
        try:
            from db.supabase_client import supabase
            if supabase:
                supabase.table("audit_trail").insert({
                    "module": "SUBSCRIPTION_RESCUE",
                    "actor": "SYSTEM",
                    "decision_log": json.dumps({
                        "action": "HUMAN_ESCALATION_REQUIRED",
                        "subscription_id": sub_id,
                        "customer_name": name,
                        "win_back_day": day,
                        "reason": "Automated win-back sequence exhausted Day 5. Human follow-up required.",
                    }),
                    "compliance_log": json.dumps({
                        "allowed": False,
                        "reason": f"Win-back Day {day} — stopping automated contact, escalating to human agent.",
                    }),
                }).execute()
        except Exception as exc:
            logger.error("Failed to write HITL audit entry for sub %s: %s", sub_id, exc)

    # ─────────────────────────────────────────────────────────────
    # Job 3: Mandate Retry Executor
    # ─────────────────────────────────────────────────────────────
    async def _run_retry_executor(self) -> None:
        """
        Scans retry_schedules for due entries and executes them.
        Rail logic:
          - PAYMENT_LINK → create Razorpay link + send WhatsApp
          - CARD_AUTODEBIT / UPI → send WhatsApp nudge (rail switch prompt)
          - NATIVE_RETRY → send WhatsApp nudge with payment link as fallback
        Updates status to COMPLETED after execution; reverts to SCHEDULED on error.
        """
        logger.info("SequenceScheduler[retry_executor]: scanning for due retries...")
        try:
            from db.supabase_client import supabase
            if not supabase:
                return

            now_iso = datetime.now(timezone.utc).isoformat()
            res = (
                supabase.table("retry_schedules")
                .select("id, event_id, attempt_number, max_attempts, retry_rail, cause")
                .eq("status", "SCHEDULED")
                .lte("next_retry_at", now_iso)
                .limit(20)
                .execute()
            )

            if not res.data:
                logger.info("SequenceScheduler[retry_executor]: no due retries.")
                return

            logger.info(
                "SequenceScheduler[retry_executor]: found %d due retry(ies). Executing...",
                len(res.data),
            )

            for record in res.data:
                await self._execute_single_retry(supabase, record)

        except Exception as exc:
            logger.error("Retry executor top-level error: %s", exc)

    async def _execute_single_retry(self, supabase, record: dict) -> None:
        record_id = record["id"]
        event_id = record["event_id"]
        rail = record.get("retry_rail", "PAYMENT_LINK")
        attempt = record.get("attempt_number", 0)
        cause = record.get("cause", "UNKNOWN")

        # Fetch parent payment event for customer data and amount
        ev_res = supabase.table("payment_events").select("amount, raw_payload").eq("id", event_id).limit(1).execute()
        payment_event = ev_res.data[0] if ev_res.data else {}
        amount = payment_event.get("amount", 0)
        raw_payload = payment_event.get("raw_payload") or {}

        customer = (
            raw_payload.get("payload", {})
            .get("payment", {})
            .get("entity", {})
            .get("customer", {}) or {}
        )
        phone = customer.get("contact", "")
        name = customer.get("name", "Customer")
        email = customer.get("email", "")

        logger.info(
            "Executing retry — event: %s, rail: %s, attempt: %d, cause: %s",
            event_id, rail, attempt + 1, cause,
        )

        # Mark as EXECUTING immediately to prevent double-fire
        supabase.table("retry_schedules").update({"status": "EXECUTING"}).eq("id", record_id).execute()

        try:
            from tools.whatsapp_sender import send_whatsapp_text

            if rail == "PAYMENT_LINK" and phone:
                from tools.payment_links import create_recovery_link
                link = await create_recovery_link(
                    order_id=event_id,
                    amount=amount,
                    customer_name=name,
                    customer_email=email,
                    customer_phone=phone,
                    description=f"Retry your failed payment (attempt {attempt + 1})",
                )
                body = (
                    f"Hi {name}! We've prepared a payment link for your retry "
                    f"(₹{amount / 100:,.0f}). Tap to complete: {link.short_url}"
                )
                await send_whatsapp_text(to_phone=phone, body=body)
                logger.info("Payment link retry sent — event %s, attempt %d", event_id, attempt + 1)

            elif rail in ("CARD_AUTODEBIT",) and phone:
                body = (
                    f"Hi {name}! We're switching your payment to a card debit "
                    f"for ₹{amount / 100:,.0f}. Please ensure your card is active. "
                    f"Cause: {cause.lower().replace('_', ' ')}."
                )
                await send_whatsapp_text(to_phone=phone, body=body)
                logger.info("Card switch nudge sent — event %s, attempt %d", event_id, attempt + 1)

            elif rail in ("UPI", "NATIVE_RETRY") and phone:
                body = (
                    f"Hi {name}! We're retrying your payment of ₹{amount / 100:,.0f} "
                    f"via {rail}. Please keep your app ready or approve the request."
                )
                await send_whatsapp_text(to_phone=phone, body=body)
                logger.info("UPI/Native retry nudge sent — event %s, attempt %d", event_id, attempt + 1)

            # Mark as COMPLETED
            supabase.table("retry_schedules").update({
                "status": "COMPLETED",
                "attempt_number": attempt + 1,
            }).eq("id", record_id).execute()

        except Exception as exc:
            logger.error("Retry execution failed for event %s: %s. Reverting to SCHEDULED.", event_id, exc)
            supabase.table("retry_schedules").update({"status": "SCHEDULED"}).eq("id", record_id).execute()

    # ─────────────────────────────────────────────────────────────
    # Job 4: PTP Follow-up (overdue promises)
    # ─────────────────────────────────────────────────────────────
    async def _run_ptp_followup(self) -> None:
        """
        Finds all ACTIVE PTP records whose promised_date < today.
        Sends a follow-up WhatsApp, marks status BROKEN, and writes audit entry.
        """
        logger.info("SequenceScheduler[ptp_followup]: checking overdue promises...")
        try:
            from db.supabase_client import supabase
            if not supabase:
                return

            today_iso = datetime.now(timezone.utc).date().isoformat()
            res = (
                supabase.table("ptp_records")
                .select("id, customer_id, promised_amount, promised_date")
                .eq("status", "ACTIVE")
                .lt("promised_date", today_iso)
                .execute()
            )

            if not res.data:
                logger.info("SequenceScheduler[ptp_followup]: no overdue promises.")
                return

            logger.info(
                "SequenceScheduler[ptp_followup]: found %d overdue PTP(s). Following up...",
                len(res.data),
            )

            from tools.whatsapp_sender import send_whatsapp_text

            for ptp in res.data:
                customer_id = ptp["customer_id"]
                promised_date = ptp.get("promised_date", "the agreed date")
                promised_amount = ptp.get("promised_amount") or 0
                amount_str = f"₹{promised_amount / 100:,.0f}" if promised_amount else "your pending amount"

                # Only try WhatsApp if customer_id looks like a phone number
                if customer_id and (customer_id.startswith("+") or customer_id.lstrip("+").isdigit()):
                    body = (
                        f"Hi! We noticed your promised payment of {amount_str} was due on "
                        f"{promised_date} but hasn't been received yet. "
                        f"If you've already paid, please ignore this message. "
                        f"Otherwise, please complete it to avoid service interruption. "
                        f"— ReVault Recovery Team 🙏"
                    )
                    try:
                        await send_whatsapp_text(to_phone=customer_id, body=body)
                        logger.info("PTP follow-up WhatsApp sent to %s", customer_id)
                    except Exception as exc:
                        logger.error("PTP follow-up WhatsApp failed for %s: %s", customer_id, exc)

                # Mark as BROKEN for audit — never delete
                supabase.table("ptp_records").update({
                    "status": "BROKEN",
                    "resolved_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", ptp["id"]).execute()

                # Append-only audit entry
                try:
                    supabase.table("audit_trail").insert({
                        "module": "PTP_TRACKER",
                        "actor": "SYSTEM",
                        "decision_log": json.dumps({
                            "action": "PTP_BROKEN",
                            "customer_id": customer_id,
                            "promised_date": promised_date,
                            "promised_amount": promised_amount,
                            "reason": "Promised date passed without payment captured. Follow-up sent.",
                        }),
                        "compliance_log": json.dumps({
                            "allowed": True,
                            "reason": "Automated PTP breach follow-up within contact limits.",
                        }),
                    }).execute()
                except Exception as exc:
                    logger.error("PTP audit write failed for %s: %s", customer_id, exc)

        except Exception as exc:
            logger.error("PTP follow-up top-level error: %s", exc)
