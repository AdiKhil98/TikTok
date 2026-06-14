-- Run this in the Supabase SQL editor to set up the schema.
-- Project: tsrksyacegmnceypchyj

-- Reference media uploaded by the user (product photos, b-roll, etc.)
create table if not exists media_library (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text not null,
  public_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  tag text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists media_library_tag_idx on media_library (tag);
create index if not exists media_library_created_at_idx on media_library (created_at desc);

-- Generated scripts saved for later video production
create table if not exists script_generations (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  angle text not null,
  style text not null,
  language text not null,
  reference_media_id uuid references media_library(id) on delete set null,
  hooks jsonb not null,
  vo_script text not null,
  captions jsonb not null,
  luma_prompt text not null,
  hashtags jsonb not null,
  selected_hook_index int,
  created_at timestamptz not null default now()
);

create index if not exists script_generations_created_at_idx on script_generations (created_at desc);

-- Storage bucket for reference media + final videos.
-- Run these as separate statements in Supabase Storage UI or via SQL:
-- insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('videos', 'videos', true) on conflict do nothing;
