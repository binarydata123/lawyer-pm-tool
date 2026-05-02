ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_no bigint,
  ADD COLUMN IF NOT EXISTS title text DEFAULT '';
