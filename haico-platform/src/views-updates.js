/* ==========================================================================
   views-updates.js — "Latest update in HaiCo Dream" replaces the My Tasks landing page.
   The sidebar item keeps its place; the page lists what changed in the platform,
   newest first, with a link to try each change, next to the person's own open tasks
   and recent activity. The task board stays one click away as the "My tasks" tab.
   ========================================================================== */
const UPD_TITLE = "Latest update in HaiCo Dream";
const UPD_ITEMS = [
  { at: "2026-10-03", tag: "Sign-in", who: "everyone", title: "Sign in without a password", what: "In the demo, pick your name and press OK. The list starts with the demo cast, then everyone else A–Z.", go: null },
  { at: "2026-10-03", tag: "Approvals", who: "admin", title: "Approvals follow the reporting line", what: "Every request goes to the requester's manager, then to the Director above an amount. The Finance Manager approves only the finance team's own requests. Administrators edit every step.", go: "/admin/workflows", can: () => can(A, "admin.workflows"), label: "Open Approval rules" },
  { at: "2026-10-03", tag: "Documents", who: "managers", title: "Contracts under Documents", what: "Managers and above upload contracts with details, an optional amount and a team. The team's managers and everyone above them can open them, with a full history of uploads and changes.", go: "/documents/contracts", can: () => typeof ctManagerPlus === "function" && ctManagerPlus(S, A), label: "Open Contracts" },
  { at: "2026-10-02", tag: "Administration", who: "admin", title: "Page & Experience Manager", what: "Administrators shape menus, pages, components, wording and fonts, preview as any role, and publish versions that can be compared, restored and downloaded.", go: "/admin/experience", can: () => typeof xmCan === "function" && xmCan("manage"), label: "Open the manager" },
];
const UPD_CHIPS = [["", "Everything"], ["me", "For me"], ["everyone", "Everyone"], ["managers", "Managers"], ["admin", "Administrators"]];
const updOpenable = (href) => { const r = ROUTES.find((x) => x.re.test(href.split("?")[0])); if (!r) return false; try { return !r.perm || (typeof r.perm === "function" ? !!r.perm() : can(A, r.perm)); } catch { return false; } };
function updAll() {
  const out = UPD_ITEMS.map((i) => ({ ...i, mine: i.who === "everyone" || (i.can ? !!i.can() : true) }));
  const area = { Everyone: "everyone", "Teams & managers": "managers", Employees: "everyone", HR: "everyone", "Finance & payroll": "everyone", "New in this edition": "everyone" };
  for (const g of WHATS_NEW) for (const n of g.items) out.push({ at: "2026-09-20", tag: g.area, who: area[g.area] || "everyone", title: n.title, what: n.what, go: n.link, guide: n.guide, mine: updOpenable(n.link), label: "Open" });
  return out;
}
function vUpdates() {
  const F = UI.filters.upd || (UI.filters.upd = { c: "" });
  const all = updAll(), list = all.filter((i) => !F.c || (F.c === "me" ? i.mine : i.who === F.c));
  const chips = UPD_CHIPS.map(([k, l]) => `<button class="hchip ${F.c === k ? "on" : ""}" data-a="updChip" data-v="${k}">${esc(l)} <span>${k === "" ? all.length : k === "me" ? all.filter((i) => i.mine).length : all.filter((i) => i.who === k).length}</span></button>`).join("");
  const days = [...new Set(list.map((i) => i.at))].sort().reverse();
  const feed = days.map((d) => `<div class="sect-l" style="margin:16px 0 8px">${esc(dLong(d))}</div><div class="hcard"><ul class="hlist" style="margin:0">${list.filter((i) => i.at === d).map((i) => `<li style="padding:11px 14px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div style="min-width:0"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:3px"><span class="badge tone-teal">${esc(i.tag)}</span>${i.mine ? `<span class="badge tone-green">For you</span>` : ""}</div><div style="font-weight:600;font-size:14px">${esc(i.title)}</div><div class="muted" style="margin-top:2px;font-size:12.5px;line-height:1.45">${esc(i.what)}</div></div><span style="white-space:nowrap;display:flex;gap:8px;align-items:center">${i.guide ? `<button class="lnk" style="font-size:12.5px" data-go="/help" data-topic="${esc(i.guide)}">Guide</button>` : ""}${i.go && updOpenable(i.go) ? `<button class="btn sm" data-go="${esc(i.go)}">${esc(i.label || "Open")} →</button>` : ""}</span></li>`).join("")}</ul></div>`).join("");
  const tasks = A.employee ? (S.tasks || []).filter((t) => t.assigneeId === A.employee.id && t.status !== "DONE").sort((a, b) => ((a.dueDate || "9") < (b.dueDate || "9") ? -1 : 1)).slice(0, 5) : [];
  const act = historyRowsA({ scope: "me" }).rows.slice(0, 5);
  const side = `<div class="hcol">
    <section class="hcard"><div class="hcard-h"><h2>My open tasks</h2><button class="lnk" style="font-size:12.5px" data-go="/me/tasks">All tasks →</button></div>${tasks.length ? `<ul class="hlist">${tasks.map((t) => `<li class="hrow" data-go="/me/tasks" style="cursor:pointer"><b>${esc(t.title)}</b><small>${t.dueDate ? `due ${esc(dShort(t.dueDate))}` : "no due date"} · ${esc(String(t.percentDone || 0))}% done</small></li>`).join("")}</ul>` : `<p class="empty-s">No open tasks.</p>`}</section>
    <section class="hcard"><div class="hcard-h"><h2>Recent activity <span class="hint" style="font-weight:400">· you</span></h2><button class="lnk" style="font-size:12.5px" data-go="/history">All history →</button></div>${act.length ? `<ul class="hlist">${act.map((r) => `<li class="hrow" style="cursor:default"><b>${esc(r.summary)}</b><small>${esc(dTime(r.at))}</small></li>`).join("")}</ul>` : `<p class="empty-s">Nothing yet.</p>`}</section></div>`;
  return ph(UPD_TITLE, "What changed in the platform, newest first — with a link to try each change.", `<span class="badge tone-green">Edition · October 2026</span>`) + flashHtml()
    + `<div class="form-row" style="gap:8px;margin-bottom:6px;flex-wrap:wrap">${chips}</div>`
    + `<div class="hgrid" style="margin-top:6px"><div>${feed || empty("Nothing here")}</div>${side}</div>`;
}
route("/me/updates", "ess.access", vUpdates);
window.ACTIONS_EXT.push({ updChip(el) { (UI.filters.upd = UI.filters.upd || {}).c = el.dataset.v; safeRender(); } });
/* the My Tasks menu item becomes "Latest update in HaiCo Dream"; the task board is its second tab */
{
  const sec = SECTION_BY_KEY["my-tasks"];
  sec.label = UPD_TITLE;
  sec.tabs = [{ href: "/me/updates", label: "Latest update", perm: "@employee" }, { href: "/me/tasks", label: "My tasks", perm: "@employee" }];
  const _nav = buildNav;
  buildNav = function () { return _nav().map((g) => ({ ...g, items: g.items.map((i) => (i.section === "my-tasks" ? { ...i, title: UPD_TITLE, icon: "star" } : i)) })); };
}
