-- PayApp 정기결제 대기 테이블
CREATE TABLE IF NOT EXISTS payapp_pending_rebills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_key UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rebill_no TEXT NOT NULL,
  member_count INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_key, rebill_no)
);

-- RLS
ALTER TABLE payapp_pending_rebills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage payapp_pending_rebills"
  ON payapp_pending_rebills
  FOR ALL
  USING (true)
  WITH CHECK (true);
