-- Migration 018: Add bank account fields to profiles + payment receipts table

-- Add bank account columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_type TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_rut TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_email TEXT;

-- Create payment_receipts table
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Applicant can insert their own receipts
CREATE POLICY "applicant_insert_receipt" ON public.payment_receipts
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

-- Applicant can view their own receipts
CREATE POLICY "applicant_select_receipt" ON public.payment_receipts
  FOR SELECT USING (auth.uid() = applicant_id);

-- Admin roles can view all receipts via service role (no RLS policy needed for service role)
