REVOKE ALL PRIVILEGES ON TABLE
  public.business_members,
  public.conversation_participants,
  public.conversations,
  public.messages,
  public.notifications,
  public.order_items,
  public.orders
FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.profiles
FROM anon;
