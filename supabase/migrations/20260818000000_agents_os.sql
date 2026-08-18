create type if not exists public.agent_run_status as enum (
  'queued', 'running', 'needs_approval', 'completed', 'failed', 'cancelled'
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  task text not null,
  autonomy text not null check (autonomy in ('N0','N1','N2','N3')),
  status public.agent_run_status not null default 'queued',
  input_summary text,
  output_summary text,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  approval_required boolean not null default false,
  approved_by uuid references auth.users(id),
  target_type text,
  target_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  tool text not null,
  action_type text not null,
  risk text not null check (risk in ('low','medium','high')),
  target_type text,
  target_id uuid,
  input_summary text,
  output_summary text,
  approval_required boolean not null default false,
  approved_by uuid references auth.users(id),
  status text not null default 'planned' check (status in ('planned','approved','executed','rejected','failed')),
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

alter table public.agent_runs enable row level security;
alter table public.agent_actions enable row level security;

create policy "Managers can read agent runs"
  on public.agent_runs for select
  using (public.can_manage(auth.uid()));

create policy "Managers can manage agent runs"
  on public.agent_runs for all
  using (public.can_manage(auth.uid()))
  with check (public.can_manage(auth.uid()));

create policy "Managers can read agent actions"
  on public.agent_actions for select
  using (public.can_manage(auth.uid()));

create policy "Managers can manage agent actions"
  on public.agent_actions for all
  using (public.can_manage(auth.uid()))
  with check (public.can_manage(auth.uid()));
