-- WorkflowCrate: review follow-up cadence (July 2026).
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run - "if not exists" makes this idempotent.

-- Tracks whether the one-time "how did it go, mind leaving a review?" email
-- has been sent/processed for an order, so the daily cron never double-sends
-- and never re-scans orders it has already handled.
alter table public.orders
  add column if not exists review_followup_sent_at timestamptz;

-- Speeds up the cron's daily scan (paid, unprocessed, ~7+ days old orders).
create index if not exists orders_followup_scan_idx
  on public.orders (status, review_followup_sent_at, created_at);
