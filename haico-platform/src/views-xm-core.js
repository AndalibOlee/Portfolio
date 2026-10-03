/* ==========================================================================
   views-xm-core.js — Page & Experience Manager: the engine.
   Administrators configure the EXPERIENCE (navigation, page structure, components,
   terminology, typography, visibility). Business logic, data, security and the
   approval engine are never touched: the configuration is applied as a presentation
   layer on top of what the existing views render, and every route still checks its
   own permission. Configuration changes are ordinary audited events.
   ========================================================================== */

const XM_SCHEMA = 1, XM_ERP_VERSION = "2026.10", XM_ORG = "HAICO Group";
const XM_PERM = { manage: "admin.experience.manage", publish: "admin.experience.publish", export: "admin.experience.export", import: "admin.experience.import", restore: "admin.experience.restore" };
/* ---- permissions: extend the existing catalog, then re-expand the role grants (Super / Group administrators get them through "*") ---- */
for (const p of Object.values(XM_PERM)) if (!PERMS.includes(p)) PERMS.push(p);
for (const k of Object.keys(ROLES)) ROLE_PERMS[k] = expandGrants(ROLES[k]);
const xmCan = (what, a = A) => !!a && can(a, XM_PERM[what]);

/* ---- audiences: the visibility vocabulary administrators see (mapped onto existing roles, never a new permission system) ---- */
const XM_AUDIENCES = [
  ["everyone", "All users", "Every signed-in person"],
  ["employees", "Employees", "Anyone with an employee record"],
  ["managers", "Managers", "People with direct reports, or the Manager role"],
  ["hr", "HR", "HR Managers"],
  ["finance", "Finance", "Finance Managers, Accountants, AP and AR clerks"],
  ["payroll", "Payroll", "Payroll Administrators and anyone who can run payroll"],
  ["executives", "Executives", "Executive Directors"],
  ["administrators", "Administrators", "System, Group and Company Administrators"],
];
const XM_AUD_LABEL = Object.fromEntries(XM_AUDIENCES.map(([k, l]) => [k, l]));
function xmAudiencesOf(a) {
  const set = new Set(["everyone"]);
  if (!a) return set;
  const rc = a.roleCodes || [];
  if (a.employee) set.add("employees");
  if (rc.includes("MANAGER") || (a.employee && S.employees.some((e) => e.managerId === a.employee.id && e.status !== "TERMINATED"))) set.add("managers");
  if (rc.includes("HR_MANAGER")) set.add("hr");
  if (rc.some((r) => ["FINANCE_MANAGER", "ACCOUNTANT", "AP_CLERK", "AR_CLERK"].includes(r))) set.add("finance");
  if (rc.includes("PAYROLL_ADMIN") || (!a.isSuper && can(a, "payroll.run"))) set.add("payroll");
  if (rc.includes("EXECUTIVE")) set.add("executives");
  if (a.isSuper || rc.some((r) => ["SUPER_ADMIN", "GROUP_ADMIN", "COMPANY_ADMIN"].includes(r))) set.add("administrators");
  return set;
}
/** visibility = { audiences: [], companies: [] }; empty lists mean everyone / every company */
function xmVisible(vis, a = A) {
  if (!vis || !a) return true;
  const aud = vis.audiences || [], cos = vis.companies || [];
  if (aud.length && !aud.includes("everyone")) { const mine = xmAudiencesOf(a); if (!aud.some((x) => mine.has(x))) return false; }
  if (cos.length) {
    const c = a.activeCompanyId || a.employee?.companyId;
    if (c) { if (!cos.includes(c)) return false; }
    else if (a.companyIds && !a.companyIds.some((x) => cos.includes(x))) return false;
  }
  return true;
}
const xmVisText = (vis) => { const aud = (vis?.audiences || []).filter((x) => x !== "everyone"), cos = vis?.companies || []; const parts = []; if (aud.length) parts.push(aud.map((x) => XM_AUD_LABEL[x] || x).join(", ")); else parts.push("Everyone"); if (cos.length) parts.push(cos.map((c) => co(c)?.displayName || c).join(", ")); return parts.join(" · "); };

/* ---- approved typography ---- */
const XM_FONTS = [["look", "Follow the chosen look", ""], ["inter", "Inter", '"Inter"'], ["segoe", "Segoe UI", '"Segoe UI"'], ["roboto", "Roboto", '"Roboto"'], ["plex", "IBM Plex Sans", '"IBM Plex Sans"'], ["source", "Source Sans 3", '"Source Sans 3"']];
const XM_SIZES = ["12", "13", "14", "15", "16"], XM_HEAD_W = ["400", "500", "600", "700"], XM_BODY_W = ["400", "500"], XM_BTN_W = ["400", "500", "600"];
const XM_DENSITY = [["standard", "Standard", "The platform's normal spacing"], ["compact", "Compact", "Tighter rows and cards for dense screens"], ["detailed", "Detailed", "More room around every row and label"]];
const XM_SIZE_OPTS = [["small", "Small", "A third of the row"], ["medium", "Medium", "Half of the row"], ["large", "Large / Full width", "The whole row"]];
const XM_SCOPES = [["user", "Current user"], ["team", "Current user's team"], ["department", "Department"], ["company", "Company"], ["organization", "Organization"]];
const XM_RANGES = [["current", "Current (last 30 days)"], ["month", "This month"], ["quarter", "This quarter"], ["year", "This year"], ["all", "All time"]];

