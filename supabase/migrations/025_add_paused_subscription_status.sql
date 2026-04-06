-- Migration 025: Add 'paused' subscription status
-- Allows subscriptions to be paused by the user

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'paused'));
