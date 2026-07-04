-- WorkflowCrate: AI chatbot freemium usage limits (July 2026).
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

-- One row per user. conversation_count/period_start track the rolling 30-day
-- free-quota window; bonus_conversations is purchased top-up credit that
-- never expires; subscription_active/subscription_expires_at gate unlimited
-- access and are kept fresh by the Razorpay subscription webhook.
create table public.chat_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  conversation_count int not null default 0,
  period_start timestamptz not null default now(),
  bonus_conversations int not null default 0,
  subscription_active boolean not null default false,
  subscription_expires_at timestamptz,
  razorpay_subscription_id text,
  updated_at timestamptz not null default now()
);
alter table public.chat_usage enable row level security;

-- Users may read their own usage row directly. There is no insert/update
-- policy, so the anon/authenticated roles can never mutate this table from
-- the client - all writes happen only through the SECURITY DEFINER functions
-- below, which are further locked to the service_role via explicit grants
-- (see the revoke/grant block at the end of this file).
create policy "chat_usage_select_own" on public.chat_usage
  for select using (auth.uid() = user_id);

-- One row per successful top-up payment, keyed by Razorpay payment id, so a
-- retried client call can never double-credit bonus conversations.
create table public.chat_topups (
  razorpay_payment_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bonus_conversations int not null,
  created_at timestamptz not null default now()
);
alter table public.chat_topups enable row level security;
create index on public.chat_topups (user_id);

