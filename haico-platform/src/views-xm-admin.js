/* ==========================================================================
   views-xm-admin.js — Administration › Page & Experience Manager (the screens).
   Navigation & IA · Pages · Component library · Terminology · Typography ·
   Role & company views · View as · Drafts, review, publish, versions, downloads, import.
   ========================================================================== */

injectCss(`
.xm-strip{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:var(--r);margin-bottom:14px;font-size:12.5px}
.xm-strip .st{display:flex;flex-direction:column;gap:1px;min-width:0}.xm-strip .st small{color:var(--muted-fg);font-size:11px}.xm-strip .sp{flex:1}
.xm-strip select.in{height:32px;width:auto;font-size:12.5px}
.xm-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-top:1px solid var(--border);font-size:13px;min-width:0}.xm-row:first-child{border-top:0}.xm-row .grow{flex:1;min-width:0}.xm-row .ops{display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end}
.xm-row .ops button{height:26px;padding:0 8px;font-size:11.5px;border-radius:999px}.xm-row.sub{padding-left:38px;background:var(--bg);font-size:12.5px}.xm-row.sub2{padding-left:60px;background:var(--bg);font-size:12.5px}
.xm-row .ico{display:inline-grid;place-items:center;width:22px;height:22px;color:var(--muted-fg)}.xm-row .ico svg{width:16px;height:16px}
.xm-row[draggable]{cursor:grab}.xm-grp-h{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--row-head);border-top:1px solid var(--border);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-fg)}.xm-grp-h .grow{flex:1}.xm-grp-h button{height:24px;padding:0 8px;font-size:11px;border-radius:999px;text-transform:none;letter-spacing:0}
.xm-muted{opacity:.55}.xm-flag{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:4px;padding:1px 6px;background:var(--muted);color:var(--muted-fg)}.xm-flag.ov{background:var(--t-amber-bg);color:var(--t-amber)}.xm-flag.cu{background:var(--t-teal-bg);color:var(--t-teal)}.xm-flag.hid{background:var(--t-red-bg);color:var(--t-red)}
.xm-lib{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}.xm-libc{border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;background:var(--card);display:flex;flex-direction:column;gap:6px;font-size:12.5px}.xm-libc b{font-size:13.5px}.xm-libc .hint{line-height:1.45}.xm-libc .acts{display:flex;gap:6px;margin-top:auto;padding-top:6px}
.xm-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.xm-chips button{border:1px solid var(--border);background:var(--card);border-radius:999px;padding:4px 11px;font:inherit;font-size:12px;cursor:pointer;color:var(--fg)}.xm-chips button.on{background:var(--action);border-color:var(--action);color:var(--action-fg)}
.xm-diff li{padding:5px 0;border-top:1px solid var(--border);font-size:12.5px;display:flex;gap:8px;align-items:flex-start}.xm-diff li:first-child{border-top:0}.xm-diff .badge{flex:none;min-width:72px;justify-content:center}
.xm-typo-prev{border:1px solid var(--border);border-radius:var(--r);padding:18px 22px;background:var(--card)}.xm-typo-prev h1{font-size:22px;margin:0 0 10px}.xm-typo-prev h2{font-size:15px;margin:14px 0 8px}.xm-typo-prev .kv{font-size:13px}
.xm-steps{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12.5px;color:var(--muted-fg)}.xm-steps b{color:var(--fg);background:var(--muted);border-radius:999px;padding:3px 10px;font-weight:600}
.xm-cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}.xm-vc{border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;background:var(--card);font-size:12.5px;display:flex;flex-direction:column;gap:6px}.xm-vc.on{border-color:var(--primary);box-shadow:inset 0 0 0 1px var(--primary)}.xm-vc b{font-size:13.5px}.xm-vc .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:4px}
.xm-check{display:grid;gap:4px 12px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));font-size:12.5px}.xm-check label{display:flex;align-items:center;gap:6px;cursor:pointer}
.xm-tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--border);margin-bottom:14px}.xm-tabs button{border:0;background:none;padding:8px 12px;font-size:13px;font-weight:500;color:var(--muted-fg);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;font-family:inherit}.xm-tabs button.on{color:var(--fg);border-bottom-color:var(--action);font-weight:600}
.xm-dl{display:inline-flex;gap:3px}.xm-dl button{height:26px;padding:0 8px;font-size:11.5px;border-radius:999px}
.xm-imp{border:1px dashed var(--border);border-radius:var(--r);padding:14px;text-align:center;font-size:12.5px;color:var(--muted-fg)}
`);

