-- ============================================================
-- StudyFlow AI — Database setup (browser-only version)
-- Paste this ENTIRE file into: Supabase Dashboard -> SQL Editor -> New query
-- Then click RUN. It creates all tables, the signup trigger, and
-- Row Level Security so each user only sees their own data.
-- Safe to re-run.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
    id                      uuid primary key references auth.users(id) on delete cascade,
    full_name               text,
    email                   text,
    learning_level          text default 'beginner'
                                check (learning_level in ('beginner','intermediate','advanced')),
    explanation_preference  text default 'balanced'
                                check (explanation_preference in ('very_simple','beginner','balanced','detailed','technical')),
    response_length         text default 'medium'
                                check (response_length in ('short','medium','detailed')),
    studying_subject        text,
    weekly_study_hours      integer default 0 check (weekly_study_hours >= 0),
    onboarding_complete     boolean default false,
    role                    text default 'user' check (role in ('user','admin')),
    created_at              timestamptz default now(),
    updated_at              timestamptz default now()
);

-- ---------- books ----------
create table if not exists public.books (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.profiles(id) on delete cascade,
    title         text not null,
    author        text,
    description   text,
    file_path     text,
    total_pages   integer default 0,
    status        text default 'processing'
                     check (status in ('processing','ready','failed','completed')),
    created_at    timestamptz default now(),
    updated_at    timestamptz default now()
);
create index if not exists idx_books_user on public.books(user_id);

-- ---------- chapters ----------
create table if not exists public.chapters (
    id              uuid primary key default gen_random_uuid(),
    book_id         uuid not null references public.books(id) on delete cascade,
    chapter_number  integer not null,
    title           text not null,
    start_page      integer,
    end_page        integer,
    extracted_text  text,
    summary         text,
    order_index     integer not null default 0,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);
create index if not exists idx_chapters_book on public.chapters(book_id);

-- ---------- user_chapter_progress ----------
create table if not exists public.user_chapter_progress (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references public.profiles(id) on delete cascade,
    chapter_id          uuid not null references public.chapters(id) on delete cascade,
    reading_progress    numeric default 0 check (reading_progress between 0 and 100),
    status              text default 'locked'
                            check (status in ('locked','unlocked','in_progress','completed')),
    completed_at        timestamptz,
    highest_quiz_score  numeric default 0,
    total_study_time    integer default 0,
    updated_at          timestamptz default now(),
    unique (user_id, chapter_id)
);
create index if not exists idx_ucp_user on public.user_chapter_progress(user_id);

-- ---------- notes ----------
create table if not exists public.notes (
    id             uuid primary key default gen_random_uuid(),
    user_id        uuid not null references public.profiles(id) on delete cascade,
    book_id        uuid references public.books(id) on delete cascade,
    chapter_id     uuid references public.chapters(id) on delete cascade,
    page_number    integer,
    selected_text  text,
    content        text,
    is_pinned      boolean default false,
    created_at     timestamptz default now(),
    updated_at     timestamptz default now()
);
create index if not exists idx_notes_user on public.notes(user_id);

-- ---------- highlights ----------
create table if not exists public.highlights (
    id             uuid primary key default gen_random_uuid(),
    user_id        uuid not null references public.profiles(id) on delete cascade,
    book_id        uuid references public.books(id) on delete cascade,
    chapter_id     uuid references public.chapters(id) on delete cascade,
    page_number    integer,
    selected_text  text,
    color          text default 'yellow',
    created_at     timestamptz default now()
);
create index if not exists idx_highlights_user on public.highlights(user_id);

-- ---------- quizzes ----------
create table if not exists public.quizzes (
    id             uuid primary key default gen_random_uuid(),
    chapter_id     uuid not null references public.chapters(id) on delete cascade,
    title          text,
    question_count integer default 20,
    passing_score  numeric default 70,
    created_at     timestamptz default now()
);
create index if not exists idx_quizzes_chapter on public.quizzes(chapter_id);

-- ---------- quiz_questions ----------
create table if not exists public.quiz_questions (
    id             uuid primary key default gen_random_uuid(),
    quiz_id        uuid not null references public.quizzes(id) on delete cascade,
    question       text not null,
    question_type  text default 'multiple_choice'
                      check (question_type in ('multiple_choice','true_false','multiple_select','matching','short_answer')),
    options        jsonb,
    correct_answer jsonb,
    explanation    text,
    topic          text,
    difficulty     text default 'medium' check (difficulty in ('easy','medium','hard')),
    created_at     timestamptz default now()
);
create index if not exists idx_qq_quiz on public.quiz_questions(quiz_id);

-- ---------- quiz_attempts ----------
create table if not exists public.quiz_attempts (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.profiles(id) on delete cascade,
    quiz_id       uuid not null references public.quizzes(id) on delete cascade,
    score         numeric default 0,
    percentage    numeric default 0,
    passed        boolean default false,
    time_spent    integer default 0,
    completed_at  timestamptz default now()
);
create index if not exists idx_qa_user on public.quiz_attempts(user_id);

-- ---------- quiz_answers ----------
create table if not exists public.quiz_answers (
    id           uuid primary key default gen_random_uuid(),
    attempt_id   uuid not null references public.quiz_attempts(id) on delete cascade,
    question_id  uuid not null references public.quiz_questions(id) on delete cascade,
    user_answer  jsonb,
    is_correct   boolean default false
);
create index if not exists idx_qans_attempt on public.quiz_answers(attempt_id);

-- ---------- flashcards ----------
create table if not exists public.flashcards (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references public.profiles(id) on delete cascade,
    book_id           uuid references public.books(id) on delete cascade,
    chapter_id        uuid references public.chapters(id) on delete cascade,
    front             text not null,
    back              text not null,
    difficulty        text default 'medium' check (difficulty in ('easy','medium','hard')),
    next_review_date  timestamptz default now(),
    created_at        timestamptz default now(),
    updated_at        timestamptz default now()
);
create index if not exists idx_flashcards_user on public.flashcards(user_id);

