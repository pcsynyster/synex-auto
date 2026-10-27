alter table public.tenants add column pix_titular text check (char_length(pix_titular) <= 60);

grant update (pix_titular) on public.tenants to authenticated;
grant select (pix_titular) on public.tenants to anon;