/* ---------------- small helpers ---------------- */
const XM_TABS = [["", "Overview"], ["navigation", "Navigation & IA"], ["pages", "Pages"], ["library", "Component library"], ["terminology", "Terminology"], ["typography", "Typography"], ["views", "Role & company views"], ["preview", "View as"], ["versions", "Drafts & versions"]];
const xmHref = (tab = "", rest = "") => `/admin/experience${tab ? "/" + tab : ""}${rest}`;
const xmSel = (name, opts, cur, extra = "") => `<select class="in" name="${esc(name)}" ${extra}>${opts.map(([v, l]) => opt(v, l, String(v) === String(cur))).join("")}</select>`;
const xmFld = (label, html, hint = "", span = "") => `<div class="fld" ${span ? `style="grid-column:${span}"` : ""}><label>${esc(label)}</label>${html}${hint ? `<span class="hint">${esc(hint)}</span>` : ""}</div>`;
const xmModal = (html, wide = false) => { UI.modal = html; UI.modalWide = wide; safeRender(); setTimeout(() => document.querySelector(".modal input:not([type=hidden]):not([type=checkbox]), .modal select, .modal textarea")?.focus(), 30); };
const xmFoot = (ok, extra = "") => `<div class="form-row" style="justify-content:flex-end;margin-top:14px">${extra}<button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">${esc(ok)}</button></div>`;
function xmVisFields(vis = {}) {
  const aud = vis.audiences || [], cos = vis.companies || [];
  return `<div class="fld" style="grid-column:1/-1"><label>Visible to</label><div class="xm-check">${XM_AUDIENCES.map(([k, l]) => `<label><input type="checkbox" name="aud" value="${k}" ${aud.includes(k) || (k === "everyone" && !aud.length) ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div><span class="hint">Tick “All users” for everyone. Access is still decided by each person's permissions — this only chooses who sees the item.</span></div>
    <div class="fld" style="grid-column:1/-1"><label>Companies</label><div class="xm-check">${S.companies.map((c) => `<label><input type="checkbox" name="co" value="${c.id}" ${cos.includes(c.id) ? "checked" : ""}> ${esc(c.displayName)}</label>`).join("")}</div><span class="hint">Leave all unticked for every company.</span></div>`;
}
function xmVisRead(f) { const aud = [...f.querySelectorAll('input[name="aud"]:checked')].map((x) => x.value); const companies = [...f.querySelectorAll('input[name="co"]:checked')].map((x) => x.value); return { audiences: aud.includes("everyone") ? [] : aud, companies }; }
const xmKindBadge = (kind) => `<span class="badge ${{ added: "tone-green", removed: "tone-red", changed: "tone-amber", moved: "tone-blue" }[kind] || "tone-grey"}">${esc(xmTitleCase(kind))}</span>`;
function xmDiffHtml(changes, max = 400) {
  if (!changes.length) return `<p class="xm-empty">No differences.</p>`;
  const cats = [...new Set(changes.map((c) => c.cat))];
  return cats.map((cat) => `<div class="sect-l" style="margin:12px 0 6px">${esc(cat)} <span class="cnt">${changes.filter((c) => c.cat === cat).length}</span></div><ul class="xm-diff" style="list-style:none;margin:0;padding:0">${changes.filter((c) => c.cat === cat).slice(0, max).map((c) => `<li>${xmKindBadge(c.kind)}<span>${esc(c.text)}</span></li>`).join("")}</ul>`).join("");
}
/** the nav catalog: every group and item the platform can show, independent of who is looking (mirrors buildNav) */
const XM_NAV_CATALOG = [
  ["Home", [["home", "Home", "home"], ["approvals", "Approvals", "check"]]],
  ["Requests", [["my-requests", "Requests", "inbox"]]],
  ["My work", [["my-time", "My Time", "clock"], ["my-timeoff", "My Time Off", "calendar"], ["my-tasks", "My Tasks", "tasks"]]],
  ["Me", [["my-profile", "My Profile", "user"], ["my-pay", "My Pay", "wallet"], ["my-documents", "My Documents", "folder"]]],
  ["Team", [["team", "My Team", "users"]]],
  ["People", [["people", "People", "directory"], ["hr-time", "Time & Attendance", "calendarclock"], ["hr-talent", "Reviews, Benefits & Pension", "star"]]],
  ["Payroll", [["ops-payroll", "Payroll", "banknote"]]],
  ["Finance", [["fin-accounting", "Accounting", "book"], ["fin-ap", "Accounts Payable", "receipt"], ["fin-ar", "Accounts Receivable", "filetext"], ["fin-banking", "Banking", "piggybank"]]],
  ["Operations", [["ops-purchasing", "Purchasing", "cart"], ["ops-sales", "Sales & Stock", "boxes"], ["ops-projects", "Projects", "briefcase"], ["documents", "Documents", "folder"]]],
  ["Reports", [["reports", "Reports", "chart"]]],
  ["Administration", [["admin", "Administration", "shield"]]],
];
/** the navigation as the current scope configures it: [{name, label, hidden, items:[{key,title,icon,hidden,custom,tabs:[...]}]}] */
function xmNavModel() {
  const eff = xmScopeEff(), nav = eff.nav || {}, gi = nav.groups || {}, it = nav.items || {}, tc = nav.tabs || {};
  const list = [];
  XM_NAV_CATALOG.forEach(([g, items], go) => items.forEach(([key, title, icon], io) => { const c = it[key] || {}; list.push({ key, title: c.label || title, origTitle: title, icon: c.icon || icon, hidden: !!c.hidden, group: c.group || g, order: c.order ?? io * 10, vis: c.visibility, ov: !!it[key] }); }));
  for (const m of nav.custom || []) if (m.kind === "menu") list.push({ key: `xm-${m.id}`, id: m.id, title: m.label, origTitle: m.label, icon: m.icon, hidden: m.enabled === false, group: m.group || "Home", order: m.order ?? 999, vis: m.visibility, custom: true, m });
  const names = XM_NAV_CATALOG.map((x) => x[0]); for (const i of list) if (!names.includes(i.group)) names.push(i.group); for (const g of Object.keys(gi)) if (!names.includes(g)) names.push(g);
  return names.map((g, idx) => ({ name: g, label: gi[g]?.label || g, hidden: !!gi[g]?.hidden, vis: gi[g]?.visibility, order: gi[g]?.order ?? idx * 10, ov: !!gi[g], items: list.filter((i) => i.group === g).sort((a, b) => a.order - b.order).map((i) => { const sec = XM_SEC_ORIG.find((s) => s.key === i.key); const tabs = sec ? sec.tabs.map((t, ti) => { const c = tc[`${i.key}|${t.href}`] || {}; return { href: t.href, label: c.label || t.label, origLabel: t.label, hidden: !!c.hidden, order: c.order ?? ti * 10, vis: c.visibility, ov: !!tc[`${i.key}|${t.href}`] }; }) : []; for (const m of nav.custom || []) if (m.kind === "submenu" && m.parent === i.key) tabs.push({ href: xmDestHref(m), label: m.label, origLabel: m.label, hidden: m.enabled === false, order: m.order ?? 999, vis: m.visibility, custom: true, id: m.id, m }); return { ...i, tabs: tabs.sort((a, b) => a.order - b.order) }; }) })).sort((a, b) => a.order - b.order);
}
function xmSwapOrder(list, idx, dir, write) { const j = idx + dir; if (j < 0 || j >= list.length) return; const arr = list.slice(); [arr[idx], arr[j]] = [arr[j], arr[idx]]; arr.forEach((x, i) => write(x, i * 10)); }

/* ---------------- shell ---------------- */
function xmShell(tab, body, acts = "") {
  const pub = S.xmPublished, draft = S.xmDraft, unsaved = xmUnsaved().length;
  const scopeOpts = [["default", "Group default"], ...XM_AUDIENCES.filter(([k]) => k !== "everyone").map(([k, l]) => [`role:${k}`, `${l} view`]), ...S.companies.map((c) => [`company:${c.id}`, `${c.displayName} override`])];
  const strip = `<div class="xm-strip"><div class="st"><span><b>Published:</b> ${pub ? `version ${pub.version}` : "nothing yet (the platform's defaults are in use)"}</span><small>${pub ? `${esc(pub.by)} · ${esc(dTime(pub.at))}` : "Publish a draft to create version 1"}</small></div>
    <div class="st"><span><b>Draft:</b> ${draft ? `saved ${esc(ago(draft.savedAt))}` : "none saved"}${unsaved ? ` · <span class="badge tone-amber">${unsaved} unsaved change${unsaved === 1 ? "" : "s"}</span>` : ""}</span><small>${draft ? `${esc(draft.savedBy)}${draft.note ? ` · ${esc(draft.note)}` : ""}` : unsaved ? "Changes are kept in this browser until you save the draft" : "Everything is saved"}</small></div>
    <div class="sp"></div><label class="st" style="flex-direction:row;align-items:center;gap:6px"><span class="hint">Editing</span>${xmSel("scope", scopeOpts, XM.scope, 'data-a="xmScope" aria-label="Which view to edit"')}</label>
    <div class="form-row" style="gap:6px">${acts}<button class="btn sm" data-a="xmSaveDraft" ${unsaved ? "" : "disabled"}>Save draft</button><button class="btn sm" data-a="xmDiscardWork" ${unsaved ? "" : "disabled"}>Discard unsaved</button><button class="btn sm" data-go="${xmHref("preview")}">View as…</button><button class="btn sm pri" data-a="xmReview">Review &amp; publish</button></div></div>`;
  const tabs = `<nav class="xm-tabs" aria-label="Page & Experience Manager">${XM_TABS.map(([k, l]) => `<button class="${k === tab ? "on" : ""}" data-go="${xmHref(k)}">${esc(l)}</button>`).join("")}</nav>`;
  return ph("Page & Experience Manager", "Configure what people see — navigation, pages, components, wording and typography — without changing how the ERP works. Edit → Save draft → View as → Review → Publish; every published version is kept.") + flashHtml() + strip + tabs + body;
}

/* ---------------- Overview ---------------- */
function vXmOverview() {
  const w = xmWork(), eff = xmScopeEff();
  const n = (o) => Object.keys(o || {}).length;
  const custMenus = (w.nav?.custom || []).length, pagesCust = n(w.pages), custPages = n(w.customPages), terms = n(w.labels) + (w.customTerms || []).length, ov = n(w.overrides);
  const cards = [[xmHref("navigation"), "Navigation & information architecture", `${custMenus} custom menu${custMenus === 1 ? "" : "s"} · ${n(w.nav?.items) + n(w.nav?.tabs) + n(w.nav?.groups)} item${n(w.nav?.items) + n(w.nav?.tabs) + n(w.nav?.groups) === 1 ? "" : "s"} changed`, "Menus, submenus, order, icons, visibility by role or company."], [xmHref("pages"), "Pages, sections & components", `${pagesCust} page${pagesCust === 1 ? "" : "s"} customised · ${custPages} custom page${custPages === 1 ? "" : "s"}`, "Rename, hide, reorder sections; add components from the library."], [xmHref("library"), "Component & widget library", `${Object.keys(XM_COMPONENTS).length} components in ${XM_CATS.length} categories`, "Information, data, KPI, actions, time, finance, HR, payroll, analytics, navigation."], [xmHref("terminology"), "Personalization & terminology", `${terms} term${terms === 1 ? "" : "s"} changed`, "Display labels only — internal identifiers never change."], [xmHref("typography"), "Typography & density", `${XM_FONTS.find((f) => f[0] === eff.typography?.font)?.[1] || "Look's font"} · ${eff.typography?.size === "default" ? "14" : eff.typography?.size}px · ${XM_DENSITY.find((d) => d[0] === eff.density)?.[1] || "Standard"}`, "Approved fonts, sizes, weights and information density."], [xmHref("views"), "Role & company views", `${ov} override${ov === 1 ? "" : "s"}`, "A group default, then differences per role or company."], [xmHref("preview"), "View as", "Preview any role or person", "See the draft exactly as they would, with actions turned off; edit in place."], [xmHref("versions"), "Drafts, review & versions", `${S.xmVersions.length} published version${S.xmVersions.length === 1 ? "" : "s"}`, "Save, review the impact, publish, compare, restore, download, import."]];
  return xmShell("", `<div class="xm-steps" style="margin-bottom:14px"><b>1 Select a page</b>→<b>2 Edit</b>→<b>3 Save draft</b>→<b>4 View as</b>→<b>5 Review changes</b>→<b>6 Publish</b>→<span>a version is recorded automatically</span></div>
    <div class="xm-cards">${cards.map(([go, t, s, h]) => `<button class="xm-vc" data-go="${go}" style="text-align:left;font:inherit;cursor:pointer;color:inherit"><b>${esc(t)}</b><span>${esc(s)}</span><span class="hint">${esc(h)}</span></button>`).join("")}</div>
    <div class="grid g2" style="margin-top:16px">${card("What administrators configure", `<ul style="margin:0;padding-left:18px;line-height:1.7;font-size:13px"><li>Navigation: menus, submenus (3 levels at most), order, icons, visibility.</li><li>Pages: titles, sections, components, layout, density, visibility.</li><li>Components from an approved library, each reading live ERP data.</li><li>Terminology: display labels, button labels, helper text — plain text only.</li><li>Typography from an approved list of fonts, sizes and weights.</li></ul>`)}${card("What stays system controlled", `<ul style="margin:0;padding-left:18px;line-height:1.7;font-size:13px"><li>Payroll, CPP, EI and tax calculations; financial posting and the ledger.</li><li>Authentication, roles and permissions (Administration › Users &amp; access).</li><li>The approval engine and its rules (Administration › Approval rules).</li><li>The audit log — every configuration change, publish, restore and download is recorded there.</li><li>Hiding a menu never grants or removes access: every page still checks its permission.</li></ul>`)}</div>`);
}

/* ---------------- Navigation & IA ---------------- */
function vXmNav() {
  const model = xmNavModel();
  const groupRow = (g, gi) => `<div class="xm-grp-h ${g.hidden ? "xm-muted" : ""}"><span class="grow">${esc(g.label)}${g.label !== g.name ? ` <span class="xm-flag ov">renamed</span>` : ""}${g.hidden ? ` <span class="xm-flag hid">hidden</span>` : ""}${g.vis && (g.vis.audiences?.length || g.vis.companies?.length) ? ` <span class="xm-flag">${esc(xmVisText(g.vis))}</span>` : ""}</span><button class="btn" data-a="xmGroupEdit" data-g="${esc(g.name)}">Edit</button>${gi ? `<button class="btn" data-a="xmGroupMove" data-g="${esc(g.name)}" data-d="-1" title="Move up">↑</button>` : ""}${gi < model.length - 1 ? `<button class="btn" data-a="xmGroupMove" data-g="${esc(g.name)}" data-d="1" title="Move down">↓</button>` : ""}</div>`;
  const tabRow = (i, t, ti, n) => `<div class="xm-row sub2 ${t.hidden ? "xm-muted" : ""}"><span class="ico">${icon("chevright")}</span><span class="grow">${esc(t.label)}${t.custom ? ` <span class="xm-flag cu">custom</span>` : t.ov ? ` <span class="xm-flag ov">changed</span>` : ""}${t.hidden ? ` <span class="xm-flag hid">hidden</span>` : ""} <span class="hint mono">${esc(t.href)}</span></span><span class="ops">${t.custom ? `<button class="btn" data-a="xmMenuEdit" data-id="${esc(t.id)}">Edit</button><button class="btn" data-a="xmMenuRemove" data-id="${esc(t.id)}">Remove</button>` : `<button class="btn" data-a="xmTabEdit" data-key="${esc(i.key)}" data-href="${esc(t.href)}">Edit</button>`}${ti ? `<button class="btn" data-a="xmTabMove" data-key="${esc(i.key)}" data-href="${esc(t.href)}" data-d="-1">↑</button>` : ""}${ti < n - 1 ? `<button class="btn" data-a="xmTabMove" data-key="${esc(i.key)}" data-href="${esc(t.href)}" data-d="1">↓</button>` : ""}<button class="btn" data-a="xmTabHide" data-key="${esc(i.key)}" data-href="${esc(t.href)}" data-custom="${t.custom ? t.id : ""}" data-v="${t.hidden ? "0" : "1"}">${t.hidden ? "Restore" : "Hide"}</button></span></div>`;
  const itemRow = (g, i, ii) => { const open = UI.tabs[`xmnav-${i.key}`] === "1"; return `<div class="xm-row sub ${i.hidden ? "xm-muted" : ""}" draggable="true" data-xmdrag="item" data-key="${esc(i.key)}" data-g="${esc(g.name)}"><span class="ico">${icon(i.icon)}</span><span class="grow"><button class="lnk" data-a="tab" data-k="xmnav-${esc(i.key)}" data-v="${open ? "0" : "1"}" style="font-weight:600">${esc(i.title)}</button>${i.custom ? ` <span class="xm-flag cu">custom</span>` : i.ov ? ` <span class="xm-flag ov">changed</span>` : ""}${i.hidden ? ` <span class="xm-flag hid">hidden</span>` : ""}${i.vis && (i.vis.audiences?.length || i.vis.companies?.length) ? ` <span class="xm-flag">${esc(xmVisText(i.vis))}</span>` : ""} <span class="hint">${i.tabs.length ? `${i.tabs.length} submenu${i.tabs.length === 1 ? "" : "s"}` : ""}</span></span><span class="ops">${i.custom ? `<button class="btn" data-a="xmMenuEdit" data-id="${esc(i.id)}">Edit</button><button class="btn" data-a="xmMenuRemove" data-id="${esc(i.id)}">Remove</button>` : `<button class="btn" data-a="xmItemEdit" data-key="${esc(i.key)}">Edit</button>`}${ii ? `<button class="btn" data-a="xmItemMove" data-key="${esc(i.key)}" data-d="-1">↑</button>` : ""}${ii < g.items.length - 1 ? `<button class="btn" data-a="xmItemMove" data-key="${esc(i.key)}" data-d="1">↓</button>` : ""}<button class="btn" data-a="xmItemHide" data-key="${esc(i.key)}" data-custom="${i.custom ? i.id : ""}" data-v="${i.hidden ? "0" : "1"}">${i.hidden ? "Restore" : "Hide"}</button><button class="btn" data-a="xmSubmenuNew" data-parent="${esc(i.key)}" ${i.custom ? "disabled title=\"Custom menus open one page\"" : ""}>+ Submenu</button></span></div>${open ? i.tabs.map((t, ti) => tabRow(i, t, ti, i.tabs.length)).join("") || `<div class="xm-row sub2 hint">No submenus.</div>` : ""}`; };
  const body = `<div class="form-row" style="justify-content:space-between;margin-bottom:10px"><span class="hint">Level 1 are the sidebar groups, level 2 the menu items, level 3 the tabs at the top of each page. Drag a menu item onto another group, or use the arrows. Hiding never removes access — every page still checks its permission.</span><span class="form-row" style="gap:6px"><button class="btn sm" data-a="xmMenuNew">+ Add menu</button><button class="btn sm" data-a="xmSubmenuNew">+ Add submenu</button><span class="xm-dl"><button class="btn" data-a="xmDl" data-kind="nav" data-fmt="json">Download navigation</button></span></span></div>
    <section class="card" style="overflow:hidden">${model.map((g, gi) => groupRow(g, gi) + (g.items.length ? g.items.map((i, ii) => itemRow(g, i, ii)).join("") : `<div class="xm-row sub hint" data-xmdrop="${esc(g.name)}">Empty group — drag a menu here.</div>`)).join("")}</section>`;
  return xmShell("navigation", body);
}
function xmMenuModal(m = null, kind = "menu", parent = "") {
  const isNew = !m; m = m || { id: "", kind, label: "", icon: "bookmark", group: "", parent, dest: { type: "route", href: "/dashboard" }, visibility: { audiences: [], companies: [] }, enabled: true };
  const pages = xmPageRegistry();
  const groups = xmNavModel().map((g) => g.name);
  const dest = m.dest || {};
  return `<h3 style="margin:0 0 4px">${isNew ? "Add" : "Edit"} ${m.kind === "submenu" ? "submenu" : "menu"}</h3><p class="hint" style="margin:0 0 12px">${m.kind === "submenu" ? "A submenu is a tab at the top of the pages in a menu." : "A menu is an item in the sidebar, inside a group."}</p>
  <form data-f="xmMenuSave" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><input type="hidden" name="id" value="${esc(m.id)}"><input type="hidden" name="kind" value="${esc(m.kind)}">
    ${xmFld("Menu name (internal)", `<input class="in mono" name="name" value="${esc(m.id || "")}" placeholder="auto from the label" ${isNew ? "" : "readonly"}>`, "Never shown to users; stays the same when the label changes.")}
    ${xmFld("Display label", `<input class="in" name="label" value="${esc(m.label)}" required maxlength="40">`)}
    ${m.kind === "submenu" ? xmFld("Parent menu", xmSel("parent", XM_NAV_CATALOG.flatMap(([, items]) => items.map(([k, t]) => [k, t])), m.parent)) : xmFld("Icon", xmSel("icon", XM_ICONS.map((i) => [i, i]), m.icon))}
    ${m.kind === "submenu" ? "" : xmFld("Group", `<div class="form-row" style="gap:6px"><select class="in" name="group" style="flex:1">${groups.map((g) => opt(g, g, g === m.group)).join("")}<option value="__new" ${m.group && !groups.includes(m.group) ? "selected" : ""}>New group…</option></select></div><input class="in" name="newGroup" placeholder="New group name" value="${esc(m.group && !groups.includes(m.group) ? m.group : "")}" style="margin-top:6px">`)}
    ${xmFld("Destination", `<div class="form-row" style="gap:10px;flex-wrap:wrap"><label><input type="radio" name="destType" value="route" ${dest.type !== "page" ? "checked" : ""}> Existing page</label><label><input type="radio" name="destType" value="page" ${dest.type === "page" ? "checked" : ""}> Custom page</label><label><input type="radio" name="destType" value="new"> New page</label></div>
      <select class="in" name="href" style="margin-top:6px">${pages.filter((p) => p.kind === "system").map((p) => opt(p.key, `${p.name} — ${p.module}`, p.key === dest.href)).join("")}</select>
      <select class="in" name="slug" style="margin-top:6px">${pages.filter((p) => p.kind === "custom").map((p) => opt(p.slug, p.name, p.slug === dest.slug)).join("") || `<option value="">No custom pages yet</option>`}</select>
      <input class="in" name="newPage" placeholder="Name of the new page" style="margin-top:6px">`, "A new page starts empty; add components to it under Pages.", "1/-1")}
    ${xmVisFields(m.visibility)}
    ${xmFld("Status", xmSel("enabled", [["1", "Enabled"], ["0", "Disabled"]], m.enabled === false ? "0" : "1"))}
    <div style="grid-column:1/-1">${xmFoot(isNew ? "Add" : "Save")}</div></form>`;
}
function xmItemModal(key) {
  const model = xmNavModel(); const g = model.find((x) => x.items.some((i) => i.key === key)); const i = g.items.find((x) => x.key === key);
  const groups = model.map((x) => x.name);
  return `<h3 style="margin:0 0 12px">Edit menu “${esc(i.origTitle)}”</h3><form data-f="xmItemSave" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><input type="hidden" name="key" value="${esc(key)}">
    ${xmFld("Display label", `<input class="in" name="label" value="${esc(i.title)}" maxlength="40">`, `Internal name: ${key}`)}${xmFld("Icon", xmSel("icon", XM_ICONS.map((x) => [x, x]), i.icon))}
    ${xmFld("Group", `<select class="in" name="group">${groups.map((x) => opt(x, x, x === g.name)).join("")}<option value="__new">New group…</option></select><input class="in" name="newGroup" placeholder="New group name" style="margin-top:6px">`)}
    ${xmFld("Status", xmSel("hidden", [["0", "Shown"], ["1", "Hidden"]], i.hidden ? "1" : "0"))}
    ${xmVisFields(i.vis)}
    <div style="grid-column:1/-1">${xmFoot("Save", i.ov ? `<button type="button" class="btn" data-a="xmItemReset" data-key="${esc(key)}">Reset to platform default</button>` : "")}</div></form>`;
}
function xmTabModal(key, href) {
  const i = xmNavModel().flatMap((g) => g.items).find((x) => x.key === key); const t = i?.tabs.find((x) => x.href === href); if (!t) return "";
  return `<h3 style="margin:0 0 12px">Edit submenu “${esc(t.origLabel)}”</h3><form data-f="xmTabSave" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><input type="hidden" name="key" value="${esc(key)}"><input type="hidden" name="href" value="${esc(href)}">
    ${xmFld("Display label", `<input class="in" name="label" value="${esc(t.label)}" maxlength="40">`, `Opens ${href}`)}${xmFld("Status", xmSel("hidden", [["0", "Shown"], ["1", "Hidden"]], t.hidden ? "1" : "0"))}
    ${xmVisFields(t.vis)}<div style="grid-column:1/-1">${xmFoot("Save", t.ov ? `<button type="button" class="btn" data-a="xmTabReset" data-key="${esc(key)}" data-href="${esc(href)}">Reset</button>` : "")}</div></form>`;
}
function xmGroupModal(name) {
  const g = xmNavModel().find((x) => x.name === name); if (!g) return "";
  return `<h3 style="margin:0 0 12px">Edit group “${esc(name)}”</h3><form data-f="xmGroupSave" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><input type="hidden" name="name" value="${esc(name)}">
    ${xmFld("Display label", `<input class="in" name="label" value="${esc(g.label)}" maxlength="40">`)}${xmFld("Status", xmSel("hidden", [["0", "Shown"], ["1", "Hidden"]], g.hidden ? "1" : "0"))}${xmVisFields(g.vis)}
    <div style="grid-column:1/-1">${xmFoot("Save", g.ov ? `<button type="button" class="btn" data-a="xmGroupReset" data-g="${esc(name)}">Reset</button>` : "")}</div></form>`;
}

/* ---------------- Pages ---------------- */
function vXmPages() {
  const eff = xmScopeEff(); const reg = xmPageRegistry();
  const rows = reg.map((p) => { const pc = eff.pages?.[p.key]; const cp = p.kind === "custom" ? eff.customPages?.[p.slug] : null; const hidden = Object.values(pc?.blocks || {}).filter((b) => b.hidden).length, renamed = Object.values(pc?.blocks || {}).filter((b) => b.title).length + (pc?.title ? 1 : 0), added = (pc?.added || []).length; const status = p.kind === "custom" ? (cp?.enabled === false ? badge("INACTIVE") : badge("ACTIVE")) : pc ? `<span class="badge tone-amber">Customised</span>` : `<span class="badge tone-grey">Platform default</span>`; return `<tr class="click" data-go="${xmHref("pages", "/" + encodeURIComponent(p.key))}"><td><strong>${esc(p.name)}</strong><div class="hint mono">${esc(p.key)}</div></td><td>${esc(p.module)}</td><td>${p.kind === "custom" ? `<span class="xm-flag cu">custom page</span>` : "System"}</td><td>${status}</td><td class="hint">${[hidden ? `${hidden} hidden` : "", renamed ? `${renamed} renamed` : "", added ? `${added} added` : ""].filter(Boolean).join(" · ") || "—"}</td></tr>`; });
  return xmShell("pages", `<div class="form-row" style="justify-content:space-between;margin-bottom:10px"><span class="hint">Select a page to see its sections and components. “Customised” means this view changes something on it.</span><button class="btn sm" data-a="xmPageNew">+ Create page</button></div>` + cardFlush("", table(["Page", "Module", "Kind", "Status", "Changes in this view"], rows)));
}
function xmPageNewModal(p = null, slug = "") {
  const isNew = !p; p = p || { name: "", title: "", description: "", module: "Custom pages", icon: "bookmark", layout: "two", visibility: { audiences: [], companies: [] }, enabled: true };
  return `<h3 style="margin:0 0 12px">${isNew ? "Create page" : "Page settings"}</h3><form data-f="xmPageSave" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><input type="hidden" name="slug" value="${esc(slug)}">
    ${xmFld("Page name", `<input class="in" name="name" value="${esc(p.name)}" required maxlength="60">`, isNew ? "The internal name is made from this and never changes." : `Internal name: ${slug}`)}${xmFld("Display name", `<input class="in" name="title" value="${esc(p.title)}" maxlength="60" placeholder="Same as the page name">`)}
    ${xmFld("Module", `<input class="in" name="module" value="${esc(p.module)}" maxlength="40">`)}${xmFld("Icon", xmSel("icon", XM_ICONS.map((x) => [x, x]), p.icon))}
    ${isNew ? xmFld("Parent menu", `<select class="in" name="parent"><option value="">Not in a menu yet</option>${XM_NAV_CATALOG.flatMap(([, items]) => items.map(([k, t]) => opt(k, t, false))).join("")}</select>`, "Adds a submenu that opens this page.") : ""}
    ${xmFld("Layout", xmSel("layout", [["two", "Two columns"], ["one", "One column"], ["full", "Full width"]], p.layout))}
    ${xmFld("Description", `<input class="in" name="description" value="${esc(p.description)}" maxlength="200">`, "", "1/-1")}
    ${xmVisFields(p.visibility)}${xmFld("Status", xmSel("enabled", [["1", "Enabled"], ["0", "Disabled"]], p.enabled === false ? "0" : "1"))}
    <div style="grid-column:1/-1">${xmFoot(isNew ? "Create page" : "Save", isNew ? "" : `<button type="button" class="btn danger" data-a="xmPageDelete" data-slug="${esc(slug)}">Delete page</button>`)}</div></form>`;
}
function vXmPageEditor(q, keyEnc) {
  const key = decodeURIComponent(keyEnc || ""); const def = xmPageDef(key);
  if (!def) return xmShell("pages", `<div class="crumb">${crumb(xmHref("pages"), "Pages")}</div>` + card("", empty("Page not found")));
  const eff = xmScopeEff(); const pc = eff.pages?.[key] || {};
  const addedRows = (list, parent = "") => list.map((a, i) => `<div class="xm-row ${parent ? "sub2" : "sub"} ${a.enabled === false ? "xm-muted" : ""}"><span class="ico">${icon(a.kind === "section" ? "layout" : "puzzle")}</span><span class="grow"><b>${esc(a.title || XM_COMPONENTS[a.component]?.name || "Section")}</b> <span class="xm-flag cu">${a.kind === "section" ? "added section" : "added component"}</span> <span class="hint">${a.kind === "section" ? `${(a.children || []).length} component${(a.children || []).length === 1 ? "" : "s"}` : `${XM_COMPONENTS[a.component]?.name || a.component} · ${XM_SIZE_OPTS.find((s) => s[0] === a.size)?.[1] || "Medium"}`}${a.anchor?.where && a.anchor.where !== "end" ? ` · ${a.anchor.where}${a.anchor.block ? ` “${xmTitleCase(a.anchor.block)}”` : ""}` : ""} · ${esc(xmVisText(a.visibility))}</span></span><span class="ops"><button class="btn" data-a="xmAddedOp" data-op="edit" data-page="${esc(key)}" data-id="${esc(a.id)}" data-parent="${esc(parent)}">Edit</button>${i ? `<button class="btn" data-a="xmAddedOp" data-op="up" data-page="${esc(key)}" data-id="${esc(a.id)}" data-parent="${esc(parent)}">↑</button>` : ""}${i < list.length - 1 ? `<button class="btn" data-a="xmAddedOp" data-op="down" data-page="${esc(key)}" data-id="${esc(a.id)}" data-parent="${esc(parent)}">↓</button>` : ""}<button class="btn" data-a="xmAddedOp" data-op="toggle" data-page="${esc(key)}" data-id="${esc(a.id)}" data-parent="${esc(parent)}">${a.enabled === false ? "Enable" : "Disable"}</button>${a.kind === "section" ? `<button class="btn" data-a="xmAddComp" data-page="${esc(key)}" data-where="into" data-into="${esc(a.id)}">+ Component</button>` : ""}<button class="btn" data-a="xmAddedOp" data-op="remove" data-page="${esc(key)}" data-id="${esc(a.id)}" data-parent="${esc(parent)}">Remove</button></span></div>${a.kind === "section" ? addedRows(a.children || [], a.id) : ""}`).join("");
  let structure = "";
  if (def.kind === "system") {
    const d = xmDiscover(key);
    const blockRow = (b, i, n, bcfg) => { const c = bcfg[b.key] || {}; return `<div class="xm-row ${b.hidden ? "xm-muted" : ""}"><span class="ico">${icon("layout")}</span><span class="grow"><b>${esc(c.title || b.title)}</b>${c.title ? ` <span class="xm-flag ov">renamed</span>` : ""}${b.hidden ? ` <span class="xm-flag hid">hidden</span>` : ""}${c.visibility && (c.visibility.audiences?.length || c.visibility.companies?.length) ? ` <span class="xm-flag">${esc(xmVisText(c.visibility))}</span>` : ""} <span class="hint mono">${esc(b.key)}</span></span><span class="ops">${b.hidden ? `<button class="btn" data-a="xmBlockOp" data-op="show" data-page="${esc(key)}" data-key="${esc(b.key)}" data-kind="block">Restore</button>` : `<button class="btn" data-a="xmBlockOp" data-op="rename" data-page="${esc(key)}" data-key="${esc(b.key)}" data-kind="block">Rename</button><button class="btn" data-a="xmBlockOp" data-op="vis" data-page="${esc(key)}" data-key="${esc(b.key)}" data-kind="block">Visible to</button>${i ? `<button class="btn" data-a="xmBlockOp" data-op="up" data-page="${esc(key)}" data-key="${esc(b.key)}" data-kind="block">↑</button>` : ""}${i < n - 1 ? `<button class="btn" data-a="xmBlockOp" data-op="down" data-page="${esc(key)}" data-key="${esc(b.key)}" data-kind="block">↓</button>` : ""}<button class="btn" data-a="xmBlockOp" data-op="hide" data-page="${esc(key)}" data-key="${esc(b.key)}" data-kind="block">Hide</button><button class="btn" data-a="xmBlockOp" data-op="add" data-page="${esc(key)}" data-key="${esc(b.key)}" data-kind="block">+ Component after</button>`}</span></div>${b.comps.map((cm, j) => { const cc = bcfg[cm.key] || {}; return `<div class="xm-row sub ${cm.hidden ? "xm-muted" : ""}"><span class="ico">${icon("puzzle")}</span><span class="grow">${esc(cc.title || cm.title)}${cc.title ? ` <span class="xm-flag ov">renamed</span>` : ""}${cm.hidden ? ` <span class="xm-flag hid">hidden</span>` : ""}${cc.visibility && (cc.visibility.audiences?.length || cc.visibility.companies?.length) ? ` <span class="xm-flag">${esc(xmVisText(cc.visibility))}</span>` : ""}</span><span class="ops">${cm.hidden ? `<button class="btn" data-a="xmBlockOp" data-op="show" data-page="${esc(key)}" data-key="${esc(cm.key)}" data-kind="comp">Restore</button>` : `<button class="btn" data-a="xmBlockOp" data-op="rename" data-page="${esc(key)}" data-key="${esc(cm.key)}" data-kind="comp">Rename</button><button class="btn" data-a="xmBlockOp" data-op="vis" data-page="${esc(key)}" data-key="${esc(cm.key)}" data-kind="comp">Visible to</button>${j ? `<button class="btn" data-a="xmBlockOp" data-op="up" data-page="${esc(key)}" data-key="${esc(cm.key)}" data-kind="comp">↑</button>` : ""}${j < b.comps.length - 1 ? `<button class="btn" data-a="xmBlockOp" data-op="down" data-page="${esc(key)}" data-key="${esc(cm.key)}" data-kind="comp">↓</button>` : ""}<button class="btn" data-a="xmBlockOp" data-op="hide" data-page="${esc(key)}" data-key="${esc(cm.key)}" data-kind="comp">Hide</button>`}</span></div>`; }).join("")}`; };
    structure = d.error ? `<p class="xm-empty">${esc(d.error)}</p>` : d.blocks.length ? d.blocks.map((b, i) => blockRow(b, i, d.blocks.length, pc.blocks || {})).join("") : `<p class="xm-empty">This page has no configurable sections (it is a single form or a record view). Components can still be added.</p>`;
    structure = `<p class="hint" style="margin:0 0 8px">Structure as <b>${esc(d.as || A.user.displayName)}</b> sees it in the “${esc(xmScopeLabel())}” view. Sections are the blocks of the page; components are the cards inside them.</p>` + `<section class="card" style="overflow:hidden">${structure}</section>`;
  } else {
    const cp = eff.customPages?.[def.slug] || { blocks: [] };
    structure = `<section class="card" style="overflow:hidden">${(cp.blocks || []).length ? addedRows(cp.blocks) : `<p class="xm-empty">Nothing on this page yet.</p>`}</section>`;
  }
  const settings = def.kind === "system" ? `<form data-f="xmPageSettings" class="form-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))"><input type="hidden" name="key" value="${esc(key)}">${xmFld("Display title", `<input class="in" name="title" value="${esc(pc.title || "")}" placeholder="${esc(def.name)}" maxlength="60">`)}${xmFld("Description", `<input class="in" name="description" value="${esc(pc.description || "")}" placeholder="Platform text" maxlength="200">`)}${xmFld("Layout of added components", xmSel("layout", [["two", "Two columns"], ["one", "One column"], ["full", "Full width"]], pc.layout || "two"))}${xmFld("Density", xmSel("density", [["", "Follow the organization"], ...XM_DENSITY.map(([k, l]) => [k, l])], pc.density || ""))}<div class="form-row" style="grid-column:1/-1"><button class="btn sm pri">Save page settings</button>${pc.title || pc.description || pc.layout || pc.density ? `<button type="button" class="btn sm" data-a="xmPageReset" data-key="${esc(key)}" data-what="settings">Reset settings</button>` : ""}${eff.pages?.[key] ? `<button type="button" class="btn sm" data-a="xmPageReset" data-key="${esc(key)}" data-what="all">Reset this page to platform default</button>` : ""}</div></form>` : `<div class="form-row"><button class="btn sm" data-a="xmPageEdit" data-slug="${esc(def.slug)}">Page settings</button><span class="hint">${esc(eff.customPages?.[def.slug]?.description || "")} · ${esc(xmVisText(eff.customPages?.[def.slug]?.visibility))}</span></div>`;
  const added = def.kind === "system" ? `<div class="sect-l">Added by configuration</div><section class="card" style="overflow:hidden">${(pc.added || []).length ? addedRows(pc.added) : `<p class="xm-empty">Nothing added yet.</p>`}</section>` : "";
  return xmShell("pages", `<div class="crumb">${crumb(xmHref("pages"), "Pages")}</div><div class="form-row" style="justify-content:space-between;align-items:flex-start;margin-bottom:12px"><div><h2 class="h2" style="margin:0">${esc(def.name)} ${def.kind === "custom" ? `<span class="xm-flag cu">custom page</span>` : ""}</h2><span class="hint">${esc(def.module)} · <span class="mono">${esc(key)}</span></span></div><span class="form-row" style="gap:6px"><button class="btn sm" data-a="xmPreviewPage" data-page="${esc(key)}">View as…</button><button class="btn sm" data-a="xmPreviewPage" data-page="${esc(key)}" data-edit="1">Edit in place</button><button class="btn sm" data-a="xmAddSection" data-page="${esc(key)}">+ Add section</button><button class="btn sm pri" data-a="xmAddComp" data-page="${esc(key)}" data-where="end">+ Add component</button><span class="xm-dl"><button class="btn" data-a="xmDl" data-kind="page" data-page="${esc(key)}" data-fmt="json">Download page JSON</button><button class="btn" data-a="xmDl" data-kind="page" data-page="${esc(key)}" data-fmt="pdf">PDF</button></span></span></div>
    ${card("Page settings", settings)}<div class="sect-l">Sections &amp; components</div>${structure}${added}`);
}
/** render a system page off-screen as the scope's representative and read its structure */
function xmDiscover(pattern) {
  const r = ROUTES.find((x) => x.pattern === pattern); if (!r) return { blocks: [], error: "This page has no route." };
  const uid = (XM.scope !== "default" ? xmRepresentative(XM.scope) : null) || A.user.id;
  const asA = authFor(S, uid, null) || A;
  const save = { A, route: UI.route, tabs: UI.tabs, ts: UI.ts, je: UI.je, filters: UI.filters, eff: XM.eff, cur: XM.curPattern };
  A = asA; UI.tabs = {}; UI.filters = {}; XM.eff = xmScopeEff(); XM.discover = true;
  let blocks = [], error = "";
  try {
    if (r.perm && !(typeof r.perm === "function" ? r.perm() : can(A, r.perm))) error = `${asA.user.displayName} may not open this page, so its structure can't be shown for this view.`;
    else { const params = pattern.includes(":") ? [xmSampleParam(pattern, asA)] : []; const html = r.view._xmInner ? r.view._xmInner({}, ...params) : r.view({}, ...params); xmProcessPage(pattern, html); blocks = (XM.lastBlocks?.[pattern] || []); }
  } catch (e) { console.error(e); error = `The page couldn't be drawn for discovery: ${e.message}`; }
  finally { XM.discover = false; A = save.A; UI.route = save.route; UI.tabs = save.tabs; UI.ts = save.ts; UI.je = save.je; UI.filters = save.filters; XM.eff = save.eff; XM.curPattern = save.cur; }
  return { blocks, error, as: asA.user.displayName };
}
function xmSampleParam(pattern, a) { const ids = scopeIds(S, a); if (pattern.startsWith("/hr/employees/")) return S.employees.find((e) => ids.includes(e.companyId) && e.status !== "TERMINATED")?.id || "x"; return "x"; }

