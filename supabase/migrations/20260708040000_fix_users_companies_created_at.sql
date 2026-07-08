-- =============================================
-- users / companies created_at 1970-01-01 표시 버그 수정
-- 근본 원인: 두 컬럼 모두 DEFAULT 값이 없고, 회원가입 트리거(handle_new_user)와
-- 회사 생성 코드(authStore.ts)가 created_at을 지정하지 않아 NULL로 저장됨.
-- 프론트엔드에서 new Date(null) -> 1970-01-01(epoch)로 렌더링되어 발생.
-- =============================================

-- 1. 앞으로 생성되는 모든 row가 자동으로 현재 시각을 갖도록 DEFAULT 추가
--    (컬럼이 INSERT 문에서 생략되면 DEFAULT가 적용되므로,
--     handle_new_user 트리거/authStore.ts/naver-oauth-callback 등
--     모든 기존 INSERT 경로를 수정하지 않아도 근본적으로 해결됨)
ALTER TABLE public.users ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.companies ALTER COLUMN created_at SET DEFAULT now();

-- 2. 기존 NULL 데이터 백필
--    2-1) users: Supabase Auth의 auth.users.created_at은 가입 시점에 항상 기록되므로
--         이를 신뢰할 수 있는 원본 값으로 사용해 복원
UPDATE public.users u
SET created_at = au.created_at
FROM auth.users au
WHERE u.id = au.id
  AND u.created_at IS NULL;

--    2-2) auth.users에도 없는 극히 예외적인 경우 -> 현재 시각으로 채움
UPDATE public.users
SET created_at = now()
WHERE created_at IS NULL;

--    2-3) companies: 정확한 생성 시점을 알 수 없으므로,
--         해당 회사에 속한 사용자 중 가장 오래된 created_at으로 근사값 백필
UPDATE public.companies c
SET created_at = sub.min_created
FROM (
  SELECT company_id, MIN(created_at) AS min_created
  FROM public.users
  WHERE company_id IS NOT NULL AND created_at IS NOT NULL
  GROUP BY company_id
) sub
WHERE c.id = sub.company_id
  AND c.created_at IS NULL;

--    2-4) 연결된 사용자가 전혀 없는 회사(고아 레코드) -> 현재 시각으로 채움
UPDATE public.companies
SET created_at = now()
WHERE created_at IS NULL;
