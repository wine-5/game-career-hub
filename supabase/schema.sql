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

-- 選考の記録。1 行 = 1 社への 1 つの応募（同じ会社に新卒とインターンで 2 行になることもある）。
-- steps: 選考の流れ [{ "name": "一次面接", "date": "2027-03-10", "done": false }]
-- documents: 出した書類 [{ "kind": "ES", "title": "...", "date": "2027-03-01", "url": "...", "note": "..." }]
create table if not exists public.applications (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  company_id   text        not null,
  company_name text        not null default '',
  kind         text        not null default 'newgrad',   -- newgrad / internship / other
  title        text        not null default '',
  outcome      text        not null default 'active',    -- active / offer / rejected / declined
  steps        jsonb       not null default '[]'::jsonb,
  documents    jsonb       not null default '[]'::jsonb,
  memo         text        not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists applications_user_idx on public.applications (user_id);

alter table public.applications enable row level security;

drop policy if exists "applications_all_own" on public.applications;
create policy "applications_all_own" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 新しい表を API に自動で公開しない設定のプロジェクトでも使えるように、ログインした人に権限を渡す
-- （どの行を読めるかは上の RLS で本人の行だけに絞っている）
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