/* ---------------- Component library ---------------- */
function xmLibraryListHtml(q, cat, pick = null) {
  const list = xmCompSearch(q).filter(([, d]) => !cat || d.cat === cat);
  if (!list.length) return `<p class="xm-empty">No components match “${esc(q)}”.</p>`;
  return `<div class="xm-lib">${list.map(([id, d]) => `<div class="xm-libc"><div class="form-row" style="justify-content:space-between"><b>${esc(d.name)}</b><span class="xm-flag ${d.type === "configurable" ? "cu" : ""}">${d.type === "configurable" ? "Configurable" : "System"}</span></div><span class="hint">${esc(d.cat)}</span><span>${esc(d.purpose)}</span><span class="hint"><b>Data:</b> ${esc(d.data)} · <b>Needs:</b> ${esc(xmPermText(d.perm))}</span><div class="acts">${pick ? `<button class="btn sm pri" data-a="xmCompPick" data-id="${id}">Choose</button>` : ""}<button class="btn sm" data-a="xmCompPreview" data-id="${id}">Preview</button>${pick ? "" : `<button class="btn sm" data-a="xmCompAddTo" data-id="${id}">Add to a page…</button>`}</div></div>`).join("")}</div>`;
}
function vXmLibrary() {
  const q = UI.filters.xmLibQ || "", cat = UI.filters.xmLibCat || "";
  return xmShell("library", `<div class="form-row" style="gap:10px;margin-bottom:4px"><input class="in" id="xmLibQ" placeholder="Search the library — leave, expense, approvals, chart…" value="${esc(q)}" style="max-width:420px" aria-label="Search components"><span class="hint">${Object.keys(XM_COMPONENTS).length} components. System components are maintained by the platform; configurable ones take settings. Every one reads live ERP data and respects permissions.</span></div><div class="xm-chips"><button class="${cat ? "" : "on"}" data-a="xmLibCat" data-v="">All</button>${XM_CATS.map((c) => `<button class="${cat === c ? "on" : ""}" data-a="xmLibCat" data-v="${c}">${c}</button>`).join("")}</div><div id="xmLibList">${xmLibraryListHtml(q, cat)}</div>`);
}
function xmCompPreviewAs(id, userId, cfg) {
  const u = byId(S.users, userId) ? userId : "u1";
  const save = { A, eff: XM.eff }; A = authFor(S, u, null) || save.A; XM.eff = xmScopeEff();
  let html = ""; try { html = xmRenderComponent({ component: id, config: cfg || XM_COMPONENTS[id].defaults, size: "large" }) || `<div class="xm-unavail">${esc(A.user.displayName)} would not see this component — it needs ${esc(xmPermText(XM_COMPONENTS[id].perm))}.</div>`; } catch (e) { html = `<div class="xm-unavail">${esc(e.message)}</div>`; } finally { A = save.A; XM.eff = save.eff; }
  return html;
}
function xmCompPreviewModal(id, userId = "u1") {
  const d = XM_COMPONENTS[id]; if (!d) return "";
  const demo = S.users.filter((u) => u.isDemoUser);
  return `<div class="form-row" style="justify-content:space-between;align-items:flex-start"><div><h3 style="margin:0">${esc(d.name)} <span class="xm-flag ${d.type === "configurable" ? "cu" : ""}">${d.type === "configurable" ? "Configurable" : "System"}</span></h3><span class="hint">${esc(d.cat)}</span></div><label class="form-row" style="gap:6px"><span class="hint">Preview as</span>${xmSel("as", demo.map((u) => [u.id, `${u.displayName} (${u.demoLabel})`]), userId, `data-a="xmCompPreviewAs" data-id="${id}"`)}</label></div>
    <dl class="kv" style="margin:12px 0"><dt>Purpose</dt><dd>${esc(d.purpose)}</dd><dt>Data source</dt><dd>${esc(d.data)}</dd><dt>Required permission</dt><dd>${esc(xmPermText(d.perm))}</dd><dt>Settings</dt><dd>${esc(d.opts.map((o) => XM_OPT_DEFS[o]?.label || o).join(", "))}, size, visibility</dd></dl>
    <div class="sect-l">Preview</div><div style="border:1px solid var(--border);border-radius:var(--r);padding:12px;background:var(--bg)">${xmCompPreviewAs(id, userId)}</div>
    <div class="form-row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-a="closeModal">Close</button>${XM.pick ? `<button class="btn pri" data-a="xmCompPick" data-id="${id}">Choose this component</button>` : `<button class="btn pri" data-a="xmCompAddTo" data-id="${id}">Add to a page…</button>`}</div>`;
}
/** the configuration panel for one component (new or existing) */
function xmCompForm(ctx) {
  const d = XM_COMPONENTS[ctx.component]; const c = { ...xmCompConfig(ctx.component, ctx.config || d.defaults) };
  const field = (k) => { const o = XM_OPT_DEFS[k]; if (!o) return ""; const opts = typeof o.opts === "function" ? o.opts(c) : o.opts; if (o.type === "text") return xmFld(o.label, `<input class="in" name="o_${k}" value="${esc(c[k] ?? "")}" maxlength="80">`); if (o.type === "textarea") return xmFld(o.label, `<textarea class="in" name="o_${k}" rows="4" style="height:auto;padding:8px 10px" maxlength="600">${esc(c[k] ?? "")}</textarea>`, "Plain text only.", "1/-1"); if (o.type === "select") return xmFld(o.label, xmSel(`o_${k}`, opts, c[k], k === "dataset" || k === "series" || k === "tseries" || k === "goal" || k === "metric" ? `data-a="xmCompReopt"` : "")); if (o.type === "multi") return `<div class="fld" style="grid-column:1/-1"><label>${esc(o.label)}</label><div class="xm-check">${opts.map(([v, l]) => `<label><input type="checkbox" name="o_${k}" value="${esc(v)}" ${(c[k] || []).includes(v) ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div></div>`; return ""; };
  const pages = xmPageRegistry(); const blocks = ctx.page && !ctx.page.startsWith("/pages/") ? (XM.lastBlocks?.[ctx.page] || xmDiscover(ctx.page).blocks) : [];
  return `<h3 style="margin:0 0 2px">${ctx.id ? "Configure" : "Add"} ${esc(d.name)}</h3><p class="hint" style="margin:0 0 12px">${esc(d.purpose)} <b>Data:</b> ${esc(d.data)}. <b>Needs:</b> ${esc(xmPermText(d.perm))}.</p>
  <form data-f="xmCompSave" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><input type="hidden" name="component" value="${esc(ctx.component)}"><input type="hidden" name="id" value="${esc(ctx.id || "")}"><input type="hidden" name="parent" value="${esc(ctx.parent || "")}"><input type="hidden" name="kind" value="component">
    ${ctx.page ? `<input type="hidden" name="page" value="${esc(ctx.page)}">` : xmFld("Page", xmSel("page", pages.map((p) => [p.key, `${p.name} — ${p.module}`]), ctx.pageDefault || "/dashboard"), "", "1/-1")}
    ${d.opts.filter((k) => k !== "size").map(field).join("")}
    ${xmFld("Size", xmSel("size", XM_SIZE_OPTS.map(([k, l, h]) => [k, `${l} — ${h}`]), ctx.size || d.defaults.size || "medium"))}
    ${ctx.id || ctx.parent ? "" : xmFld("Position", `<div class="form-row" style="gap:6px">${xmSel("where", [["end", "End of the page"], ["start", "Beginning of the page"], ["after", "After a section…"], ["before", "Before a section…"]], ctx.where || "end")}</div>${blocks.length ? xmSel("block", blocks.map((b) => [b.key, b.title]), ctx.block || "", 'style="margin-top:6px"') : ""}`)}
    ${xmVisFields(ctx.visibility)}${xmFld("Status", xmSel("enabled", [["1", "Enabled"], ["0", "Disabled"]], ctx.enabled === false ? "0" : "1"))}
    <div style="grid-column:1/-1">${xmFoot(ctx.id ? "Save" : "Add to page", `<button type="button" class="btn" data-a="xmCompPreview" data-id="${esc(ctx.component)}" data-back="1">Preview</button>`)}</div></form>`;
}
function xmSectionForm(ctx) {
  const blocks = ctx.page && !ctx.page.startsWith("/pages/") ? (XM.lastBlocks?.[ctx.page] || xmDiscover(ctx.page).blocks) : [];
  return `<h3 style="margin:0 0 12px">${ctx.id ? "Edit section" : "Add section"}</h3><form data-f="xmCompSave" class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><input type="hidden" name="kind" value="section"><input type="hidden" name="id" value="${esc(ctx.id || "")}"><input type="hidden" name="page" value="${esc(ctx.page)}"><input type="hidden" name="parent" value="">
    ${xmFld("Section name", `<input class="in" name="o_title" value="${esc(ctx.title || "")}" required maxlength="60" placeholder="e.g. Emergency contacts">`)}${xmFld("Description (optional)", `<input class="in" name="o_description" value="${esc(ctx.description || "")}" maxlength="200">`)}
    ${ctx.id ? "" : xmFld("Position", `${xmSel("where", [["end", "End of the page"], ["start", "Beginning of the page"], ["after", "After a section…"], ["before", "Before a section…"]], "end")}${blocks.length ? xmSel("block", blocks.map((b) => [b.key, b.title]), "", 'style="margin-top:6px"') : ""}`)}
    ${xmVisFields(ctx.visibility)}${xmFld("Status", xmSel("enabled", [["1", "Enabled"], ["0", "Disabled"]], ctx.enabled === false ? "0" : "1"))}<div style="grid-column:1/-1">${xmFoot(ctx.id ? "Save" : "Add section")}</div></form>`;
}
/** where added entries live for a page in the current scope layer */
function xmAddedOf(page, create = false) {
  const L = xmLayer();
  if (page.startsWith("/pages/")) { const slug = page.slice(7); L.customPages = L.customPages || {}; if (!L.customPages[slug]) { if (!create) return null; L.customPages[slug] = xmMerge(xmWork().customPages?.[slug] || { name: slug, title: slug, blocks: [] }, {}); } L.customPages[slug].blocks = L.customPages[slug].blocks || []; return L.customPages[slug].blocks; }
  L.pages = L.pages || {}; if (!L.pages[page]) { if (!create) return null; L.pages[page] = {}; } L.pages[page].added = L.pages[page].added || []; return L.pages[page].added;
}
function xmFindAdded(page, id, parent) { let list = xmAddedOf(page, true); if (parent) { const sec = list.find((x) => x.id === parent); if (!sec) return { list: null, i: -1 }; sec.children = sec.children || []; list = sec.children; } return { list, i: list.findIndex((x) => x.id === id) }; }

/* ---------------- Terminology ---------------- */
function vXmTerms() {
  const eff = xmScopeEff(), labels = eff.labels || {}, custom = eff.customTerms || [];
  const rows = (kind) => XM_TERMS.filter((t) => t[0] === kind).map(([, key, text]) => `<tr><td class="mono" style="font-size:11.5px;color:var(--muted-fg)">${esc(key)}</td><td>${esc(text)}</td><td><input class="in" name="t:${esc(key)}" value="${esc(labels[key] || "")}" placeholder="${esc(text)}" maxlength="300" style="height:32px"></td><td class="r">${labels[key] ? `<button type="button" class="btn sm" data-a="xmTermReset" data-key="${esc(key)}">Reset</button>` : ""}</td></tr>`);
  return xmShell("terminology", `<form data-f="xmTermsSave"><div class="form-row" style="justify-content:space-between;margin-bottom:10px"><span class="hint">Change how things are named. Internal identifiers, routes and data never change — only the words people see, wherever that exact label appears. Navigation labels are edited under Navigation &amp; IA. Plain text only.</span><button class="btn sm pri">Save labels</button></div>
    ${Object.entries(XM_TERM_KINDS).map(([k, l]) => `<div class="sect-l">${esc(l)}</div>` + cardFlush("", table(["Internal identifier", "Default", "Display label", ""], rows(k)))).join("")}
    <div class="form-row" style="justify-content:flex-end;margin-top:12px"><button class="btn pri">Save labels</button></div></form>
    <div class="sect-l">Your own terms</div>${card("Add a term", `<form data-f="xmTermAdd" class="form-grid" style="grid-template-columns:2fr 2fr 1fr auto;align-items:end">${xmFld("Text as it appears now", `<input class="in" name="find" required maxlength="120" placeholder="e.g. Pay & benefits">`)}${xmFld("Show instead", `<input class="in" name="to" required maxlength="300">`)}${xmFld("Kind", xmSel("kind", Object.entries(XM_TERM_KINDS).map(([k, l]) => [k, l]), "field"))}<button class="btn pri" style="height:38px">Add</button></form><p class="hint" style="margin:8px 0 0">Matches a whole label exactly (a column heading, a button, a hint sentence) — not words inside sentences.</p>`)}
    ${custom.length ? cardFlush("", table(["Kind", "Find", "Show instead", ""], custom.map((t) => `<tr><td>${esc(XM_TERM_KINDS[t.kind] || t.kind)}</td><td>${esc(t.find)}</td><td>${esc(t.to)}</td><td class="r"><button class="btn sm" data-a="xmTermRemove" data-id="${esc(t.id)}">Remove</button></td></tr>`))) : ""}`);
}

/* ---------------- Typography ---------------- */
function vXmTypo() {
  const eff = xmScopeEff(), T = eff.typography || {};
  const f = XM_FONTS.find((x) => x[0] === T.font); const fam = f && f[2] ? `${f[2].replace(/"/g, "'")},system-ui,sans-serif` : "var(--font-ui)";
  const zoom = { 12: 0.88, 13: 0.94, 14: 1, 15: 1.07, 16: 1.14 }[T.size] || 1;
  const hw = T.headingWeight && T.headingWeight !== "default" ? T.headingWeight : 600, bw = T.bodyWeight && T.bodyWeight !== "default" ? T.bodyWeight : 400, btw = T.buttonWeight && T.buttonWeight !== "default" ? T.buttonWeight : 500;
  const sel = (k, opts, cur) => xmSel(k, opts, cur, `data-a="xmTypo" data-k="${k}"`);
  return xmShell("typography", `<div class="grid g2" style="align-items:start">${card("Typography", `<div class="form-grid" style="grid-template-columns:1fr 1fr">${xmFld("Primary font", sel("font", XM_FONTS.map(([k, l]) => [k, k === "inter" ? `${l} (recommended)` : l]), T.font || "look"), "“Follow the chosen look” keeps each look's own font.")}${xmFld("Base font size", sel("size", [["default", "Platform default (14px)"], ...XM_SIZES.map((s) => [s, `${s}px`])], T.size || "default"))}${xmFld("Heading weight", sel("headingWeight", [["default", "Default (600)"], ...XM_HEAD_W.map((w) => [w, w])], T.headingWeight || "default"))}${xmFld("Body weight", sel("bodyWeight", [["default", "Default (400)"], ...XM_BODY_W.map((w) => [w, w])], T.bodyWeight || "default"))}${xmFld("Button weight", sel("buttonWeight", [["default", "Default (500)"], ...XM_BTN_W.map((w) => [w, w])], T.buttonWeight || "default"))}${xmFld("Information density", xmSel("density", XM_DENSITY.map(([k, l, h]) => [k, `${l} — ${h}`]), eff.density || "standard", `data-a="xmTypo" data-k="density"`))}</div><p class="hint" style="margin:10px 0 0">Only approved values are offered, so no choice can break the layout. Changes apply to the “${esc(xmScopeLabel())}” view and are seen after publishing (or in View as).</p><div class="form-row" style="margin-top:10px"><button class="btn sm" data-a="xmTypoReset">Reset typography to platform default</button><span class="xm-dl"><button class="btn" data-a="xmDl" data-kind="appearance" data-fmt="json">Download appearance</button></span></div>`)}
    ${card("Live preview", `<div class="xm-typo-prev" style="font-family:${fam};zoom:${zoom};font-weight:${bw}"><h1 style="font-weight:${hw};font-family:${fam}">Employee Management</h1><h2 style="font-weight:${hw};font-family:${fam}">Employee Information</h2><dl class="kv"><dt>Employee Name</dt><dd>Kiona Cardinal</dd><dt>Department</dt><dd>Finance</dd><dt>Status</dt><dd>${badge("ACTIVE")}</dd></dl><div class="form-row" style="margin-top:14px"><button class="btn pri" style="font-weight:${btw};font-family:${fam}">Save Changes</button><button class="btn" style="font-weight:${btw};font-family:${fam}">Cancel</button></div><div class="tw" style="margin-top:14px"><table class="t"><thead><tr><th>Name</th><th>Department</th><th class="r">Amount</th></tr></thead><tbody><tr><td>Kiona Cardinal</td><td>Finance</td><td class="r num">$1,250.00</td></tr><tr><td>Wade Ladouceur</td><td>Harvest Operations</td><td class="r num">$860.50</td></tr></tbody></table></div></div>`)}</div>`);
}

/* ---------------- Role & company views ---------------- */
function vXmViews() {
  const w = xmWork(), ov = w.overrides || {}, byAud = xmPeopleByAudience();
  const areas = (o) => [o.nav ? "navigation" : "", o.pages || o.customPages ? "pages" : "", o.labels || o.customTerms ? "terminology" : "", o.typography || o.density ? "typography" : ""].filter(Boolean).join(", ") || "no differences";
  const cardFor = (key, title, sub) => { const on = XM.scope === key; const o = ov[key]; return `<div class="xm-vc ${on ? "on" : ""}"><b>${esc(title)}${on ? ` <span class="badge tone-green">editing</span>` : ""}</b><span class="hint">${esc(sub)}</span><span>${key === "default" ? "Everyone starts from this." : o ? `Differs in: ${areas(o)}` : "Same as the group default"}</span><div class="acts"><button class="btn sm ${on ? "" : "pri"}" data-a="xmScope" data-v="${esc(key)}">${on ? "Editing" : "Edit this view"}</button>${key !== "default" ? `<button class="btn sm" data-a="xmViewAs" data-id="${esc(xmRepresentative(key) || "")}" ${xmRepresentative(key) ? "" : "disabled"}>View as</button>` : ""}${o ? `<button class="btn sm" data-a="xmScopeReset" data-v="${esc(key)}">Reset to default</button>` : ""}</div></div>`; };
  return xmShell("views", `<p class="hint" style="margin:0 0 12px">Configuration priority: platform default → group default → company override → role override. Pick a view to edit; everything you change under Navigation, Pages, Terminology and Typography then applies to that view only. Only create overrides you need.</p>
    <div class="sect-l">Group</div><div class="xm-cards">${cardFor("default", "Group default", "HAICO Group — all companies, all roles")}</div>
    <div class="sect-l">By role</div><div class="xm-cards">${XM_AUDIENCES.filter(([k]) => k !== "everyone").map(([k, l, h]) => cardFor(`role:${k}`, l, `${h} · ${byAud[k]?.people.length || 0} ${byAud[k]?.people.length === 1 ? "person" : "people"}`)).join("")}</div>
    <div class="sect-l">By company</div><div class="xm-cards">${S.companies.map((c) => cardFor(`company:${c.id}`, c.displayName, `${S.employees.filter((e) => e.companyId === c.id && e.status !== "TERMINATED").length} people · ${c.industry || ""}`)).join("")}</div>`);
}

/* ---------------- View as ---------------- */
function vXmPreview() {
  const byAud = xmPeopleByAudience(); const cos = [["", "Their usual company view"], ...S.companies.map((c) => [c.id, c.displayName])];
  const people = S.users.filter((u) => u.isActive !== false).map((u) => { const a = authFor(S, u.id); const e = a?.employee; return { id: u.id, name: u.displayName, role: u.demoLabel || a?.roleNames.join(", ") || "User", company: e ? co(e.companyId)?.displayName : "All companies", aud: [...xmAudiencesOf(a)].filter((x) => x !== "everyone").map((x) => XM_AUD_LABEL[x]).join(", ") }; }).sort((a, b) => a.name.localeCompare(b.name));
  return xmShell("preview", `<div class="grid g2" style="align-items:start">${card("Preview mode", `<p style="margin:0 0 8px;font-size:13px">See the platform exactly as a role or a person would — navigation, pages, sections, components, labels, typography and visibility — using the <b>draft</b> you are editing. While previewing, every real action (approve, post, save, send) is turned off, and a banner says who you are viewing as. Turn on <b>Edit mode</b> to rename, hide, move and add components right on the page.</p><div class="form-row"><label class="form-row" style="gap:6px"><span class="hint">Company</span>${xmSel("co", cos, XM.previewCo || "", 'data-a="xmPreviewCo"')}</label></div>`)}
    ${card("By role", `<div class="xm-cards">${XM_AUDIENCES.filter(([k]) => k !== "everyone").map(([k, l, h]) => { const rep = xmRepresentative(k); const u = rep ? byId(S.users, rep) : null; return `<div class="xm-vc"><b>${esc(l)}</b><span class="hint">${esc(h)}</span><span>${u ? `as ${esc(u.displayName)}` : "No one in this role"} · ${byAud[k]?.people.length || 0} ${(byAud[k]?.people.length || 0) === 1 ? "person" : "people"}</span><div class="acts"><button class="btn sm pri" data-a="xmViewAs" data-id="${esc(rep || "")}" ${rep ? "" : "disabled"}>View as</button><button class="btn sm" data-a="xmViewAs" data-id="${esc(rep || "")}" data-edit="1" ${rep ? "" : "disabled"}>Edit mode</button></div></div>`; }).join("")}</div>`)}</div>
    <div class="sect-l">A specific person</div><div class="form-row" style="margin-bottom:8px"><input class="in" data-filter="xmPeople" placeholder="Filter by name, role or company…" style="max-width:360px" aria-label="Filter people"></div>
    ${cardFlush("", `<div class="tw"><table class="t" id="xmPeople"><thead><tr><th>Person</th><th>Role</th><th>Company</th><th>Audiences</th><th></th></tr></thead><tbody>${people.map((p) => `<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.role)}</td><td>${esc(p.company)}</td><td class="hint">${esc(p.aud)}</td><td class="r"><button class="btn sm pri" data-a="xmViewAs" data-id="${p.id}">View as</button> <button class="btn sm" data-a="xmViewAs" data-id="${p.id}" data-edit="1">Edit mode</button></td></tr>`).join("")}</tbody></table></div>`)}`);
}

/* ---------------- Drafts, review, versions, downloads, import ---------------- */
function xmImpact(before, after) {
  const changes = xmDiff(before, after);
  const counts = {}; let total = 0;
  for (const u of S.users.filter((x) => x.isActive !== false)) { const a = authFor(S, u.id); if (!a) continue; if (JSON.stringify(xmEffective(before || {}, a)) === JSON.stringify(xmEffective(after || {}, a))) continue; total++; for (const k of xmAudiencesOf(a)) if (k !== "everyone") counts[k] = (counts[k] || 0) + 1; }
  return { changes, roles: Object.entries(counts).map(([k, n]) => ({ key: k, label: XM_AUD_LABEL[k], n })), total };
}
function xmReviewModal() {
  const w = xmWork(), pub = S.xmPublished?.config || null; const im = xmImpact(pub, w);
  if (!im.changes.length) return `<h3 style="margin:0 0 8px">Nothing to publish</h3><p class="hint">The draft is identical to what is published now.</p><div class="form-row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-a="closeModal">Close</button></div>`;
  return `<h3 style="margin:0 0 2px">Review changes</h3><p class="hint" style="margin:0 0 10px">Published ${pub ? `version ${S.xmPublished.version}` : "platform defaults"} → new version ${S.xmVersions.length + 1}. ${im.changes.length} change${im.changes.length === 1 ? "" : "s"}.</p>
    <div style="max-height:40vh;overflow:auto;border:1px solid var(--border);border-radius:var(--r);padding:4px 12px">${xmDiffHtml(im.changes)}</div>
    <div class="sect-l">People affected</div>${im.total ? `<div class="form-row" style="gap:8px">${im.roles.map((r) => `<span class="badge tone-teal">${esc(r.label)}: ${r.n}</span>`).join("")}<span class="hint">${im.total} ${im.total === 1 ? "person's" : "people's"} experience changes</span></div>` : `<p class="hint">No signed-in person's experience changes (the changes affect roles or companies with no users yet).</p>`}
    <form data-f="xmPublish" style="margin-top:12px"><div class="fld"><label for="xmPubNote">Note for the version history (optional)</label><input class="in" id="xmPubNote" name="note" maxlength="200" placeholder="e.g. Added Leave balance to Employee Home"></div><div class="form-row" style="justify-content:flex-end;margin-top:14px"><span class="xm-dl"><button type="button" class="btn" data-a="xmDl" data-kind="draft" data-fmt="json">Download draft</button></span><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri" ${xmCan("publish") ? "" : "disabled title=\"You can't publish\""}>Publish changes</button></div></form>`;
}
function vXmVersions(q) {
  const w = xmWork(), pub = S.xmPublished, draft = S.xmDraft, unsaved = xmUnsaved();
  const versions = [...S.xmVersions].reverse();
  const dl = (v, kind = "version") => `<span class="xm-dl"><button class="btn" data-a="xmDl" data-kind="${kind}" data-v="${v}" data-fmt="json">JSON</button><button class="btn" data-a="xmDl" data-kind="${kind}" data-v="${v}" data-fmt="pdf">PDF</button><button class="btn" data-a="xmDl" data-kind="${kind}" data-v="${v}" data-fmt="zip">ZIP</button></span>`;
  const draftCard = card("Draft", `<dl class="kv"><dt>Unsaved changes</dt><dd>${unsaved.length ? `<span class="badge tone-amber">${unsaved.length}</span> in this browser` : "none"}</dd><dt>Saved draft</dt><dd>${draft ? `${esc(draft.savedBy)} · ${esc(dTime(draft.savedAt))}${draft.note ? ` · ${esc(draft.note)}` : ""}${draft.source === "import" ? ` <span class="xm-flag cu">imported</span>` : ""}` : "none"}</dd>${draft?.importMeta?.warnings?.length ? `<dt>Import notes</dt><dd class="hint">${draft.importMeta.warnings.map(esc).join("<br>")}</dd>` : ""}</dl>
    ${unsaved.length ? `<div style="max-height:160px;overflow:auto;margin-top:8px;border:1px solid var(--border);border-radius:var(--r);padding:2px 10px">${xmDiffHtml(unsaved, 40)}</div>` : ""}
    <form data-f="xmDraftSave" class="form-row" style="margin-top:10px"><input class="in" name="note" placeholder="Note (optional)" maxlength="200" style="flex:1;min-width:160px"><button class="btn pri sm" ${unsaved.length ? "" : "disabled"}>Save draft</button><button type="button" class="btn sm" data-a="xmDiscardWork" ${unsaved.length ? "" : "disabled"}>Discard unsaved</button>${draft ? `<button type="button" class="btn sm" data-a="xmDraftDiscard">Discard saved draft</button>` : ""}</form>
    <div class="form-row" style="margin-top:10px"><button class="btn pri" data-a="xmReview">Review &amp; publish</button><span class="xm-dl"><button class="btn" data-a="xmDl" data-kind="draft" data-fmt="json">Download draft JSON</button><button class="btn" data-a="xmDl" data-kind="draft" data-fmt="pdf">PDF</button></span></div>`);
  const pubCard = card("Published configuration", pub ? `<dl class="kv"><dt>Version</dt><dd>${pub.version}</dd><dt>Published</dt><dd>${esc(dTime(pub.at))} · ${esc(pub.by)}</dd><dt>Changes</dt><dd>${S.xmVersions[pub.version - 1]?.changes.length ?? 0}</dd></dl><div class="form-row" style="margin-top:10px;gap:10px;flex-wrap:wrap"><span><span class="hint">Current configuration</span> ${dl(pub.version, "current")}</span><span><span class="hint">Navigation</span> <span class="xm-dl"><button class="btn" data-a="xmDl" data-kind="nav" data-fmt="json">JSON</button><button class="btn" data-a="xmDl" data-kind="nav" data-fmt="pdf">PDF</button></span></span><span><span class="hint">Appearance</span> <span class="xm-dl"><button class="btn" data-a="xmDl" data-kind="appearance" data-fmt="json">JSON</button><button class="btn" data-a="xmDl" data-kind="appearance" data-fmt="pdf">PDF</button></span></span></div>` : `<p class="hint">Nothing published yet — everyone sees the platform's defaults. Review &amp; publish the draft to create version 1.</p>`);
  const importCard = card("Import a configuration", `<div class="xm-imp"><p style="margin:0 0 8px">Upload a <b>JSON</b> configuration exported from this platform (the .json inside a ZIP package). It is validated, compared with what is published, and becomes a <b>draft</b> — nothing is applied until you review and publish.</p><input type="file" id="xmImportFile" accept=".json,application/json" style="display:none"><button class="btn sm pri" data-a="xmImportPick" ${xmCan("import") ? "" : "disabled"}>Choose file…</button></div>`);
  const cmp = `<form data-f="xmCompare" class="form-row" style="gap:6px">${xmSel("a", S.xmVersions.map((v) => [v.n, `Version ${v.n}`]), q.a || Math.max(1, S.xmVersions.length - 1))}<span class="hint">→</span>${xmSel("b", S.xmVersions.map((v) => [v.n, `Version ${v.n}`]), q.b || S.xmVersions.length)}<button class="btn sm">Compare</button></form>`;
  const compareOut = q.a && q.b ? (() => { const va = S.xmVersions.find((v) => v.n === +q.a), vb = S.xmVersions.find((v) => v.n === +q.b); if (!va || !vb) return ""; const d = xmDiff(va.config, vb.config); return card(`Version ${va.n} → Version ${vb.n}`, `<div class="form-row" style="gap:8px;margin-bottom:6px">${["added", "removed", "changed", "moved"].map((k) => `${xmKindBadge(k)} ${d.filter((c) => c.kind === k).length}`).join(" ")}</div>${xmDiffHtml(d)}`); })() : "";
  const hist = cardFlush("", table(["Version", "Published", "By", "Note", "Changes", "Source", ""], versions.map((v) => `<tr><td><strong>Version ${v.n}</strong>${pub?.version === v.n ? ` <span class="badge tone-green">Published</span>` : ""}</td><td style="white-space:nowrap">${esc(dTime(v.at))}</td><td>${esc(v.by)}</td><td style="max-width:260px">${esc(v.note || "")}</td><td>${v.changes.length}</td><td class="hint">${v.restoredFrom ? `Restored from v${v.restoredFrom}` : v.importedFrom ? `Imported` : "Editor"}</td><td class="r" style="white-space:nowrap"><button class="btn sm" data-go="${xmHref("versions", "/" + v.n)}">View</button> ${v.n > 1 ? `<button class="btn sm" data-go="${xmHref("versions", `?a=${v.n - 1}&b=${v.n}`)}">Compare</button>` : ""} ${pub?.version !== v.n ? `<button class="btn sm" data-a="xmRestore" data-v="${v.n}" ${xmCan("restore") ? "" : "disabled"}>Restore</button>` : ""} ${dl(v.n)}</td></tr>`), "No versions yet. Publishing creates version 1."));
  const dls = [...S.xmDownloads].reverse().slice(0, 10);
  const dlLog = cardFlush("", table(["When", "Who", "File", "Version"], dls.map((d) => `<tr><td style="white-space:nowrap">${esc(dTime(d.at))}</td><td>${esc(d.by)}</td><td class="mono" style="font-size:12px">${esc(d.file)}</td><td>${d.version ?? "—"}</td></tr>`), "No downloads recorded yet."));
  return xmShell("versions", `<div class="grid g2" style="align-items:start">${draftCard}${pubCard}</div><div class="grid g2" style="align-items:start;margin-top:14px">${importCard}${card("Compare versions", S.xmVersions.length > 1 ? cmp : `<p class="hint">Compare becomes available once two versions exist.</p>`)}</div>${compareOut ? `<div style="margin-top:14px">${compareOut}</div>` : ""}
    <div class="form-row" style="justify-content:space-between;margin-top:18px"><div class="sect-l" style="margin:0">Version history</div>${S.xmVersions.length ? dlButton("xm-history", "Download change history", { variant: "outline" }) : ""}</div><div style="margin-top:8px">${hist}</div>
    <div class="sect-l">Configuration downloads (audited)</div>${dlLog}`);
}
function vXmVersion(q, n) {
  const v = S.xmVersions.find((x) => x.n === +n); if (!v) return xmShell("versions", `<div class="crumb">${crumb(xmHref("versions"), "Versions")}</div>` + card("", empty("Version not found")));
  const c = v.config; const count = (o) => Object.keys(o || {}).length;
  return xmShell("versions", `<div class="crumb">${crumb(xmHref("versions"), "Versions")}</div><div class="grid g2" style="align-items:start">${card(`Version ${v.n}`, `<dl class="kv"><dt>Published</dt><dd>${esc(dTime(v.at))}</dd><dt>By</dt><dd>${esc(v.by)}</dd><dt>Note</dt><dd>${esc(v.note || "—")}</dd><dt>Source</dt><dd>${v.restoredFrom ? `Restored from version ${v.restoredFrom}` : v.importedFrom ? "Imported file" : "Editor"}</dd><dt>Status</dt><dd>${S.xmPublished?.version === v.n ? `<span class="badge tone-green">Published now</span>` : "Superseded"}</dd></dl><div class="form-row" style="margin-top:10px">${S.xmPublished?.version !== v.n ? `<button class="btn pri sm" data-a="xmRestore" data-v="${v.n}" ${xmCan("restore") ? "" : "disabled"}>Restore this version</button>` : ""}${v.n > 1 ? `<button class="btn sm" data-go="${xmHref("versions", `?a=${v.n - 1}&b=${v.n}`)}">Compare with version ${v.n - 1}</button>` : ""}<span class="xm-dl"><button class="btn" data-a="xmDl" data-kind="version" data-v="${v.n}" data-fmt="json">JSON</button><button class="btn" data-a="xmDl" data-kind="version" data-v="${v.n}" data-fmt="pdf">PDF</button><button class="btn" data-a="xmDl" data-kind="version" data-v="${v.n}" data-fmt="zip">ZIP</button></span></div>`)}
    ${card("What this version holds", `<dl class="kv"><dt>Custom menus</dt><dd>${(c.nav?.custom || []).length}</dd><dt>Menu changes</dt><dd>${count(c.nav?.items) + count(c.nav?.tabs) + count(c.nav?.groups)}</dd><dt>Pages customised</dt><dd>${count(c.pages)}</dd><dt>Custom pages</dt><dd>${count(c.customPages)}</dd><dt>Terms</dt><dd>${count(c.labels) + (c.customTerms || []).length}</dd><dt>Font</dt><dd>${esc(XM_FONTS.find((f) => f[0] === c.typography?.font)?.[1] || "Look's font")} · ${c.typography?.size === "default" ? "14" : c.typography?.size}px</dd><dt>Density</dt><dd>${esc(c.density || "standard")}</dd><dt>Overrides</dt><dd>${Object.keys(c.overrides || {}).map((k) => esc(k.startsWith("role:") ? `${XM_AUD_LABEL[k.slice(5)]} view` : `${co(k.slice(8))?.displayName} override`)).join(", ") || "none"}</dd></dl>`)}</div>
    <div class="sect-l">Changes in this version (compared with version ${v.n - 1 || "0 — platform defaults"})</div>${card("", xmDiffHtml(v.changes))}`);
}
EXPORTS["xm-history"] = () => ({ base: `HAICO_ERP_UI_Config_History_${todayStr()}`, title: "Page & Experience configuration history", rows: [["Version", "Published", "By", "Note", "Changes", "Source", "Summary"], ...S.xmVersions.map((v) => [v.n, v.at.replace("T", " ").slice(0, 16), v.by, v.note || "", v.changes.length, v.restoredFrom ? `Restored from v${v.restoredFrom}` : v.importedFrom ? "Imported" : "Editor", v.changes.slice(0, 12).map((c) => c.text).join(" | ")])] });

/* ---- downloads: JSON / PDF / ZIP through the platform's download capability, every one audited ---- */
function xmReportRows(cfg, meta) {
  const rows = [["Area", "Item", "Setting"]];
  rows.push(["Document", "Organization", XM_ORG], ["Document", "Configuration schema", String(XM_SCHEMA)], ["Document", "ERP version", XM_ERP_VERSION], ["Document", "UI configuration version", meta.version != null ? String(meta.version) : "draft"], ["Document", "Company scope", meta.scope || "Group (all companies)"], ["Document", "Created by", meta.createdBy || ""], ["Document", "Created", (meta.createdDate || "").slice(0, 16).replace("T", " ")], ["Document", "Published", (meta.publishedDate || "").slice(0, 16).replace("T", " ") || "not published"]);
  const flat = xmFlatten(xmSanitize(cfg)); const empty = xmFlatten(xmEmpty());
  for (const [k, v] of flat) { if (k === "schema") continue; if (JSON.stringify(empty.get(k)) === JSON.stringify(v)) continue; const { cat, text } = xmPathText(k, cfg, cfg); rows.push([cat, text, xmValText(v)]); }
  if (rows.length === 9) rows.push(["Configuration", "Platform defaults", "No changes from the platform defaults"]);
  for (const [k, l] of XM_AUDIENCES) if (k !== "everyone") rows.push(["Roles", l, (cfg.overrides || {})[`role:${k}`] ? "Own view" : "Group default"]);
  return rows;
}
function xmSubset(cfg, kind, page) {
  const c = xmSanitize(cfg);
  if (kind === "nav") return { schema: c.schema, nav: c.nav, customPages: Object.fromEntries(Object.entries(c.customPages).filter(([slug]) => c.nav.custom.some((m) => m.dest?.slug === slug))), overrides: Object.fromEntries(Object.entries(c.overrides).filter(([, v]) => v.nav).map(([k, v]) => [k, { nav: v.nav }])) };
  if (kind === "appearance") return { schema: c.schema, typography: c.typography, density: c.density, overrides: Object.fromEntries(Object.entries(c.overrides).filter(([, v]) => v.typography || v.density).map(([k, v]) => [k, { typography: v.typography, density: v.density }])) };
  if (kind === "page") { if (page.startsWith("/pages/")) { const slug = page.slice(7); return { schema: c.schema, customPages: { [slug]: c.customPages[slug] }, overrides: Object.fromEntries(Object.entries(c.overrides).filter(([, v]) => v.customPages?.[slug]).map(([k, v]) => [k, { customPages: { [slug]: v.customPages[slug] } }])) }; } return { schema: c.schema, pages: { [page]: c.pages[page] || {} }, overrides: Object.fromEntries(Object.entries(c.overrides).filter(([, v]) => v.pages?.[page]).map(([k, v]) => [k, { pages: { [page]: v.pages[page] } }])) }; }
  return c;
}
async function xmDownload(kind, fmt, opts = {}) {
  if (!xmCan("export")) { toast("Not allowed", "Your role can't download configurations.", "err"); return; }
  const date = todayStr(); let cfg, version = null, meta = { createdBy: A.user.displayName, createdDate: new Date().toISOString() }, base = `HAICO_ERP_UI_Config`;
  if (kind === "version") { const v = S.xmVersions.find((x) => x.n === +opts.v); if (!v) return; cfg = v.config; version = v.n; meta = { ...meta, version: v.n, createdBy: v.by, createdDate: v.at, publishedDate: v.at, note: v.note }; }
  else if (kind === "current") { if (!S.xmPublished) { toast("Nothing published", "Publish a draft first.", "err"); return; } cfg = S.xmPublished.config; version = S.xmPublished.version; meta = { ...meta, version, publishedDate: S.xmPublished.at, createdBy: S.xmPublished.by, createdDate: S.xmPublished.at }; }
  else if (kind === "draft") { cfg = xmWork(); meta = { ...meta, version: null, kind: "draft" }; base = `HAICO_ERP_UI_Config_Draft`; }
  else { cfg = S.xmPublished?.config || xmWork(); version = S.xmPublished?.version ?? null; meta = { ...meta, version, publishedDate: S.xmPublished?.at || null, kind }; }
  let name = `${base}_v${version ?? "draft"}_${date}`;
  if (kind === "nav") { cfg = xmSubset(cfg, "nav"); name = `HAICO_ERP_Navigation_Config_v${version ?? "draft"}_${date}`; }
  if (kind === "appearance") { cfg = xmSubset(cfg, "appearance"); name = `HAICO_ERP_Appearance_Config_v${version ?? "draft"}_${date}`; }
  if (kind === "page") { cfg = xmSubset(cfg, "page", opts.page); name = `HAICO_${xmPageName(opts.page).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}_Config_v${version ?? "draft"}_${date}`; meta.kind = "page"; meta.page = opts.page; }
  const pkg = xmPackage(cfg, { ...meta, kind: meta.kind || "full" });
  const json = JSON.stringify(pkg, null, 2);
  const title = `HAICO ERP - Page & Experience Configuration${version != null ? ` - Version ${version}` : " - Draft"}${kind === "page" ? ` - ${xmPageName(opts.page)}` : kind === "nav" ? " - Navigation" : kind === "appearance" ? " - Appearance" : ""}`;
  let data, filename;
  if (fmt === "json") { data = json; filename = `${name}.json`; }
  else if (fmt === "pdf") { data = buildPdf(xmReportRows(cfg, pkg), title, `${XM_ORG} · ${kind === "draft" ? "draft" : "published " + (pkg.publishedDate || "").slice(0, 10)}`); filename = `${name}.pdf`; }
  else { data = xmZip([[`${name}.json`, json], [`${name}.pdf`, buildPdf(xmReportRows(cfg, pkg), title, XM_ORG)], ["version.json", JSON.stringify({ organization: XM_ORG, configurationSchema: XM_SCHEMA, erpVersion: XM_ERP_VERSION, uiConfigurationVersion: version, kind: pkg.kind, createdBy: pkg.createdBy, createdDate: pkg.createdDate, publishedDate: pkg.publishedDate, files: [`${name}.json`, `${name}.pdf`] }, null, 2)]]); filename = `${name}.zip`; }
  const dl = await DOWNLOADS();
  if (!dl) { toast("Can't download here", "Saving files isn't available in this view — the live site downloads the same file.", "err"); return; }
  try { await dl.save({ filename, data }); act("xm.download", { file: filename, version, kind: `${kind}/${fmt}` }, `Downloaded ${filename}.`); }
  catch (e) { if (e?.code !== "declined") toast("Not saved", e?.message || "The file couldn't be saved.", "err"); }
}
function xmImportReport(pkg, fileName) {
  const res = xmValidateImport(pkg);
  const diff = res.config ? xmDiff(S.xmPublished?.config || null, res.config) : [];
  return `<h3 style="margin:0 0 6px">Import “${esc(fileName)}”</h3><dl class="kv" style="margin-bottom:10px"><dt>Schema</dt><dd>${esc(String(pkg?.configurationSchema ?? "—"))}</dd><dt>ERP version</dt><dd>${esc(String(pkg?.erpVersion ?? "—"))}</dd><dt>Configuration version</dt><dd>${esc(String(pkg?.uiConfigurationVersion ?? "—"))}</dd><dt>Organization</dt><dd>${esc(String(pkg?.organization ?? "—"))}</dd><dt>Created</dt><dd>${esc(String(pkg?.createdBy ?? "—"))} · ${esc(String(pkg?.createdDate ?? "").slice(0, 16).replace("T", " "))}</dd></dl>
    ${res.errors.length ? `<div class="msg err"><b>Rejected.</b> Nothing was applied.<ul style="margin:6px 0 0;padding-left:18px">${res.errors.slice(0, 12).map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>` : `<div class="msg ok">Valid. ${res.warnings.length ? `${res.warnings.length} note${res.warnings.length === 1 ? "" : "s"}.` : "No problems found."}</div>`}
    ${res.warnings.length ? `<ul style="margin:0 0 10px;padding-left:18px;font-size:12.5px;color:var(--muted-fg)">${res.warnings.slice(0, 12).map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
    ${res.config ? `<div class="sect-l">Compared with what is published</div><div style="max-height:30vh;overflow:auto;border:1px solid var(--border);border-radius:var(--r);padding:2px 12px">${xmDiffHtml(diff, 60)}</div>` : ""}
    <div class="form-row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-a="closeModal">Cancel</button>${res.config ? `<button class="btn pri" data-a="xmImportConfirm">Create draft from this file</button>` : ""}</div>`;
}

/* ---------------- routes ---------------- */
route("/admin/experience", XM_PERM.manage, vXmOverview);
route("/admin/experience/navigation", XM_PERM.manage, vXmNav);
route("/admin/experience/pages", XM_PERM.manage, vXmPages);
route("/admin/experience/pages/:key", XM_PERM.manage, vXmPageEditor);
route("/admin/experience/library", XM_PERM.manage, vXmLibrary);
route("/admin/experience/terminology", XM_PERM.manage, vXmTerms);
route("/admin/experience/typography", XM_PERM.manage, vXmTypo);
route("/admin/experience/views", XM_PERM.manage, vXmViews);
route("/admin/experience/preview", XM_PERM.manage, vXmPreview);
route("/admin/experience/versions", XM_PERM.manage, vXmVersions);
route("/admin/experience/versions/:n", XM_PERM.manage, vXmVersion);

/* ---------------- actions ---------------- */
window.ACTIONS_EXT.push({
  xmScope(el) { XM.scope = el.dataset.v || el.value || "default"; safeRender(); },
  xmScopeReset(el) { const k = el.dataset.v; UI.modal = `<h3>Reset the “${esc(k.startsWith("role:") ? XM_AUD_LABEL[k.slice(5)] + " view" : co(k.slice(8))?.displayName + " override")}”?</h3><p>Every difference from the group default in this view is removed (not yet published).</p><div class="form-row" style="justify-content:flex-end"><button class="btn" data-a="closeModal">Keep</button><button class="btn dng" data-a="xmScopeResetConfirm" data-v="${esc(k)}">Reset</button></div>`; safeRender(); },
  xmScopeResetConfirm(el) { const w = xmWork(); delete (w.overrides || {})[el.dataset.v]; xmWorkTouch(); UI.modal = null; if (XM.scope === el.dataset.v) XM.scope = "default"; safeRender(); },
  xmSaveDraft() { UI.modal = `<h3 style="margin:0 0 10px">Save draft</h3><form data-f="xmDraftSave"><div class="fld"><label for="xmDn">Note (optional)</label><input class="in" id="xmDn" name="note" maxlength="200" placeholder="What changed, in a few words"></div>${xmFoot("Save draft")}</form>`; safeRender(); setTimeout(() => document.getElementById("xmDn")?.focus(), 30); },
  xmDiscardWork() { UI.modal = `<h3>Discard unsaved changes?</h3><p>The editor goes back to the saved draft${S.xmDraft ? "" : " (or the published configuration)"}.</p><div class="form-row" style="justify-content:flex-end"><button class="btn" data-a="closeModal">Keep editing</button><button class="btn dng" data-a="xmDiscardWorkConfirm">Discard</button></div>`; safeRender(); },
  xmDiscardWorkConfirm() { xmWorkReset(); UI.modal = null; toast("Discarded", "Unsaved changes were dropped.", "ok"); safeRender(); },
  xmDraftDiscard() { if (act("xm.draftDiscard", {}, "Saved draft discarded.")) xmWorkReset(); },
  xmReview() { xmModal(xmReviewModal(), true); },
  xmRestore(el) { const n = +el.dataset.v; UI.modal = `<h3>Restore the Page &amp; Experience configuration from Version ${n}?</h3><p>Navigation, page structure, components, typography, labels and visibility go back to version ${n}, published as a new version. Employee, payroll, accounting, bank and HR data are never touched.</p><div class="form-row" style="justify-content:flex-end"><button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="xmRestoreConfirm" data-v="${n}">Restore version ${n}</button></div>`; safeRender(); },
  xmRestoreConfirm(el) { UI.modal = null; if (act("xm.restore", { version: +el.dataset.v }, `Version ${el.dataset.v} restored as version ${S.xmVersions.length + 1}.`)) { xmWorkReset(); go(xmHref("versions")); } },
  async xmDl(el) { await xmDownload(el.dataset.kind, el.dataset.fmt, { v: el.dataset.v, page: el.dataset.page }); },
  xmImportPick() { document.getElementById("xmImportFile")?.click(); },
  xmImportConfirm() { const p = XM.importPending; if (!p) return; UI.modal = null; if (act("xm.import", { pkg: p.pkg, fileName: p.fileName }, "Imported as a draft — review and publish when ready.")) { XM.importPending = null; xmWorkReset(); go(xmHref("versions")); } },
  /* navigation */
  xmMenuNew() { xmModal(xmMenuModal(null, "menu"), true); },
  xmSubmenuNew(el) { xmModal(xmMenuModal(null, "submenu", el.dataset.parent || "people"), true); },
  xmMenuEdit(el) { const m = (xmScopeEff().nav.custom || []).find((x) => x.id === el.dataset.id); if (m) xmModal(xmMenuModal(m), true); },
  xmMenuRemove(el) { const L = xmLayer(); L.nav = L.nav || {}; L.nav.custom = (L.nav.custom || []).filter((m) => m.id !== el.dataset.id); if (XM.scope !== "default" && (xmWork().nav.custom || []).some((m) => m.id === el.dataset.id)) { L.nav.custom.push({ id: el.dataset.id, enabled: false }); } xmWorkTouch(); safeRender(); },
  xmItemEdit(el) { xmModal(xmItemModal(el.dataset.key), true); },
  xmItemReset(el) { const L = xmLayer(); delete (L.nav?.items || {})[el.dataset.key]; xmWorkTouch(); UI.modal = null; safeRender(); },
  xmItemHide(el) { if (el.dataset.custom) { const L = xmLayer(); L.nav = L.nav || {}; L.nav.custom = L.nav.custom || []; let m = L.nav.custom.find((x) => x.id === el.dataset.custom); if (!m) { m = { id: el.dataset.custom }; L.nav.custom.push(m); } m.enabled = el.dataset.v !== "1"; xmWorkTouch(); safeRender(); return; } xmSet(["nav", "items", el.dataset.key, "hidden"], el.dataset.v === "1" ? true : undefined); },
  xmItemMove(el) { const g = xmNavModel().find((x) => x.items.some((i) => i.key === el.dataset.key)); const idx = g.items.findIndex((i) => i.key === el.dataset.key); xmSwapOrder(g.items, idx, +el.dataset.d, (i, o) => { if (i.custom) { const L = xmLayer(); L.nav = L.nav || {}; L.nav.custom = L.nav.custom || []; let m = L.nav.custom.find((x) => x.id === i.id); if (!m) { m = { id: i.id }; L.nav.custom.push(m); } m.order = o; } else xmSetPath(xmLayer(), ["nav", "items", i.key, "order"], o); }); xmWorkTouch(); safeRender(); },
  xmTabEdit(el) { xmModal(xmTabModal(el.dataset.key, el.dataset.href), true); },
  xmTabReset(el) { const L = xmLayer(); delete (L.nav?.tabs || {})[`${el.dataset.key}|${el.dataset.href}`]; xmWorkTouch(); UI.modal = null; safeRender(); },
  xmTabHide(el) { if (el.dataset.custom) { ACTIONS.xmItemHide(el); return; } xmSet(["nav", "tabs", `${el.dataset.key}|${el.dataset.href}`, "hidden"], el.dataset.v === "1" ? true : undefined); },
  xmTabMove(el) { const i = xmNavModel().flatMap((g) => g.items).find((x) => x.key === el.dataset.key); const idx = i.tabs.findIndex((t) => t.href === el.dataset.href); xmSwapOrder(i.tabs, idx, +el.dataset.d, (t, o) => { if (t.custom) { const L = xmLayer(); L.nav = L.nav || {}; L.nav.custom = L.nav.custom || []; let m = L.nav.custom.find((x) => x.id === t.id); if (!m) { m = { id: t.id }; L.nav.custom.push(m); } m.order = o; } else xmSetPath(xmLayer(), ["nav", "tabs", `${i.key}|${t.href}`, "order"], o); }); xmWorkTouch(); safeRender(); },
  xmGroupEdit(el) { xmModal(xmGroupModal(el.dataset.g), true); },
  xmGroupReset(el) { const L = xmLayer(); delete (L.nav?.groups || {})[el.dataset.g]; xmWorkTouch(); UI.modal = null; safeRender(); },
  xmGroupMove(el) { const model = xmNavModel(); const idx = model.findIndex((g) => g.name === el.dataset.g); xmSwapOrder(model, idx, +el.dataset.d, (g, o) => xmSetPath(xmLayer(), ["nav", "groups", g.name, "order"], o)); xmWorkTouch(); safeRender(); },
  /* pages */
  xmPageNew() { xmModal(xmPageNewModal(), true); },
  xmPageEdit(el) { const p = xmScopeEff().customPages?.[el.dataset.slug]; if (p) xmModal(xmPageNewModal(p, el.dataset.slug), true); },
  xmPageDelete(el) { const slug = el.dataset.slug; UI.modal = `<h3>Delete the page “${esc(xmWork().customPages?.[slug]?.name || slug)}”?</h3><p>The page and its components are removed from the draft, with any menu that opens it. Nothing else changes.</p><div class="form-row" style="justify-content:flex-end"><button class="btn" data-a="closeModal">Keep</button><button class="btn dng" data-a="xmPageDeleteConfirm" data-slug="${esc(slug)}">Delete page</button></div>`; safeRender(); },
  xmPageDeleteConfirm(el) { const w = xmWork(); const slug = el.dataset.slug; delete (w.customPages || {})[slug]; w.nav.custom = (w.nav.custom || []).filter((m) => !(m.dest?.type === "page" && m.dest.slug === slug)); for (const o of Object.values(w.overrides || {})) { if (o.customPages) delete o.customPages[slug]; if (o.nav?.custom) o.nav.custom = o.nav.custom.filter((m) => !(m.dest?.type === "page" && m.dest.slug === slug)); } xmWorkTouch(); UI.modal = null; go(xmHref("pages")); },
  xmPageReset(el) { const L = xmLayer(); const p = (L.pages || {})[el.dataset.key]; if (!p) return; if (el.dataset.what === "all") delete L.pages[el.dataset.key]; else { delete p.title; delete p.description; delete p.layout; delete p.density; } xmWorkTouch(); safeRender(); },
  xmPreviewPage(el) { const uid = (XM.scope !== "default" ? xmRepresentative(XM.scope) : null) || xmRepresentative("employees") || A.user.id; XM.preview = null; xmEnterPreview(uid, XM.previewCo || null, el.dataset.edit === "1"); const page = el.dataset.page; UI.route = page.includes(":") ? page.replace(":id", xmSampleParam(page, authFor(S, uid))) : page; XM.preview.from = xmHref("pages", "/" + encodeURIComponent(page)); safeRender(); },
  xmBlockOp(el) {
    const { op, page, key, kind } = el.dataset; const path = ["pages", page, "blocks", key];
    if (op === "hide") { xmSet([...path, "hidden"], true); return; }
    if (op === "show") { xmSet([...path, "hidden"], undefined); return; }
    if (op === "rename") { const cur = xmGetPath(xmScopeEff(), path)?.title || ""; const title = (XM.lastBlocks?.[page] || []).flatMap((b) => [b, ...b.comps]).find((b) => b.key === key)?.title || key; xmModal(`<h3 style="margin:0 0 10px">Rename “${esc(title)}”</h3><form data-f="xmBlockRename"><input type="hidden" name="page" value="${esc(page)}"><input type="hidden" name="key" value="${esc(key)}"><div class="fld"><label for="xmBt">Display title</label><input class="in" id="xmBt" name="title" value="${esc(cur)}" maxlength="60" placeholder="${esc(title)}"></div><p class="hint">Leave empty to use the platform's title. Internal key: <span class="mono">${esc(key)}</span></p>${xmFoot("Save")}</form>`); return; }
    if (op === "vis") { const cur = xmGetPath(xmScopeEff(), path)?.visibility; xmModal(`<h3 style="margin:0 0 10px">Who sees this ${kind === "comp" ? "component" : "section"}?</h3><form data-f="xmBlockVis" class="form-grid" style="grid-template-columns:1fr"><input type="hidden" name="page" value="${esc(page)}"><input type="hidden" name="key" value="${esc(key)}">${xmVisFields(cur)}${xmFoot("Save")}</form>`, true); return; }
    if (op === "add") { ACTIONS.xmAddComp({ dataset: { page, where: "after", block: key } }); return; }
    if (op === "up" || op === "down") { const lb = XM.lastBlocks?.[page] || xmDiscover(page).blocks; const list = kind === "comp" ? (lb.find((b) => b.comps.some((c) => c.key === key))?.comps || []) : lb; const idx = list.findIndex((x) => x.key === key); if (idx < 0) return; xmSwapOrder(list, idx, op === "up" ? -1 : 1, (x, o) => xmSetPath(xmLayer(), ["pages", page, "blocks", x.key, "order"], o)); xmWorkTouch(); safeRender(); }
  },
  xmAddSection(el) { xmModal(xmSectionForm({ page: el.dataset.page }), true); },
  xmAddComp(el) { const d = el.dataset; XM.pick = { page: d.page, where: d.where || "end", block: d.block || "", into: d.into || "" }; UI.filters.xmPickQ = ""; xmModal(`<h3 style="margin:0 0 6px">Add component${d.page ? ` to ${esc(xmPageName(d.page))}` : ""}</h3><div class="form-row" style="margin-bottom:6px"><input class="in" id="xmPickQ" placeholder="Search — leave, expense, chart, approvals…" style="max-width:360px" aria-label="Search components"><span class="hint">Choose a component, then set it up.</span></div><div class="xm-chips" style="margin:4px 0 8px"><button class="on" data-a="xmPickCat" data-v="">All</button>${XM_CATS.map((c) => `<button data-a="xmPickCat" data-v="${c}">${c}</button>`).join("")}</div><div id="xmPickList" style="max-height:52vh;overflow:auto">${xmLibraryListHtml("", "", true)}</div><div class="form-row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-a="closeModal">Cancel</button></div>`, true); setTimeout(() => document.getElementById("xmPickQ")?.focus(), 30); },
  xmPickCat(el) { UI.filters.xmPickCat = el.dataset.v; document.querySelectorAll("[data-a=xmPickCat]").forEach((b) => b.classList.toggle("on", b === el)); const l = document.getElementById("xmPickList"); if (l) l.innerHTML = xmLibraryListHtml(document.getElementById("xmPickQ")?.value || "", el.dataset.v, true); },
  xmCompPick(el) { const p = XM.pick; if (!p) { ACTIONS.xmCompAddTo(el); return; } xmModal(xmCompForm({ component: el.dataset.id, page: p.page, where: p.where, block: p.block, parent: p.into }), true); },
  xmCompAddTo(el) { XM.pick = null; xmModal(xmCompForm({ component: el.dataset.id, pageDefault: "/dashboard" }), true); },
  xmCompPreview(el) { XM.previewBack = el.dataset.back ? UI.modal : null; xmModal(xmCompPreviewModal(el.dataset.id, "u1"), true); },
  xmCompPreviewAs(el) { xmModal(xmCompPreviewModal(el.dataset.id, el.value), true); },
  xmCompReopt(el) { const f = el.closest("form"); if (!f) return; const d = fd(f); const cfg = {}; for (const [k, v] of Object.entries(d)) if (k.startsWith("o_")) cfg[k.slice(2)] = v; for (const k of ["metrics", "actions", "pages", "columns"]) if (f.querySelector(`[name="o_${k}"]`)) cfg[k] = [...f.querySelectorAll(`[name="o_${k}"]:checked`)].map((x) => x.value); xmModal(xmCompForm({ component: d.component, id: d.id, page: d.page || "", pageDefault: d.page, parent: d.parent, where: d.where, block: d.block, size: d.size, config: cfg, visibility: xmVisRead(f), enabled: d.enabled !== "0" }), true); },
  xmAddedOp(el) {
    const { op, page, id, parent } = el.dataset; const { list, i } = xmFindAdded(page, id, parent); if (!list || i < 0) return; const a = list[i];
    if (op === "edit") { xmModal(a.kind === "section" ? xmSectionForm({ ...a, page }) : xmCompForm({ ...a, page, parent, config: a.config }), true); return; }
    if (op === "remove") { list.splice(i, 1); }
    else if (op === "toggle") { a.enabled = a.enabled === false; }
    else if (op === "up" || op === "down") { const j = i + (op === "up" ? -1 : 1); if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; }
    xmWorkTouch(); safeRender();
  },
  /* library page */
  xmLibCat(el) { UI.filters.xmLibCat = el.dataset.v; safeRender(); },
  /* terminology */
  xmTermReset(el) { const L = xmLayer(); delete (L.labels || {})[el.dataset.key]; xmWorkTouch(); safeRender(); },
  xmTermRemove(el) { const L = xmLayer(); L.customTerms = (L.customTerms || []).filter((t) => t.id !== el.dataset.id); xmWorkTouch(); safeRender(); },
  /* typography */
  xmTypo(el) { if (el.dataset.k === "density") xmSet(["density"], el.value); else xmSet(["typography", el.dataset.k], el.value); },
  xmTypoReset() { const L = xmLayer(); delete L.typography; delete L.density; if (XM.scope === "default") { L.typography = xmEmpty().typography; L.density = "standard"; } xmWorkTouch(); safeRender(); },
  /* preview */
  xmPreviewCo(el) { XM.previewCo = el.value || null; },
  xmViewAs(el) { xmEnterPreview(el.dataset.id, XM.previewCo || null, el.dataset.edit === "1"); },
  xmEditMode(el) { XM.edit = el.dataset.v === "1"; safeRender(); },
  xmExitPreview() { xmExitPreview(); },
  xmPreviewPick() { const byAud = xmPeopleByAudience(); xmModal(`<h3 style="margin:0 0 10px">View as…</h3><div style="max-height:60vh;overflow:auto">${Object.entries(byAud).map(([k, g]) => g.people.length ? `<div class="sect-l" style="margin:10px 0 4px">${esc(g.label)}</div>${g.people.map((p) => `<button class="orow" data-a="xmViewAs" data-id="${p.id}" ${XM.edit ? 'data-edit="1"' : ""}><span class="tx"><b>${esc(p.name)}</b> <small class="hint">${esc(p.role)} · ${esc(p.company)}</small></span></button>`).join("")}` : "").join("")}</div><div class="form-row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-a="closeModal">Close</button></div>`); },
  signout() { if (XM.previewOn) xmExitPreview(); else signOut(); },
  switchRole() { if (XM.previewOn) xmExitPreview(); else signOut(); },
  company(el) { if (XM.previewOn) { XM.preview.companyId = el.value === "ALL" ? null : el.value; safeRender(); return; } UI.activeCompanyId = el.value === "ALL" ? null : el.value; A = authFor(S, UI.userId, UI.activeCompanyId); UI.payb = null; UI.depb = null; savePrefs(); safeRender(); },
});

/* ---------------- forms ---------------- */
window.FORMS_EXT.push({
  xmDraftSave(f) { const d = fd(f); if (act("xm.draftSave", { config: xmWork(), note: d.note }, "Draft saved.")) { xmWorkReset(); UI.modal = null; safeRender(); } },
  xmPublish(f) { const d = fd(f); const im = xmImpact(S.xmPublished?.config || null, xmWork()); if (act("xm.publish", { config: xmWork(), note: d.note, impact: { total: im.total, roles: im.roles } }, `Published as version ${S.xmVersions.length + 1}.`)) { xmWorkReset(); UI.modal = null; go(xmHref("versions")); } },
  xmCompare(f) { const d = fd(f); go(xmHref("versions", `?a=${d.a}&b=${d.b}`)); },
  xmMenuSave(f) {
    const d = fd(f); const L = xmLayer(); L.nav = L.nav || {}; L.nav.custom = L.nav.custom || [];
    const isNew = !d.id; const id = isNew ? (xmSlug(d.name || d.label) || xmId("m")).replace(/^-+/, "") : d.id;
    if (isNew && (xmWork().nav.custom || []).some((m) => m.id === id)) { toast("Name already used", "Pick another menu name.", "err"); return; }
    let dest; const w = xmWork();
    if (d.destType === "new") { const name = (d.newPage || d.label).trim(); if (!name) { toast("Name the new page", "", "err"); return; } let slug = xmSlug(name) || xmId("p"); if (w.customPages?.[slug]) slug = `${slug}-${xmId("").slice(-3)}`; w.customPages = w.customPages || {}; w.customPages[slug] = { name, title: name, description: "", module: "Custom pages", icon: d.icon || "bookmark", layout: "two", visibility: { audiences: [], companies: [] }, enabled: true, blocks: [] }; dest = { type: "page", slug }; }
    else if (d.destType === "page") { if (!d.slug) { toast("No custom page to open", "Create one first, or choose an existing page.", "err"); return; } dest = { type: "page", slug: d.slug }; }
    else dest = { type: "route", href: d.href };
    const existing = L.nav.custom.find((m) => m.id === id) || (XM.scope !== "default" ? xmClone((w.nav.custom || []).find((m) => m.id === id) || null) : null);
    const m = { ...(existing || {}), id, kind: d.kind === "submenu" ? "submenu" : "menu", label: d.label.trim(), icon: d.icon || existing?.icon || "bookmark", group: d.kind === "submenu" ? "" : (d.group === "__new" ? (d.newGroup || "").trim() || "Home" : d.group), parent: d.kind === "submenu" ? d.parent : "", dest, visibility: xmVisRead(f), enabled: d.enabled !== "0", order: existing?.order ?? 999 };
    const i = L.nav.custom.findIndex((x) => x.id === id); if (i >= 0) L.nav.custom[i] = m; else L.nav.custom.push(m);
    xmWorkTouch(); UI.modal = null; safeRender();
  },
  xmItemSave(f) { const d = fd(f); const L = xmLayer(); const orig = XM_NAV_CATALOG.flatMap(([g, items]) => items.map(([k, t, ic]) => ({ k, t, ic, g }))).find((x) => x.k === d.key); const c = { label: d.label.trim() && d.label.trim() !== orig?.t ? d.label.trim() : undefined, icon: d.icon && d.icon !== orig?.ic ? d.icon : undefined, group: d.group === "__new" ? (d.newGroup || "").trim() || undefined : (d.group !== orig?.g ? d.group : undefined), hidden: d.hidden === "1" ? true : undefined, visibility: xmVisRead(f) }; if (!c.visibility.audiences.length && !c.visibility.companies.length) delete c.visibility; const prev = xmGetPath(L, ["nav", "items", d.key]) || {}; const next = { ...prev, ...c }; for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k]; xmSetPath(L, ["nav", "items", d.key], Object.keys(next).length ? next : undefined); xmWorkTouch(); UI.modal = null; safeRender(); },
  xmTabSave(f) { const d = fd(f); const L = xmLayer(); const key = `${d.key}|${d.href}`; const orig = XM_SEC_ORIG.find((s) => s.key === d.key)?.tabs.find((t) => t.href === d.href); const prev = xmGetPath(L, ["nav", "tabs", key]) || {}; const next = { ...prev, label: d.label.trim() && d.label.trim() !== orig?.label ? d.label.trim() : undefined, hidden: d.hidden === "1" ? true : undefined, visibility: xmVisRead(f) }; if (!next.visibility.audiences.length && !next.visibility.companies.length) delete next.visibility; for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k]; xmSetPath(L, ["nav", "tabs", key], Object.keys(next).length ? next : undefined); xmWorkTouch(); UI.modal = null; safeRender(); },
  xmGroupSave(f) { const d = fd(f); const L = xmLayer(); const prev = xmGetPath(L, ["nav", "groups", d.name]) || {}; const next = { ...prev, label: d.label.trim() && d.label.trim() !== d.name ? d.label.trim() : undefined, hidden: d.hidden === "1" ? true : undefined, visibility: xmVisRead(f) }; if (!next.visibility.audiences.length && !next.visibility.companies.length) delete next.visibility; for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k]; xmSetPath(L, ["nav", "groups", d.name], Object.keys(next).length ? next : undefined); xmWorkTouch(); UI.modal = null; safeRender(); },
  xmPageSave(f) {
    const d = fd(f); const w = xmWork(); w.customPages = w.customPages || {};
    let slug = d.slug; const isNew = !slug;
    if (isNew) { slug = xmSlug(d.name) || xmId("p"); if (w.customPages[slug]) slug = `${slug}-${xmId("").slice(-3)}`; }
    const prev = w.customPages[slug] || { blocks: [] };
    w.customPages[slug] = { ...prev, name: d.name.trim(), title: (d.title || d.name).trim(), description: (d.description || "").trim(), module: (d.module || "Custom pages").trim(), icon: d.icon || "bookmark", layout: d.layout || "two", visibility: xmVisRead(f), enabled: d.enabled !== "0", blocks: prev.blocks || [] };
    if (isNew && d.parent) { w.nav.custom = w.nav.custom || []; w.nav.custom.push({ id: `${slug}-menu`, kind: "submenu", label: w.customPages[slug].title, icon: d.icon || "bookmark", group: "", parent: d.parent, dest: { type: "page", slug }, visibility: xmVisRead(f), enabled: true, order: 999 }); }
    xmWorkTouch(); UI.modal = null; go(xmHref("pages", "/" + encodeURIComponent(`/pages/${slug}`)));
  },
  xmPageSettings(f) { const d = fd(f); const L = xmLayer(); L.pages = L.pages || {}; const p = L.pages[d.key] || (L.pages[d.key] = {}); const set = (k, v) => { if (v) p[k] = v; else delete p[k]; }; set("title", d.title.trim()); set("description", d.description.trim()); set("layout", d.layout !== "two" ? d.layout : ""); set("density", d.density); if (!Object.keys(p).length) delete L.pages[d.key]; xmWorkTouch(); UI.flash = { kind: "ok", text: "Page settings saved to the draft." }; safeRender(); },
  xmBlockRename(f) { const d = fd(f); xmSet(["pages", d.page, "blocks", d.key, "title"], d.title.trim() || undefined); UI.modal = null; safeRender(); },
  xmBlockVis(f) { const d = fd(f); const vis = xmVisRead(f); xmSet(["pages", d.page, "blocks", d.key, "visibility"], vis.audiences.length || vis.companies.length ? vis : undefined); UI.modal = null; safeRender(); },
  xmCompSave(f) {
    const d = fd(f); const page = d.page; if (!page) { toast("Choose a page", "", "err"); return; }
    const cfg = {}; for (const [k, v] of Object.entries(d)) if (k.startsWith("o_")) cfg[k.slice(2)] = v; for (const k of ["metrics", "actions", "pages", "columns"]) if (f.querySelector(`[name="o_${k}"]`)) cfg[k] = [...f.querySelectorAll(`[name="o_${k}"]:checked`)].map((x) => x.value);
    const vis = xmVisRead(f);
    if (d.id) { const { list, i } = xmFindAdded(page, d.id, d.parent); if (!list || i < 0) return; const a = list[i]; if (a.kind === "section") { a.title = cfg.title || a.title; a.description = cfg.description || ""; } else { a.component = d.component; a.config = xmCompConfig(d.component, cfg); a.title = cfg.title || ""; a.size = d.size || a.size; } a.visibility = vis; a.enabled = d.enabled !== "0"; }
    else {
      const entry = d.kind === "section" ? { id: xmId("s"), kind: "section", title: cfg.title || "Section", description: cfg.description || "", visibility: vis, enabled: d.enabled !== "0", anchor: { where: d.where || "end", block: d.block || "" }, children: [] } : { id: xmId("c"), kind: "component", component: d.component, config: xmCompConfig(d.component, cfg), title: cfg.title || "", size: d.size || "medium", visibility: vis, enabled: d.enabled !== "0", anchor: { where: d.where || "end", block: d.block || "" } };
      if (d.parent) { const { list } = xmFindAdded(page, "", ""); const sec = (list || []).find((x) => x.id === d.parent); if (!sec) { toast("Section not found", "", "err"); return; } sec.children = sec.children || []; sec.children.push(entry); }
      else { const list = xmAddedOf(page, true); if (entry.anchor.where === "start") list.unshift(entry); else list.push(entry); }
    }
    XM.pick = null; xmWorkTouch(); UI.modal = null; UI.flash = { kind: "ok", text: `${d.kind === "section" ? "Section" : XM_COMPONENTS[d.component]?.name || "Component"} ${d.id ? "updated" : "added"} — save the draft, then review and publish.` }; safeRender();
  },
  xmTermsSave(f) { const d = fd(f); const L = xmLayer(); L.labels = L.labels || {}; for (const [k, v] of Object.entries(d)) if (k.startsWith("t:")) { const key = k.slice(2); const val = String(v).trim(); if (val && val !== XM_TERM_BY_KEY[key]?.text) L.labels[key] = val; else delete L.labels[key]; } xmWorkTouch(); UI.flash = { kind: "ok", text: "Labels saved to the draft — save the draft, then review and publish." }; safeRender(); },
  xmTermAdd(f) { const d = fd(f); const L = xmLayer(); L.customTerms = L.customTerms || []; L.customTerms.push({ id: xmId("t"), find: d.find.trim(), to: d.to.trim(), kind: d.kind }); xmWorkTouch(); safeRender(); },
});

/* ---------------- wiring: library search, import file, drag & drop in the navigation editor ---------------- */
document.addEventListener("input", (ev) => {
  const el = ev.target;
  if (el.id === "xmLibQ") { UI.filters.xmLibQ = el.value; const l = document.getElementById("xmLibList"); if (l) l.innerHTML = xmLibraryListHtml(el.value, UI.filters.xmLibCat || ""); }
  if (el.id === "xmPickQ") { const l = document.getElementById("xmPickList"); if (l) l.innerHTML = xmLibraryListHtml(el.value, UI.filters.xmPickCat || "", true); }
});
document.addEventListener("change", (ev) => {
  const el = ev.target; if (el.id !== "xmImportFile") return;
  const file = el.files?.[0]; el.value = ""; if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast("File too large", "A configuration file is a few kilobytes; this one is over 2 MB.", "err"); return; }
  const rd = new FileReader();
  rd.onload = () => { let pkg = null; try { pkg = JSON.parse(String(rd.result)); } catch { xmModal(`<h3>Not a configuration file</h3><p class="hint">“${esc(file.name)}” is not valid JSON. Upload the .json exported from this platform.</p><div class="form-row" style="justify-content:flex-end"><button class="btn" data-a="closeModal">Close</button></div>`); return; } XM.importPending = { pkg, fileName: file.name }; xmModal(xmImportReport(pkg, file.name), true); };
  rd.readAsText(file);
});
let XM_DRAG = null;
document.addEventListener("dragstart", (ev) => { const r = ev.target.closest?.("[data-xmdrag]"); if (!r) return; XM_DRAG = { key: r.dataset.key, g: r.dataset.g }; r.classList.add("xm-dragging"); try { ev.dataTransfer.setData("text/plain", r.dataset.key); } catch { /* ignore */ } ev.dataTransfer.effectAllowed = "move"; });
document.addEventListener("dragend", (ev) => { ev.target.closest?.("[data-xmdrag]")?.classList.remove("xm-dragging"); document.querySelectorAll(".xm-over").forEach((n) => n.classList.remove("xm-over")); XM_DRAG = null; });
document.addEventListener("dragover", (ev) => { if (!XM_DRAG) return; const t = ev.target.closest?.("[data-xmdrag], [data-xmdrop], .xm-grp-h"); if (t) { ev.preventDefault(); t.classList.add("xm-over"); } });
document.addEventListener("dragleave", (ev) => { const t = ev.target.closest?.("[data-xmdrag], [data-xmdrop], .xm-grp-h"); if (t && !t.contains(ev.relatedTarget)) t.classList.remove("xm-over"); });
document.addEventListener("drop", (ev) => {
  if (!XM_DRAG) return; const t = ev.target.closest?.("[data-xmdrag], [data-xmdrop], .xm-grp-h"); if (!t) return; ev.preventDefault();
  const drag = XM_DRAG; XM_DRAG = null;
  const model = xmNavModel(); const src = model.flatMap((g) => g.items).find((i) => i.key === drag.key); if (!src) return;
  const targetGroup = t.dataset.xmdrop || (t.classList.contains("xm-grp-h") ? t.querySelector("button[data-g]")?.dataset.g : t.dataset.g);
  const L = xmLayer();
  const setGroup = (g) => { if (src.custom) { L.nav = L.nav || {}; L.nav.custom = L.nav.custom || []; let m = L.nav.custom.find((x) => x.id === src.id); if (!m) { m = { id: src.id }; L.nav.custom.push(m); } m.group = g; } else xmSetPath(L, ["nav", "items", src.key, "group"], g === XM_NAV_CATALOG.find(([, items]) => items.some(([k]) => k === src.key))?.[0] ? undefined : g); };
  if (!targetGroup) return;
  setGroup(targetGroup);
  const g = model.find((x) => x.name === targetGroup); const items = (g ? g.items.filter((i) => i.key !== src.key) : []);
  const before = t.dataset.key && t.dataset.key !== src.key ? items.findIndex((i) => i.key === t.dataset.key) : items.length;
  items.splice(before < 0 ? items.length : before, 0, src);
  items.forEach((i, idx) => { if (i.custom) { let m = L.nav.custom.find((x) => x.id === i.id); if (!m) { m = { id: i.id }; L.nav.custom.push(m); } m.order = idx * 10; } else xmSetPath(L, ["nav", "items", i.key, "order"], idx * 10); });
  xmWorkTouch(); safeRender();
});

/* ---------------- a How-to guide for administrators ---------------- */
if (typeof HOWTO !== "undefined") { const adm = HOWTO.find((r) => r[0] === "admin"); if (adm) adm[4].push(["xm-manager", "Shape what people see", "Navigation, pages, components, wording and fonts — without a developer.", ["Open Administration › Page & Experience.", "Pick a page, rename or hide sections, add components from the library.", "Use View as to see it as an employee; turn on Edit mode to change things in place.", "Save the draft, Review & publish — a version is recorded; compare or restore any time."], "/admin/experience", "Open Page & Experience"]); }
