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

-- ── Row Level Security ──────────────────────────────────────────────────────
-- A user may only touch rows tied to their own Clerk id. With Clerk↔Supabase
-- JWT integration, auth.jwt()->>'sub' is the Clerk user id. The backend uses the
-- service-role key (which bypasses RLS) and additionally filters by user_id in
-- code, so these policies protect any direct client access.
alter table public.workspaces enable row level security;
alter table public.flashcards enable row level security;

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
