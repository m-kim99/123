---
name: traystorage-connect-design
description: Use this skill to generate well-branded interfaces and assets for TrayStorage CONNECT (트레이스토리지 커넥트) — a Korean B2B document management system that pairs cloud document storage with physical NFC-tagged storage locations. Use this for production code or throwaway prototypes/mocks of the admin or team-member experience, login flows, dashboards, NFC/QR features, or any TrayStorage-branded artifact.
user-invocable: true
---

Read the `README.md` file within this skill, then explore the other available files (`colors_and_type.css`, the `assets/` folder, and the `ui_kits/web/` folder which contains a working click-through prototype + JSX components).

Key things to remember when using this skill:

- The product is **Korean-first**. Write Korean copy unless explicitly asked for English. Tone is formal, polite (-합니다체), businesslike.
- **Primary color is blue (#2563eb)**, not orange or green. The source repo's README claims role-based orange/green theming but the actual code is unified blue — follow the code.
- **One product, one shell.** Admin and team users share the same `DashboardLayout`; sidebar entries differ but the visual language is identical.
- **Vocabulary is precise**: 부서 (department) → 대분류 (parent category) → 세부 스토리지 (subcategory) → 문서 (document). Don't translate these inconsistently.
- **Icons:** Lucide React (load from CDN for HTML artifacts), with a small set of custom flat SVGs in `assets/` for specific actions. Never invent new SVG icons.
- **Cards:** `rounded-xl border border-slate-200 bg-white shadow`, `p-6` padding. **Buttons:** `rounded-lg`. **Inputs:** `rounded-md`. **No gradients except the one ranked-list avatar.** No glassmorphism.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out of `assets/` and create static HTML files for the user to view. Link `colors_and_type.css` (or paste its `:root` block) for tokens. For full UI mockups, start from `ui_kits/web/index.html` — copy it and modify.

If working on production code (React + Tailwind + shadcn/ui), copy the relevant asset files and read the rules in README.md to become an expert in designing with this brand. The original codebase is at https://github.com/m-kim99/123 — refer to it for component-level fidelity.

If the user invokes this skill without other guidance, ask them what they want to build (a specific screen, a feature mock, a slide, a marketing asset?), ask 2–4 clarifying questions about scope and audience, and then act as an expert designer who outputs HTML artifacts or production code.