/* ---- the configuration document ---- */
function xmEmpty() { return { schema: XM_SCHEMA, nav: { groups: {}, items: {}, tabs: {}, custom: [] }, pages: {}, customPages: {}, labels: {}, typography: { font: "look", size: "default", headingWeight: "default", bodyWeight: "default", buttonWeight: "default" }, density: "standard", overrides: {} }; }
const xmClone = (o) => JSON.parse(JSON.stringify(o ?? null));
const xmIsObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const xmPlain = (s, max = 120) => String(s ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
function xmMerge(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (!a.some((x) => xmIsObj(x) && x.id) && !b.some((x) => xmIsObj(x) && x.id)) return xmClone(b);
    const out = a.map((x) => xmClone(x)); for (const x of b) { const i = out.findIndex((y) => xmIsObj(y) && xmIsObj(x) && y.id === x.id); if (i >= 0) out[i] = xmMerge(out[i], x); else out.push(xmClone(x)); } return out;
  }
  if (xmIsObj(a) && xmIsObj(b)) { const out = { ...a }; for (const k of Object.keys(b)) out[k] = k in a ? xmMerge(a[k], b[k]) : xmClone(b[k]); return out; }
  return xmClone(b);
}
/** the configuration one person actually gets: group default ← company override ← role (audience) overrides, most specific last */
function xmEffective(cfg, a) {
  const base = xmMerge(xmEmpty(), cfg || {}); const ov = base.overrides || {}; delete base.overrides;
  let out = base;
  const cid = a?.activeCompanyId || a?.employee?.companyId;
  if (cid && ov["company:" + cid]) out = xmMerge(out, ov["company:" + cid]);
  const mine = xmAudiencesOf(a);
  for (const [k] of XM_AUDIENCES) if (k !== "everyone" && mine.has(k) && ov["role:" + k]) out = xmMerge(out, ov["role:" + k]);
  return out;
}
/** normalise anything an administrator (or an imported file) hands us: plain text, approved values, known shapes */
function xmSanitize(raw) {
  const c = xmMerge(xmEmpty(), xmIsObj(raw) ? raw : {});
  const vis = (v) => (xmIsObj(v) ? { audiences: (v.audiences || []).filter((x) => XM_AUD_LABEL[x]), companies: (v.companies || []).filter((x) => co(x)) } : undefined);
  const layer = (L) => {
    L.nav = xmIsObj(L.nav) ? L.nav : {}; L.nav.groups = xmIsObj(L.nav.groups) ? L.nav.groups : {}; L.nav.items = xmIsObj(L.nav.items) ? L.nav.items : {}; L.nav.tabs = xmIsObj(L.nav.tabs) ? L.nav.tabs : {};
    for (const g of Object.values(L.nav.groups)) if (xmIsObj(g)) { if (g.label != null) g.label = xmPlain(g.label, 40); if (g.visibility) g.visibility = vis(g.visibility); }
    for (const it of Object.values(L.nav.items)) if (xmIsObj(it)) { if (it.label != null) it.label = xmPlain(it.label, 40); if (it.icon != null && !ICON_PATHS[it.icon]) delete it.icon; if (it.group != null) it.group = xmPlain(it.group, 40); if (it.visibility) it.visibility = vis(it.visibility); }
    for (const t of Object.values(L.nav.tabs)) if (xmIsObj(t)) { if (t.label != null) t.label = xmPlain(t.label, 40); if (t.visibility) t.visibility = vis(t.visibility); }
    L.nav.custom = (Array.isArray(L.nav.custom) ? L.nav.custom : []).filter((m) => xmIsObj(m) && m.id).map((m) => ({ id: xmPlain(m.id, 40), kind: m.kind === "submenu" ? "submenu" : "menu", label: xmPlain(m.label, 40) || "Menu", icon: ICON_PATHS[m.icon] ? m.icon : "bookmark", group: xmPlain(m.group, 40), parent: xmPlain(m.parent, 40), dest: xmIsObj(m.dest) ? { type: m.dest.type === "page" ? "page" : "route", href: xmPlain(m.dest.href, 120), slug: xmPlain(m.dest.slug, 60) } : { type: "route", href: "/dashboard" }, visibility: vis(m.visibility) || { audiences: [], companies: [] }, enabled: m.enabled !== false, order: Number.isFinite(+m.order) ? +m.order : 999 }));
    L.pages = xmIsObj(L.pages) ? L.pages : {};
    for (const [k, p] of Object.entries(L.pages)) { if (!xmIsObj(p)) { delete L.pages[k]; continue; } if (p.title != null) p.title = xmPlain(p.title, 60); if (p.description != null) p.description = xmPlain(p.description, 200); if (p.layout && !["one", "two", "full"].includes(p.layout)) delete p.layout; if (p.density && !XM_DENSITY.some((d) => d[0] === p.density)) delete p.density; p.blocks = xmIsObj(p.blocks) ? p.blocks : {}; for (const b of Object.values(p.blocks)) if (xmIsObj(b)) { if (b.title != null) b.title = xmPlain(b.title, 60); if (b.visibility) b.visibility = vis(b.visibility); } p.added = xmAddedList(p.added, vis); }
    L.customPages = xmIsObj(L.customPages) ? L.customPages : {};
    for (const [slug, p] of Object.entries(L.customPages)) { if (!xmIsObj(p) || !/^[a-z0-9-]{1,60}$/.test(slug)) { delete L.customPages[slug]; continue; } p.name = xmPlain(p.name, 60) || slug; p.title = xmPlain(p.title, 60) || p.name; p.description = xmPlain(p.description, 200); p.module = xmPlain(p.module, 40); p.icon = ICON_PATHS[p.icon] ? p.icon : "bookmark"; p.layout = ["one", "two", "full"].includes(p.layout) ? p.layout : "two"; p.visibility = vis(p.visibility) || { audiences: [], companies: [] }; p.enabled = p.enabled !== false; p.blocks = xmAddedList(p.blocks, vis); }
    L.labels = xmIsObj(L.labels) ? L.labels : {};
    for (const [k, v] of Object.entries(L.labels)) { if (typeof v !== "string" || !v.trim()) delete L.labels[k]; else L.labels[k] = xmPlain(v, 300); }
    L.customTerms = (Array.isArray(L.customTerms) ? L.customTerms : []).filter((t) => xmIsObj(t) && t.find).map((t) => ({ id: xmPlain(t.id, 40) || xmId("t"), find: xmPlain(t.find, 120), to: xmPlain(t.to, 300), kind: ["field", "button", "helper", "page"].includes(t.kind) ? t.kind : "field" })).slice(0, 200);
    const T = xmIsObj(L.typography) ? L.typography : {};
    L.typography = { font: XM_FONTS.some((f) => f[0] === T.font) ? T.font : "look", size: XM_SIZES.includes(String(T.size)) ? String(T.size) : "default", headingWeight: XM_HEAD_W.includes(String(T.headingWeight)) ? String(T.headingWeight) : "default", bodyWeight: XM_BODY_W.includes(String(T.bodyWeight)) ? String(T.bodyWeight) : "default", buttonWeight: XM_BTN_W.includes(String(T.buttonWeight)) ? String(T.buttonWeight) : "default" };
    if (!XM_DENSITY.some((d) => d[0] === L.density)) L.density = "standard";
  };
  layer(c);
  const ov = xmIsObj(c.overrides) ? c.overrides : {};
  c.overrides = {};
  for (const [k, v] of Object.entries(ov)) { if (!xmIsObj(v)) continue; const ok = (k.startsWith("role:") && XM_AUD_LABEL[k.slice(5)] && k !== "role:everyone") || (k.startsWith("company:") && co(k.slice(8))); if (!ok) continue; const L = xmMerge({}, v); layer(L); for (const key of ["nav", "pages", "customPages", "labels", "customTerms", "typography"]) if (JSON.stringify(L[key]) === JSON.stringify(xmEmpty()[key]) || (key === "customTerms" && !L[key].length)) delete L[key]; if (L.density === "standard" && !("density" in v)) delete L.density; c.overrides[k] = L; }
  c.schema = XM_SCHEMA;
  return c;
}
function xmAddedList(list, vis) {
  return (Array.isArray(list) ? list : []).filter((x) => xmIsObj(x) && x.id).map((x) => {
    const o = { id: xmPlain(x.id, 40), kind: x.kind === "section" ? "section" : "component", title: xmPlain(x.title, 60), description: xmPlain(x.description, 200), size: XM_SIZE_OPTS.some((s) => s[0] === x.size) ? x.size : "medium", visibility: vis(x.visibility) || { audiences: [], companies: [] }, enabled: x.enabled !== false, anchor: xmIsObj(x.anchor) && ["start", "end", "before", "after", "into"].includes(x.anchor.where) ? { where: x.anchor.where, block: xmPlain(x.anchor.block, 80) } : { where: "end" } };
    if (o.kind === "component") { o.component = XM_COMPONENTS[x.component] ? x.component : "text"; o.config = xmCompConfig(o.component, x.config); }
    else o.children = xmAddedList(x.children, vis).filter((c) => c.kind === "component");
    return o;
  }).slice(0, 60);
}
const xmId = (p = "x") => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* ---- state slice + reducers: the draft, the published configuration and the immutable version list ---- */
{ const _fsXm = freshState; freshState = function () { const S = _fsXm(); S.xmDraft = null; S.xmPublished = null; S.xmVersions = []; S.xmDownloads = []; return S; }; }
function xmPublishInto(S, ctx, cfg, extra) {
  const n = S.xmVersions.length + 1, prev = S.xmPublished?.config || null;
  const changes = xmDiff(prev, cfg);
  const v = { n, at: ctx.now, by: ctx.actor.displayName, byId: ctx.actor.id, note: xmPlain(extra.note, 200), config: cfg, changes: changes.slice(0, 300).map((c) => ({ cat: c.cat, kind: c.kind, text: c.text })), restoredFrom: extra.restoredFrom || null, importedFrom: extra.importedFrom || null, impact: extra.impact || null };
  S.xmVersions.push(v);
  S.xmPublished = { version: n, at: ctx.now, by: ctx.actor.displayName, config: cfg };
  S.xmDraft = null;
  return v;
}
Object.assign(R, {
  "xm.draftSave"(S, p, ctx) {
    ctx.need(XM_PERM.manage);
    const cfg = xmSanitize(p.config);
    S.xmDraft = { config: cfg, savedAt: ctx.now, savedBy: ctx.actor.displayName, note: xmPlain(p.note, 200), source: p.source === "import" ? "import" : "editor", basedOn: S.xmPublished?.version || 0 };
    ctx.audit({ module: "admin", action: "UPDATE", entityType: "ExperienceConfig", entityId: "draft", summary: `${ctx.actor.displayName} saved a Page & Experience draft${p.note ? ` — ${xmPlain(p.note, 80)}` : ""}.` });
  },
  "xm.draftDiscard"(S, p, ctx) {
    ctx.need(XM_PERM.manage);
    if (!S.xmDraft) fail("There is no saved draft to discard.");
    S.xmDraft = null;
    ctx.audit({ module: "admin", action: "DELETE", entityType: "ExperienceConfig", entityId: "draft", summary: `${ctx.actor.displayName} discarded the Page & Experience draft.` });
  },
  "xm.publish"(S, p, ctx) {
    ctx.need(XM_PERM.publish);
    const cfg = xmSanitize(p.config);
    if (S.xmPublished && !xmDiff(S.xmPublished.config, cfg).length) fail("Nothing has changed since the published configuration.");
    const v = xmPublishInto(S, ctx, cfg, { note: p.note, impact: p.impact });
    ctx.audit({ module: "admin", action: "POST", entityType: "ExperienceConfig", entityId: `v${v.n}`, summary: `${ctx.actor.displayName} published Page & Experience configuration version ${v.n} (${v.changes.length} change${v.changes.length === 1 ? "" : "s"})${p.note ? ` — ${xmPlain(p.note, 80)}` : ""}.` });
  },
  "xm.restore"(S, p, ctx) {
    ctx.need(XM_PERM.restore);
    const src = S.xmVersions.find((v) => v.n === Number(p.version));
    if (!src) fail("That version doesn't exist.");
    if (S.xmPublished && !xmDiff(S.xmPublished.config, src.config).length) fail(`Version ${src.n} is identical to what is published now.`);
    const v = xmPublishInto(S, ctx, xmClone(src.config), { note: p.note || `Restored from version ${src.n}`, restoredFrom: src.n });
    ctx.audit({ module: "admin", action: "POST", entityType: "ExperienceConfig", entityId: `v${v.n}`, summary: `${ctx.actor.displayName} restored Page & Experience configuration version ${src.n} as version ${v.n}. Only navigation, page structure, components, labels, typography and visibility changed — no business data was touched.` });
  },
  "xm.import"(S, p, ctx) {
    ctx.need(XM_PERM.import);
    const res = xmValidateImport(p.pkg);
    if (res.errors.length) fail(`The configuration file was rejected: ${res.errors[0]}`);
    S.xmDraft = { config: res.config, savedAt: ctx.now, savedBy: ctx.actor.displayName, note: `Imported from ${xmPlain(p.fileName, 80) || "a configuration file"}`, source: "import", basedOn: S.xmPublished?.version || 0, importMeta: { fileName: xmPlain(p.fileName, 80), version: res.meta.uiConfigurationVersion ?? null, createdBy: xmPlain(res.meta.createdBy, 60), createdDate: xmPlain(res.meta.createdDate, 40), warnings: res.warnings.slice(0, 20) } };
    ctx.audit({ module: "admin", action: "CREATE", entityType: "ExperienceConfig", entityId: "draft", summary: `${ctx.actor.displayName} imported a Page & Experience configuration from ${xmPlain(p.fileName, 60) || "a file"} as a draft (not published).` });
  },
  "xm.download"(S, p, ctx) {
    ctx.need(XM_PERM.export);
    const rec = { id: ctx.id("xd"), at: ctx.now, by: ctx.actor.displayName, file: xmPlain(p.file, 120), version: p.version ?? null, kind: xmPlain(p.kind, 40) };
    S.xmDownloads.push(rec);
    ctx.audit({ module: "admin", action: "EXPORT", entityType: "ExperienceConfig", entityId: p.version != null ? `v${p.version}` : "current", summary: `${ctx.actor.displayName} downloaded ${rec.file}.` });
  },
});

