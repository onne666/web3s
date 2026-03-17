CREATE POLICY "Admins can delete api_keys"
ON public.api_keys
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));