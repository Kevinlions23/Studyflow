-- ============================================================
-- StudyFlow AI — Storage setup for PDF uploads
-- Run in Supabase -> SQL Editor -> Run. Safe to re-run.
-- Creates a private "books" bucket and policies so each user can only
-- read/write files inside a folder named after their own user id.
-- File path convention used by the app:  {user_id}/{book_id}.pdf
-- ============================================================

-- Create the bucket (private). If it already exists, do nothing.
insert into storage.buckets (id, name, public)
values ('books', 'books', false)
on conflict (id) do nothing;

-- Allow a user to READ files in their own folder.
drop policy if exists "books read own" on storage.objects;
create policy "books read own"
on storage.objects for select to authenticated
using (
    bucket_id = 'books'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow a user to UPLOAD into their own folder.
drop policy if exists "books insert own" on storage.objects;
create policy "books insert own"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'books'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow a user to UPDATE (overwrite) their own files.
drop policy if exists "books update own" on storage.objects;
create policy "books update own"
on storage.objects for update to authenticated
using (
    bucket_id = 'books'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow a user to DELETE their own files.
drop policy if exists "books delete own" on storage.objects;
create policy "books delete own"
on storage.objects for delete to authenticated
using (
    bucket_id = 'books'
    and (storage.foldername(name))[1] = auth.uid()::text
);
