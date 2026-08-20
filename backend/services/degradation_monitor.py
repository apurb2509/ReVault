import asyncio
import logging
from datetime import datetime, timedelta

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

# Threshold: alert if success rate drops more than 15% below the 24hr baseline
DEGRADATION_THRESHOLD = 0.15

# How far back to look for the current window vs. baseline
CURRENT_WINDOW_MINUTES = 15
BASELINE_HOURS = 24


class DegradationMonitor:
    """
    Background poller that checks Razorpay payment success rates every 2 minutes.
    When a bank/method combination degrades beyond the threshold, it publishes
    a DEGRADATION_ALERT event to the WebSocket hub and triggers the RCA agent.
    """

    def __init__(
        self,
        razorpay_client: "RazorpayClient",  # type: ignore[name-defined]
        websocket_broadcaster: "WebSocketBroadcaster",  # type: ignore[name-defined]
        rca_trigger: "callable",  # type: ignore[name-defined]
    ) -> None:
        self._rzp = razorpay_client
        self._broadcaster = websocket_broadcaster
        self._rca_trigger = rca_trigger
        self._scheduler = AsyncIOScheduler()

    def start(self) -> None:
        self._scheduler.add_job(
            self._poll,
            "interval",
            minutes=2,
            id="degradation_monitor",
            replace_existing=True,
        )
        self._scheduler.start()
        logger.info("DegradationMonitor started — polling every 2 minutes")

    def stop(self) -> None:
        self._scheduler.shutdown(wait=False)

    async def _poll(self) -> None:
        try:
            now = datetime.utcnow()
            current_from = now - timedelta(minutes=CURRENT_WINDOW_MINUTES)
            baseline_from = now - timedelta(hours=BASELINE_HOURS)

            current_payments = await self._rzp.fetch_payments(from_dt=current_from, to_dt=now)
            baseline_payments = await self._rzp.fetch_payments(from_dt=baseline_from, to_dt=current_from)

            degraded_segments = self._detect_degradation(current_payments, baseline_payments)

            for segment in degraded_segments:
                logger.warning("Degradation detected: %s", segment)
                await self._broadcaster.broadcast({
                    "event": "DEGRADATION_ALERT",
                    "segment": segment,
                    "detected_at": now.isoformat(),
                })
                await self._rca_trigger(segment, current_payments)

        except Exception:
            # Log and continue — monitor must not crash the scheduler
            logger.exception("DegradationMonitor poll failed")

    @staticmethod
    def _detect_degradation(
        current: list[dict],
        baseline: list[dict],
    ) -> list[dict]:
        """
        Groups payments by bank/method and computes success rates.
        Returns segments where current success rate is more than 15% below baseline.
        """
        def _success_rate(payments: list[dict], bank: str, method: str) -> float | None:
            segment = [p for p in payments if p.get("bank") == bank and p.get("method") == method]
            if len(segment) < 5:
                # Too few samples to draw conclusions
                return None
            successful = sum(1 for p in segment if p.get("status") == "captured")
            return successful / len(segment)

        # Collect unique bank/method combinations from baseline
        segments: set[tuple[str, str]] = set()
        for p in baseline:
            if p.get("bank") and p.get("method"):
                segments.add((p["bank"], p["method"]))

        degraded = []
        for bank, method in segments:
            baseline_rate = _success_rate(baseline, bank, method)
            current_rate = _success_rate(current, bank, method)
            if baseline_rate is None or current_rate is None:
                continue
            drop = baseline_rate - current_rate
            if drop >= DEGRADATION_THRESHOLD:
                degraded.append({
                    "bank": bank,
                    "method": method,
                    "baseline_rate": round(baseline_rate, 3),
                    "current_rate": round(current_rate, 3),
                    "drop": round(drop, 3),
                })

        return degraded