/* ---- comparing two configurations: Added / Removed / Changed / Moved, grouped by area ---- */
const XM_CAT = { nav: "Navigation", pages: "Pages", customPages: "Pages", labels: "Terminology", customTerms: "Terminology", typography: "Typography", density: "Density", overrides: "Role & company views" };
const XM_SEP = "\u001f"; // path separator for flattened configurations (keys themselves contain "/")
function xmFlatten(o, path = [], out = new Map()) {
  if (Array.isArray(o)) { if (o.some((x) => xmIsObj(x) && x.id)) o.forEach((x) => xmFlatten(x, [...path, `#${x.id}`], out)); else out.set(path.join(XM_SEP), JSON.stringify(o)); return out; }
  if (xmIsObj(o)) { const keys = Object.keys(o); if (!keys.length) return out; for (const k of keys) xmFlatten(o[k], [...path, k], out); return out; }
  out.set(path.join(XM_SEP), o);
  return out;
}
function xmPathText(path, a, b) {
  const seg = path.split(XM_SEP); const cat = XM_CAT[seg[0]] || seg[0];
  const names = { groups: "group", items: "menu", tabs: "submenu", custom: "custom menu", blocks: "section", added: "added component", children: "component", label: "label", title: "title", hidden: "hidden", order: "position", icon: "icon", visibility: "visible to", description: "description", layout: "layout", density: "density", size: "size", enabled: "enabled", config: "settings", component: "component", group: "group", dest: "opens", font: "font", headingWeight: "heading weight", bodyWeight: "body weight", buttonWeight: "button weight", anchor: "placed" };
  const look = (id) => { for (const src of [b, a]) { const m = JSON.stringify(src || {}).match(new RegExp(`"id":"${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^}]*?"(?:label|title|name)":"([^"]*)"`)); if (m) return m[1]; } return id; };
  const words = [];
  let scope = "";
  for (let i = 0; i < seg.length; i++) {
    const s = seg[i];
    if (i === 0) { if (s === "overrides") { const k = seg[1] || ""; scope = k.startsWith("role:") ? `${XM_AUD_LABEL[k.slice(5)] || k.slice(5)} view` : `${co(k.slice(8))?.displayName || k.slice(8)} view`; i++; continue; } continue; }
    if (s.startsWith("#")) { words.push(`“${look(s.slice(1))}”`); continue; }
    if (seg[i - 1] === "pages" || seg[i - 1] === "customPages") { words.push(`page “${xmPageName(s)}”`); continue; }
    if (seg[i - 1] === "items" || seg[i - 1] === "groups") { words.push(`${names[seg[i - 1]]} “${xmNavName(s)}”`); continue; }
    if (seg[i - 1] === "tabs") { words.push(`submenu “${xmTabName(s)}”`); continue; }
    if (seg[i - 1] === "blocks") { words.push(`section “${xmTitleCase(s)}”`); continue; }
    if (seg[i - 1] === "labels") { words.push(`term “${XM_TERM_BY_KEY[s]?.text || s}”`); continue; }
    if (["items", "groups", "tabs", "custom", "blocks", "added", "children", "pages", "customPages", "labels", "customTerms", "nav", "hidden", "enabled"].includes(s)) continue;
    if (names[s]) { words.push(names[s]); continue; }
    words.push(s);
  }
  return { cat: seg[0] === "overrides" ? `${XM_CAT.overrides} — ${scope}` : cat, text: words.join(" · ") || cat };
}
const xmTitleCase = (k) => String(k).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const xmValText = (v) => (v == null || v === "" ? "—" : typeof v === "string" && v.startsWith("[") ? v.replace(/[\[\]"]/g, "") : typeof v === "string" && v.startsWith("{") ? (() => { try { const o = JSON.parse(v); return Object.entries(o).map(([k, x]) => `${k}: ${Array.isArray(x) ? x.join(", ") || "all" : x}`).join("; "); } catch { return v; } })() : String(v));
/** one line for a whole object that is new or gone (a custom menu, an added component or section, a custom page) */
function xmWholeText(prefix, obj, cfg) {
  const seg = prefix.split(XM_SEP); const scope = seg[0] === "overrides" ? (seg[1].startsWith("role:") ? `${XM_AUD_LABEL[seg[1].slice(5)] || seg[1]} view` : `${co(seg[1].slice(8))?.displayName || seg[1]} view`) : "";
  const s = scope ? seg.slice(2) : seg; const cat = scope ? `${XM_CAT.overrides} — ${scope}` : XM_CAT[s[0]] || s[0];
  let text = "";
  if (s[0] === "nav" && s[1] === "custom") text = `${obj.kind === "submenu" ? "submenu" : "menu"} “${obj.label}”${obj.kind === "submenu" ? ` under “${xmNavName(obj.parent)}”` : obj.group ? ` in group “${obj.group}”` : ""} — opens ${obj.dest?.type === "page" ? `page “${cfg?.customPages?.[obj.dest.slug]?.name || obj.dest.slug}”` : obj.dest?.href || "?"}`;
  else if (s[0] === "customPages") text = `page “${obj.name || s[1]}”${(obj.blocks || []).length ? ` with ${obj.blocks.length} component${obj.blocks.length === 1 ? "" : "s"}` : ""}`;
  else if (s[0] === "pages") { const page = xmPageName(s[1]); if (obj.kind === "section") text = `section “${obj.title}” on page “${page}”${(obj.children || []).length ? ` with ${obj.children.length} component${obj.children.length === 1 ? "" : "s"}` : ""}`; else text = `component “${obj.title || XM_COMPONENTS[obj.component]?.name || obj.component}” (${XM_COMPONENTS[obj.component]?.name || obj.component}) on page “${page}”${obj.anchor?.where && obj.anchor.where !== "end" ? `, ${obj.anchor.where}${obj.anchor.block ? ` “${xmTitleCase(obj.anchor.block)}”` : ""}` : ""}`; }
  else if (s[0] === "customTerms") text = `term “${obj.find}” → “${obj.to}”`;
  else text = `${s.slice(-2).join(" ")}`;
  return { cat, text };
}
function xmDiff(a, b) {
  const SA = xmSanitize(a || {}), SB = xmSanitize(b || {});
  const A1 = xmFlatten(SA), B1 = xmFlatten(SB);
  const empty = xmFlatten(xmEmpty());
  const out = [];
  const keys = new Set([...A1.keys(), ...B1.keys()]);
  // whole objects (by id, or a custom page) present on one side only → one line each
  const wholeA = new Set(), wholeB = new Set(), skip = [];
  const prefixesOf = (k) => { const seg = k.split(XM_SEP); const out2 = []; seg.forEach((s, i) => { if (s.startsWith("#") || (seg[i - 1] === "customPages")) out2.push(seg.slice(0, i + 1).join(XM_SEP)); }); return out2; };
  const hasPrefix = (map, p) => { for (const k of map.keys()) if (k === p || k.startsWith(p + XM_SEP)) return true; return false; };
  for (const k of keys) for (const p of prefixesOf(k)) {
    if (skip.some((x) => p.startsWith(x + XM_SEP))) continue;
    const inA = hasPrefix(A1, p), inB = hasPrefix(B1, p);
    if (inA && inB) continue;
    if (!skip.includes(p)) { skip.push(p); (inB ? wholeB : wholeA).add(p); }
  }
  const objAt = (cfg, p) => { let o = cfg; for (const s of p.split(XM_SEP)) { if (s.startsWith("#")) o = (Array.isArray(o) ? o : []).find((x) => x && x.id === s.slice(1)); else o = o?.[s]; if (o == null) return null; } return o; };
  for (const p of wholeB) { const o = objAt(SB, p); if (o) { const { cat, text } = xmWholeText(p, o, SB); out.push({ cat, kind: "added", path: p, text }); } }
  for (const p of wholeA) { const o = objAt(SA, p); if (o) { const { cat, text } = xmWholeText(p, o, SA); out.push({ cat, kind: "removed", path: p, text }); } }
  for (const k of keys) {
    if (k === "schema") continue;
    if (skip.some((p) => k === p || k.startsWith(p + XM_SEP))) continue;
    const va = A1.has(k) ? A1.get(k) : empty.get(k), vb = B1.has(k) ? B1.get(k) : empty.get(k);
    if (JSON.stringify(va) === JSON.stringify(vb)) continue;
    const { cat, text } = xmPathText(k, a, b);
    const last = k.split(XM_SEP).pop();
    const isOrder = last === "order" || k.endsWith(`anchor${XM_SEP}where`) || k.endsWith(`anchor${XM_SEP}block`);
    const isOnOff = last === "hidden" || last === "enabled";
    let kind = isOrder ? "moved" : va == null || va === "" ? "added" : vb == null || vb === "" ? "removed" : "changed";
    if (isOnOff) kind = (last === "hidden" ? vb === true : vb === false) ? "removed" : "added";
    const detail = kind === "moved" ? (va == null ? `now at position ${xmValText(vb)}` : `position ${xmValText(va)} → ${xmValText(vb)}`) : kind === "changed" ? `${xmValText(va)} → ${xmValText(vb)}` : kind === "added" ? (isOnOff ? "shown again" : xmValText(vb)) : (isOnOff ? "hidden" : xmValText(va));
    out.push({ cat, kind, path: k, text: `${text}: ${detail}` });
  }
  return out.sort((x, y) => x.cat.localeCompare(y.cat) || x.text.localeCompare(y.text));
}

/* ---- the configuration package (exports / imports): UI configuration only, never data or secrets ---- */
function xmPackage(cfg, meta = {}) {
  return { configurationSchema: XM_SCHEMA, erpVersion: XM_ERP_VERSION, uiConfigurationVersion: meta.version ?? null, organization: XM_ORG, companyScope: meta.scope || "Group (all companies)", kind: meta.kind || "full", createdBy: meta.createdBy || A?.user.displayName || "", createdDate: meta.createdDate || new Date().toISOString(), publishedDate: meta.publishedDate || null, note: meta.note || "", configuration: xmSanitize(cfg) };
}
function xmValidateImport(pkg) {
  const errors = [], warnings = [];
  if (!xmIsObj(pkg)) return { errors: ["The file is not a JSON object."], warnings, config: null, meta: {} };
  const meta = { ...pkg }; delete meta.configuration;
  if (pkg.configurationSchema !== XM_SCHEMA) errors.push(`Configuration schema ${pkg.configurationSchema ?? "(missing)"} is not supported (this platform reads schema ${XM_SCHEMA}).`);
  if (!pkg.erpVersion) warnings.push("No ERP version recorded in the file."); else if (pkg.erpVersion !== XM_ERP_VERSION) warnings.push(`Made with ERP version ${pkg.erpVersion}; this platform is ${XM_ERP_VERSION}.`);
  if (pkg.organization && pkg.organization !== XM_ORG) warnings.push(`The file was made for “${pkg.organization}”.`);
  if (!xmIsObj(pkg.configuration)) { errors.push("The file has no configuration section."); return { errors, warnings, config: null, meta }; }
  if (pkg.kind && pkg.kind !== "full") errors.push(`This is a ${pkg.kind} export; only a full configuration can be imported.`);
  const raw = pkg.configuration;
  const forbidden = ["password", "token", "secret", "apiKey", "credential", "bank", "payroll", "employees", "users"];
  for (const k of Object.keys(raw)) if (forbidden.some((f) => k.toLowerCase().includes(f.toLowerCase()))) errors.push(`Unexpected section “${k}” — a configuration file must not carry data or credentials.`);
  const known = ["schema", "nav", "pages", "customPages", "labels", "customTerms", "typography", "density", "overrides"];
  for (const k of Object.keys(raw)) if (!known.includes(k) && !forbidden.some((f) => k.toLowerCase().includes(f))) warnings.push(`Unknown section “${k}” was ignored.`);
  const checkLayer = (L, where) => {
    for (const k of Object.keys(L.nav?.items || {})) if (!SECTION_BY_KEY[k]) errors.push(`${where}: menu “${k}” does not exist in this platform.`);
    for (const k of Object.keys(L.nav?.tabs || {})) { const [sec, href] = k.split("|"); if (!SECTION_BY_KEY[sec] || !(XM_SEC_ORIG.find((s) => s.key === sec)?.tabs || []).some((t) => t.href === href)) errors.push(`${where}: submenu “${k}” does not exist.`); }
    for (const m of L.nav?.custom || []) { if (m.dest?.type === "route" && !ROUTES.some((r) => r.re.test(m.dest.href || ""))) errors.push(`${where}: custom menu “${m.label}” opens “${m.dest?.href}”, which is not a page here.`); if (m.dest?.type === "page" && !(raw.customPages || {})[m.dest.slug]) errors.push(`${where}: custom menu “${m.label}” opens a page “${m.dest?.slug}” that is not in the file.`); for (const x of m.visibility?.audiences || []) if (!XM_AUD_LABEL[x]) errors.push(`${where}: unknown audience “${x}”.`); for (const x of m.visibility?.companies || []) if (!co(x)) errors.push(`${where}: unknown company “${x}”.`); }
    for (const [k, p] of Object.entries(L.pages || {})) { if (!xmPageDef(k)) errors.push(`${where}: page “${k}” does not exist in this platform.`); for (const add of p.added || []) for (const c of add.kind === "section" ? add.children || [] : [add]) if (c.component && !XM_COMPONENTS[c.component]) errors.push(`${where}: component “${c.component}” is not in this platform's library.`); }
    for (const [slug, p] of Object.entries(L.customPages || {})) for (const c of p.blocks || []) for (const x of c.kind === "section" ? c.children || [] : [c]) if (x.component && !XM_COMPONENTS[x.component]) errors.push(`${where}: page “${slug}” uses component “${x.component}”, which is not in the library.`);
    for (const k of Object.keys(L.labels || {})) if (!XM_TERM_BY_KEY[k]) warnings.push(`${where}: term “${k}” is not in the catalog and was ignored.`);
    const T = L.typography || {};
    if (T.font && !XM_FONTS.some((f) => f[0] === T.font)) errors.push(`${where}: font “${T.font}” is not approved.`);
    if (T.size && T.size !== "default" && !XM_SIZES.includes(String(T.size))) errors.push(`${where}: base font size ${T.size} is not approved.`);
  };
  try { checkLayer(raw, "Group default"); for (const [k, v] of Object.entries(raw.overrides || {})) { if (!((k.startsWith("role:") && XM_AUD_LABEL[k.slice(5)]) || (k.startsWith("company:") && co(k.slice(8))))) errors.push(`Override “${k}” refers to an unknown role or company.`); else if (xmIsObj(v)) checkLayer(v, k); } } catch (e) { errors.push(`The file could not be read: ${e.message}`); }
  let config = null;
  if (!errors.length) { config = xmSanitize(raw); for (const k of Object.keys(config.labels)) if (!XM_TERM_BY_KEY[k]) delete config.labels[k]; }
  return { errors, warnings, config, meta };
}
/** a store-only ZIP that also takes binary parts (the PDF); same layout as export.js's zipStore */
function xmZip(files) {
  const parts = [], central = []; let offset = 0;
  const u16 = (n) => [n & 255, (n >> 8) & 255], u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const [name, body] of files) {
    const nameB = ENC.encode(name), data = typeof body === "string" ? ENC.encode(body) : body, crc = crc32(data);
    const head = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0x21), ...u16(0x5a21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameB.length), ...u16(0)]);
    parts.push(head, nameB, data);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0x21), ...u16(0x5a21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nameB);
    offset += head.length + nameB.length + data.length;
  }
  const cdStart = offset, cdLen = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdLen), ...u32(cdStart), ...u16(0)]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((s, p) => s + p.length, 0)); let o = 0;
  for (const p of all) { out.set(p, o); o += p.length; }
  return out;
}

