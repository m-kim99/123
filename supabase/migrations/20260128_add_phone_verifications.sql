CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  purpose text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  send_count integer NOT NULL DEFAULT 1,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  consumed_at timestamptz,
  consumed_for_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_purpose_created_at
  ON phone_verifications (phone, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at
  ON phone_verifications (expires_at);

ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
