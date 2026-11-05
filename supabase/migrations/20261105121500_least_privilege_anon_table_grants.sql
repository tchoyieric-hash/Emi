-- Limit anonymous table privileges to the exact operations backed by anon/public RLS policies.
-- RLS remains the row-level boundary; grants are the table-level boundary.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.oid::regclass AS table_ref
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %s FROM anon', t.table_ref);
  END LOOP;

  FOR t IN
    SELECT DISTINCT p.tablename
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.cmd = 'SELECT'
      AND (p.roles @> ARRAY['anon']::name[] OR p.roles @> ARRAY['public']::name[])
  LOOP
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon', t.tablename);
  END LOOP;

  FOR t IN
    SELECT DISTINCT p.tablename
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.cmd = 'INSERT'
      AND (p.roles @> ARRAY['anon']::name[] OR p.roles @> ARRAY['public']::name[])
  LOOP
    EXECUTE format('GRANT INSERT ON TABLE public.%I TO anon', t.tablename);
  END LOOP;
END
$$;
