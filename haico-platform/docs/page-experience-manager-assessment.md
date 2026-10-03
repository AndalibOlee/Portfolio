# Page & Experience Manager — implementation assessment

Prepared before any code was changed. Scope: the HAICO Group platform browser edition in `haico-platform/`.

## Existing architecture

- Single-file app. `build.py` concatenates `src/head.html` (CSS, five looks, light/dark), `seed.json`, the how-to screenshots and 22 `src/*.js` modules into one HTML file. No framework, no bundler, no server.
- Event-sourced state. `S` is always `freshState()` (a clone of the seed) plus every recorded event replayed through reducers `R[type](S, p, ctx)`. `act(type, p, okMsg)` applies an event, then `persist()` writes it to the shared `db` capability when the page is opened as a claude.ai artifact, or to `localStorage` otherwise. `rebuild()` replays everything on every change from another client.
- Rendering is one `render()` pass that rebuilds the whole DOM from strings: banner, sidebar, top bar, section tab bar, the routed view, footer, modal.
- Modules extend the core by: `route()` (first match wins, later files put overrides at the front with `hr3Route`/`f3Route`), `Object.assign(R, {...})` for reducers, `window.FORMS_EXT` / `window.ACTIONS_EXT` for handlers, `freshState` wrapping for new state slices, and `injectCss()` for styles.

## Existing navigation system

- Three levels already exist, all code-defined in `src/ui.js`:
  1. Sidebar group headings (My work, Me, Team, People, Payroll, Finance, Operations, Reports, Administration) built in `buildNav()`.
  2. Sidebar items, one per `SECTIONS` entry (key, label, icon, count badge).
  3. The tab bar at the top of each page, one per `tabs[]` entry in that section (href, label, perm).
- Visibility is decided per item by `hasPermA(perm)`: a permission string, an array (any of), `"@employee"`, or a predicate. The route guard in `render()` checks again, so hiding a menu never grants or removes access.
- There is already an `Administration` section with Users & access (includes the roles table), Companies, Approval rules, Audit log, Feedback, Settings. It will be extended, not duplicated.

## Existing page system

- A page is a view function returning HTML, registered with `route(pattern, perm, view)`. 106 static routes plus parameterised ones.
- Pages compose shared blocks: `ph()` header, `card()`/`cardFlush()`, `.hcard` panels, `.grid` rows, `.stat` tiles, `table()`. Home (`vDashboard`) is `homeTop() + homeGlance()`, which itself is a sequence of discrete blocks (greeting, tiles, Waiting on you, Needs your attention, Quick actions, My requests, Recent activity, Coming up, At a glance).
- There is no page registry, no section model, and no per-page configuration store.

## Existing component system

- There is no component library. Reusable rendering helpers exist (`stat`, `card`, `table`, `donut`, `barChart`, `homeTile`, `waitingOnYou`, `needsAttention`, `leaveBalances`, `statusRows`, `historyRowsA`, `upcomingEventsA`, `cashOf`, `reportData`) and every one reads live `S` data filtered by the signed-in user's scope.
- Charts are inline SVG wired by `wireChart` / `animateCharts` after render.

## Existing permissions

- Catalog: `PERMS` (54 keys) and `ROLES` (13 roles, wildcard grants) in `src/core.js`; `ROLE_PERMS` is expanded once at load; `authFor()` builds the signed-in user's `perms` set; `can(A, perm)` is the single check used by menus, routes and reducers (`ctx.need(perm)`).
- Administrator = `user.isSuperAdmin` (demo user u6, role `SUPER_ADMIN`). `GROUP_ADMIN` holds everything except `admin.roles` and `admin.settings`.
- The permission catalog is extended in place with five new keys (section 64). No second permission system.

## Existing audit system

- `ctx.audit({module, action, summary, companyId?, entityType?, entityId?})` appends to `S.audit`. The `/admin/audit` page and the `/history` page both read it. Because the audit is derived from the event log, it is append-only by construction: a configuration event cannot be edited or removed by an administrator.

## Existing settings

- `/admin/settings` is a read-only information page. `/payroll/settings` holds overtime rules and tax tables (reducer `payroll.settings`). `/admin/workflows` holds approval thresholds (reducer `workflow.threshold`). There is no `S.settings` object.

## Existing database structure

- Seed tables in `seed.json` (85 collections) plus event-time slices added in `freshState` wrappers. No schema version field exists; the configuration export adds one.

## Recommended implementation

One new module, `src/views-xm.js`, loaded before `app.js`, and small hooks only:

