-- Migration 001: split single-document workspaces into containers + documents.
--
-- Run ONCE in the Supabase SQL editor on a database created with the ORIGINAL
-- schema (where workspaces held source_type + reviewer directly). It is safe to
-- re-run: the data copy is guarded so it won't duplicate or error after the old
-- columns are dropped. Fresh databases should just run schema.sql instead.

-- 1. documents table --------------------------------------------------------
create table if not exists public.documents (
    id           text primary key,
    workspace_id text not null references public.workspaces (id) on delete cascade,
    title        text not null,
    source_type  text not null check (source_type in ('pdf', 'pptx', 'youtube')),
    reviewer     jsonb not null,
    mode         text not null default 'learn' check (mode in ('learn', 'review')),
    created_at   timestamptz not null default now()
);

create index if not exists documents_workspace_id_idx on public.documents (workspace_id);

-- 2. copy each old single-document workspace into a document (guarded so it is
--    a no-op once the legacy columns have been dropped) ---------------------
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'workspaces'
          and column_name = 'reviewer'
    ) then
        insert into public.documents (id, workspace_id, title, source_type, reviewer, mode, created_at)
        select gen_random_uuid()::text, w.id, w.title, w.source_type, w.reviewer, 'learn', w.created_at
        from public.workspaces w
        where w.reviewer is not null
          and not exists (select 1 from public.documents d where d.workspace_id = w.id);
    end if;
end $$;

-- 3. drop the now-migrated columns from the container ----------------------
alter table public.workspaces drop column if exists reviewer;
alter table public.workspaces drop column if exists source_type;

-- 4. RLS for documents (owner = owner of the parent workspace) --------------
alter table public.documents enable row level security;

drop policy if exists documents_owner on public.documents;
create policy documents_owner on public.documents
    for all
    using (
        exists (
            select 1 from public.workspaces w
            where w.id = documents.workspace_id
              and w.user_id = auth.jwt() ->> 'sub'
        )
    )
    with check (
        exists (
            select 1 from public.workspaces w
            where w.id = documents.workspace_id
              and w.user_id = auth.jwt() ->> 'sub'
        )
    );
