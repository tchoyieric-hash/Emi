alter table public.annonces
  add constraint annonces_prix_positive_check check (prix > 0) not valid;
alter table public.annonces validate constraint annonces_prix_positive_check;

alter table public.products
  add constraint products_price_positive_check check (price > 0) not valid;
alter table public.products validate constraint products_price_positive_check;
