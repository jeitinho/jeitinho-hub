-- JEITINHO Agent Operating System: execution and action audit
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  task text not null,
  autonomy text not null check (autonomy in ('N0','N1','N2','N3')),
  status text not null default 'queued' check (status in ('queued','running','needs_approval','completed','failed','cancelled')),
  input_summary text,
  output_summary text,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  approval_required boolean not null default false,
  approved_by uuid references auth.users(id),
  target_type text,
  target_id text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  agent_id text not null,
  tool text not null,
  status text not null default 'proposed' check (status in ('proposed','executed','blocked','failed')),
  risk text not null default 'low' check (risk in ('low','medium','high')),
  approval_required boolean not null default false,
  approved_by uuid references auth.users(id),
  input jsonb,
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create index if not exists agent_runs_agent_created_idx on public.agent_runs(agent_id, created_at desc);
create index if not exists agent_runs_status_idx on public.agent_runs(status);
create index if not exists agent_actions_run_idx on public.agent_actions(agent_run_id);

alter table public.agent_runs enable row level security;
alter table public.agent_actions enable row level security;

create policy "agent runs managers can read"
on public.agent_runs for select to authenticated
using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'manager'::app_role));

create policy "agent runs managers can create"
on public.agent_runs for insert to authenticated
with check (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'manager'::app_role));

create policy "agent runs managers can update"
on public.agent_runs for update to authenticated
using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'manager'::app_role));

create policy "agent actions managers can read"
on public.agent_actions for select to authenticated
using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'manager'::app_role));

create policy "agent actions managers can create"
on public.agent_actions for insert to authenticated
with check (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'manager'::app_role));

create policy "agent actions managers can update"
on public.agent_actions for update to authenticated
using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'manager'::app_role));
