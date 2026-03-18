DROP POLICY IF EXISTS "Anyone can insert api_keys" ON public.api_keys;

CREATE POLICY "Admins can insert api_keys"
ON public.api_keys
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));