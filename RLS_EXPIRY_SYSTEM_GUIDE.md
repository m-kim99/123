# RLS 기반 세부 카테고리 만료 시스템

## 핵심 원칙

✅ **간단함**: 개별 문서에 만료일 저장하지 않음
✅ **성능**: RLS Policy에서 동적 체크 (인덱스 활용)
✅ **유지보수**: 세부 카테고리 만료일만 관리
✅ **일관성**: 카테고리 정책 변경 시 즉시 반영
✅ **표준**: SharePoint, Box 등 주요 DMS와 동일한 방식

## 시스템 동작 방식

### 만료 체크 흐름

```
사용자가 문서 조회 요청
    ↓
RLS Policy 실행
    ↓
해당 문서의 subcategory_id 확인
    ↓
subcategories.expiry_date 체크
    ↓
expiry_date < NOW() ? → 접근 차단 (RLS에서 필터링)
expiry_date >= NOW() 또는 NULL ? → 접근 허용
```

**핵심**: 문서 테이블에는 만료일이 없고, 조회 시마다 세부 카테고리의 만료일을 동적으로 체크합니다.

## 구현된 파일

### 1. 데이터베이스 마이그레이션

**파일 1**: `supabase/migrations/20241223_add_expiry_to_subcategories.sql`
- `subcategories.expiry_date` 컬럼 추가
- 만료일 조회 인덱스 생성

**파일 2**: `supabase/migrations/20241223_add_expiry_rls_policy.sql`
- 기존 RLS Policy 삭제
- 만료 체크 포함한 새 RLS Policy 생성
- 관리자와 팀원 모두 만료된 카테고리의 문서 접근 불가

### 2. TypeScript 코드

**파일**: `src/store/documentStore.ts`
- `Subcategory` 인터페이스에 `expiryDate` 필드 추가
- `addSubcategory`, `updateSubcategory`, `fetchSubcategories` 수정

### 3. 알림 시스템

**파일**: 
- `src/lib/notifications.ts`
- `src/store/notificationStore.ts`

알림 타입:
- `subcategory_expiring_soon`: ⚠️ 7일 이내 만료
- `subcategory_expiring_very_soon`: ⏰ 30일 이내 만료
- `subcategory_expired`: 🔒 만료됨 (접근 차단)

### 4. Edge Function

**파일**: `supabase/functions/check-expiring-subcategories/index.ts`

기능:
- 7일/30일 이내 만료 카테고리 알림
- 만료된 카테고리 알림
- 선택적 자동 삭제 (`AUTO_DELETE_EXPIRED` 플래그)

## 배포 가이드

### 1단계: 마이그레이션 실행

Supabase Dashboard → SQL Editor에서 순서대로 실행:

**1-1. expiry_date 컬럼 추가**:
```sql
-- 세부 카테고리에 만료일 추가
ALTER TABLE subcategories
ADD COLUMN IF NOT EXISTS expiry_date timestamptz;

COMMENT ON COLUMN subcategories.expiry_date IS '카테고리 만료일 (이 날짜 이후 내부 문서 접근 불가)';

-- 만료일 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_subcategories_expiry_date
  ON subcategories(expiry_date DESC)
  WHERE expiry_date IS NOT NULL;
```

**1-2. RLS Policy 업데이트**:
```sql
-- 기존 documents SELECT 정책 삭제
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;
DROP POLICY IF EXISTS "Team members can view their department documents" ON documents;

-- 관리자: 모든 문서 조회 가능 (만료 체크 포함)
CREATE POLICY "Admins can view all documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    AND (
      -- 세부 카테고리가 만료되지 않았거나, 만료일이 설정되지 않은 경우
      NOT EXISTS (
        SELECT 1 FROM subcategories
        WHERE subcategories.id = documents.subcategory_id
        AND subcategories.expiry_date IS NOT NULL
        AND subcategories.expiry_date < NOW()
      )
    )
  );

-- 팀원: 자기 부서 문서만 조회 가능 (만료 체크 포함)
CREATE POLICY "Team members can view their department documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    department_id = (
      SELECT department_id FROM users
      WHERE users.id = auth.uid()
    )
    AND (
      -- 세부 카테고리가 만료되지 않았거나, 만료일이 설정되지 않은 경우
      NOT EXISTS (
        SELECT 1 FROM subcategories
        WHERE subcategories.id = documents.subcategory_id
        AND subcategories.expiry_date IS NOT NULL
        AND subcategories.expiry_date < NOW()
      )
    )
  );
```

