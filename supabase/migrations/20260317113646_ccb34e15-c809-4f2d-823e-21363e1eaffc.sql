
-- Create api_keys table
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exchange TEXT NOT NULL,
  api_key TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  passphrase TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'checking',
  permissions JSONB DEFAULT '[]'::jsonb,
  account_info JSONB DEFAULT '{}'::jsonb,
  card_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_checked_at TIMESTAMPTZ
);

-- Create rates table
CREATE TABLE public.rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  buyback_rate NUMERIC NOT NULL DEFAULT 7.20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default USDT rate
INSERT INTO public.rates (symbol, buyback_rate) VALUES ('USDT', 7.20);

-- Enable RLS on both tables
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;

-- api_keys: anyone can insert (user submits their keys)
CREATE POLICY "Anyone can insert api_keys"
ON public.api_keys FOR INSERT
WITH CHECK (true);

-- api_keys: anyone can select (admin password gate is frontend-only for now)
-- NOTE: This is temporary. Should be restricted to admin role once auth is added.
CREATE POLICY "Anyone can select api_keys"
ON public.api_keys FOR SELECT
USING (true);

-- api_keys: anyone can update (edge function updates status/account_info)
CREATE POLICY "Anyone can update api_keys"
ON public.api_keys FOR UPDATE
USING (true);

-- rates: anyone can read
CREATE POLICY "Anyone can read rates"
ON public.rates FOR SELECT
USING (true);

-- rates: anyone can insert/update/delete (admin password gate is frontend-only for now)
CREATE POLICY "Anyone can manage rates"
ON public.rates FOR ALL
USING (true)
WITH CHECK (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rates_updated_at
BEFORE UPDATE ON public.rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
