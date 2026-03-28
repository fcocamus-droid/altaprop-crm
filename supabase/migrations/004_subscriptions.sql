-- Migration: Add subscription fields to profiles for SaaS plans

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none'
  CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_subscription_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_agents integer DEFAULT 0;