1. **Configuration store (event-sourced, audited).** New slices `S.xmDraft`, `S.xmPublished`, `S.xmVersions[]` with reducers `xm.draftSave`, `xm.draftDiscard`, `xm.publish`, `xm.restore`, `xm.import`, `xm.download`. Every one calls `ctx.need()` and `ctx.audit()`. Published versions are immutable snapshots with a change summary.
2. **Configuration model.** `{schema, nav, pages, customPages, labels, typography, density, overrides: {"role:X": {...}, "company:Y": {...}}}`. Effective configuration = system default ← group default ← company override ← role override. User level is not implemented (the per-device "Look" already covers it).
3. **Apply layer.** `buildNav()` and `sectionTabsHtml()` are wrapped (rename, reorder, hide, add menus and submenus, change icon, role/company visibility). Page structure is applied as a post-render pass over the view's DOM: top-level blocks are sections, their cards are components; each can be renamed, hidden, reordered or extended with library components. Terminology is applied to the nav model and to exact-match text labels. Typography and density are CSS variables on `<html>`.
4. **Component & Widget Library.** Catalogued system components in the categories requested, each with purpose, data source, required permission, allowed settings, a preview, and a renderer that uses the existing helpers and live `S` data. Quick actions and shortcuts navigate to existing routes; nothing new is posted.
5. **Admin UI** at `/admin/experience` as a tab of the existing Administration section: Navigation, Pages (structure editor), Library, Terminology, Typography, View As, Versions (drafts, review & publish, history, compare, restore, downloads, import).
6. **View As / Preview.** Render as any user with the draft configuration, a preview banner, `act()` disabled, and optional Edit mode that overlays controls on blocks.
7. **Exports.** JSON, PDF (existing `buildPdf`), ZIP (existing `zipStore`) through the existing `downloads` capability; downloads are recorded as audit events.

## Potential risks

- Block identity on existing pages is derived from headings; if a heading text changes in code, an override for that block is ignored (never breaks the page).
- Terminology replaces exact label text only; it cannot rewrite sentences, which is intended.
- The shared `db` event store persists configuration events like any other action; a large import is one event. Configurations are kept small (no data, no images).
- Preview mode blocks `act()`; the few UI-only handlers (tabs, filters) still work, which is what a preview needs.
- Role codes are also tested directly in a few places in the existing code (`homeRole`, `attendanceAdmin`); the manager reads roles through `A.roleCodes` and never changes them.

## Duplication found (section 73): recommendations, nothing deleted

- **History vs Audit log.** `/history` (scoped, filtered, downloadable) and `/admin/audit` (raw table) read the same `S.audit`. Recommend keeping `/history` as the one screen and giving the administrator's tab the same view with the "all" scope preselected.
- **Employee lists.** `/hr/employees`, `/people/directory` and `/reports/headcount` all list people. Recommend one directory with an "HR detail" mode for `hr.employees.view`, and headcount as a component on the Reports hub (the library now has `headcount` and `employee-status`).
- **Dashboard tiles.** For finance, HR and executive users `homeTiles()` and `homeGlance()` both render KPI strips with overlapping figures (Bills we owe / Owed to us appear twice). Recommend dropping one strip; an administrator can already hide either via the manager.
- **Timesheet approval in four places.** Home "Waiting on you", `/approvals`, `/hr/timesheets` and `/hr/timesheets/:id` all offer Approve / Send back. Recommend `/approvals` and the timesheet page only; the list pages link to them.
- **Requests and expenses.** `/me/requests` and `/me/expenses` are one tab in the shell but two pages; `/hr/requests` and `/finance/expenses` appear under both Team and Accounts Payable. Recommend one request centre with a kind filter.
- **Alias routes.** `/finance/ap/attachments` and `/finance/ap-files` are the same view; `/me/pay/:id` and `/payroll/statements/:id` share `vStatement`. Harmless, but one route each is cleaner.
- **Dead code.** Eleven view functions are no longer routed (`vEmployees`, `vEmployee`, `vLeave`, `vMe`, `vMyRequestsLegacy`, `vFin2Journals`, `vFin2NewJournal`, `vFin2RecurringNew`, `vSalesOrders`, `vApAttachments`, `vAssets`, `vPeriods`, `vProjects` in views-misc) and 31 `route()` registrations in `app.js` are overridden by later files. `views-cap.js` is on disk but not built. Recommend removing in a separate clean-up change.
- **Stock naming.** The Sales & Stock section has both a "Stock" tab and an "Items & stock" tab. Recommend "Stock levels" and "Items"; the manager can rename them today.

## Files modified

- Added: `src/views-xm.js` (all new behaviour), `docs/page-experience-manager-assessment.md`, `netlify/` packaging.
- Changed: `build.py` (one entry in the module order), `src/ui.js` (one tab in the Administration section, nothing else), `src/views-home.js` (help entry only), `pw-merge.js` (smoke test covers the new routes).
- Not changed: every reducer, approval workflow, payroll, finance, HR, timesheet, leave, report, authentication and audit code path.
