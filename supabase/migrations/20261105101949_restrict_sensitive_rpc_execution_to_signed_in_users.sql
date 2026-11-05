-- Keep authenticated RPC access for application workflows, but prevent anonymous callers.
REVOKE EXECUTE ON FUNCTION public.emi_cancel_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emi_cancel_order(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.emi_create_order(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emi_create_order(jsonb, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.emi_update_order_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emi_update_order_status(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.start_direct_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_direct_conversation(uuid) TO authenticated, service_role;
