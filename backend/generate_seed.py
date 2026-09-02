import random
import uuid
from datetime import datetime, timedelta
import json

def gen_uuid():
    return str(uuid.uuid4())

def main():
    out = []
    out.append("-- ============================================================")
    out.append("-- ReVault — Generated Seed Data (50+ rows per table)")
    out.append("-- ============================================================")
    out.append("TRUNCATE TABLE audit_trail, ptp_records, retry_schedules, recovery_actions, payment_events, b2b_invoices RESTART IDENTITY CASCADE;")
    out.append("INSERT INTO merchant_config (merchant_id, max_recovery_attempts, allow_discount_offers, discount_percent, voice_enabled) VALUES ('default', 3, TRUE, 10.0, TRUE) ON CONFLICT (merchant_id) DO UPDATE SET allow_discount_offers = TRUE, voice_enabled = TRUE;\n")
    
    events = []
    actions = []
    audits = []
    ptps = []
    invoices = []
    
    # --- Generate 50 Payment Events & Recovery Actions & Audits ---
    for i in range(50):
        ev_id = gen_uuid()
        act_id = gen_uuid()
        amt = random.randint(1000, 50000) * 100 # In paise
        
        # Pick scenario
        scenario = random.choice(["UPI_DEG", "CART_ABND", "SUB_FAIL", "B2B_FAIL", "GEN_FAIL"])
        
        time_offset = timedelta(hours=random.randint(1, 72), minutes=random.randint(0, 59))
        received_at = datetime.now() - time_offset
        
        if scenario == "UPI_DEG":
            event_type = "payment.failed"
            cause = "BANK_INFRA_DOWN"
            payload = {"event": event_type, "bank": random.choice(["HDFC", "SBI", "ICICI"]), "method": "upi"}
            
            # Action
            module = "DEGRADATION_WATCHDOG"
            action_type = "PAYMENT_LINK_SENT"
            outcome = random.choice(["SUCCESS", "SUCCESS", "PENDING"])
            recovered = amt if outcome == "SUCCESS" else "NULL"
            reason = '{"reason": "Bank UPI degraded. Switched user to Card."}'
            channel = "WHATSAPP"
            
        elif scenario == "CART_ABND":
            event_type = "order.abandoned"
            cause = "USER_DROPOFF"
            payload = {"event": event_type, "customer_phone": f"+9198{random.randint(10000000, 99999999)}"}
            module = "ABANDONMENT_HUNTER"
            action_type = random.choice(["DISCOUNT_OFFERED", "VOICE_CALL_TRIGGERED"])
            outcome = random.choice(["SUCCESS", "PENDING", "FAILED"])
            recovered = amt if outcome == "SUCCESS" else "NULL"
            reason = '{"reason": "High-value cart abandoned. Intervening."}'
            channel = "WHATSAPP" if action_type == "DISCOUNT_OFFERED" else "VOICE"

        elif scenario == "SUB_FAIL":
            event_type = "subscription.charged.failed"
            cause = "INSUFFICIENT_FUNDS"
            payload = {"event": event_type, "customer_id": f"cust_{random.randint(100, 999)}"}
            module = "SUBSCRIPTION_RESCUE"
            action_type = "RETRY_SCHEDULED"
            outcome = "PENDING"
            recovered = "NULL"
            reason = '{"reason": "Insufficient funds. Scheduling retry."}'
            channel = "SYSTEM"
            
        else:
            event_type = "payment.failed"
            cause = "UNKNOWN"
            payload = {"event": event_type}
            module = "COMPLIANCE_ENGINE"
            action_type = "COMPLIANCE_BLOCKED"
            outcome = "BLOCKED"
            recovered = 0
            reason = '{"reason": "Cooling period enforced."}'
            channel = "SYSTEM"

        payload_str = json.dumps(payload).replace("'", "''")
        reason_str = reason.replace("'", "''")
        
        events.append(f"('{ev_id}', 'evt_{i}', '{event_type}', 'pay_{i}', 'order_{i}', {amt}, '{cause}', '{payload_str}', '{received_at.strftime('%Y-%m-%d %H:%M:%S')}')")
        
        actions.append(f"('{act_id}', '{ev_id}', '{module}', '{action_type}', '{channel}', '{{}}', '{reason_str}', '{outcome}', {recovered})")
        
        audits.append(f"('{module}', '{act_id}', '{ev_id}', 'AI_AGENT', '{{\"model\": \"gemini-1.5-flash\", \"decision\": \"{action_type}\"}}', '{{\"allowed\": true}}')")
        
    out.append("INSERT INTO payment_events (id, razorpay_event_id, event_type, payment_id, order_id, amount, failure_cause, raw_payload, received_at) VALUES")
    out.append(",\n".join(events) + ";\n")
    
    out.append("INSERT INTO recovery_actions (id, event_id, module, action_type, channel, payload, agent_reasoning, outcome, amount_recovered) VALUES")
    out.append(",\n".join(actions) + ";\n")
    
    out.append("INSERT INTO audit_trail (module, action_id, event_id, actor, decision_log, compliance_log) VALUES")
    out.append(",\n".join(audits) + ";\n")
    
    # --- Generate 50 PTP Records ---
    for i in range(50):
        cust_id = f"cust_ptp_{random.randint(1000, 9999)}"
        amt = random.randint(5000, 200000) * 100
        days_offset = random.randint(-15, 15)
        prom_date = datetime.now() + timedelta(days=days_offset)
        src = random.choice(["WHATSAPP_CHAT", "VOICE_CALL_TRANSCRIPT", "EMAIL", "SMS"])
        conf = random.choice(["HIGH", "MEDIUM", "LOW"])
        
        if days_offset < 0:
            status = random.choice(["BROKEN", "FULFILLED"])
        else:
            status = random.choice(["ACTIVE", "FULFILLED"])
            
        # We need an event id, pick random from events
        ev_id = random.choice(events).split("'")[1] 
        ptps.append(f"('{cust_id}', '{ev_id}', {amt}, '{prom_date.strftime('%Y-%m-%d')}', '{src}', '{conf}', '{status}')")
        
    out.append("INSERT INTO ptp_records (customer_id, event_id, promised_amount, promised_date, extraction_source, commitment_confidence, status) VALUES")
    out.append(",\n".join(ptps) + ";\n")
    
    # --- Generate 100 B2B Invoices ---
    for i in range(100):
        inv = f"INV-2026-{str(i).zfill(3)}"
        company = random.choice(["Acme Corp", "Globex Inc", "Initech", "Stark Ind", "Wayne Ent", "Soylent Corp", "Cyberdyne", "Umbrella Corp"])
        contact = random.choice(["John Doe", "Jane Smith", "Peter Gibbons", "Tony S", "Bruce W"])
        phone = f"+91{random.randint(6000000000, 9999999999)}"
        amt = random.randint(100000, 10000000) * 100
        days_offset = random.randint(-40, 40)
        due = datetime.now() + timedelta(days=days_offset)
        
        if days_offset < -20:
            tier = "RED"
            status = random.choice(["OVERDUE", "ESCALATED"])
        elif days_offset < -10:
            tier = "ORANGE"
            status = "OVERDUE"
        elif days_offset < 0:
            tier = "YELLOW"
            status = "OVERDUE"
        else:
            tier = "GREEN"
            status = "OUTSTANDING"
            
        invoices.append(f"('{inv}', '{company}', '{contact}', '{phone}', {amt}, '{due.strftime('%Y-%m-%d')}', '{tier}', '{status}')")

    out.append("INSERT INTO b2b_invoices (invoice_number, customer_company, customer_contact, customer_phone, amount, due_date, risk_tier, status) VALUES")
    out.append(",\n".join(invoices) + ";\n")

    with open(r"e:\ReVault\backend\db\seed.sql", "w") as f:
        f.write("\n".join(out))

if __name__ == "__main__":
    main()
