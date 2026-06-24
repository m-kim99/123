-- 다중 기기 푸시 지원: 사용자당 여러 기기 토큰 저장
--  - 기존 users.push_id(단일 컬럼)는 한 사용자가 한 기기만 받을 수 있어,
--    같은 계정으로 여러 기기 로그인 시 토큰이 서로 덮어써졌다.
--  - user_device_tokens 테이블로 분리해 기기별 토큰을 누적 저장한다.
--  - token은 전역 유니크(기기 1대 = 토큰 1개). 기기 소유자가 바뀌면 upsert로 user_id 갱신.

create table if not exists public.user_device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  token      text not null,
  platform   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_device_tokens_token_key unique (token)
);

create index if not exists idx_user_device_tokens_user_id
  on public.user_device_tokens (user_id);

-- PostgREST 접근 권한 (RLS와 별개로 테이블 GRANT 필요)
grant select, insert, update, delete on public.user_device_tokens to authenticated;
grant all on public.user_device_tokens to service_role;

alter table public.user_device_tokens enable row level security;

-- 본인 토큰만 추가/수정/삭제
drop policy if exists "own_device_tokens_insert" on public.user_device_tokens;
create policy "own_device_tokens_insert" on public.user_device_tokens
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own_device_tokens_update" on public.user_device_tokens;
create policy "own_device_tokens_update" on public.user_device_tokens
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_device_tokens_delete" on public.user_device_tokens;
create policy "own_device_tokens_delete" on public.user_device_tokens
  for delete to authenticated using (auth.uid() = user_id);

-- 발송 대상 토큰 수집을 위해 인증 사용자는 조회 허용
-- (기존 users 테이블 SELECT 정책이 USING(true)라 동일한 노출 수준)
drop policy if exists "device_tokens_select" on public.user_device_tokens;
create policy "device_tokens_select" on public.user_device_tokens
  for select to authenticated using (true);

-- 기존 users.push_id 토큰 이관
insert into public.user_device_tokens (user_id, token)
select id, push_id from public.users
where push_id is not null and length(push_id) > 0
on conflict (token) do nothing;
