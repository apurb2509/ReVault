-- ============================================================
-- ReVault — Database Schema
-- ============================================================

-- All financial amounts are stored in paise (integer) to avoid
-- floating-point rounding errors in monetary calculations.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Core event log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_event_id   TEXT UNIQUE NOT NULL,
    event_type          TEXT NOT NULL,
    payment_id          TEXT,
    order_id            TEXT,
    subscription_id     TEXT,
    amount              INTEGER,
    currency            TEXT DEFAULT 'INR',
    failure_cause       TEXT,
    failure_confidence  FLOAT,
    raw_payload         JSONB NOT NULL,
    received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON payment_events (event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_received_at ON payment_events (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON payment_events (payment_id);

-- ── Recovery actions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recovery_actions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES payment_events (id),
    module              TEXT NOT NULL,
    action_type         TEXT NOT NULL,
    channel             TEXT,
    payload             JSONB NOT NULL DEFAULT '{}',
    agent_reasoning     TEXT,
    compliance_checked  BOOLEAN NOT NULL DEFAULT TRUE,
    executed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    outcome             TEXT NOT NULL DEFAULT 'PENDING',
    outcome_recorded_at TIMESTAMPTZ,
    -- NULL until a real payment.captured event is observed
    amount_recovered    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recovery_actions_event_id ON recovery_actions (event_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_module ON recovery_actions (module);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_outcome ON recovery_actions (outcome);

-- ── Retry state machine ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS retry_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES payment_events (id),
    attempt_number  INTEGER NOT NULL DEFAULT 0,
    max_attempts    INTEGER NOT NULL,
    next_retry_at   TIMESTAMPTZ,
    retry_rail      TEXT,
    cause           TEXT,
    status          TEXT NOT NULL DEFAULT 'SCHEDULED',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retry_schedules_event_id ON retry_schedules (event_id);
CREATE INDEX IF NOT EXISTS idx_retry_schedules_next_retry ON retry_schedules (next_retry_at)
    WHERE status = 'SCHEDULED';

-- ── Promise-to-pay records ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ptp_records (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id             TEXT NOT NULL,
    event_id                UUID NOT NULL REFERENCES payment_events (id),
    promised_amount         INTEGER,
    promised_date           DATE NOT NULL,
    extraction_source       TEXT NOT NULL,
    commitment_confidence   TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ptp_records_customer ON ptp_records (customer_id);
CREATE INDEX IF NOT EXISTS idx_ptp_records_promised_date ON ptp_records (promised_date)
    WHERE status = 'ACTIVE';

-- ── B2B invoices ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS b2b_invoices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number      TEXT UNIQUE NOT NULL,
    customer_company    TEXT NOT NULL,
    customer_contact    TEXT NOT NULL,
    customer_phone      TEXT NOT NULL,
    amount              INTEGER NOT NULL,
    due_date            DATE NOT NULL,
    -- Computed from CURRENT_DATE - due_date at query time
    risk_tier           TEXT NOT NULL DEFAULT 'GREEN',
    payment_link_id     TEXT,
    status              TEXT NOT NULL DEFAULT 'OUTSTANDING',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_invoices_status ON b2b_invoices (status);
CREATE INDEX IF NOT EXISTS idx_b2b_invoices_due_date ON b2b_invoices (due_date);

-- ── Immutable audit trail ────────────────────────────────────
-- Rows are never updated or deleted — append only.
CREATE TABLE IF NOT EXISTS audit_trail (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    module          TEXT NOT NULL,
    action_id       UUID REFERENCES recovery_actions (id),
    event_id        UUID REFERENCES payment_events (id),
    actor           TEXT NOT NULL DEFAULT 'SYSTEM',
    decision_log    JSONB NOT NULL DEFAULT '{}',
    compliance_log  JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_id ON audit_trail (event_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_module ON audit_trail (module);

-- Prevent UPDATE and DELETE on the audit trail at the DB level
CREATE OR REPLACE FUNCTION block_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit_trail is append-only — updates and deletes are not permitted';
END;
$$;

CREATE TRIGGER audit_trail_no_update
    BEFORE UPDATE ON audit_trail
    FOR EACH ROW EXECUTE FUNCTION block_audit_mutation();

CREATE TRIGGER audit_trail_no_delete
    BEFORE DELETE ON audit_trail
    FOR EACH ROW EXECUTE FUNCTION block_audit_mutation();

-- ── Merchant configuration ───────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_config (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id             TEXT UNIQUE NOT NULL DEFAULT 'default',
    max_recovery_attempts   INTEGER NOT NULL DEFAULT 3,
    cooling_period_hours    INTEGER NOT NULL DEFAULT 24,
    contact_start_hour      INTEGER NOT NULL DEFAULT 9,
    contact_end_hour        INTEGER NOT NULL DEFAULT 21,
    allow_discount_offers   BOOLEAN NOT NULL DEFAULT FALSE,
    discount_percent        FLOAT NOT NULL DEFAULT 5.0,
    whatsapp_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    voice_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
    email_enabled           BOOLEAN NOT NULL DEFAULT TRUE,
    b2b_mode                BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed a default config row so the system works out of the box
INSERT INTO merchant_config (merchant_id) VALUES ('default')
    ON CONFLICT (merchant_id) DO NOTHING;
