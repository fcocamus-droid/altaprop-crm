-- Update handle_new_user to save subscriber_id from metadata (for invited propietarios)
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
    coalesce(new.raw_user_meta_data->>'role', 'POSTULANTE'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'rut',
    NULLIF(new.raw_user_meta_data->>'subscriber_id', ''),
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
$func$ LANGUAGE plpgsql SECURITY DEFINER;
