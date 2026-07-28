-- ============================================================
-- Migration: 입출고(보관 라이프사이클) 기능을 프로 플랜 이상으로 제한
-- 날짜: 2026-07-28
-- 배경: 반출/반납/폐기·입출고 이력은 프로 이상 전용 기능으로 전환한다.
--   무료 체험(status='trialing')은 pro 플랜이 부여되므로 자동 이용 가능.
--   기존 feature_ai_chat 패턴(plans의 boolean 컬럼)을 그대로 따른다.
-- 강제 지점: (1) storage_events INSERT RLS (2) subcategories 상태 전이 트리거
--   UI 숨김만으로는 우회 가능하므로 DB에서도 막는다.
-- ============================================================

-- ------------------------------------------------------------
-- 1) plans.feature_storage_lifecycle — 단일 진실 소스
--    free/basic = false, pro/enterprise = true
-- ------------------------------------------------------------
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS feature_storage_lifecycle boolean NOT NULL DEFAULT false;

UPDATE public.plans SET feature_storage_lifecycle = true  WHERE name IN ('pro', 'enterprise');
UPDATE public.plans SET feature_storage_lifecycle = false WHERE name IN ('free', 'basic');

-- ------------------------------------------------------------
-- 2) 회사 단위 판정 함수
--    subscriptions RLS가 자사로 스코프돼 트리거 컨텍스트에서 안 보이므로 SECURITY DEFINER.
--    유효 구독(active/trialing + 기간 미경과)이 없으면 false.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.company_has_storage_lifecycle(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.feature_storage_lifecycle
      FROM public.subscriptions s
      JOIN public.plans p ON p.id = s.plan_id
      WHERE s.company_id = p_company_id
        AND s.status IN ('active', 'trialing')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.company_has_storage_lifecycle(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.company_has_storage_lifecycle(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 3) storage_events INSERT: 기존 권한 조건 + 플랜 조건
--    (company_id 는 클라이언트가 auth_company_id() 와 동일 값으로 넣는다)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "storage_events_insert" ON public.storage_events;
CREATE POLICY "storage_events_insert"
  ON public.storage_events FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_company_id()
    AND public.company_has_storage_lifecycle(company_id)
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'admin'
      )
      OR department_id = (SELECT department_id FROM users WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
          AND department_id = storage_events.department_id
          AND role IN ('editor', 'manager')
      )
    )
  );

-- ------------------------------------------------------------
-- 4) subcategories 상태 전이 트리거
--    반출(checked_out)/폐기(disposed) 진입은 프로 이상에서만.
--    반납(→ 'stored')은 플랜과 무관하게 허용 — 플랜 강등 시 남은 반출건을
--    정리할 경로를 남겨두기 위함(잠금 방지).
--    [주의] subcategories.company_id 는 현재 INSERT 시 채워지지 않아 NULL 인 행이 많다.
--    부서를 통해 회사를 해석하고, 그래도 특정 불가하면 오탐 방지를 위해 통과시킨다.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_storage_lifecycle_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF NEW.storage_status IS NOT DISTINCT FROM OLD.storage_status
     OR NEW.storage_status = 'stored' THEN
    RETURN NEW;
  END IF;

  v_company_id := COALESCE(
    NEW.company_id,
    (SELECT d.company_id FROM public.departments d WHERE d.id = NEW.department_id)
  );

  IF v_company_id IS NOT NULL AND NOT public.company_has_storage_lifecycle(v_company_id) THEN
    RAISE EXCEPTION 'PLAN_STORAGE_LIFECYCLE_REQUIRED: 입출고 관리는 프로 플랜 이상에서 사용할 수 있습니다.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_storage_lifecycle_plan ON public.subcategories;
CREATE TRIGGER trg_enforce_storage_lifecycle_plan
  BEFORE UPDATE ON public.subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_storage_lifecycle_plan();
