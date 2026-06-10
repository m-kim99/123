# TrayStorage 아키텍처 문서

> 이 문서는 AI 코딩 어시스턴트가 디버깅 시 참조하기 위한 구조 문서입니다.
> 프로젝트의 모듈 관계, 데이터 흐름, **암묵적 의존성**을 기록합니다.

## 1. 기술 스택

| 계층 | 기술 |
|------|------|
| 프레임워크 | React 18 + TypeScript, Vite |
| 라우팅 | react-router-dom v6 (BrowserRouter) |
| 상태관리 | Zustand (6개 store) |
| UI | Tailwind CSS + shadcn/ui + Lucide icons |
| 백엔드 | Supabase (Auth, DB, Realtime, RLS) |
| 파일저장 | Cloudflare R2 (S3 호환 API) |
| 네이티브 | Capacitor (iOS/Android) |
| 다국어 | react-i18next (ko/en/ja/zh) |

## 2. 디렉터리 구조

```
src/
├── App.tsx              ← 라우팅, 세션 체크, 라우트 가드 (진입점)
├── main.tsx             ← React 마운트
├── store/               ← Zustand 스토어 6개
│   ├── authStore.ts         사용자 인증/세션
│   ├── documentStore.ts     문서/부서/카테고리 CRUD
│   ├── favoriteStore.ts     즐겨찾기/최근방문
│   ├── notificationStore.ts 알림 + Realtime 구독
│   ├── operatorStore.ts     운영자 콘솔 전용
│   └── themeStore.ts        다크모드
├── lib/                 ← 유틸리티/서비스
│   ├── supabase.ts          Supabase 클라이언트 (싱글턴)
│   ├── r2.ts                R2 파일 업로드/삭제
│   ├── subscription.ts      구독 플랜 제한 체크
│   ├── notifications.ts     알림 생성 헬퍼
│   ├── chatbot.ts           AI 챗봇 로직
│   ├── nfc.ts / nfcApi.ts   NFC 태그 읽기/쓰기
│   ├── ocr.ts               OCR 처리
│   ├── appBridge.ts         네이티브 앱 브릿지
│   └── analytics.ts         이벤트 트래킹
├── components/          ← 공유 컴포넌트
│   ├── DashboardLayout.tsx  사용자 앱 레이아웃 (사이드바/검색)
│   ├── OperatorLayout.tsx   운영자 콘솔 레이아웃
│   ├── AIChatbot.tsx        AI 챗봇 FAB
│   ├── PdfViewer.tsx        PDF 뷰어
│   └── ui/                  shadcn/ui 컴포넌트
├── pages/               ← 페이지 컴포넌트
│   ├── LoginPage.tsx / SignupPage.tsx / OnboardingPage.tsx
│   ├── AdminDashboard.tsx / TeamDashboard.tsx
│   ├── DocumentManagement.tsx
│   ├── operator/            운영자 콘솔 페이지 7개
│   └── ...
└── types/               ← TypeScript 타입 정의
```

## 3. 사용자 역할 및 라우팅

| 역할 | 경로 접두사 | 라우트 가드 | 레이아웃 |
|------|-----------|-----------|---------|
| admin (관리자) | `/admin/*` | `ProtectedRoute(requiredRole='admin')` | `DashboardLayout` |
| team (팀원) | `/team/*` | `ProtectedRoute(requiredRole='team')` | `DashboardLayout` |
| operator (운영자) | `/operator/*` | `OperatorProtectedRoute` | `OperatorLayout` |

- 관리자/팀원은 `authStore`로 인증, 운영자는 `operatorStore`로 인증
- `/` (루트)는 `RootRoute`에서 인증 상태에 따라 로그인 또는 대시보드로 분기
- `/*` 와일드카드는 `/`로 리다이렉트

## 4. Zustand 스토어 의존 관계

```
authStore ◄──────── documentStore   (useAuthStore.getState()로 user 참조)
    ▲                    │
    │                    ├── lib/notifications.ts (알림 생성)
    │                    ├── lib/r2.ts (파일 업로드)
    │                    └── lib/subscription.ts (제한 체크)
    │
    ├──────── favoriteStore     (user.id 참조)
    ├──────── notificationStore (user.id, user.companyId 참조)
    ├──────── themeStore        (user.id로 테마 DB 저장)
    │
    │  [독립]
    └── operatorStore           (authStore와 직접 의존 없음)

주의: authStore와 operatorStore는 서로 import하지 않지만,
      같은 Supabase Auth 세션을 공유함 (→ 암묵적 의존성 #1)
```

## 5. 암묵적 의존성 목록

> **암묵적 의존성**: import나 직접 호출이 없지만 런타임에서 서로 영향을 주는 관계.
> 코드 검색으로 발견하기 어려우며, 디버깅 시 반드시 확인해야 함.

### 5.1 Supabase Auth 이벤트 체인

**관련 파일**: `App.tsx`, `authStore.ts`, `operatorStore.ts`

```
[사용자 로그인]
authStore.login() → supabase.auth.signInWithPassword()
                         │
                         ▼ (Supabase SDK 내부 이벤트)
App.tsx: onAuthStateChange('SIGNED_IN')
                         │
                         ▼ (경로 기반 분기)
    /operator/* → operatorStore.checkOperatorSession()
    그 외       → authStore.checkSession()

[운영자 로그인]
operatorStore.operatorLogin() → supabase.auth.signInWithPassword()
                                     │
                                     ▼ (동일한 이벤트)
                              App.tsx: onAuthStateChange('SIGNED_IN')
                                     │
                                     ▼
                              경로가 /operator → checkOperatorSession()만 실행
```

