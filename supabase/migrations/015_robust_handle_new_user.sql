-- Make handle_new_user robust: NULLIF protects all type casts from empty strings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $func$
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, phone, rut, subscriber_id,
    birth_date, marital_status, nationality,
    occupation, employer, employment_years, monthly_income,
    housing_status, emergency_contact_name, emergency_contact_phone
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'POSTULANTE'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    NULLIF(new.raw_user_meta_data->>'rut', ''),
    NULLIF(new.raw_user_meta_data->>'subscriber_id', '')::uuid,
    NULLIF(new.raw_user_meta_data->>'birth_date', '')::date,
    NULLIF(new.raw_user_meta_data->>'marital_status', ''),
    COALESCE(NULLIF(new.raw_user_meta_data->>'nationality', ''), 'Chilena'),
    NULLIF(new.raw_user_meta_data->>'occupation', ''),
    NULLIF(new.raw_user_meta_data->>'employer', ''),
    NULLIF(new.raw_user_meta_data->>'employment_years', '')::integer,
    NULLIF(new.raw_user_meta_data->>'monthly_income', '')::integer,
    NULLIF(new.raw_user_meta_data->>'housing_status', ''),
    NULLIF(new.raw_user_meta_data->>'emergency_contact_name', ''),
    NULLIF(new.raw_user_meta_data->>'emergency_contact_phone', '')
  );
  RETURN new;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
