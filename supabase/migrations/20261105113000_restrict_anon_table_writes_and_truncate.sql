-- Restrict anonymous writes on commerce, messaging, and notification tables.
-- Keep SELECT grants; row visibility remains controlled by RLS policies.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE
  public.business_members,
  public.businesses,
  public.conversation_participants,
  public.conversations,
  public.messages,
  public.notifications,
  public.order_items,
  public.orders,
  public.products
FROM anon;

-- Anonymous users must never be able to bypass row-level policies with TRUNCATE.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS table_ref
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND has_table_privilege('anon', c.oid, 'TRUNCATE')
  LOOP
    EXECUTE format('REVOKE TRUNCATE ON TABLE %s FROM anon', r.table_ref);
  END LOOP;
END
$$;
