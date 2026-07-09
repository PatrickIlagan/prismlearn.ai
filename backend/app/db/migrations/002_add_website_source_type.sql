-- Migration 002: allow 'website' as a documents.source_type value.
--
-- Run ONCE in the Supabase SQL editor. Needed because the app added generic
-- website-link ingestion (extract_website in app/services/extractors.py) as
-- a fourth source type without this migration — any live database created
-- before this migration will reject every website ingest with a Postgres
-- check-constraint violation (23514) at the insert step, even though
-- ingestion itself succeeds. Safe to re-run.

alter table public.documents drop constraint if exists documents_source_type_check;
alter table public.documents add constraint documents_source_type_check
    check (source_type in ('pdf', 'pptx', 'youtube', 'website'));