확인:
```sql
-- RLS Policy 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'documents';

-- expiry_date 컬럼 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subcategories' AND column_name = 'expiry_date';
```

### 2단계: Edge Function 배포

Supabase Dashboard → Edge Functions:

1. Function name: `check-expiring-subcategories`
2. 코드 붙여넣기 (전체 내용)
3. **Deploy function** 클릭

### 3단계: Cron Job 설정

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'check-expiring-subcategories',
  '0 9 * * *',  -- 매일 오전 9시 (KST 기준 오후 6시 UTC)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-expiring-subcategories',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      )
    ) AS request_id;
  $$
);
```

**중요**: 
- `YOUR_PROJECT_REF`: Dashboard → Settings → API → Project URL
- `YOUR_SERVICE_ROLE_KEY`: Dashboard → Settings → API → service_role key

## 사용 방법

### 세부 카테고리에 만료일 설정

```sql
-- 특정 카테고리에 만료일 설정
UPDATE subcategories 
SET expiry_date = '2025-12-31 23:59:59+00'::timestamptz
WHERE id = 'YOUR_SUBCATEGORY_ID';

-- 1년 후로 설정
UPDATE subcategories 
SET expiry_date = NOW() + INTERVAL '1 year'
WHERE id = 'YOUR_SUBCATEGORY_ID';

-- 3년 후로 설정
UPDATE subcategories 
SET expiry_date = NOW() + INTERVAL '3 years'
WHERE id = 'YOUR_SUBCATEGORY_ID';

-- 만료일 제거 (영구 보관)
UPDATE subcategories 
SET expiry_date = NULL
WHERE id = 'YOUR_SUBCATEGORY_ID';
```

### 만료 상태 조회

```sql
-- 만료 임박 카테고리 (30일 이내)
SELECT 
  s.name,
  s.expiry_date,
  EXTRACT(DAY FROM (s.expiry_date - NOW())) as days_until_expiry,
  (SELECT COUNT(*) FROM documents WHERE subcategory_id = s.id) as document_count
FROM subcategories s
WHERE s.expiry_date IS NOT NULL
  AND s.expiry_date > NOW()
  AND s.expiry_date <= NOW() + INTERVAL '30 days'
ORDER BY s.expiry_date;

-- 이미 만료된 카테고리
SELECT 
  s.name,
  s.expiry_date,
  EXTRACT(DAY FROM (NOW() - s.expiry_date)) as days_since_expired,
  (SELECT COUNT(*) FROM documents WHERE subcategory_id = s.id) as blocked_documents
FROM subcategories s
WHERE s.expiry_date IS NOT NULL
  AND s.expiry_date < NOW()
ORDER BY s.expiry_date DESC;
```

## 테스트 방법

### 테스트 1: RLS Policy 동작 확인

```sql
-- 1. 테스트용 세부 카테고리 만료일 설정 (이미 만료)
UPDATE subcategories 
SET expiry_date = NOW() - INTERVAL '1 day'
WHERE id = 'YOUR_SUBCATEGORY_ID';

-- 2. 해당 카테고리의 문서 조회 시도 (UI에서)
-- 결과: 문서가 보이지 않아야 함 (RLS에서 차단)

-- 3. 만료일 제거 또는 미래로 변경
UPDATE subcategories 
SET expiry_date = NOW() + INTERVAL '1 year'
WHERE id = 'YOUR_SUBCATEGORY_ID';

