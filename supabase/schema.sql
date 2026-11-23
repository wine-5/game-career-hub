-- お気に入りの表。Supabase の SQL Editor でそのまま実行する。
-- 本人の行だけ読める・書ける（Row Level Security）。

create table if not exists public.favorites (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  opening_id text        not null,
  title      text        not null default '',
  company    text        not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, opening_id)
);

alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);
