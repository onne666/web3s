ALTER TABLE public.api_keys
ADD COLUMN IF NOT EXISTS proxy_config jsonb NOT NULL DEFAULT '{}'::jsonb;