-- Keep privileged implementations outside the exposed Data API schema.
-- Public RPC entry points remain SECURITY INVOKER wrappers for compatibility.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.emi_cancel_order(uuid) SET SCHEMA private;
ALTER FUNCTION public.emi_create_order(jsonb, text) SET SCHEMA private;
ALTER FUNCTION public.emi_update_order_status(uuid, text) SET SCHEMA private;
ALTER FUNCTION public.is_conversation_participant(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.start_direct_conversation(uuid) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.emi_cancel_order(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.emi_create_order(jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.emi_update_order_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.start_direct_conversation(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.emi_cancel_order(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.emi_create_order(jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.emi_update_order_status(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_conversation_participant(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.start_direct_conversation(uuid) TO authenticated, service_role;

CREATE FUNCTION public.emi_cancel_order(p_order_id uuid)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $$ SELECT private.emi_cancel_order(p_order_id) $$;

CREATE FUNCTION public.emi_create_order(p_items jsonb, p_buyer_note text DEFAULT '')
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $$ SELECT private.emi_create_order(p_items, p_buyer_note) $$;

CREATE FUNCTION public.emi_update_order_status(p_order_id uuid, p_status text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $$ SELECT private.emi_update_order_status(p_order_id, p_status) $$;

CREATE FUNCTION public.is_conversation_participant(target_conversation uuid, target_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
AS $$ SELECT private.is_conversation_participant(target_conversation, target_user) $$;

CREATE FUNCTION public.start_direct_conversation(target_user uuid)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $$ SELECT private.start_direct_conversation(target_user) $$;

REVOKE ALL ON FUNCTION public.emi_cancel_order(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.emi_create_order(jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.emi_update_order_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_direct_conversation(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.emi_cancel_order(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.emi_create_order(jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.emi_update_order_status(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_direct_conversation(uuid) TO authenticated, service_role;
