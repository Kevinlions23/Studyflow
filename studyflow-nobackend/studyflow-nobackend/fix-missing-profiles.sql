-- ============================================================
-- Fix: "Cannot coerce the result to a single JSON object"
-- Cause: an auth user exists with no matching row in public.profiles.
-- This back-fills a profile for every auth user that is missing one.
-- Safe to run any time. Run in Supabase -> SQL Editor -> Run.
-- ============================================================

insert into public.profiles (id, full_name, email)
select
    u.id,
    coalesce(u.raw_user_meta_data->>'full_name', ''),
    u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Verify: this should now show your account with a profile.
select u.email, p.full_name, p.onboarding_complete
from auth.users u
join public.profiles p on p.id = u.id;