- `operatorStore.ts`는 `authStore.ts`를 import하지 않음
- 둘을 연결하는 건 **Supabase의 onAuthStateChange 이벤트** (App.tsx에서 구독)
- **Supabase Auth는 한 번에 하나의 세션만 유지** — 한쪽 로그인이 다른 쪽 세션을 교체함

### 5.2 checkSession()의 자동 사용자 생성

**관련 파일**: `authStore.ts` (line ~418-474)

- `users` 테이블에 행이 없으면:
  - `operators` 테이블 확인 → 운영자면 사용자 생성 없이 종료
  - 24시간 이내 계정 → `role: 'team'`으로 자동 insert (OAuth 신규 사용자)
  - 24시간 경과 계정 → `supabase.auth.signOut()` 강제 로그아웃
- 이 로직이 의도치 않게 실행되면 데이터 오염 또는 세션 파괴 발생

### 5.3 Supabase Realtime 채널

**관련 파일**: `notificationStore.ts`

- `startRealtimeSubscription()`이 `notifications` 테이블의 INSERT를 구독
- 이 구독은 `DashboardLayout` 마운트 시 시작, 언마운트 시 정리
- **주의**: Realtime 채널은 Supabase Auth 세션에 의존 — 세션이 만료/교체되면 채널도 끊김
- 알림이 갑자기 안 오면 Auth 세션 상태를 먼저 확인

### 5.4 Cloudflare R2 파일 경로 규칙

**관련 파일**: `documentStore.ts`, `lib/r2.ts`

- 파일 경로: `{companyId}/{parentCategoryId}/{subcategoryId}/{fileName}`
- `documents` 테이블의 `file_path`는 이 경로를 저장
- 카테고리/세부스토리지 삭제 시 R2 파일도 삭제해야 하지만, 이 연결은 코드 레벨에서만 존재 (DB 트리거 없음)
- 파일이 남아있는데 DB 레코드만 삭제되면 R2에 고아 파일이 쌓임

### 5.5 CSS/Tailwind 다크모드 연쇄

**관련 파일**: `themeStore.ts`, `index.css`, 모든 컴포넌트

```
themeStore.setMode('dark')
    → document.documentElement.classList.add('dark')
        → 모든 dark: Tailwind 변형이 일괄 활성화
        → index.css의 .dark 선택자 !important 오버라이드 적용
        → v1-components.tsx의 MutationObserver가 html.dark 감지 → 색상 토큰 전환
```

- 한 컴포넌트의 스타일 문제가 `index.css`의 `!important` 오버라이드 때문일 수 있음
- 다크모드 스타일 버그 시 해당 컴포넌트뿐 아니라 `index.css`도 확인

### 5.6 Supabase RLS (Row Level Security)

- 코드가 정상이어도 **DB 정책이 쿼리를 차단**할 수 있음
- `operators` 테이블은 사용자 앱 세션(users 기반)으로 접근 불가할 수 있음
- `documents`, `categories` 등은 `company_id` 기반 RLS로 다른 회사 데이터 차단
- 쿼리가 빈 결과를 반환하면 RLS 정책을 의심

### 5.7 구독 플랜 제한 체크

**관련 파일**: `lib/subscription.ts`, `documentStore.ts`

- 문서 업로드, 부서 생성, AI 쿼리 등에서 `subscription.ts`의 제한 체크 함수를 호출
- 제한 초과 시 UI에서 차단하지만, **RLS에서도 이중으로 차단할 수 있음**
- "저장 실패" 에러가 나면 구독 제한과 RLS 양쪽 확인

### 5.8 Capacitor 네이티브 브릿지

**관련 파일**: `lib/appBridge.ts`, `lib/nfc.ts`, `lib/pushNotification.ts`

- 웹 환경에서는 Capacitor API가 no-op 또는 에러를 던짐
- `Capacitor.isNativePlatform()`으로 분기하는 코드가 여러 곳에 산재
- 네이티브에서만 발생하는 버그는 웹 콘솔에서 재현 불가

## 6. 주요 데이터 흐름

### 6.1 문서 업로드 흐름

```
사용자가 파일 선택
    → documentStore.uploadDocument()
        → subscription.checkDocumentLimit() (제한 체크)
        → isImageFile() ? convertImageToPdf() : 원본
        → r2Storage.upload() (R2에 파일 저장)
        → supabase.from('documents').insert() (DB 레코드)
        → createDocumentNotification() (알림 생성)
        → notificationStore → Realtime → 다른 사용자에게 전달
```

### 6.2 사용자 인증 흐름

```
LoginPage → authStore.login(email, pw, role)
    → supabase.auth.signInWithPassword()
    → users 테이블에서 role 확인
    → App.tsx: onAuthStateChange('SIGNED_IN')
    → authStore.checkSession()
    → isAuthenticated = true
    → ProtectedRoute 통과
    → DashboardLayout 마운트
    → documentStore 초기 데이터 로드
    → notificationStore Realtime 구독 시작
```

### 6.3 운영자 인증 흐름

```
OperatorLogin → operatorStore.operatorLogin(email, pw)
    → supabase.auth.signInWithPassword()
    → operators 테이블에서 is_active 확인 (실패 시 signOut)
    → App.tsx: onAuthStateChange('SIGNED_IN')
    → 경로가 /operator → operatorStore.checkOperatorSession()
    → isOperator = true
    → OperatorProtectedRoute 통과
    → OperatorLayout 마운트
```