-- Rolls the rolling 30-day window over if it has expired (and creates the
-- row on a user's first-ever chat). Locks the row FOR UPDATE so concurrent
-- callers within the same transaction see a consistent view.
create or replace function public.chat_usage_ensure_period(p_user_id uuid, p_period_days int default 30)
returns public.chat_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.chat_usage;
begin
  insert into public.chat_usage (user_id) values (p_user_id)
    on conflict (user_id) do nothing;

  select * into v_row from public.chat_usage where user_id = p_user_id for update;

  if v_row.period_start < now() - (p_period_days || ' days')::interval then
    update public.chat_usage
      set conversation_count = 0, period_start = now(), updated_at = now()
      where user_id = p_user_id
      returning * into v_row;
  end if;

  return v_row;
end;
$$;

-- Read-only usage snapshot - rolls the period over if lapsed but never
-- consumes quota. Safe to call as often as the UI wants.
create or replace function public.chat_usage_status(p_user_id uuid, p_free_quota int default 5, p_period_days int default 30)
returns table (
  conversation_count int,
  bonus_conversations int,
  free_remaining int,
  subscription_active boolean,
  subscription_expires_at timestamptz,
  period_start timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.chat_usage;
begin
  v_row := public.chat_usage_ensure_period(p_user_id, p_period_days);
  return query select
    v_row.conversation_count,
    v_row.bonus_conversations,
    greatest(p_free_quota - v_row.conversation_count, 0),
    v_row.subscription_active and (v_row.subscription_expires_at is null or v_row.subscription_expires_at > now()),
    v_row.subscription_expires_at,
    v_row.period_start;
end;
$$;

-- Atomically decides whether a NEW conversation may start and, if so,
-- consumes one unit of quota in the same transaction (subscription, then
-- free quota, then bonus credits) - this is what prevents two concurrent
-- "new conversation" requests from a race where both get allowed.
create or replace function public.chat_usage_start_conversation(p_user_id uuid, p_free_quota int default 5, p_period_days int default 30)
returns table (
  allowed boolean,
  reason text,
  conversation_count int,
  bonus_conversations int,
  free_remaining int,
  subscription_active boolean,
  subscription_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.chat_usage;
  v_sub_active boolean;
begin
  v_row := public.chat_usage_ensure_period(p_user_id, p_period_days);
  v_sub_active := v_row.subscription_active and (v_row.subscription_expires_at is null or v_row.subscription_expires_at > now());

  if v_sub_active then
    update public.chat_usage set conversation_count = conversation_count + 1, updated_at = now()
      where user_id = p_user_id returning * into v_row;
    return query select true, 'subscription'::text, v_row.conversation_count, v_row.bonus_conversations,
      greatest(p_free_quota - v_row.conversation_count, 0), v_sub_active, v_row.subscription_expires_at;
    return;
  end if;

  if v_row.conversation_count < p_free_quota then
    update public.chat_usage set conversation_count = conversation_count + 1, updated_at = now()
      where user_id = p_user_id returning * into v_row;
    return query select true, 'free'::text, v_row.conversation_count, v_row.bonus_conversations,
      greatest(p_free_quota - v_row.conversation_count, 0), v_sub_active, v_row.subscription_expires_at;
    return;
  end if;

  if v_row.bonus_conversations > 0 then
    update public.chat_usage set conversation_count = conversation_count + 1, bonus_conversations = bonus_conversations - 1, updated_at = now()
      where user_id = p_user_id returning * into v_row;
    return query select true, 'bonus'::text, v_row.conversation_count, v_row.bonus_conversations,
      greatest(p_free_quota - v_row.conversation_count, 0), v_sub_active, v_row.subscription_expires_at;
    return;
  end if;

  return query select false, 'limit_reached'::text, v_row.conversation_count, v_row.bonus_conversations,
    greatest(p_free_quota - v_row.conversation_count, 0), v_sub_active, v_row.subscription_expires_at;
end;
$$;

-- Called after a verified top-up payment. Idempotent via chat_topups' PK -
-- if this payment id was already credited (retry/duplicate call), the insert
-- is skipped and no bonus is added twice.
create or replace function public.chat_usage_add_bonus(p_user_id uuid, p_payment_id text, p_amount int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted boolean;
begin
  insert into public.chat_topups (razorpay_payment_id, user_id, bonus_conversations)
    values (p_payment_id, p_user_id, p_amount)
    on conflict (razorpay_payment_id) do nothing
    returning true into v_inserted;

  if v_inserted then
    insert into public.chat_usage (user_id, bonus_conversations)
      values (p_user_id, p_amount)
      on conflict (user_id) do update
        set bonus_conversations = public.chat_usage.bonus_conversations + excluded.bonus_conversations,
            updated_at = now();
  end if;
end;
$$;

-- Called from the Razorpay webhook on subscription lifecycle events
-- (activated/charged/cancelled/completed/halted).
create or replace function public.chat_usage_set_subscription(
  p_user_id uuid,
  p_active boolean,
  p_expires_at timestamptz,
  p_subscription_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_usage (user_id, subscription_active, subscription_expires_at, razorpay_subscription_id)
    values (p_user_id, p_active, p_expires_at, p_subscription_id)
    on conflict (user_id) do update
      set subscription_active = excluded.subscription_active,
          subscription_expires_at = excluded.subscription_expires_at,
          razorpay_subscription_id = coalesce(excluded.razorpay_subscription_id, public.chat_usage.razorpay_subscription_id),
          updated_at = now();
end;
$$;

-- Lock all five functions down to the service role. By default Postgres
-- grants EXECUTE on new functions to PUBLIC, which would let any signed-in
-- (or even anonymous) client call chat_usage_start_conversation directly
-- with an arbitrary p_user_id and burn a stranger's free quota - these
-- functions don't check auth.uid() themselves (the server's service-role key
-- has no bearer-token identity to check against), so the grant is the only
-- thing enforcing "only our API routes can call this."
revoke all on function public.chat_usage_ensure_period(uuid, int) from public;
revoke all on function public.chat_usage_status(uuid, int, int) from public;
revoke all on function public.chat_usage_start_conversation(uuid, int, int) from public;
revoke all on function public.chat_usage_add_bonus(uuid, text, int) from public;
revoke all on function public.chat_usage_set_subscription(uuid, boolean, timestamptz, text) from public;

grant execute on function public.chat_usage_ensure_period(uuid, int) to service_role;
grant execute on function public.chat_usage_status(uuid, int, int) to service_role;
grant execute on function public.chat_usage_start_conversation(uuid, int, int) to service_role;
grant execute on function public.chat_usage_add_bonus(uuid, text, int) to service_role;
grant execute on function public.chat_usage_set_subscription(uuid, boolean, timestamptz, text) to service_role;

-- Admin helper: see who's about to hit their monthly free limit.
--   select user_id, conversation_count, bonus_conversations, subscription_active
--   from public.chat_usage where conversation_count >= 3 order by updated_at desc;
