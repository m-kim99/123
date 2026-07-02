# 보안 감사 리포트 (Security Audit)

> 대상: Trayst Storage Connect — Supabase(Auth/DB/RLS) + Cloudflare R2 + Capacitor(모바일) + Supabase Edge Functions
> 작성: 코드베이스 정적 분석 기반. "운영 DB 실제 상태"는 일부 추정이며 ✅ 표시된 검증 쿼리로 확인 필요.

---

## 0. 요약 — 우선순위 보드

| # | 항목 | 심각도 | 상태 |
|---|------|--------|------|
| 1 | R2 액세스 키/시크릿이 프론트엔드 번들에 노출 | 🔴 치명 | 미해결 |
| 2 | `data.sql` 운영 데이터 덤프가 git에 커밋됨 | 🔴 치명 | 미해결 |
| 3 | `get-gemini-key`가 인증 사용자에게 원본 API 키를 그대로 반환 | 🟠 높음 | 미해결 |
| 4 | RLS 운영 적용 여부 미검증 (`apply_rls_policies.sql` 수동 적용) | 🟠 높음 | 검증 필요 |
| 5 | `.env.production.txt`로 시크릿 커밋 우회 패턴 | 🟡 중간 | 미해결 |
| 6 | `GRANT ALL ... TO anon` (구독/사용량 테이블) | 🟡 중간 | 하드닝 |
| 7 | `send-push-notification`: 호출자 토큰 소유권 미검증 | 🟡 중간 | 미해결 |
| 8 | 보안 헤더(CSP/HSTS/X-Frame-Options 등) 부재 | 🟡 중간 | 미해결 |
| 9 | Edge Function CORS `Allow-Origin: *` 전역 허용 | 🟢 낮음 | 하드닝 |

---

## 1. 🔴 R2 자격증명 프론트엔드 노출 (최우선)

**위치:** `src/lib/r2.ts:3-16`

```ts
const R2_ACCESS_KEY = import.meta.env.VITE_R2_ACCESS_KEY;
const R2_SECRET_KEY = import.meta.env.VITE_R2_SECRET_KEY;
const r2Client = new S3Client({ ... credentials: { accessKeyId, secretAccessKey } });
```

**문제:** `VITE_` 접두사 환경변수는 빌드 시 JS 번들에 평문으로 박힌다. 웹 개발자도구 또는 앱(.apk/.ipa) 디컴파일로 키를 추출하면 **버킷 전체 읽기/쓰기/삭제**가 가능하다. 이미 배포된 빌드가 있다면 키는 유출된 것으로 간주해야 한다.

**근본 해결 (실무 표준):**
1. R2 키를 클라이언트에서 제거 → **Edge Function 시크릿**으로 이전.
2. 업로드: Edge Function이 **presigned PUT URL**(짧은 만료, 경로 제한) 발급 → 클라이언트는 그 URL로만 업로드.
3. 삭제/다운로드도 서버 경유 또는 presigned로 처리. 버킷은 비공개.
4. **현재 키 즉시 폐기 후 재발급(rotate).**

**검증:** 새 빌드 후 `dist/` 번들을 `grep -ri "r2.cloudflarestorage\|secretAccessKey"` 했을 때 키가 안 나와야 함.

---

## 2. 🔴 운영 데이터 덤프 git 커밋

**위치:** `data.sql` (398KB), 일부 `schema.sql`

`data.sql`은 `pg_dump` 결과로 `companies` 등 실제 운영 테이블 데이터(회사명, 코드 등)를 포함한다. `users`/이메일/사업자정보 등 개인정보가 포함될 경우 **git 히스토리에 영구 잔류**한다.

**해결:**
1. `data.sql`(필요시 `schema.sql`)을 `.gitignore`에 추가하고 트래킹 해제.
2. 이미 커밋된 민감 데이터는 **git 히스토리에서 제거**(`git filter-repo` 등) 후 강제 푸시 — 협업자와 사전 조율 필요.
3. 개인정보가 포함됐다면 유출 범위 평가(개인정보보호법 관점).

---

## 3. 🟠 Gemini API 키 원본 반환

**위치:** `supabase/functions/get-gemini-key/index.ts:47`

인증만 통과하면 **원본 `GEMINI_API_KEY`를 클라이언트에 그대로 반환**한다. 로그인한 누구나 키를 추출해 자유롭게 외부에서 사용/남용할 수 있고, 비용 폭탄·할당량 소진 위험이 있다.

**해결:** 키를 내려주지 말고 **AI 호출 자체를 Edge Function이 프록시**(`ai-chat` 함수처럼 서버에서 호출하고 결과만 반환). 이미 `ai-chat`가 서버 측 호출 패턴이므로 Gemini 경로도 동일하게 통합.

