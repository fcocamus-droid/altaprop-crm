-- Other service payments: for charging repair work, maintenance, etc.
CREATE TABLE IF NOT EXISTS public.other_service_payments (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id    UUID          NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  description       TEXT          NOT NULL,
  amount            NUMERIC       NOT NULL,
  currency          TEXT          NOT NULL DEFAULT 'CLP',
  payer_type        TEXT          NOT NULL CHECK (payer_type IN ('applicant', 'owner')),
  file_url          TEXT,
  file_name         TEXT,
  paid              BOOLEAN       NOT NULL DEFAULT FALSE,
  mp_preference_id  TEXT,
  created_by        UUID          REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.other_service_payments ENABLE ROW LEVEL SECURITY;

-- Admins and agents (non-applicants) can do everything via subscriber isolation
CREATE POLICY "admins can manage other_service_payments"
  ON public.other_service_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.properties p ON p.id = a.property_id
      WHERE a.id = other_service_payments.application_id
        AND p.subscriber_id = get_subscriber_id()
    )
  );

-- Applicants can view their own payments
CREATE POLICY "applicants can view their own other_service_payments"
  ON public.other_service_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = other_service_payments.application_id
        AND a.applicant_id = auth.uid()
    )
  );

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS other_service_payments_application_id_idx
  ON public.other_service_payments(application_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_other_service_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER other_service_payments_updated_at
  BEFORE UPDATE ON public.other_service_payments
  FOR EACH ROW EXECUTE FUNCTION update_other_service_payments_updated_at();
