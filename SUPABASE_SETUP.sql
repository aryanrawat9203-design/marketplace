-- WorkflowCrate Supabase schema additions (July 2026).
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- The original `orders` table DDL lives in FlowDex_Claude_Code_Tasks.md (task 7).

-- Buyer reviews. Rows are written by the server (service role) only, arrive as
-- 'pending', and appear on the site once you set status = 'approved' in the
-- dashboard. Never insert reviews by hand - honest social proof only.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text not null,
  author_name text,
  item_kind text not null,
  item_ref text not null,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text not null,
  status text not null default 'pending',
  unique (email, item_kind, item_ref)
);
create index on public.reviews (item_ref, status);
alter table public.reviews enable row level security;

-- Buyer-assembled carts. Created at checkout so Razorpay order notes and
-- download tokens can reference a compact cart id instead of an item list.
-- Rows are small and kept forever so old receipt links keep working.
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  items jsonb not null,
  amount_paise integer not null
);
alter table public.carts enable row level security;

-- Moderation helper: see what's waiting for approval.
--   select id, created_at, email, item_ref, rating, title, body
--   from public.reviews where status = 'pending' order by created_at;
-- Approve with:
--   update public.reviews set status = 'approved' where id = '<id>';