---

## 4. 🟠 RLS 운영 적용 검증 필요

**위치:** `apply_rls_policies.sql` (SQL Editor 수동 실행 방식)

정책 설계 자체는 양호(관리자/부서/`user_permissions` 역할 기반). 그러나 "수동 실행"이라 **운영 DB 실제 적용 보장이 없고**, 과거 `users` SELECT 정책이 `USING(true)`(전체 공개)와 충돌한 이력이 있다.

**검증 쿼리 (Supabase SQL Editor에서 실행):**
```sql
-- (a) RLS 미활성 테이블 탐지
SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity=false;

-- (b) 개방형(USING true / WITH CHECK true) 정책 탐지
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND (qual='true' OR with_check='true' OR policyname ILIKE 'anyone%');
```
**조치:** (a) 결과가 있으면 RLS 활성화, (b)의 개방형 정책 제거. 정책은 migration 파일로 관리해 재현 가능하게.

---

## 5. 🟡 `.env.production.txt` 시크릿 커밋 우회

**위치:** `.env.production.txt`

`.gitignore`는 `.env*`를 막지만 `.txt` 확장자로 **우회 커밋**됨. 현재 담긴 값(anon key, Naver client id)은 공개돼도 되는 값이지만, **시크릿을 .txt로 보관하는 패턴 자체**가 R2/토스/PayApp 시크릿 유출로 이어질 수 있다.

**해결:** `.gitignore`에 `.env.production.txt` 추가, 트래킹 해제. 진짜 시크릿은 배포 플랫폼(Netlify/Vercel) 환경변수 + Supabase Secrets로만 관리.

---

## 6. 🟡 `GRANT ALL ... TO anon` (심층방어 약점)

**위치:** `supabase/migrations/20250520000001_add_subscription_tables.sql:219-229`

`plans / subscriptions / usage_tracking` 테이블에 `GRANT ALL TO anon`. 해당 테이블은 RLS가 켜져 있어(같은 파일 186-214행) 실제 무단 쓰기는 막히지만, **테이블 권한 자체가 과도**하다. RLS 정책 실수 시 곧장 구멍이 된다.

**해결:** 최소권한으로 축소 — `plans`는 `GRANT SELECT TO anon`, `subscriptions/usage_tracking`은 anon GRANT 제거(authenticated만). 쓰기는 service_role(Edge Function) 경로로.

---

## 7. 🟡 푸시 발송 토큰 소유권 미검증

**위치:** `supabase/functions/send-push-notification/index.ts:123-139`

인증된 사용자가 임의 `playerIds`(FCM 토큰) + `title/message`를 보내면 그대로 발송된다. 호출자가 **해당 토큰의 소유자/수신 대상인지 확인하지 않으므로**, 토큰을 아는 공격자가 임의 푸시(피싱 메시지 등)를 보낼 수 있다.

**해결:** 클라이언트가 토큰 배열을 직접 넘기지 말고, **수신 대상(회사/부서/유저 ID)만 전달** → service_role로 서버가 토큰을 조회·발송. 발신자 권한(같은 회사/관리자)도 서버에서 검증. (메모리상 send 구조 개편 과제와 일치)

---

## 8. 🟡 보안 헤더 부재

**위치:** `nginx.conf`, `netlify.toml`, `vercel.json` — CSP/HSTS/X-Frame-Options/X-Content-Type-Options/Referrer-Policy 없음.

