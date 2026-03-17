
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS display_key text NOT NULL DEFAULT '';

-- Backfill existing rows: copy api_key to display_key (already masked)
UPDATE public.api_keys SET display_key = api_key WHERE display_key = '';