/* ---- the terminology catalog: internal keys never change; only the display text does ---- */
const XM_TERMS = [
  ["page", "employees", "Employees"], ["page", "employee-records", "Employee records"], ["page", "directory", "Directory"], ["page", "timesheets", "Timesheets"], ["page", "time-off", "Time off"], ["page", "approvals", "Approvals"], ["page", "documents", "Documents"], ["page", "reports", "Reports"], ["page", "history", "History"], ["page", "home", "Home"], ["page", "my-pay", "My Pay"],
  ["field", "name", "Name"], ["field", "employee", "Employee"], ["field", "company", "Company"], ["field", "department", "Department"], ["field", "position", "Position"], ["field", "manager", "Manager"], ["field", "type", "Type"], ["field", "started", "Started"], ["field", "status", "Status"], ["field", "hire-date", "Start date"], ["field", "employee-number", "Employee number"], ["field", "vendor", "Vendor"], ["field", "customer", "Customer"], ["field", "amount", "Amount"], ["field", "due", "Due"], ["field", "pay-day", "Pay day"], ["field", "vacation", "Vacation"], ["field", "sick", "Sick"], ["field", "personal", "Personal"], ["field", "banked-overtime", "Banked overtime"], ["field", "worked", "Worked"], ["field", "paid-hours", "Paid hours"],
  ["section", "quick-actions", "Quick actions"], ["section", "needs-attention", "Needs your attention"], ["section", "waiting-on-you", "Waiting on you"], ["section", "recent-activity", "Recent activity"], ["section", "coming-up", "Coming up"], ["section", "my-requests", "My requests & expenses"], ["section", "at-a-glance", "At a glance"], ["section", "money-glance", "Money at a glance"], ["section", "people-glance", "People at a glance"], ["section", "requests-expenses", "Requests & expenses"],
  ["button", "approve", "Approve"], ["button", "decline", "Decline"], ["button", "send-back", "Send back"], ["button", "request-time-off", "Request time off"], ["button", "enter-my-hours", "Enter my hours"], ["button", "submit-expense", "Submit an expense"], ["button", "new-request", "New request"], ["button", "add-employee", "Add employee"], ["button", "save", "Save"], ["button", "cancel", "Cancel"], ["button", "sign-in", "Sign in"], ["button", "download", "Download"], ["button", "all-of-them", "All of them →"], ["button", "open-approvals", "Open Approvals →"],
  ["helper", "approved-hours", "Approved hours go into the next payroll run."], ["helper", "all-caught-up", "All caught up."], ["helper", "nothing-waiting", "Nothing waiting on a decision."], ["helper", "menus-only", "Menus only show what the server would allow — switch role from the yellow bar to see it."],
];
const XM_TERM_BY_KEY = Object.fromEntries(XM_TERMS.map(([kind, key, text]) => [key, { kind, key, text }]));
const XM_TERM_KINDS = { page: "Page names", field: "Field labels", section: "Section titles", button: "Button labels", helper: "Helper text" };

/* ---- page registry: every page the shell links to, named for administrators; keyed by its route pattern ---- */
const XM_PAGE_NAMES = { "/dashboard": "Home", "/approvals": "Approvals", "/me/time": "My Time", "/me/time-off": "My Time Off", "/me/profile/events": "Calendar", "/me/requests": "My Requests & Expenses", "/me/expenses": "My Expenses", "/me/tasks": "My Tasks", "/me/profile": "My Profile", "/me/profile/benefits": "Pay & benefits", "/me/reviews": "My Reviews", "/me/certifications": "My Certificates", "/me/looks": "Look", "/me/pay": "My Pay", "/me/documents": "My Documents", "/team": "My Team", "/hr/employees": "Employee records", "/hr/employees/:id": "Employee record", "/people/directory": "Directory", "/people/org-chart": "Org chart", "/hr/departments": "Departments", "/hr/onboarding": "Onboarding", "/hr/hiring": "Hiring", "/hr/timesheets": "Timesheets", "/hr/leave": "Time off (HR)", "/hr/requests": "Employee requests", "/payroll/timesheet-status": "Timesheets by pay period", "/hr/reviews": "Performance reviews", "/hr/certifications": "Certificates (HR)", "/hr/benefits": "Benefits (HR)", "/payroll/runs": "Pay runs", "/payroll/statements": "Pay statements", "/payroll/yearend": "Year-end", "/payroll/remittances": "CRA remittances", "/payroll/roe": "Records of Employment", "/payroll/settings": "Payroll settings", "/finance": "Finance overview", "/finance/journals": "Journal entries", "/finance/recurring": "Recurring entries", "/finance/periods": "Month-end", "/finance/assets": "Fixed assets", "/finance/budgets": "Budgets", "/finance/accounts": "Chart of accounts", "/finance/interco": "Inter-company", "/finance/ap": "Accounts Payable — Bills", "/finance/ap/vendors": "Vendors", "/finance/ap/attachments": "AP files", "/finance/expenses": "Employee claims", "/finance/ar": "Accounts Receivable — Invoices", "/finance/banking": "Banking", "/procurement/requests": "Purchase requests", "/procurement/pos": "Purchase orders", "/procurement/receiving": "Receiving", "/procurement/match": "Matching", "/sales/orders": "Sales orders", "/sales/shipments": "Shipments", "/inventory/stock": "Stock", "/inventory/items": "Items & stock", "/projects": "Projects", "/documents": "Documents", "/documents/contracts": "Contracts", "/reports": "Reports", "/history": "History" };
function xmPageRegistry() {
  const out = [], seen = new Set();
  const nav = (() => { try { return XM_NAV_ORIG_FN(); } catch { return []; } })();
  const groupOf = {}; for (const g of nav) for (const i of g.items) groupOf[i.section] = g.label;
  for (const sec of XM_SEC_ORIG) for (const t of sec.tabs) { if (seen.has(t.href) || t.href.startsWith("/admin/")) continue; seen.add(t.href); out.push({ key: t.href, name: XM_PAGE_NAMES[t.href] || t.label, module: sec.label, group: groupOf[sec.key] || "", kind: "system", section: sec.key }); }
  for (const [k, n] of Object.entries(XM_PAGE_NAMES)) if (!seen.has(k)) { seen.add(k); out.push({ key: k, name: n, module: k.startsWith("/hr/employees") ? "People" : "Other", group: "", kind: "system" }); }
  for (const [slug, p] of Object.entries(xmWork().customPages || {})) out.push({ key: `/pages/${slug}`, name: p.name, module: p.module || "Custom pages", group: "", kind: "custom", slug });
  return out;
}
const xmPageDef = (key) => xmPageRegistry().find((p) => p.key === key) || null;
const xmPageName = (key) => XM_PAGE_NAMES[key] || xmPageDef(key)?.name || key;
const xmNavName = (key) => XM_SEC_ORIG.find((s) => s.key === key)?.label || key;
const xmTabName = (k) => { const [sec, href] = String(k).split("|"); return XM_SEC_ORIG.find((s) => s.key === sec)?.tabs.find((t) => t.href === href)?.label || k; };

