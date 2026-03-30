-- Add applicant profile fields for Chilean property broker requirements
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Chilena';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employer text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employment_years integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_income integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS housing_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- Update handle_new_user to save applicant fields from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, phone, rut,
    birth_date, marital_status, nationality,
    occupation, employer, employment_years, monthly_income,
    housing_status, emergency_contact_name, emergency_contact_phone
  )
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'POSTULANTE'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'rut',
    (new.raw_user_meta_data->>'birth_date')::date,
    new.raw_user_meta_data->>'marital_status',
    coalesce(new.raw_user_meta_data->>'nationality', 'Chilena'),
    new.raw_user_meta_data->>'occupation',
    new.raw_user_meta_data->>'employer',
    (new.raw_user_meta_data->>'employment_years')::integer,
    (new.raw_user_meta_data->>'monthly_income')::integer,
    new.raw_user_meta_data->>'housing_status',
    new.raw_user_meta_data->>'emergency_contact_name',
    new.raw_user_meta_data->>'emergency_contact_phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
