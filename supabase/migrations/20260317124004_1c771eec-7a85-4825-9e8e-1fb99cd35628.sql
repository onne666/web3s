
-- The "Anyone can insert api_keys" policy with true is intentional for public API key submission
-- But let's also create an edge function to handle first-admin registration
-- We need a function that assigns admin role to first user when no admins exist
CREATE OR REPLACE FUNCTION public.assign_first_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin');
    RETURN true;
  END IF;
  RETURN false;
END;
$$;