/* ---- the Administration tab for the manager, then the snapshot of the original sections that every render starts from ---- */
SECTION_BY_KEY.admin.tabs.push({ href: "/admin/experience", label: "Page & Experience", perm: XM_PERM.manage });
SECTIONS.forEach((s) => s.tabs.forEach((t) => { t._xmLabel = t.label; t._xmPerm = t.perm; }));
const XM_SEC_ORIG = SECTIONS.map((s) => ({ key: s.key, label: s.label, tabs: s.tabs.slice() }));
const XM_NAV_ORIG_FN = buildNav;
const XM_GROUP_ORDER = ["Home", "My work", "Me", "Team", "People", "Payroll", "Finance", "Operations", "Reports", "Administration"];
function xmResetSections() {
  for (let i = SECTIONS.length - 1; i >= 0; i--) if (SECTIONS[i]._xm) { delete SECTION_BY_KEY[SECTIONS[i].key]; SECTIONS.splice(i, 1); }
  for (const o of XM_SEC_ORIG) { const s = SECTION_BY_KEY[o.key]; s.label = o.label; s.tabs = o.tabs.slice(); s.tabs.forEach((t) => { t.label = t._xmLabel; t.perm = t._xmPerm; }); }
}
const xmDestHref = (m) => (m.dest?.type === "page" ? `/pages/${m.dest.slug}` : m.dest?.href || "/dashboard");
function xmDestAllowed(m, a = A) {
  if (m.dest?.type === "page") { const p = xmCurrentCfg()?.customPages?.[m.dest.slug]; return !!p && p.enabled !== false && xmVisible(p.visibility, a); }
  const r = ROUTES.find((x) => x.re.test(m.dest?.href || "")); if (!r) return false;
  if (!r.perm) return true; try { return typeof r.perm === "function" ? !!r.perm() : can(a, r.perm); } catch { return false; }
}
/** mutate SECTIONS in place for this render: labels, hidden / audience-limited submenus, order, custom submenus and custom menus */
function xmApplyNav(eff) {
  xmResetSections();
  const nav = eff?.nav || {};
  const tcfg = nav.tabs || {};
  for (const s of SECTIONS) {
    s.tabs.forEach((t, i) => { const c = tcfg[`${s.key}|${t.href}`]; t._xmOrder = c?.order ?? i; if (!c) return; if (c.label) t.label = c.label; const orig = t._xmPerm; if (c.hidden) t.perm = () => false; else if (c.visibility && (c.visibility.audiences?.length || c.visibility.companies?.length)) t.perm = () => hasPermA(orig) && xmVisible(c.visibility, A); });
    for (const m of nav.custom || []) if (m.kind === "submenu" && m.parent === s.key && m.enabled !== false) s.tabs.push({ href: xmDestHref(m), label: m.label, perm: () => xmVisible(m.visibility, A) && xmDestAllowed(m), _xmCustom: m.id, _xmOrder: m.order ?? 999 });
    s.tabs.sort((a, b) => a._xmOrder - b._xmOrder);
    const c = (nav.items || {})[s.key]; if (c?.label) s.label = c.label;
  }
  for (const m of nav.custom || []) if (m.kind === "menu" && m.enabled !== false) { const sec = { key: `xm-${m.id}`, label: m.label, _xm: true, tabs: [{ href: xmDestHref(m), label: m.label, perm: () => xmVisible(m.visibility, A) && xmDestAllowed(m) }] }; SECTIONS.push(sec); SECTION_BY_KEY[sec.key] = sec; }
}
/** the sidebar: the platform's own menu, then the administrator's changes on top (rename, icon, hide, move, reorder, custom menus, group labels) */
buildNav = function () {
  const groups = XM_NAV_ORIG_FN();
  const eff = XM.eff; if (!eff || !A) return groups;
  const nav = eff.nav || {}, gi = nav.groups || {}, it = nav.items || {};
  let list = [];
  groups.forEach((g, go) => g.items.forEach((i, io) => list.push({ ...i, group: g.label, go, io })));
  list = list.filter((i) => !it[i.section]?.hidden && xmVisible(it[i.section]?.visibility)).map((i) => { const c = it[i.section]; return c ? { ...i, title: c.label || i.title, icon: c.icon || i.icon, group: c.group || i.group, order: c.order } : i; });
  for (const m of nav.custom || []) if (m.kind === "menu" && m.enabled !== false && xmVisible(m.visibility) && xmDestAllowed(m)) list.push({ title: m.label, href: xmDestHref(m), icon: ICON_PATHS[m.icon] ? m.icon : "bookmark", section: `xm-${m.id}`, badge: 0, group: m.group || "Home", order: m.order, custom: true });
  const names = [...XM_GROUP_ORDER]; for (const i of list) if (!names.includes(i.group)) names.push(i.group); for (const g of Object.keys(gi)) if (!names.includes(g)) names.push(g);
  const ordered = names.map((g, idx) => ({ g, o: gi[g]?.order ?? idx * 10 })).sort((a, b) => a.o - b.o).map((x) => x.g);
  const out = [];
  for (const g of ordered) {
    if (gi[g]?.hidden || !xmVisible(gi[g]?.visibility)) continue;
    const items = list.filter((i) => i.group === g).map((i, n) => ({ ...i, _o: i.order ?? (i.io != null ? i.io * 10 : 500 + n) })).sort((a, b) => a._o - b._o);
    if (items.length) out.push({ label: gi[g]?.label || g, items, flat: g === "Home" });
  }
  return out;
};
ICON_PATHS.bookmark = '<path d="M6 3h12v18l-6-4-6 4z"/>';
ICON_PATHS.layout = '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>';
ICON_PATHS.puzzle = '<path d="M10 3h4v3a2 2 0 1 0 2 2h3v4h-3a2 2 0 1 0 0 4h3v4h-4v-3a2 2 0 1 0-4 0v3H7v-3a2 2 0 1 0-2-2H3v-4h2a2 2 0 1 0 2-2V3z"/>';
ICON_PATHS.eye = '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
ICON_PATHS.type = '<path d="M5 5h14v3M12 5v14M9 19h6"/>';
ICON_PATHS.flag = '<path d="M5 21V4h12l-2 4 2 4H5"/>';
ICON_PATHS.globe = '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>';
const XM_ICONS = ["home", "check", "clock", "calendar", "inbox", "tasks", "user", "wallet", "folder", "users", "directory", "calendarclock", "star", "banknote", "book", "receipt", "filetext", "piggybank", "cart", "boxes", "briefcase", "chart", "shield", "bookmark", "layout", "puzzle", "flag", "globe", "map", "truck", "package", "target", "landmark", "building", "clipboard", "sheet", "message", "award", "heart", "tag", "gauge", "network", "gitbranch", "scroll", "settings", "help", "history", "search", "lock", "eye", "type", "paperclip", "handcoins", "repeat", "listtree", "arrows", "calendarlock"];

/* ---- live state of the manager on this device ---- */
const XM = { eff: null, previewOn: false, preview: null, edit: false, work: null, scope: "default", realAuth: null, curPattern: null, hooked: false };
const XM_WORK_KEY = "haico-xm-work-v1";
function xmWork() {
  if (XM.work) return XM.work;
  let local = null; try { local = JSON.parse(localStorage.getItem(XM_WORK_KEY) || "null"); } catch { local = null; }
  XM.work = xmSanitize(local?.config || S.xmDraft?.config || S.xmPublished?.config || xmEmpty());
  return XM.work;
}
function xmWorkSet(cfg) { XM.work = xmSanitize(cfg); try { localStorage.setItem(XM_WORK_KEY, JSON.stringify({ config: XM.work, at: new Date().toISOString() })); } catch { /* no storage */ } }
function xmWorkTouch() { xmWorkSet(XM.work); }
function xmWorkReset(cfg) { XM.work = null; try { localStorage.removeItem(XM_WORK_KEY); } catch { /* ignore */ } if (cfg) xmWorkSet(cfg); }
const xmBaseline = () => S.xmDraft?.config || S.xmPublished?.config || xmEmpty();
const xmUnsaved = () => xmDiff(xmBaseline(), xmWork());
/** the layer the editors write to: the group default, or one role / company override */
function xmLayer() { const w = xmWork(); if (XM.scope === "default") return w; w.overrides = w.overrides || {}; return (w.overrides[XM.scope] = w.overrides[XM.scope] || {}); }
const xmScopeLabel = () => (XM.scope === "default" ? "Group default" : XM.scope.startsWith("role:") ? `${XM_AUD_LABEL[XM.scope.slice(5)]} view` : `${co(XM.scope.slice(8))?.displayName || XM.scope.slice(8)} override`);
/** what the editors show for the current scope: the group default merged with that scope's override */
function xmScopeEff() { const w = xmWork(); if (XM.scope === "default") { const b = xmMerge(xmEmpty(), w); delete b.overrides; return b; } const b = xmMerge(xmEmpty(), w); delete b.overrides; return xmMerge(b, w.overrides?.[XM.scope] || {}); }
const xmCurrentCfg = () => (XM.previewOn ? xmWork() : S.xmPublished?.config || null);
function xmSetPath(obj, path, value) { let o = obj; for (let i = 0; i < path.length - 1; i++) { const k = path[i]; if (!xmIsObj(o[k])) o[k] = {}; o = o[k]; } if (value === undefined) delete o[path[path.length - 1]]; else o[path[path.length - 1]] = value; }
function xmGetPath(obj, path) { let o = obj; for (const k of path) { if (!xmIsObj(o)) return undefined; o = o[k]; } return o; }
/** write one setting into the current scope layer, then re-render */
function xmSet(path, value) { xmSetPath(xmLayer(), path, value); xmWorkTouch(); safeRender(); }