**해결 (예: nginx):**
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
# CSP는 Supabase/R2/FCM 도메인 허용 목록 작성 후 점진 적용
```
Netlify/Vercel은 동일 헤더를 `[[headers]]` / `headers`로 추가.

---

## 9. 🟢 Edge Function CORS 전역 허용

모든 함수가 `Access-Control-Allow-Origin: *`. 인증 헤더 기반 함수라 즉각적 위험은 낮으나, 운영 도메인 화이트리스트로 좁히는 것을 권장.

---

## 양호한 점 (유지)
- `signIn`/`getCurrentUser`가 users 조회 실패 시 **fail-closed**(기본 role 폴백 없음) — `src/lib/auth.ts:54-63`.
- service_role 키는 **Edge Function 서버 측에서만** 사용, 클라이언트 미노출.
- 결제 확인 함수에 `CUSTOMER_KEY_MISMATCH` 검증 존재.
- Supabase 미설정 시 Proxy로 명확한 에러 — `src/lib/supabase.ts:27-34`.
- `dangerouslySetInnerHTML`은 shadcn 차트의 정적 테마 CSS 1곳뿐(사용자 입력 없음) — XSS 위험 낮음.

---

## 적용 현황 (2026-07-01 코드 반영)

| # | 항목 | 코드 조치 | 파일 |
|---|------|-----------|------|
| 1 | R2 키 노출 | ✅ presigned URL 방식 전환, 클라이언트 키 제거 | `src/lib/r2.ts`, `supabase/functions/r2-presign/` |
| 2 | data.sql 커밋 | ✅ gitignore + 인덱스 제거 | `.gitignore` |
| 3 | Gemini 키 반환 | ✅ 30분·단회 임시 토큰 발급으로 변경 | `get-gemini-key`, `src/hooks/useGeminiLive.ts` |
| 4 | RLS 검증 | ✅ 진단 쿼리 스크립트 작성 | `supabase/rls_verification.sql` |
| 5 | .env.production.txt | ✅ gitignore + 인덱스 제거 | `.gitignore` |
| 6 | GRANT anon 과다 | ✅ 축소 마이그레이션 작성 | `supabase/migrations/20260701000000_tighten_grants.sql` |
| 7 | 푸시 토큰 소유권 | ✅ 서버(service_role) 대상 조회 + 발신자 회사 검증 | `send-push-notification`, `src/lib/notifications.ts`, `src/lib/pushNotifications.ts` |
| 8 | 보안 헤더 | ✅ nginx/netlify/vercel 추가 | `nginx.conf`, `netlify.toml`, `vercel.json` |
| 9 | CORS `*` | ⏸️ 코드 미변경(모바일 비표준 Origin 깨짐 위험 + 토큰 인증이라 이득 낮음) | — |

## 적용 현황 (2026-07-02 2차 — 개방형 RLS/GRANT 정리)

라이브 DB 점검에서 추가 발견 → `supabase/migrations/20260702000000_rls_hardening.sql`:

| 대상 | 문제 | 조치 |
|------|------|------|
| `phone_verifications` | anon/authenticated 전체 GRANT (OTP 해시 공개) | 클라 롤 REVOKE, service_role 전용 정책 |
| `payapp_pending_rebills` | anon/authenticated 전체 GRANT (결제 데이터 공개) | 클라 롤 REVOKE, service_role 전용 정책 |
| `notifications` | anon GRANT + INSERT `WITH CHECK(true)` | anon REVOKE, 삽입을 같은 회사로 제한 |
| `user_device_tokens` | SELECT `USING(true)` (전 유저 토큰 노출) | 본인 토큰만 SELECT |
| `users` | SELECT `USING(true)` (전 회사 유저 노출) | 본인/같은회사/운영자만 SELECT (+`auth_company_id()` 헬퍼로 재귀 회피) |

> `companies`(name/code만, 회원가입 조회용)와 `plans`/`system_notices` 공개 정책은 의도된 것이라 유지.

## ⚠️ 배포 후 필수 수동 조치 (코드만으로는 완료 안 됨)

1. **R2 키 rotate + Edge 시크릿 설정**
   - 노출된 R2 키를 Cloudflare에서 폐기·재발급.
   - `supabase secrets set R2_ACCOUNT_ID=... R2_ACCESS_KEY=... R2_SECRET_KEY=... R2_BUCKET=...`
   - `supabase functions deploy r2-presign`
   - R2 버킷 CORS에 웹 도메인 PUT 허용(브라우저 업로드용). 네이티브만 쓰면 생략 가능.
2. **Gemini 임시 토큰 함수 재배포 + 음성기능 테스트**
   - `supabase functions deploy get-gemini-key`
   - 음성 모드 연결 확인(임시 토큰 미지원 키면 실패 → 키 형식 점검).
3. **푸시 함수 재배포 + 발송 테스트**
   - `supabase functions deploy send-push-notification`
   - `SUPABASE_SERVICE_ROLE_KEY` 시크릿 설정 확인. 문서 업로드→푸시 수신 확인.
4. **DB 마이그레이션 적용**
   - `supabase db push` 또는 SQL Editor에서 `20260701000000_tighten_grants.sql` 실행.
   - `rls_verification.sql`로 (a)~(d) 점검, 개방형 정책 있으면 제거.
5. **git 히스토리 정리** (과거 커밋에 남은 `data.sql`/`.env.production.txt`)
   - `git filter-repo --path data.sql --path .env.production.txt --invert-paths` 후 강제 푸시.
   - 협업자 사전 조율 필요(히스토리 재작성).
   - `data.sql`에 PII 포함 시 유출 범위 평가.

## 권장 처리 순서
1. **#1 R2 키 차단 + 키 rotate** (가장 위험, 즉시)
2. **#2 data.sql 히스토리 제거**
3. **#3 Gemini 키 프록시화**
4. **#4 RLS 운영 검증**
5. #5~#9 하드닝

> 다음 단계: 위 순서대로 실제 코드/마이그레이션 작업을 진행하면 됩니다. 어느 항목부터 착수할지 알려주세요.
