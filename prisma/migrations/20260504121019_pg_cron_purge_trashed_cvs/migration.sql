-- pg_cron is provided by Supabase. Locally this migration is a no-op
-- if the extension isn't available; the function definition still
-- succeeds because it has no side effects until called.

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN undefined_file THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION purge_trashed_cvs() RETURNS void AS $$
  DELETE FROM cvs c
  USING folders f
  WHERE c.folder_id = f.id
    AND f.is_system = true
    AND f.ttl_days IS NOT NULL
    AND c.updated_at < NOW() - (f.ttl_days || ' days')::INTERVAL;
$$ LANGUAGE sql SET search_path = public;

-- Idempotent schedule registration: unschedule + reschedule in a single atomic block.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cvie-purge-trashed-cvs') THEN
    PERFORM cron.unschedule('cvie-purge-trashed-cvs');
  END IF;
  PERFORM cron.schedule(
    'cvie-purge-trashed-cvs',
    '0 3 * * *',
    'SELECT purge_trashed_cvs()'
  );
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_function THEN NULL;
END $$;