/* ---- typography, density: CSS variables on the document, never inline styles in views ---- */
function xmStyleCss(eff) {
  if (!eff) return "";
  const T = eff.typography || {}, f = XM_FONTS.find((x) => x[0] === T.font);
  let css = "";
  if (f && f[2]) { const stack = `${f[2]},system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`; css += `:root,:root[data-look="harbour"],:root[data-look="navy"],:root[data-look="moss"],:root[data-look="graphite"]{--font-ui:${stack};--font-head:${stack}}`; }
  const zoom = { 12: 0.88, 13: 0.94, 14: 1, 15: 1.07, 16: 1.14 }[T.size];
  if (zoom && zoom !== 1) css += `.content .wrap{zoom:${zoom}}`;
  if (T.headingWeight && T.headingWeight !== "default") css += `h1,h2,h3,.ph h1,.big-h,.card-h,.hcard-h h2,.hcard-h h3,.h2{font-weight:${T.headingWeight}}`;
  if (T.bodyWeight && T.bodyWeight !== "default") css += `body,.content{font-weight:${T.bodyWeight}}`;
  if (T.buttonWeight && T.buttonWeight !== "default") css += `.btn,.qa2 button,.side .item,.stabs button{font-weight:${T.buttonWeight}}`;
  return css;
}
const XM_DENSITY_CSS = {
  compact: `.content[data-density="compact"]{--cell-py:5px;--thead-h:30px}.content[data-density="compact"] .t td{padding-top:5px;padding-bottom:5px;font-size:12.5px}.content[data-density="compact"] .card-b{padding:6px 12px 12px}.content[data-density="compact"] .card-h{padding:10px 12px 4px;font-size:13.5px}.content[data-density="compact"] .hcard-h{padding:7px 12px}.content[data-density="compact"] .grid,.content[data-density="compact"] .hgrid,.content[data-density="compact"] .hcol{gap:10px}.content[data-density="compact"] .stat{padding:9px 12px}.content[data-density="compact"] .stat .v{font-size:18px}.content[data-density="compact"] .ph{margin-bottom:12px}`,
  detailed: `.content[data-density="detailed"]{--cell-py:12px;--thead-h:42px}.content[data-density="detailed"] .t td{padding-top:12px;padding-bottom:12px;font-size:14px}.content[data-density="detailed"] .card-b{padding:12px 20px 20px}.content[data-density="detailed"] .card-h{padding:18px 20px 8px}.content[data-density="detailed"] .hcard-h{padding:12px 16px}.content[data-density="detailed"] .grid,.content[data-density="detailed"] .hgrid,.content[data-density="detailed"] .hcol{gap:18px}.content[data-density="detailed"] .stat{padding:18px 20px}.content[data-density="detailed"] .kv{gap:10px 20px;font-size:14px}`,
};
let XM_FONT_LINK = false;
function xmApplyStyle(eff) {
  const css = xmStyleCss(eff);
  let el = document.getElementById("xm-style"); if (!el) { el = document.createElement("style"); el.id = "xm-style"; document.head.appendChild(el); }
  if (el.textContent !== css) el.textContent = css;
  const font = eff?.typography?.font;
  if ((font === "inter" || font === "roboto") && !XM_FONT_LINK) { XM_FONT_LINK = true; const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;600;700&display=swap"; document.head.appendChild(l); }
}
injectCss(`
${XM_DENSITY_CSS.compact}${XM_DENSITY_CSS.detailed}
.xm-pv{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px;padding:6px 16px;background:var(--t-ink-bg);color:var(--t-ink);font-size:12.5px}
.xm-pv b{letter-spacing:.08em;font-size:11px}.xm-pv .btn{height:28px;padding:0 10px;font-size:12px;box-shadow:none}.xm-pv .seg{padding:2px;background:transparent;border-color:rgba(255,255,255,.3)}.xm-pv .seg button{color:inherit;padding:4px 10px}.xm-pv .seg button.on{background:var(--t-ink);color:var(--t-ink-bg)}
.xm-editable{position:relative;outline:1px dashed transparent;outline-offset:3px;transition:outline-color .15s}.xm-editable:hover{outline-color:var(--primary)}
.xm-tools{position:absolute;top:-11px;right:8px;z-index:5;display:flex;gap:2px;background:var(--card);border:1px solid var(--border);border-radius:999px;padding:2px 4px;box-shadow:var(--shadow);font-size:11px;opacity:.92}
.xm-tools button{border:0;background:none;font:inherit;font-size:11px;font-weight:600;color:var(--primary);padding:2px 6px;border-radius:999px;cursor:pointer;line-height:1.4}.xm-tools button:hover{background:var(--muted)}.xm-tools .k{color:var(--muted-fg);font-weight:500;padding:2px 4px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.xm-tools.comp{top:-9px;right:6px;transform:scale(.9);transform-origin:top right;opacity:0;pointer-events:none;transition:opacity .12s}
.xm-editable:hover>.xm-tools.comp,.xm-editable:focus-within>.xm-tools.comp{opacity:.96;pointer-events:auto}
.xm-hidden-stub{border:1px dashed var(--border);border-radius:var(--r);padding:8px 14px;font-size:12.5px;color:var(--muted-fg);display:flex;align-items:center;gap:10px;background:var(--bg)}
.xm-addbar{display:flex;justify-content:center;margin:6px 0 14px}.xm-addbar button{border:1px dashed var(--border);background:var(--card);color:var(--primary);font:inherit;font-size:12px;font-weight:600;border-radius:999px;padding:5px 14px;cursor:pointer}.xm-addbar button:hover{background:var(--muted)}
.xm-grid{display:grid;gap:14px;grid-template-columns:repeat(6,minmax(0,1fr));align-items:start;margin-bottom:18px}.xm-grid.one{grid-template-columns:minmax(0,1fr)}.xm-grid.one>*{grid-column:1/-1}
.xm-grid>.xm-size-small{grid-column:span 2}.xm-grid>.xm-size-medium{grid-column:span 3}.xm-grid>.xm-size-large{grid-column:1/-1}
@media (max-width:1000px){.xm-grid>.xm-size-small{grid-column:span 3}}@media (max-width:700px){.xm-grid>.xm-size-small,.xm-grid>.xm-size-medium{grid-column:1/-1}}
.xm-added .hcard,.xm-added .card{height:100%}.xm-sec>.hcard-h{margin-bottom:10px}.xm-sec .xm-grid{margin:0;padding:0 12px 12px}
.xm-kv{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;font-size:13px;padding:10px 14px}.xm-kv dt{color:var(--muted-fg)}.xm-kv dd{margin:0}
.xm-tiles{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));padding:10px 12px}
.xm-list{list-style:none;margin:0;padding:0}.xm-list li{display:flex;justify-content:space-between;gap:10px;padding:7px 14px;border-top:1px solid var(--border);font-size:12.5px}.xm-list li:first-child{border-top:0}.xm-list b{font-weight:600}.xm-list small{color:var(--muted-fg);display:block}
.xm-bars{padding:10px 14px}.xm-bars .hbar{margin:6px 0}
.xm-line{padding:8px 12px 4px}.xm-line svg{width:100%;height:auto;display:block}.xm-line .ax{font-size:9px;fill:var(--muted-fg)}.xm-line path.l{fill:none;stroke:var(--c1);stroke-width:2}.xm-line path.l2{fill:none;stroke:var(--c2);stroke-width:2}.xm-line .dot{fill:var(--c1)}
.xm-note{padding:10px 14px;font-size:13px;line-height:1.55;white-space:pre-wrap}.xm-ann{border-left:4px solid var(--ochre);background:var(--warn-bg);color:var(--warn);border-radius:var(--r)}
.xm-prog{padding:10px 14px}.xm-prog .tr{height:10px;border-radius:99px;background:var(--muted);overflow:hidden;margin:6px 0}.xm-prog .tr i{display:block;height:100%;border-radius:99px;background:var(--action)}
.xm-empty{padding:12px 14px;font-size:12.5px;color:var(--muted-fg)}
.xm-unavail{border:1px dashed var(--bad-line);border-radius:var(--r);padding:10px 14px;font-size:12.5px;color:var(--bad);background:var(--bad-bg)}
.xm-dragging{opacity:.4}.xm-over{outline:2px solid var(--primary);outline-offset:-2px}
`);

/* ---- page structure: sections and components discovered from what a view renders, then the configuration applied on top ---- */
const XM_BLOCK_NAMES = { hgreet: "Greeting", htiles: "Summary tiles", hgrid: "Attention & actions", qa2: "Quick actions", glance2: "At a glance", ptabs: "Profile tabs", hr3tabs: "Record tabs", looks: "Looks" };
const xmSlug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
function xmHeadingOf(el) {
  for (const cls of Object.keys(XM_BLOCK_NAMES)) if (el.classList.contains(cls)) return XM_BLOCK_NAMES[cls];
  const h = el.matches("h1,h2,h3,h4,.sect-l") ? el : el.querySelector("h1,h2,h3,h4,.card-h > span,.card-h,.hcard-h,.sect-l,.hh,.stat .l,.t thead th,.grp-l,legend,label");
  if (h) { const t = (h.querySelector("span, b") && h.matches(".card-h, .hcard-h, .hh") ? (h.querySelector("h2,h3,span,b")?.textContent || h.textContent) : h.textContent).replace(/\s*[·—]\s.*$/s, "").replace(/\d+/g, "").replace(/[→✓]/g, "").replace(/\s+/g, " ").trim(); if (t) return t.slice(0, 50); }
  return "";
}
function xmBlocksOf(root) {
  const skip = (el) => el.matches(".ph, .crumb, .msg, .stabs, script, style, .xm-tools, .xm-addbar, h1.big-h, p.big-p, .ptabs, .hr3tabs, .xm-added, .xm-hidden-stub, template");
  const items = []; const used = {};
  const keyOf = (title, el, i) => { let k = xmSlug(title) || `${el.tagName.toLowerCase()}-${i}`; if (used[k] != null) { used[k]++; k = `${k}-${used[k]}`; } else used[k] = 0; return k; };
  let i = 0;
  for (const el of [...root.children]) {
    if (!(el instanceof Element) || skip(el)) continue;
    const title = xmHeadingOf(el) || (el.classList.length ? xmTitleCase(el.classList[0]) : el.tagName.toLowerCase());
    const key = keyOf(title, el, i++);
    const compEls = [...el.querySelectorAll(":scope > .hcard, :scope > .card, :scope > .stat, :scope > section, :scope > .hcol > *, :scope > .tiles > *, :scope > .glance2 > *, :scope > .grid > *, :scope > .attn > *, :scope > .g2 > *, :scope > .g3 > *, :scope > .g4 > *")].filter((c) => c instanceof Element && !c.matches(".xm-tools, .xm-addbar") && c !== el);
    const cused = {}; let ci = 0;
    const comps = compEls.length > 1 ? compEls.map((c) => { const ct = xmHeadingOf(c) || (c.classList.length ? xmTitleCase(c.classList[0]) : c.tagName.toLowerCase()); let ck = xmSlug(ct) || `${c.tagName.toLowerCase()}-${ci}`; if (cused[ck] != null) { cused[ck]++; ck = `${ck}-${cused[ck]}`; } else cused[ck] = 0; ci++; return { el: c, key: ck, title: ct }; }) : [];
    items.push({ el, key, title, comps });
  }
  return items;
}
function xmSetHeading(el, text) {
  const h = el.querySelector("h1,h2,h3,h4,.card-h > span,.card-h,.hcard-h h2,.hcard-h h3,.hcard-h,.sect-l,.hh h2,.stat .l,.grp-l");
  if (!h) return;
  const target = h.matches(".card-h, .hcard-h, .hh") ? h.querySelector("h2,h3,span,b") || h : h;
  const tn = [...target.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
  if (tn) tn.nodeValue = text; else target.insertBefore(document.createTextNode(text), target.firstChild);
}
function xmReorder(items, cfgOf) {
  if (items.length < 2) return;
  const sorted = items.map((b, i) => ({ b, o: cfgOf(b)?.order ?? i * 10 + 5, i })).sort((x, y) => x.o - y.o || x.i - y.i).map((x) => x.b);
  if (sorted.every((b, i) => b === items[i])) return;
  const marks = items.map((b) => { const m = document.createComment("xm"); b.el.parentNode.insertBefore(m, b.el); return m; });
  items.forEach((b) => b.el.remove());
  marks.forEach((m, i) => { m.parentNode.insertBefore(sorted[i].el, m); m.remove(); });
}
function xmToolsHtml(page, key, title, kind, hidden, first, last) {
  const b = (op, label, title2) => `<button type="button" data-a="xmBlockOp" data-op="${op}" data-page="${esc(page)}" data-key="${esc(key)}" data-kind="${kind}" title="${esc(title2 || label)}">${label}</button>`;
  return `<div class="xm-tools ${kind === "comp" ? "comp" : ""}" contenteditable="false"><span class="k" title="${esc(title)}">${esc(title)}</span>${hidden ? b("show", "Restore") : `${b("rename", "Rename")}${b("vis", "Visible to", "Who sees this")}${first ? "" : b("up", "↑", "Move up")}${last ? "" : b("down", "↓", "Move down")}${b("hide", "Hide")}${kind === "block" ? b("add", "+ Component", "Add a component after this section") : ""}`}</div>`;
}
/** apply the page configuration to the HTML a view returned (and, in Edit mode, add the editing controls) */
function xmProcessPage(pattern, html) {
  if (typeof html !== "string" || pattern.startsWith("/admin/experience") || pattern === "/pages/:slug" || pattern === "/me") return html;
  XM.curPattern = pattern;
  const eff = XM.eff, pc = eff?.pages?.[pattern], edit = XM.previewOn && XM.edit, disc = !!XM.discover, stubs = edit || disc;
  if (!pc && !edit && !disc) return html;
  const tpl = document.createElement("template"); tpl.innerHTML = html; const root = tpl.content;
  if (pc?.title) { const h1 = root.querySelector(".ph h1, h1.big-h"); if (h1) h1.textContent = pc.title; }
  if (pc?.description) { const p = root.querySelector(".ph p, p.big-p"); if (p) p.textContent = pc.description; }
  const blocks = xmBlocksOf(root), bc = pc?.blocks || {};
  const hiddenOf = (c) => !!c && (c.hidden || (c.visibility && !xmVisible(c.visibility)));
  blocks.forEach((b, i) => {
    const c = bc[b.key];
    if (c?.title) xmSetHeading(b.el, c.title);
    b.comps.forEach((cm, j) => { const cc = bc[`${b.key}/${cm.key}`]; if (cc?.title) xmSetHeading(cm.el, cc.title); if (hiddenOf(cc)) { if (stubs) { const stub = document.createElement("div"); stub.className = "xm-hidden-stub"; stub.innerHTML = `${icon("eye")} Hidden: ${esc(cc.title || cm.title)}${xmToolsHtml(pattern, `${b.key}/${cm.key}`, cc.title || cm.title, "comp", true)}`; cm.el.replaceWith(stub); cm.el = stub; cm.hidden = true; } else { cm.el.remove(); cm.removed = true; } } });
    const live = b.comps.filter((x) => !x.removed);
    xmReorder(live, (cm) => bc[`${b.key}/${cm.key}`]);
    if (hiddenOf(c)) { if (stubs) { const stub = document.createElement("div"); stub.className = "xm-hidden-stub"; stub.innerHTML = `${icon("eye")} Hidden section: ${esc(c.title || b.title)}${xmToolsHtml(pattern, b.key, c.title || b.title, "block", true)}`; b.el.replaceWith(stub); b.el = stub; b.hidden = true; } else { b.el.remove(); b.removed = true; } }
  });
  const liveBlocks = blocks.filter((b) => !b.removed);
  xmReorder(liveBlocks, (b) => bc[b.key]);
  if (edit) liveBlocks.forEach((b, i) => { if (b.hidden) return; const lv = b.comps.filter((x) => !x.removed); lv.forEach((cm, j) => { if (cm.hidden) return; cm.el = xmAttachTools(cm.el, xmToolsHtml(pattern, `${b.key}/${cm.key}`, bc[`${b.key}/${cm.key}`]?.title || cm.title, "comp", false, j === 0, j === lv.length - 1)); }); b.el = xmAttachTools(b.el, xmToolsHtml(pattern, b.key, bc[b.key]?.title || b.title, "block", false, i === 0, i === liveBlocks.length - 1)); });
  XM.lastBlocks = XM.lastBlocks || {}; XM.lastBlocks[pattern] = liveBlocks.map((b) => ({ key: b.key, title: bc[b.key]?.title || b.title, hidden: !!b.hidden, comps: b.comps.filter((x) => !x.removed).map((c) => ({ key: `${b.key}/${c.key}`, title: bc[`${b.key}/${c.key}`]?.title || c.title, hidden: !!c.hidden })) }));
  if (disc) return html;
  // added sections and components
  const adds = (pc?.added || []).filter((a) => a.enabled !== false && xmVisible(a.visibility));
  const firstBlock = liveBlocks[0]?.el || null;
  const place = (node, a) => { const w = a.anchor?.where || "end"; const ref = a.anchor?.block ? liveBlocks.find((b) => b.key === a.anchor.block) : null; if (w === "start") { if (firstBlock) firstBlock.before(node); else root.appendChild(node); } else if ((w === "before" || w === "after") && ref) { if (w === "before") ref.el.before(node); else ref.el.after(node); } else root.appendChild(node); };
  const layout = pc?.layout || "two";
  for (const a of adds) { const node = document.createElement("div"); node.innerHTML = xmRenderAdded(a, pattern, edit, layout); place(node.firstElementChild || node, a); }
  if (edit) { const bar = document.createElement("div"); bar.className = "xm-addbar"; bar.innerHTML = `<button type="button" data-a="xmAddSection" data-page="${esc(pattern)}">+ Add section</button>&nbsp;<button type="button" data-a="xmAddComp" data-page="${esc(pattern)}" data-where="end">+ Add component</button>`; root.appendChild(bar); }
  return tpl.innerHTML;
}
/** one added entry (a component, or a section that holds components) as HTML; wraps it in the responsive size grid */
function xmRenderAdded(a, page, edit, layout = "two", parentId = "") {
  const tools = (kind, id, title, first, last) => (edit ? `<div class="xm-tools ${kind === "comp" ? "comp" : ""}"><span class="k">${esc(title)}</span><button type="button" data-a="xmAddedOp" data-op="edit" data-page="${esc(page)}" data-id="${esc(id)}" data-parent="${esc(parentId)}">Edit</button>${first ? "" : `<button type="button" data-a="xmAddedOp" data-op="up" data-page="${esc(page)}" data-id="${esc(id)}" data-parent="${esc(parentId)}">↑</button>`}${last ? "" : `<button type="button" data-a="xmAddedOp" data-op="down" data-page="${esc(page)}" data-id="${esc(id)}" data-parent="${esc(parentId)}">↓</button>`}<button type="button" data-a="xmAddedOp" data-op="remove" data-page="${esc(page)}" data-id="${esc(id)}" data-parent="${esc(parentId)}">Remove</button>${kind === "block" ? `<button type="button" data-a="xmAddComp" data-page="${esc(page)}" data-where="into" data-into="${esc(id)}">+ Component</button>` : ""}</div>` : "");
  if (a.kind === "section") {
    const kids = (a.children || []).filter((c) => c.enabled !== false && xmVisible(c.visibility));
    const inner = kids.map((c, i) => { const h = xmRenderComponent(c); if (!h && !edit) return ""; return `<div class="xm-added xm-size-${c.size || "medium"}" data-xm-add="${esc(c.id)}">${tools("comp", c.id, c.title || XM_COMPONENTS[c.component]?.name || "Component", i === 0, i === kids.length - 1)}${h || xmUnavailHtml(c)}</div>`; }).join("");
    return `<section class="hcard xm-sec xm-added ${edit ? "xm-editable" : ""}" data-xm-add="${esc(a.id)}">${tools("block", a.id, a.title || "Section", false, false)}<div class="hcard-h"><h2>${esc(a.title || "Section")}</h2>${a.description ? `<span class="hint">${esc(a.description)}</span>` : ""}</div><div class="xm-grid ${layout === "one" ? "one" : ""}">${inner || (edit ? `<p class="xm-empty" style="grid-column:1/-1">No components yet — use “+ Component”.</p>` : "")}</div></section>`;
  }
  const h = xmRenderComponent(a); if (!h && !edit) return "";
  return `<div class="xm-grid ${layout === "one" ? "one" : ""}" data-xm-wrap="${esc(a.id)}"><div class="xm-added xm-size-${a.size || "medium"} ${edit ? "xm-editable" : ""}" data-xm-add="${esc(a.id)}">${tools("comp", a.id, a.title || XM_COMPONENTS[a.component]?.name || "Component", true, true)}${h || xmUnavailHtml(a)}</div></div>`;
}
const xmUnavailHtml = (c) => { const d = XM_COMPONENTS[c.component]; return `<div class="xm-unavail">“${esc(c.title || d?.name || c.component)}” is not shown to this person — it needs ${esc(xmPermText(d?.perm))}${d ? "" : " (unknown component)"}.</div>`; };
/** editing controls go inside the block; a button block gets a wrapper first so buttons never nest */
function xmAttachTools(el, html) {
  if (el.matches("button, a")) { const w = el.ownerDocument.createElement("div"); w.className = "xm-editable"; w.style.cssText = "display:grid;position:relative;min-width:0"; el.replaceWith(w); w.appendChild(el); w.insertAdjacentHTML("afterbegin", html); return w; }
  el.classList.add("xm-editable"); el.insertAdjacentHTML("afterbegin", html); return el;
}

/* ---- rendering hooks: before every render apply the configuration (or the draft, in preview); after it, terminology and density ---- */
const _xmRender = render;
render = function () {
  xmHookLate();
  let swapped = null;
  const realA = UI.userId ? authFor(S, UI.userId, UI.activeCompanyId) : null;
  XM.realAuth = realA;
  if (XM.previewOn && !(realA && xmCan("manage", realA))) { XM.previewOn = false; XM.preview = null; XM.edit = false; }
  if (XM.previewOn) { swapped = { userId: UI.userId, co: UI.activeCompanyId, chosen: UI.chosenCompany }; UI.userId = XM.preview.userId; UI.activeCompanyId = XM.preview.companyId || null; UI.chosenCompany = true; }
  const a = UI.userId ? authFor(S, UI.userId, UI.activeCompanyId) : null;
  const base = XM.previewOn ? xmWork() : S.xmPublished?.config || null;
  XM.eff = a ? xmEffective(base || xmEmpty(), a) : null;
  try { xmApplyNav(XM.eff); xmApplyStyle(XM.eff); } catch (e) { console.error(e); }
  try { _xmRender(); } finally { if (swapped) { UI.userId = swapped.userId; UI.activeCompanyId = swapped.co; UI.chosenCompany = swapped.chosen; } }
  try { xmAfterRender(); } catch (e) { console.error(e); }
};
function xmAfterRender() {
  const content = document.querySelector(".content");
  if (!content || !XM.eff) return;
  const pc = XM.eff.pages?.[XM.curPattern];
  const density = pc?.density || XM.eff.density || "standard";
  if (density === "standard") delete content.dataset.density; else content.dataset.density = density;
  const path = parseRoute(UI.route).path;
  if (path.startsWith("/admin/experience")) return;
  const map = new Map();
  for (const [k, v] of Object.entries(XM.eff.labels || {})) { const t = XM_TERM_BY_KEY[k]; if (t && v && v !== t.text) map.set(t.text, v); }
  for (const t of XM.eff.customTerms || []) if (t.find && t.to && t.find !== t.to) map.set(t.find, t.to);
  if (!map.size) return;
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest("script,style,textarea,.xm-tools") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const todo = []; let n;
  while ((n = walker.nextNode())) { const t = n.nodeValue.trim(); if (t && map.has(t)) todo.push([n, t]); }
  for (const [node, t] of todo) node.nodeValue = node.nodeValue.replace(t, map.get(t));
  content.querySelectorAll("input[placeholder],button[title],[aria-label]").forEach((el) => { for (const attr of ["placeholder", "title", "aria-label"]) { const v = el.getAttribute(attr); if (v && map.has(v.trim())) el.setAttribute(attr, map.get(v.trim())); } });
}
/** wrap the pieces that only exist once app.js has loaded (act, route) — done on the first render */
function xmHookLate() {
  if (XM.hooked) return; XM.hooked = true;
  const _act = act;
  act = function (type, p, okMsg) {
    if (XM.previewOn && !String(type).startsWith("xm.")) { toast("Preview mode", "Nothing is changed while you are viewing as someone else. Exit the preview to act for real.", "err"); return false; }
    return _act(type, p, okMsg);
  };
  ROUTES.forEach((r) => { if (!r.pattern) r.pattern = r.re.source.replace(/^\^|\$$/g, "").replace(/\\\//g, "/").replace(/\(\[\^\/\]\+\)/g, ":id"); r.view = xmWrapView(r.pattern, r.view); });
}
function xmWrapView(pattern, view) { if (view._xm) return view; const w = function (q, ...a) { return xmProcessPage(pattern, view.call(this, q, ...a)); }; w._xm = true; w._xmInner = view; return w; }
{ const _route = route; route = function (pattern, perm, view) { _route(pattern, perm, xmWrapView(pattern, view)); ROUTES[ROUTES.length - 1].pattern = pattern; }; }
ROUTES.forEach((r) => { if (!r.pattern) r.pattern = r.re.source.replace(/^\^|\$$/g, "").replace(/\\\//g, "/").replace(/\(\[\^\/\]\+\)/g, ":id"); r.view = xmWrapView(r.pattern, r.view); });
/** the preview bar under the demo banner */
{ const _banner = banner; banner = function () { const b = _banner(); if (!XM.previewOn || !XM.preview) return b; const u = byId(S.users, XM.preview.userId); const who = u ? u.displayName : "someone"; const role = u ? (u.demoLabel || (authFor(S, u.id)?.roleNames || []).join(", ") || "User") : ""; const n = xmUnsaved().length; return b + `<div class="xm-pv" role="status"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><b>PREVIEW — VIEWING AS ${esc(who.toUpperCase())}</b><span>${esc(role)}${XM.preview.companyId ? ` · ${esc(co(XM.preview.companyId)?.displayName || "")}` : ""} · showing the draft${n ? ` (${n} unsaved change${n === 1 ? "" : "s"})` : ""} · actions are turned off</span></div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><div class="seg" role="group" aria-label="Edit mode"><button class="${XM.edit ? "" : "on"}" data-a="xmEditMode" data-v="0">View</button><button class="${XM.edit ? "on" : ""}" data-a="xmEditMode" data-v="1">Edit mode</button></div><button class="btn" data-a="xmPreviewPick">Change person</button><button class="btn pri" data-a="xmExitPreview">Exit preview</button></div></div>`; }; }

/* ---- preview helpers ---- */
function xmEnterPreview(userId, companyId, edit = false) {
  if (!xmCan("manage", XM.realAuth || A)) return;
  const u = byId(S.users, userId); if (!u) { toast("No such person", "", "err"); return; }
  XM.previewOn = true; XM.preview = { userId, companyId: companyId || null, from: UI.route }; XM.edit = !!edit;
  UI.pop = null; UI.modal = null; UI.ts = null; UI.je = null;
  const a = authFor(S, userId, companyId || null);
  const to = a?.employee ? "/dashboard" : (can(a, "reports.view") || can(a, "finance.view") || can(a, "hr.employees.view") ? "/dashboard" : "/approvals");
  UI.route = to; safeRender();
}
function xmExitPreview() { const back = XM.preview?.from && XM.preview.from.startsWith("/admin/experience") ? XM.preview.from : "/admin/experience/preview"; XM.previewOn = false; XM.preview = null; XM.edit = false; UI.modal = null; UI.pop = null; UI.ts = null; UI.je = null; UI.route = back; savePrefs(); safeRender(); }
/** a representative person for an audience or company (for View As and structure discovery) */
function xmRepresentative(scope) {
  const users = S.users.filter((u) => u.isActive !== false);
  if (scope.startsWith("company:")) { const cid = scope.slice(8); return users.find((u) => u.employeeId && byId(S.employees, u.employeeId)?.companyId === cid)?.id || null; }
  const aud = scope.startsWith("role:") ? scope.slice(5) : scope;
  const pref = { employees: "u1", managers: "u2", hr: "u3", finance: "u4", payroll: "u4", executives: "u5", administrators: "u6", everyone: "u1" }[aud];
  if (pref && byId(S.users, pref)) return pref;
  return users.find((u) => xmAudiencesOf(authFor(S, u.id)).has(aud))?.id || null;
}
/** people grouped by audience, for the View As picker */
function xmPeopleByAudience() {
  const out = {}; for (const [k, l] of XM_AUDIENCES) if (k !== "everyone") out[k] = { label: l, people: [] };
  for (const u of S.users.filter((x) => x.isActive !== false)) { const a = authFor(S, u.id); if (!a) continue; const e = a.employee; const row = { id: u.id, name: u.displayName, role: u.demoLabel || a.roleNames.join(", ") || "User", company: e ? co(e.companyId)?.displayName : "All companies" }; for (const k of xmAudiencesOf(a)) if (out[k]) out[k].people.push(row); }
  return out;
}

/* ---- custom pages: /pages/:slug, built only from library components ---- */
function vXmPage(q, slug) {
  const cfg = xmCurrentCfg() || xmEmpty();
  const p = (cfg.customPages || {})[slug];
  if (!p || p.enabled === false) return vNotFound();
  if (!xmVisible(p.visibility)) return vDenied("page visibility");
  XM.curPattern = `/pages/${slug}`;
  const edit = XM.previewOn && XM.edit;
  const blocks = (p.blocks || []).filter((b) => b.enabled !== false && xmVisible(b.visibility));
  const body = blocks.length ? `<div class="xm-grid ${p.layout === "one" ? "one" : ""}">${blocks.map((b, i) => { if (b.kind === "section") return `<div class="xm-size-large">${xmRenderAdded(b, `/pages/${slug}`, edit, p.layout)}</div>`; const h = xmRenderComponent(b); if (!h && !edit) return ""; return `<div class="xm-added xm-size-${b.size || "medium"} ${edit ? "xm-editable" : ""}" data-xm-add="${esc(b.id)}">${edit ? `<div class="xm-tools comp"><span class="k">${esc(b.title || XM_COMPONENTS[b.component]?.name || "")}</span><button type="button" data-a="xmAddedOp" data-op="edit" data-page="/pages/${esc(slug)}" data-id="${esc(b.id)}">Edit</button>${i ? `<button type="button" data-a="xmAddedOp" data-op="up" data-page="/pages/${esc(slug)}" data-id="${esc(b.id)}">↑</button>` : ""}${i < blocks.length - 1 ? `<button type="button" data-a="xmAddedOp" data-op="down" data-page="/pages/${esc(slug)}" data-id="${esc(b.id)}">↓</button>` : ""}<button type="button" data-a="xmAddedOp" data-op="remove" data-page="/pages/${esc(slug)}" data-id="${esc(b.id)}">Remove</button></div>` : ""}${h || xmUnavailHtml(b)}</div>`; }).join("")}</div>` : empty("Nothing on this page yet", edit ? " Use “+ Add component” below." : "");
  return ph(p.title || p.name, p.description || "") + flashHtml() + body + (edit ? `<div class="xm-addbar"><button type="button" data-a="xmAddSection" data-page="/pages/${esc(slug)}">+ Add section</button>&nbsp;<button type="button" data-a="xmAddComp" data-page="/pages/${esc(slug)}" data-where="end">+ Add component</button></div>` : "");
}
route("/pages/:slug", null, vXmPage);

/* ---- downloads outside claude.ai (a plain web host such as Netlify): save through the browser instead of the artifact capability ---- */
{
  const _dlOrig = DOWNLOADS;
  const browserDl = { async save({ filename, data }) { const blob = data instanceof Blob ? data : new Blob([data], { type: /\.pdf$/i.test(filename) ? "application/pdf" : /\.zip$/i.test(filename) ? "application/zip" : /\.xlsx$/i.test(filename) ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : /\.json$/i.test(filename) ? "application/json" : "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); return { status: "saved" }; } };
  DOWNLOADS = function () { return _dlOrig().then((d) => d || browserDl); };
}
