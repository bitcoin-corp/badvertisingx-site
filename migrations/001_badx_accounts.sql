-- bAdvertisingX: wallet sign-in nonces and job briefs. Server-only (service role); RLS on, no public policies.
create table if not exists public.badx_nonces (
  nonce text primary key,
  data jsonb not null,
  expires_at timestamptz not null
);

create table if not exists public.badx_briefs (
  id uuid primary key default gen_random_uuid(),
  identity_key text not null,
  job text not null check (job in ('share-image','logo','brand-kit','ad-film','launch-pack','other')),
  brand text not null check (char_length(brand) between 1 and 120),
  brief text not null check (char_length(brief) between 1 and 4000),
  link text check (link is null or char_length(link) <= 500),
  contact text check (contact is null or char_length(contact) <= 200),
  status text not null default 'received' check (status in ('received','quoted','in-progress','delivered','declined')),
  created_at timestamptz not null default now()
);
create index if not exists badx_briefs_identity_key on public.badx_briefs (identity_key, created_at desc);

alter table public.badx_nonces enable row level security;
alter table public.badx_briefs enable row level security;

grant all on public.badx_nonces, public.badx_briefs to service_role;
revoke all on public.badx_nonces, public.badx_briefs from anon, authenticated;
