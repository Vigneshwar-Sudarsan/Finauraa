-- Add table for tracking processed webhook events (idempotency)
-- This prevents duplicate processing of webhook events from retries

CREATE TABLE processed_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast lookups during idempotency checks
CREATE INDEX idx_processed_webhook_events_event_id ON processed_webhook_events(event_id);

-- Index for cleanup queries (events older than 7 days can be deleted)
-- Stripe retries for up to 3 days, so 7 days provides safety margin
CREATE INDEX idx_processed_webhook_events_processed_at ON processed_webhook_events(processed_at);

-- RLS: Only service role can access (webhooks use service role key)
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies needed - service role bypasses RLS
-- This ensures webhook handlers have exclusive access to this table
