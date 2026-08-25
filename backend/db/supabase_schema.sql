-- ==============================================================================
-- REVAULT FULL SUPABASE SCHEMA MIGRATION
-- Run this completely free in your Supabase SQL Editor!
-- ==============================================================================

-- 1. Create Tables
DROP TABLE IF EXISTS merchant_config CASCADE;
DROP TABLE IF EXISTS payment_events CASCADE;
DROP TABLE IF EXISTS recovery_actions CASCADE;
DROP TABLE IF EXISTS retry_schedules CASCADE;
DROP TABLE IF EXISTS ptp_records CASCADE;
DROP TABLE IF EXISTS b2b_invoices CASCADE;
DROP TABLE IF EXISTS audit_trail CASCADE;
DROP TABLE IF EXISTS batch_runs CASCADE;
DROP TABLE IF EXISTS voice_calls CASCADE;

CREATE TABLE merchant_config (
    id SERIAL PRIMARY KEY,
    max_recovery_attempts INT DEFAULT 3,
    cooling_period_hours INT DEFAULT 24,
    contact_start_hour INT DEFAULT 9,
    contact_end_hour INT DEFAULT 21,
    allow_discount_offers BOOLEAN DEFAULT TRUE,
    discount_percent INT DEFAULT 10,
    whatsapp_enabled BOOLEAN DEFAULT TRUE,
    voice_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    b2b_mode BOOLEAN DEFAULT TRUE,
    vip_cart_threshold INT DEFAULT 500000, -- in paise
    retry_interval_unit TEXT DEFAULT 'minutes' -- 'minutes' for demo, 'days' for prod
);

-- Insert a default config row immediately
INSERT INTO merchant_config (id) VALUES (1);

CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payment_id TEXT,
    order_id TEXT,
    subscription_id TEXT,
    amount INT,
    currency TEXT DEFAULT 'INR',
    failure_cause TEXT,
    failure_confidence FLOAT,
    raw_payload JSONB,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recovery_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES payment_events(id),
    module TEXT NOT NULL,
    action_type TEXT NOT NULL,
    channel TEXT NOT NULL,
    payload JSONB,
    agent_reasoning TEXT,
    compliance_checked BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    outcome TEXT DEFAULT 'PENDING',
    outcome_recorded_at TIMESTAMPTZ,
    amount_recovered INT
);

CREATE TABLE retry_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES payment_events(id),
    attempt_number INT NOT NULL,
    max_attempts INT NOT NULL,
    next_retry_at TIMESTAMPTZ NOT NULL,
    retry_rail TEXT NOT NULL,
    cause TEXT,
    status TEXT DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ptp_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT,
    event_id UUID REFERENCES payment_events(id),
    promised_amount INT,
    promised_date DATE,
    extraction_source TEXT,
    commitment_confidence FLOAT,
    status TEXT DEFAULT 'PROMISED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE b2b_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    customer_company TEXT NOT NULL,
    customer_contact TEXT NOT NULL,
    customer_phone TEXT,
    amount INT NOT NULL,
    due_date DATE NOT NULL,
    risk_tier TEXT,
    payment_link_id TEXT,
    status TEXT DEFAULT 'OUTSTANDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    module TEXT NOT NULL,
    action_id UUID,
    event_id UUID,
    actor TEXT NOT NULL,
    decision_log JSONB,
    compliance_log JSONB
);

CREATE TABLE batch_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_records INT,
    total_at_risk INT,
    total_recovered INT,
    recovery_rate FLOAT,
    classifier_accuracy FLOAT,
    compliance_violations INT,
    escalations_correct INT,
    escalations_total INT
);

CREATE TABLE voice_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES payment_events(id),
    customer_name TEXT,
    script_text TEXT,
    audio_url TEXT,
    outcome TEXT,
    transcript TEXT,
    reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 2. Audit Trail Immutability Trigger (The Compliance Guarantee)
-- ==============================================================================
CREATE OR REPLACE FUNCTION block_audit_modifications()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'COMPLIANCE VIOLATION: The audit_trail table is immutable. UPDATE or DELETE operations are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_immutability
BEFORE UPDATE OR DELETE ON audit_trail
FOR EACH ROW EXECUTE FUNCTION block_audit_modifications();


-- ==============================================================================
-- 3. Enable Realtime Replication
-- ==============================================================================
-- Drop the publication if it exists to avoid errors on re-run
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;

-- Create the realtime publication
CREATE PUBLICATION supabase_realtime FOR TABLE 
    payment_events,
    recovery_actions,
    retry_schedules,
    ptp_records,
    b2b_invoices,
    audit_trail,
    batch_runs,
    voice_calls,
    merchant_config;

-- Alternatively, add tables to the existing supabase_realtime publication
-- ALTER PUBLICATION supabase_realtime ADD TABLE payment_events, recovery_actions, retry_schedules, ptp_records, b2b_invoices, audit_trail, batch_runs, voice_calls, merchant_config;
