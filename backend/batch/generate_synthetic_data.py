import json
import random
import uuid
from datetime import datetime, timedelta, timezone
import os

def gen_uuid():
    return str(uuid.uuid4())

def generate_batch_data(output_path: str):
    events = []

    # Helper to create an event
    def create_event(event_type, cause, payload, is_fraud=False, is_opt_out=False, is_after_hours=False):
        timestamp = datetime.now(timezone.utc)
        
        if is_after_hours:
            # Force to 3 AM IST (21:30 UTC previous day)
            timestamp = timestamp.replace(hour=21, minute=30)
            
        customer_id = f"cust_{random.randint(1000, 9999)}"
        if is_opt_out:
            customer_id = f"optout_{customer_id}" # We can use this to pre-seed redis in runner

        return {
            "id": gen_uuid(),
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

    # 1. Failed Payments (150+)
    causes = ["INSUFFICIENT_FUNDS", "BANK_INFRA_DOWN", "CARD_EXPIRED", "UPI_LIMIT_EXCEEDED", "AUTH_FAILURE"]
    for _ in range(130):
        events.append(create_event("payment.failed", random.choice(causes), {"method": "upi"}))
    
    # 2. Abandoned Orders (75+)
    for _ in range(80):
        cart_val = random.randint(500, 20000) * 100
        events.append(create_event("order.abandoned", "USER_DROPOFF", {"cart_value": cart_val}))

    # 3. Halted Subscriptions (80+)
    for _ in range(85):
        events.append(create_event("subscription.halted", "RETRIES_EXHAUSTED", {"plan_id": "plan_123"}))

    # 4. B2B Invoices (30+) - Not technically webhooks, but we'll include them to trigger the Chaser
    for _ in range(35):
        days = random.randint(5, 120)
        events.append(create_event("invoice.aging", "TIME_ELAPSED", {"days_outstanding": days}))

    # 5. PTP Responses (20+)
    for _ in range(25):
        events.append(create_event("message.received", "CUSTOMER_REPLY", {"text": "I will pay next Friday"}))

    # 6. Fraud Flagged (15)
    for _ in range(15):
        events.append(create_event("payment.failed", "FRAUD_SUSPECTED", {}, is_fraud=True))

    # 7. Opted Out (15)
    for _ in range(15):
        events.append(create_event("payment.failed", "BANK_INFRA_DOWN", {}, is_opt_out=True))

    # 8. After Hours (15)
    for _ in range(15):
        events.append(create_event("payment.failed", "BANK_INFRA_DOWN", {}, is_after_hours=True))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(events, f, indent=2)
    
    print(f"Generated {len(events)} synthetic events at {output_path}")

if __name__ == "__main__":
    from pathlib import Path
    # Relative to this file: two levels up → repo root → simulation/sample_data
    _out = Path(__file__).parent.parent.parent / "simulation" / "sample_data" / "batch_events.json"
    generate_batch_data(str(_out))