-- 4. 다시 조회
-- 결과: 문서가 다시 보여야 함
```

### 테스트 2: Edge Function 실행

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-expiring-subcategories' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

예상 응답:
```json
{
  "success": true,
  "message": "3개의 카테고리 만료 알림 생성",
  "expiringSoonCount": 1,
  "expiringLaterCount": 1,
  "expiredCount": 1,
  "notificationsCreated": 3,
  "notificationsSkipped": 0,
  "subcategoriesDeleted": 0
}
```

### 테스트 3: 알림 생성 확인

```sql
-- 만료 관련 알림 조회
SELECT 
  n.type,
  n.message,
  n.created_at,
  s.name as subcategory_name,
  s.expiry_date
FROM notifications n
JOIN subcategories s ON n.subcategory_id = s.id
WHERE n.type IN ('subcategory_expiring_soon', 'subcategory_expiring_very_soon', 'subcategory_expired')
ORDER BY n.created_at DESC
LIMIT 10;
```

## 자동 삭제 활성화 (선택 사항)

만료된 카테고리를 자동으로 삭제하려면:

Edge Function 코드에서:
```typescript
const AUTO_DELETE_EXPIRED = true; // false → true로 변경
```

**주의**: 
- 자동 삭제 시 CASCADE로 내부 문서도 함께 삭제됩니다
- 백업 없이 영구 삭제되므로 신중하게 결정하세요
- 프로덕션 환경에서는 백업 후 수동 삭제 권장

## 성능 최적화

### 인덱스 활용

RLS Policy는 다음 인덱스를 활용합니다:
```sql
-- 이미 생성됨
CREATE INDEX idx_subcategories_expiry_date
  ON subcategories(expiry_date DESC)
  WHERE expiry_date IS NOT NULL;
```

### 쿼리 성능 확인

```sql
-- RLS Policy 실행 계획 확인
EXPLAIN ANALYZE
SELECT * FROM documents
WHERE subcategory_id = 'SOME_ID';
```

## 문제 해결

### 문제 1: 만료된 문서가 여전히 보임

**원인**: RLS Policy가 제대로 적용되지 않음

**확인**:
```sql
-- RLS 활성화 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'documents';

-- Policy 확인
SELECT * FROM pg_policies WHERE tablename = 'documents';
```

**해결**: RLS Policy 재생성 (1단계 1-2 참조)

### 문제 2: 알림이 생성되지 않음

**확인**:
```sql
-- 만료 임박 카테고리 확인
SELECT * FROM subcategories
WHERE expiry_date IS NOT NULL
  AND expiry_date > NOW()
  AND expiry_date <= NOW() + INTERVAL '30 days';
```

**해결**: 
- 테스트용 카테고리 만료일 설정
- Edge Function 로그 확인 (Dashboard → Edge Functions → Logs)

### 문제 3: Cron Job이 실행되지 않음

```sql
-- Cron Job 상태 확인
SELECT * FROM cron.job WHERE jobname = 'check-expiring-subcategories';

-- 실행 이력 확인
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-expiring-subcategories')
ORDER BY start_time DESC LIMIT 10;
```

## 장점 요약

### 1. 데이터 중복 없음
- 문서 테이블에 만료일 저장 불필요
- 세부 카테고리에만 관리

### 2. 즉시 반영
- 카테고리 만료일 변경 시 모든 문서에 즉시 적용
- 별도 업데이트 쿼리 불필요

### 3. 성능 우수
- RLS Policy는 인덱스 활용
- 조회 시마다 계산하지만 인덱스로 최적화

### 4. 유지보수 간편
- 카테고리 단위 관리
- 문서별 개별 관리 불필요

### 5. 표준 방식
- SharePoint: 보존 정책 (Retention Policy)
- Box: 보존 정책 (Retention Policy)
- Google Drive: 보존 규칙 (Retention Rules)
- 모두 폴더/카테고리 단위로 만료 관리

## 참고 자료

- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [pg_cron Extension](https://github.com/citusdata/pg_cron)
