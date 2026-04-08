-- Add receipt URL columns for commission and other service payments
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS commission_receipt_applicant_url TEXT,
  ADD COLUMN IF NOT EXISTS commission_receipt_owner_url TEXT;

ALTER TABLE other_service_payments
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_name TEXT;
