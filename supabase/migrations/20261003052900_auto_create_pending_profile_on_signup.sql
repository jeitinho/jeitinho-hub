-- Bug: profiles rows were only created client-side (createPendingProfile in
-- src/routes/api/auth/signup.ts), and only in the branch where Supabase
-- returns an immediate session right after signup. With email confirmation
-- required (this project's current auth setting), POST /auth/v1/signup
-- returns no session, that branch was skipped, and the new auth.users row
-- never got a matching profiles row — the account was invisible everywhere
-- in the Hub (never showed up in "Comptes en attente") and, once the user
-- did confirm their email, login failed with "Profil Hub introuvable ou
-- inactif après authentification Supabase."
--
-- Fix: create the pending profile straight from auth.users via a trigger,
-- independent of whichever API path created the user (signup, OAuth, magic
-- link, admin invite, …) or whether a session was issued immediately.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, status, is_active)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    'pending_validation',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
