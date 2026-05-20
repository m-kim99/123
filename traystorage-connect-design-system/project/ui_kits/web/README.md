# UI Kit — Web app

This is the single UI kit for **TrayStorage CONNECT**. The product is one React PWA shipped to web + iOS + Android (via Capacitor), so all flows share this codebase.

## What's in here

- `index.html` — a click-through prototype that boots into the login screen and lets you navigate to dashboards and the subcategory detail.
- `tokens.css` — design tokens (copy of `../../colors_and_type.css`).
- `components/` — Hand-rolled JSX recreations of the shadcn/ui primitives and screen-level compositions.

## Components

**Primitives.jsx**
- `<Button variant size>` — `default | destructive | outline | secondary | ghost | link`, sizes `default | sm | lg | icon`.
- `<Input>` — text/password input with focused border state.
- `<Label>` — form label.
- `<Card> + <CardHeader> + <CardTitle> + <CardContent>` — the standard shadcn card.
- `<Badge variant>` — `default | secondary | destructive | outline | soft | success | warning | danger | neutral`.
- `<Pill variant>` — same as Badge but pill-shaped (rounded-full) for status indicators.

**Icon.jsx** — `<Icon name size color/>` with ~30 inline Lucide-style SVG icons (no CDN dep).

**Chrome.jsx**
- `<DashboardLayout role currentPath onNavigate onLogout user notificationCount>` — the full app shell.
- `<Sidebar role currentPath onNavigate onLogout>` — fixed left nav. Different items per role.
- `<TopHeader user notificationCount>` — sticky top bar with search, bell, avatar.
- `<Avatar name size>` / `<RankAvatar n>` — gradient-filled circular avatars.
- `<ToastHost toasts>` + `useToasts()` hook — top-right toast stack.

**Screens**
- `<LoginScreen onLogin>` — admin/team tabs, email + password, remember-email, forgot-password, four social-login buttons. Dark warehouse overlay background.
- `<DashboardScreen role onOpenSubcategory onOpenDept onNavigate>` — 4-up stat tiles, 3-up favorites/recents/top-X widgets, department list. Same shell, different copy per role.
- `<SubcategoryScreen subcategory ...>` — the heart of the product. Big info card with location + management number + NFC status, action toolbar (favorite, NFC, QR), document list.
- `<PreviewModal doc onClose>` — full-screen document preview modal.
- `<QrModal subcategory onClose>` — QR code modal (decorative).
- `<Chatbot>` — floating AI chatbot widget (bottom-right). The bot's name is 트로이 / Troy.

## What's intentionally NOT here

These are screens the source codebase has but the UI kit does not recreate — open the source repo if you need them:

- Onboarding (`OnboardingPage.tsx`) — company-code entry after first signup.
- Department / parent-category / user / announcement management pages.
- Statistics page (charts via Recharts).
- Trash, NFC scan/redirect screens, reset-password, terms popups.
- PDF viewer (`PdfViewer.tsx` — wraps `pdfjs-dist`).

These all use the same primitives + chrome the kit already provides, so adding any of them is mechanical.

## How to use

In a throwaway prototype, copy this folder, edit screen JSX inline, and open `index.html`. For production, refer to the source repo at https://github.com/m-kim99/123 for the real shadcn + Radix implementations (which include things this kit omits — keyboard handling, focus traps, ARIA wiring, etc.).
