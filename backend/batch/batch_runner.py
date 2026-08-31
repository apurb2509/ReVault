"""
ReVault Batch Producer
====================
Generates a synthetic batch of 400 payment events and pushes them to the Kafka queue.
The new Kafka Worker daemon will consume and process these events at a throttled rate.

Usage:
    python batch/batch_runner.py
"""
import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# ── Path bootstrap so imports work when run directly ─────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

import redis.asyncio as aioredis
from config import get_settings

settings = get_settings()

def generate_dynamic_batch_events() -> list[dict]:
    import random
    
    events = []
    def create_event(event_type, cause, payload, is_fraud=False, is_opt_out=False, is_after_hours=False):
        timestamp = datetime.now(timezone.utc)
        if is_after_hours:
            timestamp = timestamp.replace(hour=21, minute=30)
            
        customer_id = f"cust_{random.randint(1000, 9999)}"
        if is_opt_out:
            customer_id = f"optout_{customer_id}"

        return {
            "id": str(uuid.uuid4()),
            "event_type": event_type,
            "failure_cause": "FRAUD_SUSPECTED" if is_fraud else cause,
            "customer_id": customer_id,
            "amount": random.randint(1000, 50000) * 100,
            "payload": payload,
            "timestamp": timestamp.isoformat(),
            "meta": {
                "is_fraud": is_fraud,
                "is_opt_out": is_opt_out,
                "is_after_hours": is_after_hours
            }
        }

    causes = ["INSUFFICIENT_FUNDS", "BANK_INFRA_DOWN", "CARD_EXPIRED", "UPI_LIMIT_EXCEEDED", "AUTH_FAILURE"]
    for _ in range(130): events.append(create_event("payment.failed", random.choice(causes), {"method": "upi"}))
    for _ in range(80): events.append(create_event("order.abandoned", "USER_DROPOFF", {"cart_value": random.randint(500, 20000) * 100}))
    for _ in range(85): events.append(create_event("subscription.halted", "RETRIES_EXHAUSTED", {"plan_id": "plan_123"}))
    for _ in range(35): events.append(create_event("invoice.aging", "TIME_ELAPSED", {"days_outstanding": random.randint(5, 120)}))
    for _ in range(25): events.append(create_event("message.received", "CUSTOMER_REPLY", {"text": "I will pay next Friday"}))
    for _ in range(15): events.append(create_event("payment.failed", "FRAUD_SUSPECTED", {}, is_fraud=True))
    for _ in range(15): events.append(create_event("payment.failed", "BANK_INFRA_DOWN", {}, is_opt_out=True))
    for _ in range(15): events.append(create_event("payment.failed", "BANK_INFRA_DOWN", {}, is_after_hours=True))
    
    random.shuffle(events)
    return events


async def produce_batch() -> None:
    print("=" * 60)
    print("  ReVault Kafka Batch Producer")
    print("=" * 60)

    events = generate_dynamic_batch_events()
    print(f"Generated {len(events)} random batch events in memory...")

    redis_client = aioredis.from_url(settings.redis_url, ssl_cert_reqs="none")
    QUEUE_NAME = "revault:payment_events_queue"
    
    try:
        print(f"Publishing 400 events to Redis queue '{QUEUE_NAME}'...")
        # We can push them all at once using rpush
        payloads = [json.dumps(ev).encode("utf-8") for ev in events]
        await redis_client.rpush(QUEUE_NAME, *payloads)
            
        print("✅ Successfully pushed all events to Redis queue!")
        print("The background Redis Worker will consume them at a throttled rate.")
    except Exception as e:
        print(f"Failed to publish to Redis: {e}")
    finally:
        await redis_client.aclose()

if __name__ == "__main__":
    asyncio.run(produce_batch())
