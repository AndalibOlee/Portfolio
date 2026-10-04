# HaiCo Group platform — browser edition (merged build)

Single-file ERP demo: `python3 build.py` concatenates `src/head.html` + `seed.json` + `howto/*.jpg` + the `src/*.js` modules (in the order listed in `build.py`) into `haico-platform.html`. Open that file in a browser; nothing else is needed.

- `src/core.js` — state, permissions, reducers (`R["event.type"](S, p, ctx)`), `act()`, audit.
- `src/ui.js` — shell: `SECTIONS` (section tabs), `buildNav()` (grouped menu with counts), `route(pattern, perm, view)`, modal/popover.
- `src/views-*.js` — screens; later files win on route conflicts (`views-hr3.js`, `views-fin3.js` hold the merged additions).
- `src/views-tsearch.js` — the small search bar (box + “Search in” column + count) above the main table on the pages listed in `TS_PAGES`.
- `src/export.js` — Excel / PDF / CSV from one `dlButton(key)`; keys in `EXPORTS`.
- `src/app.js` — FORMS / ACTIONS handlers (`window.FORMS_EXT` / `ACTIONS_EXT` from other files are merged in).
- `src/views-xm-core.js` — Page & Experience Manager engine: configuration document, reducers (`xm.*` events, audited), effective configuration per company/role, navigation and page-structure apply layer, terminology, typography, preview / edit mode.
- `src/views-xm-lib.js` — Component & Widget Library: approved actions, metrics, datasets, chart series and 42 components, all reading live data through the existing helpers and permissions.
- `src/views-xm-admin.js` — Administration › Page & Experience screens (navigation, pages, library, terminology, typography, role & company views, view as, drafts / review / publish / versions / compare / restore / downloads / import).
- `seed.json` — demo data (4 companies × 2 departments, 18 people, 6 demo roles).
- `pw-merge.js` — Playwright smoke test (every route, every role, 0 page errors).
- `pw-xm.js` — Playwright test of the Page & Experience Manager end to end (`node pw-xm.js`).
- `package-netlify.py` — builds and packages `netlify-site/` plus `haico-platform-netlify.zip` for Netlify.
- `docs/page-experience-manager-assessment.md` — the implementation assessment written before the feature was built.

Demo sign-ins: Employee, Manager, HR Manager, Finance Manager (also runs payroll), Executive Director, Administrator.