-- ---------- bookmarks ----------
create table if not exists public.bookmarks (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references public.profiles(id) on delete cascade,
    book_id      uuid references public.books(id) on delete cascade,
    chapter_id   uuid references public.chapters(id) on delete cascade,
    page_number  integer,
    created_at   timestamptz default now()
);
create index if not exists idx_bookmarks_user on public.bookmarks(user_id);

-- ---------- achievements catalog ----------
create table if not exists public.achievements (
    id           uuid primary key default gen_random_uuid(),
    name         text not null unique,
    description  text,
    icon         text
);

-- ---------- user_achievements ----------
create table if not exists public.user_achievements (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references public.profiles(id) on delete cascade,
    achievement_id  uuid not null references public.achievements(id) on delete cascade,
    unlocked_at     timestamptz default now(),
    unique (user_id, achievement_id)
);
create index if not exists idx_ua_user on public.user_achievements(user_id);

-- ---------- auto-create a profile row when a user signs up ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, email)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------- keep updated_at fresh on profiles ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
    for each row execute function public.touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- The anon key is safe in the browser precisely because these
-- policies restrict every row to its owner (auth.uid()).
-- ============================================================

alter table public.profiles              enable row level security;
alter table public.books                 enable row level security;
alter table public.chapters              enable row level security;
alter table public.user_chapter_progress enable row level security;
alter table public.notes                 enable row level security;
alter table public.highlights            enable row level security;
alter table public.quizzes               enable row level security;
alter table public.quiz_questions        enable row level security;
alter table public.quiz_attempts         enable row level security;
alter table public.quiz_answers          enable row level security;
alter table public.flashcards            enable row level security;
alter table public.bookmarks             enable row level security;
alter table public.achievements          enable row level security;
alter table public.user_achievements     enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
    for select using (auth.uid() = id);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
    for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
    for insert with check (auth.uid() = id);

-- books
drop policy if exists books_all on public.books;
create policy books_all on public.books
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chapters (via parent book)
drop policy if exists chapters_all on public.chapters;
create policy chapters_all on public.chapters
    for all using (exists (select 1 from public.books b where b.id = chapters.book_id and b.user_id = auth.uid()))
    with check (exists (select 1 from public.books b where b.id = chapters.book_id and b.user_id = auth.uid()));

-- user_chapter_progress
drop policy if exists ucp_all on public.user_chapter_progress;
create policy ucp_all on public.user_chapter_progress
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notes
drop policy if exists notes_all on public.notes;
create policy notes_all on public.notes
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- highlights
drop policy if exists highlights_all on public.highlights;
create policy highlights_all on public.highlights
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- quizzes (via chapter -> book)
drop policy if exists quizzes_all on public.quizzes;
create policy quizzes_all on public.quizzes
    for all using (exists (select 1 from public.chapters c join public.books b on b.id = c.book_id where c.id = quizzes.chapter_id and b.user_id = auth.uid()))
    with check (exists (select 1 from public.chapters c join public.books b on b.id = c.book_id where c.id = quizzes.chapter_id and b.user_id = auth.uid()));

-- quiz_questions (via quiz -> chapter -> book)
drop policy if exists qq_all on public.quiz_questions;
create policy qq_all on public.quiz_questions
    for all using (exists (select 1 from public.quizzes q join public.chapters c on c.id = q.chapter_id join public.books b on b.id = c.book_id where q.id = quiz_questions.quiz_id and b.user_id = auth.uid()))
    with check (exists (select 1 from public.quizzes q join public.chapters c on c.id = q.chapter_id join public.books b on b.id = c.book_id where q.id = quiz_questions.quiz_id and b.user_id = auth.uid()));

-- quiz_attempts
drop policy if exists qa_all on public.quiz_attempts;
create policy qa_all on public.quiz_attempts
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- quiz_answers (via attempt)
drop policy if exists qans_all on public.quiz_answers;
create policy qans_all on public.quiz_answers
    for all using (exists (select 1 from public.quiz_attempts a where a.id = quiz_answers.attempt_id and a.user_id = auth.uid()))
    with check (exists (select 1 from public.quiz_attempts a where a.id = quiz_answers.attempt_id and a.user_id = auth.uid()));

-- flashcards
drop policy if exists flashcards_all on public.flashcards;
create policy flashcards_all on public.flashcards
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- bookmarks
drop policy if exists bookmarks_all on public.bookmarks;
create policy bookmarks_all on public.bookmarks
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- achievements catalog (any logged-in user can read)
drop policy if exists achievements_read on public.achievements;
create policy achievements_read on public.achievements
    for select to authenticated using (true);

-- user_achievements
drop policy if exists ua_all on public.user_achievements;
create policy ua_all on public.user_achievements
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- seed achievements ----------
insert into public.achievements (name, description, icon) values
    ('First Chapter Completed', 'Complete your very first chapter.',  'flag'),
    ('First Quiz Passed',       'Pass your first chapter quiz.',      'check-circle'),
    ('Perfect Score',           'Score 100% on any quiz.',            'star'),
    ('3-Day Study Streak',      'Study on three consecutive days.',   'fire'),
    ('7-Day Study Streak',      'Study on seven consecutive days.',   'fire'),
    ('10 Chapters Completed',   'Complete ten chapters in total.',    'layers'),
    ('Book Completed',          'Finish every chapter of a book.',    'book'),
    ('Final Exam Passed',       'Pass a book''s final exam.',         'award')
on conflict (name) do nothing;
