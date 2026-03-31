-- Add agent_id to profiles for propietario-agent assignment
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_agent_id ON public.profiles(agent_id);
