# TrayStorage CONNECT — Design System

A design system extracted from the **TrayStorage CONNECT** (트레이스토리지 커넥트) web/mobile application — a Korean B2B **document management system** (문서 관리 시스템) that uniquely combines cloud document storage with **physical-world NFC tags** and QR codes for tracking where paper documents are stored on physical shelves.

> **Source:** [github.com/m-kim99/123](https://github.com/m-kim99/123) — the production React + TypeScript + Vite + Supabase codebase. Explore this repo to recreate features at higher fidelity; this design system extracts the visual language, not the business logic.
>
> **Figma:** the codebase references a Figma file at `figma.com/design/uDfgp1A5A8rzoqlR3txrtW/AOS_KR` covering the **Android-app login/signup screens**. We did not access this file; the design tokens here come from the web codebase, which uses the same brand.

---

## 1. Product context

### What it does
TrayStorage CONNECT lets companies catalogue paper documents into a hierarchy and pin each "subcategory" (a folder, box, or tray) to a physical location with an **NFC tag**. Tapping a phone against the tag opens that subcategory's document list. Cloud documents (PDF/JPG/PNG with OCR) are managed alongside the physical inventory.

### Two roles, one interface
- **관리자 (Admin, orange in the legacy README — but actually blue in code)** — system-wide access. Manages departments, parent categories, subcategories, users, statistics, announcements, trash.
- **팀원 (Team member, green in the legacy README — also blue in code)** — scoped to their own department (plus any departments they've been granted permissions on). Same shell, fewer entries in the sidebar.
  > ⚠️ The repo's README claims orange-for-admin / green-for-team theming. **This is stale.** The current code uses one unified **blue** primary for both roles — confirmed in `LoginPage.tsx`, `AdminDashboard.tsx`, and `tailwind.config.js`. We follow the code.

### Information architecture
```
Company  →  Department (e.g. 인사팀)
            └── Parent Category (e.g. 채용 문서)
                └── Subcategory (e.g. 채용 서류 보관함)  ← NFC-taggable
                    └── Document (PDF/JPG/PNG, with OCR text)
```

### Single product, single surface
The codebase is **one product, one UI shell** (a Vite + React PWA also packaged for iOS/Android via Capacitor). There is no separate marketing site or admin console — admin and team users land in the same `DashboardLayout` with different sidebar entries. So this design system contains **one UI kit**: the web/PWA app.

### Tech (for reference, not part of the design system)
React 18 · TypeScript · Vite · Tailwind CSS · **shadcn/ui** · Radix primitives · Zustand · React Router v7 · Supabase · Lucide React icons · Capacitor (iOS/Android) · i18next (KO/EN) · jsPDF · pdfjs-dist · qrcode.react.

---

## 2. Content fundamentals

### Language
**Korean-first.** The product ships KO + EN translations (`src/locales/ko.json`, `en.json`), but every screen was designed and named in Korean. When in doubt, write Korean copy; the English is a polite translation, not the canonical voice.

### Tone
**Formal, polite, businesslike — Korean B2B SaaS register.**
- Uses 합니다체 (the formal `-합니다 / -습니다` ending) consistently. _"부서 정보가 수정되었습니다."_ — _"Department info has been updated."_ Never casual `-요` endings, never blunt `-다`.
- Refers to the user neutrally — no `당신` (you), no `우리` (we). The product describes what it just did, in passive third person.
- Toast confirmations follow the format **`<title>` + descriptive sentence**:
  - Title: short noun phrase. _"수정 완료"_, _"공유 완료"_, _"업로드 실패"_.
  - Description: full polite sentence ending in `-습니다 / -었습니다`. _"세부 스토리지가 성공적으로 수정되었습니다."_
- Warning / destructive copy is direct but not alarmist. _"삭제 후에는 되돌릴 수 없습니다. 신중하게 진행하세요."_ ("Deletion cannot be undone. Proceed carefully.")
- **Confirm-to-destroy.** Hard-delete actions ask the user to type a phrase like `삭제하겠습니다` ("I will delete") into a field before the button enables. The phrase is shown literally on screen.

### Vocabulary
The product invents a hierarchy and sticks to it religiously — match the exact terms:

| Concept | Korean | English (in EN locale) | Notes |
|---|---|---|---|
| Department | 부서 | Department | Top-level org unit, has a code like `HR001`. |
| Parent category | 대분류 | Parent Category | Bucket inside a department. |
| Subcategory | 세부 스토리지 | Subcategory / Detail Storage | The NFC-taggable unit. **Note** the Korean literally says "detail storage," not "subcategory." |
| Document | 문서 | Document | A file. |
| Tray | (no user-facing label) | — | Brand metaphor only; only appears in the product name. |
| NFC tag | NFC 태그 | NFC tag | Physical sticker, written via Web NFC. |
| Storage location | 보관 장소 | Storage location | Free-text, e.g. _"A동 2층 캐비닛 3"_. |
| Management number | 관리번호 | Management number | Free-text, e.g. _"MGT-2024-001"_. |
| Color label | 컬러라벨 | Color label | 10-color picker tag on subcategories. |

### Casing
- **Korean:** no casing concept. Don't add Western title case to translated strings.
- **English brand:** `TrayStorage CONNECT` — `TrayStorage` is camel-cased and `CONNECT` is all caps. Don't write "Traystorage Connect" or "TrayStorageConnect."
- **English UI strings:** sentence case for buttons and headings — _"Add subcategory"_, not _"Add Subcategory"_.
- **Code-like values** (department codes, management numbers, biz numbers): uppercase, hyphenated — `HR001`, `MGT-2024-001`.

### Emoji & symbol usage
- **Sparingly, and only in two places:**
  1. **Toast / status text** to soften long flows: `✅ NFC 태그 인식`, `❌ 미등록 태그`, `🔒 만료됨`, `🎤 음성 대화 중...`, `⚠️ 주의사항`. These are baked into copy, not styled as separate icons.
  2. **Chatbot welcome message:** _"안녕하세요! 저는 TrayStorage Connect의 AI 어시스턴트 트로이입니다. 😊"_
- **Never in headings, buttons, navigation, or labels.** All chrome iconography is Lucide React (line icons).

### Microcopy patterns
- **Empty states** are short, plain Korean sentences with no illustration: _"즐겨찾기한 세부 스토리지가 없습니다"_, _"최근 방문 기록이 없습니다"_, _"조건에 해당하는 세부 스토리지가 없습니다."_
- **Hints under fields** start with the format then explain: _"8자 이상, 대/소문자, 숫자, 특수문자 포함"_.
- **Placeholders** are concrete examples prefixed with `예:` — _"예: 인사팀"_, _"예: HR001"_, _"예: A동 2층 캐비닛 3"_.
- **Optional fields** are marked inline with `(선택)`, e.g. _"컬러라벨(선택)"_.
- **Confidentiality marker:** the literal word `기밀` on a document, never an icon alone.

---

## 3. Visual foundations

### Color
- **One primary, one accent.** The whole app runs on **blue-600 (`#2563eb`)** as primary; **violet-500 (`#8b5cf6`)** appears only on the gradient avatar (ranked list pills, sidebar user chip) and `Archive` stat icons. Both roles (admin / team) share the same palette — there is no orange/green role swap in the current code despite what the legacy README claims.
- **Neutrals are cool slate.** Background is `#f8f9fa` (a touch cooler than pure white). Text descends through `slate-900 → 600 → 500 → 400`. Borders are `slate-200`.
- **Status colors** are Tailwind defaults: success `#10b981`, warning `#f59e0b`, danger `#ef4444`, favorite-star `#eab308`.
- **Color labels for storage** are a curated 10-swatch palette (`white / red / orange / yellow / green / blue / purple / brown / gray / black`) shown as a row of clickable circles on subcategory create/edit forms.
- **No dark mode in production.** The Tailwind config defines `.dark` variables but the live app forces light. Skip dark mode unless asked.

### Type
- **Noto Sans KR + Noto Sans**, loaded from Google Fonts. The pairing handles Korean + Latin in the same line without metric shifts.
- Base size **16px**, line-height **1.5**. The `html { font-size: 16px }` lock in `src/index.css` is deliberate — it prevents iOS Safari from auto-scaling type. Honor it.
- Page H1 is **30px / `font-bold`** (`text-3xl font-bold`). Card titles are `font-semibold leading-none tracking-tight`. Body is 16px / 14px depending on context. Helper meta (timestamps, code chips) is 12px `text-slate-500`.

### Layout & rhythm
- **Sidebar + content shell.** Fixed left sidebar (`DashboardLayout`), sticky top header with search + bell + avatar, scrollable main canvas. Sidebar collapses to a drawer on mobile.
- **Page padding** is `p-6` (24px). **Card padding** is also `p-6`. **Card→card gap** is `gap-4` (16px) for stat tiles and `gap-6` (24px) for major sections.
- **Stat tiles** are a 4-column grid on lg, 2-col on md, 1-col on sm.
- **Three-column "favorites / recents / top X"** row appears on every dashboard.
- **Bottom of every dashboard:** a "departments / parent categories" list of clickable cards with an icon block, name + code on the left, big count on the right.

### Backgrounds & imagery
- **Solid neutral `#f8f9fa`** everywhere inside the app shell. No textures, no patterns, no gradients on content surfaces.
- **One exception — the login page** runs a full-bleed muted video (`/login-bg.mp4`, a stock warehouse / racking shot) with a `bg-black/45` overlay, and the login card floats centered on top. This is the *only* full-bleed treatment in the product.
- **Gradients** appear in exactly **one** UI element: the small ranked-list avatar (`bg-gradient-to-br from-blue-500 to-purple-500`) showing positions 1–5 in the "top departments / top parent categories" widget. Don't introduce new gradients.

### Animation
- **Restrained, functional.** Transitions are `transition-colors` (~150ms default) on buttons and list rows; `transition-shadow` on hover for clickable cards. Accordions use Radix's `accordion-down / -up` keyframes at `0.2s ease-out`.
- **No spring physics, no bounce, no parallax.** A spinner (`animate-spin` border) is the only loading indicator.
- **Toasts** slide in from the top-right via Radix Toast (default Radix easing).
- **Page transitions:** none. Routes swap instantly behind a `Suspense` fallback that shows the spinner if a lazy chunk isn't loaded.

### Hover / press / focus
- **Hover (buttons):** background darkens via shadcn's `hover:bg-primary/90` (10% darker via alpha). Outline buttons gain `hover:bg-accent` (a slate-50 tint).
- **Hover (cards / list rows):** `hover:bg-slate-50` for rows; `hover:shadow-lg` for the "clickable card" pattern used in dashboards.
- **Press / active:** no visible state beyond hover — the original codebase relies on focus-visible rings.
- **Focus:** `focus-visible:ring-1 focus-visible:ring-ring` (a slate-900 thin ring) on every interactive element.
- **Disabled:** `opacity-50 pointer-events-none`.

### Borders & shadows
- **Borders** are 1px `slate-200` (`#e5e7eb`). Inputs and cards both use this single border color; there is no "strong" vs "subtle" border distinction.
- **Shadows** are shadcn's three steps: `shadow-sm` (inputs, ghost surfaces), `shadow` (default card), `shadow-lg` (hover-lifted card). No tinted shadows; no inset shadows.
- **No "left-border accent" cards.** Avoid the AI-slop pattern of a rounded card with a colored 4px left border.

### Corner radii
- Inputs: **6px** (`rounded-md`).
- Buttons: **8px** (`rounded-lg`).
- Cards: **12px** (`rounded-xl`).
- Pills / badges: **6px** (`rounded-md`) or **9999px** (`rounded-full`) for status dots.
- Stat-icon tiles: **12px** (`rounded-xl`).
- The radii ladder is small. **Avoid 16-24px** rounding — it doesn't fit the product.

### Transparency & blur
- Modal/dialog backdrop: `bg-black/40` (no blur).
- Login overlay: `bg-black/45` over the video (no blur).
- **No glassmorphism, no backdrop-filter blur anywhere** in production. Don't introduce it.

### Card pattern
A card is: `rounded-xl border border-slate-200 bg-white shadow`. The header is `flex flex-col space-y-1.5 p-6`, the content is `p-6 pt-0`. Card titles are `font-semibold leading-none tracking-tight` (NOT `text-xl`-styled by default — shadcn leaves sizing to the consumer). Clickable cards add `cursor-pointer hover:shadow-lg transition-shadow`.

### Fixed elements
- Sidebar (`fixed` on desktop, `drawer` on mobile).
- Top header (`sticky top-0`).
- AI Chatbot floating button: bottom-right, fixed.
- Toaster: top-right, fixed.

---

## 4. Iconography

### System: **Lucide React** (`lucide-react@^0.446.0`)
Every chrome icon in the app comes from Lucide. The product imports them by name (`FileText`, `Building2`, `Star`, `Clock`, `FolderOpen`, `Archive`, `TrendingUp`, `Users`, `Search`, `Bell`, etc.) and renders them at `h-5 w-5` (20px) inside buttons / list rows or `h-6 w-6` (24px) inside stat tiles.

When recreating screens, **load Lucide from CDN** rather than redrawing icons:
```html
<script type="module">
  import { createIcons, icons } from "https://unpkg.com/lucide@latest/dist/esm/lucide.js";
  createIcons({ icons });
</script>
<i data-lucide="file-text" class="w-5 h-5"></i>
```

### Custom SVG icons in `assets/`
The codebase also ships a small set of **custom flat-fill SVGs** under `src/assets/` that mirror Lucide visually but are styled to brand. We've copied them into `assets/` — use them wherever the product uses them. They are:

| File | Used for |
|---|---|
| `bell.svg` | Notification button in header (alternate to Lucide's `Bell`) |
| `bin.svg` | Trash / delete |
| `change.svg` | "Change" / swap action |
| `close.svg` | Close (X) |
| `download.svg` | Download |
| `expand.svg` / `reduce.svg` | Expand / collapse |
| `mic.svg` / `mic_on.svg` | Voice chat (chatbot) on/off states |
| `pen.svg` | Edit |
| `preview.svg` | Preview document |
| `search.svg` | Search |
| `send.svg` | Send chat message |
| `share.svg` | Share document |
| `notice.png` | Announcements badge |
| `parent.png` / `sub.png` | Parent-category / subcategory glyphs |

### Brand assets
| File | Use |
|---|---|
| `assets/logo.png` | **Primary logo** — tray glyph + `TrayStorage CONNECT` wordmark, ~144×40px aspect. Used on login. |
| `assets/logo1.png` | **Compact wordmark** — `TrayStorage®` on one line, `CONNECT` underneath. Used in mobile contexts. |
| `assets/connect.png` / `assets/icon.png` | **App icon** — bold black-on-white tray glyph with "CONNECT" underneath, 512×512. Used for iOS/Android home-screen icons. |

### Social-login logos
`google.png`, `apple.png`, `kakao.png`, `naver.png` — full-color brand marks rendered at `h-5 w-5` inside outline buttons on the login page. Each provider has a slight per-logo scale tweak (`google: 1.08`, `apple: 1.18`, `kakao: 1.0`, `naver: 1.0`) so they read at consistent visual weight; preserve this if you rebuild the login.

### Emoji
Used **only** in toast/status copy and chatbot greeting (see Content § Emoji usage). Never as standalone icons or in navigation.

### Unicode chars
Used very lightly — `·` (middle dot, `&middot;`) as a separator in metadata rows like _"인사팀 · 채용 문서"_, and `→` in some flow descriptions. No special bullet glyphs.

### What NOT to do
- ❌ Don't draw new SVG icons from scratch when Lucide has it.
- ❌ Don't mix line-icon (Lucide) and filled-icon (Material) styles on the same screen.
- ❌ Don't add icons to buttons that don't already have one — most CTAs are text-only.

---

## 5. File index

```
TrayStorage CONNECT Design System/
├── README.md                       ← you are here
├── SKILL.md                        ← Agent Skills entry point
├── colors_and_type.css             ← design tokens (CSS vars) + semantic element styles
├── assets/                         ← logos, social marks, custom SVG icons, app icon
│   ├── logo.png  logo1.png  connect.png  icon.png
│   ├── google.png  apple.png  kakao.png  naver.png
│   ├── notice.png  parent.png  sub.png
│   └── bell.svg  bin.svg  change.svg  close.svg  download.svg
│       expand.svg  mic.svg  mic_on.svg  pen.svg  preview.svg
│       reduce.svg  search.svg  send.svg  share.svg
├── ui_kits/
│   └── web/                        ← the one UI kit (web/PWA app)
│       ├── README.md
│       ├── index.html              ← interactive click-through prototype
│       ├── tokens.css              ← kit-local copy of design tokens
│       └── components/             ← JSX components (button, card, input, sidebar, etc.)
└── preview/                        ← Design-system tab card files (HTML specimens)
```

The UI kit's `index.html` is the canonical reference for how the system composes — login → admin dashboard → subcategory detail → document preview. Open it first.

---

## 6. Caveats & substitutions

- **Fonts:** Noto Sans KR + Noto Sans are loaded from Google Fonts CDN — no local `.ttf` is shipped. If you need offline, ask and we'll bundle them.
- **Login background video** (`/login-bg.mp4`) is referenced by the codebase but not in the repo (it's served from `public/` in production and not committed). The UI kit shows a placeholder div with the dark overlay.
- **No Figma access.** The `AOS_KR` Figma file is referenced in `1 시작화면 ...txt` for the Android login flows but we did not import its design context. If you need the exact Android-app layout, ask the user to grant Figma access.
- **The legacy README in the source repo says "orange for admin, green for team."** This is stale — the live UI is unified blue. We follow the code.
