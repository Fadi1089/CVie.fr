-- pg_cron is provided by Supabase. Locally this migration is a no-op
-- if the extension isn't available; the function definition still
-- succeeds because it has no side effects until called.

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN undefined_file THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION purge_trashed_cvs() RETURNS void AS $$
  DELETE FROM cvs WHERE folder_id IN (
    SELECT id FROM folders
    WHERE is_system = true AND ttl_days IS NOT NULL
  )
  AND updated_at < NOW() - INTERVAL '30 days';
$$ LANGUAGE sql;

-- Idempotent schedule registration.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cvie-purge-trashed-cvs') THEN
    PERFORM cron.unschedule('cvie-purge-trashed-cvs');
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  PERFORM cron.schedule(
    'cvie-purge-trashed-cvs',
    '0 3 * * *',
    'SELECT purge_trashed_cvs()'
  );
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_function THEN NULL;
END $$;
