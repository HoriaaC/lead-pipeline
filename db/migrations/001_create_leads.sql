-- 001: leads table. Applied once by db/migrate.ts inside a transaction.
create table leads (
  id          bigint generated always as identity primary key,
  name        text not null,
  email       text not null,
  phone       text,
  company     text,
  message     text,
  source      text not null default 'website',
  status      text not null default 'new'
              check (status in ('new', 'contacted', 'qualified', 'lost')),
  created_at  timestamptz not null default now()
);

-- Dashboard and stats always query "latest first" / "since X".
create index leads_created_at_idx on leads (created_at desc);
-- Dedup lookups; emails are lowercased + trimmed by zod before insert (step 2).
create index leads_email_idx on leads (email);

-- Supabase exposes the public schema over its REST API to anyone with the anon key.
-- We never use that API: the app connects directly as the table owner, and owners
-- bypass RLS. RLS on + no policies = the REST API can't read or write these tables.
alter table leads enable row level security;
alter table schema_migrations enable row level security;
