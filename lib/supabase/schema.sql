-- ============================================================================
-- AetherDoc Studio — Official Supabase PostgreSQL Quickstart Schema
-- Author: keshav647 <keshavbudhiraja4321@gmail.com>
-- Paste into Supabase SQL Editor and click "Run"
-- ============================================================================

create table if not exists public.documents (
  id text primary key,
  tenant_id text not null default 'a0000000-0000-0000-0000-000000000001',
  title text not null default 'Untitled Document',
  file_name text not null default 'Untitled Document',
  file_url text default '/uploads/local.pdf',
  file_size bigint default 120000,
  document_type text not null default 'INVOICE',
  vendor_name text default 'Enterprise Entity',
  status text not null default 'review_required',
  page_count integer not null default 1,
  storage_path text default '/uploads/local.pdf',
  accuracy_rate numeric default 98.5,
  overall_confidence numeric default 0.985,
  processing_time_ms integer default 420,
  extraction_engine text default 'Local PDF.js Section Parser',
  raw_text text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure any existing public.documents table has all columns
alter table public.documents add column if not exists title text default 'Untitled Document';
alter table public.documents add column if not exists file_name text default 'Untitled Document';
alter table public.documents add column if not exists file_url text default '/uploads/local.pdf';
alter table public.documents add column if not exists file_size bigint default 120000;
alter table public.documents add column if not exists vendor_name text default 'Enterprise Entity';
alter table public.documents add column if not exists accuracy_rate numeric default 98.5;
alter table public.documents add column if not exists overall_confidence numeric default 0.985;
alter table public.documents add column if not exists processing_time_ms integer default 420;
alter table public.documents add column if not exists extraction_engine text default 'Local PDF.js Section Parser';
alter table public.documents add column if not exists raw_text text default '';

create table if not exists public.extracted_fields (
  id text primary key,
  document_id text references public.documents(id) on delete cascade,
  tenant_id text not null default 'a0000000-0000-0000-0000-000000000001',
  field_key text not null,
  label text not null default 'Extracted Field',
  field_label text not null default 'Extracted Field',
  field_value text not null default '',
  category text default 'Extracted Details',
  confidence numeric not null default 0.95,
  page_number integer not null default 1,
  bbox jsonb not null default '{"x":0.06,"y":0.12,"w":0.88,"h":0.14}',
  status text not null default 'verified',
  audited_by text,
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure any existing public.extracted_fields table has all columns
alter table public.extracted_fields add column if not exists label text default 'Extracted Field';
alter table public.extracted_fields add column if not exists field_label text default 'Extracted Field';
alter table public.extracted_fields add column if not exists category text default 'Extracted Details';
alter table public.extracted_fields add column if not exists bbox jsonb default '{"x":0.06,"y":0.12,"w":0.88,"h":0.14}';
alter table public.extracted_fields add column if not exists audited_by text;

alter table public.documents enable row level security;
alter table public.extracted_fields enable row level security;

drop policy if exists "Allow anon access to documents" on public.documents;
create policy "Allow anon access to documents" on public.documents
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow anon access to extracted_fields" on public.extracted_fields;
create policy "Allow anon access to extracted_fields" on public.extracted_fields
  for all to anon, authenticated using (true) with check (true);
