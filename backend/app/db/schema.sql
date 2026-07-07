-- PrismLearning.AI — Supabase schema + Row Level Security
-- Run in the Supabase SQL editor. user_id holds the Clerk user id (text).

create extension if not exists "pgcrypto";

-- ── workspaces ──────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
    id          text primary key,
    user_id     text not null,
    title       text not null,
    source_type text not null check (source_type in ('pdf', 'pptx', 'youtube')),
    reviewer    jsonb not null,
    created_at  timestamptz not null default now()
);

create index if not exists workspaces_user_id_idx on public.workspaces (user_id);

-- ── flashcards ──────────────────────────────────────────────────────────────
create table if not exists public.flashcards (
    id           text primary key,
    workspace_id text not null references public.workspaces (id) on delete cascade,
    front        text not null,
    back         text not null,
    anchor_id    text,
    created_at   timestamptz not null default now()
);

create index if not exists flashcards_workspace_id_idx on public.flashcards (workspace_id);

-- ── player_profiles (gamification: XP, streak, daily quests) ─────────────────
create table if not exists public.player_profiles (
    user_id     text primary key,
    xp          integer not null default 0,
    streak      integer not null default 0,
    last_active text not null default '',        -- YYYY-MM-DD
    quests      jsonb not null default '{}'::jsonb, -- date -> {questId -> done}
    updated_at  timestamptz not null default now()
);

-- ── concept_mastery (per workspace + concept) ────────────────────────────────
create table if not exists public.concept_mastery (
    workspace_id text not null references public.workspaces (id) on delete cascade,
    anchor_id    text not null,
    strength     integer not null default 0 check (strength between 0 and 100),
    strikes      integer not null default 0,
    mastered     boolean not null default false,
    updated_at   timestamptz not null default now(),
    primary key (workspace_id, anchor_id)
);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- A user may only touch rows tied to their own Clerk id. With Clerk↔Supabase
-- JWT integration, auth.jwt()->>'sub' is the Clerk user id. The backend uses the
-- service-role key (which bypasses RLS) and additionally filters by user_id in
-- code, so these policies protect any direct client access.
alter table public.workspaces enable row level security;
alter table public.flashcards enable row level security;
alter table public.player_profiles enable row level security;
alter table public.concept_mastery enable row level security;

drop policy if exists workspaces_owner on public.workspaces;
create policy workspaces_owner on public.workspaces
    for all
    using (user_id = auth.jwt() ->> 'sub')
    with check (user_id = auth.jwt() ->> 'sub');

drop policy if exists flashcards_owner on public.flashcards;
create policy flashcards_owner on public.flashcards
    for all
    using (
        exists (
            select 1 from public.workspaces w
            where w.id = flashcards.workspace_id
              and w.user_id = auth.jwt() ->> 'sub'
        )
    )
    with check (
        exists (
            select 1 from public.workspaces w
            where w.id = flashcards.workspace_id
              and w.user_id = auth.jwt() ->> 'sub'
        )
    );

drop policy if exists player_profiles_owner on public.player_profiles;
create policy player_profiles_owner on public.player_profiles
    for all
    using (user_id = auth.jwt() ->> 'sub')
    with check (user_id = auth.jwt() ->> 'sub');

drop policy if exists concept_mastery_owner on public.concept_mastery;
create policy concept_mastery_owner on public.concept_mastery
    for all
    using (
        exists (
            select 1 from public.workspaces w
            where w.id = concept_mastery.workspace_id
              and w.user_id = auth.jwt() ->> 'sub'
        )
    )
    with check (
        exists (
            select 1 from public.workspaces w
            where w.id = concept_mastery.workspace_id
              and w.user_id = auth.jwt() ->> 'sub'
        )
    );
