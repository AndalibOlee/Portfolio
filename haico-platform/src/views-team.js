/* ==========================================================================
   views-team.js — My Team & Tasks (simple monday.com-style task tracker).
   Mirrors src/lib/tasks.ts and app/(app)/team/* in the live app.
   Rules
    - Everyone with an employee record sees tasks assigned to them and tasks
      they created; they may update progress / steps / status / notes on those
      and fully manage tasks they created.
    - A manager (anyone with active direct reports) also sees and manages
      every task assigned to a direct report.
    - HR / admin (hr.employees.edit) see and manage every task in scope.
   Every change writes a taskUpdates row — the task's Activity history.
   ========================================================================== */
injectCss(`
.tmtop{display:grid;gap:12px;grid-template-columns:minmax(0,1fr) 300px;margin-bottom:14px;align-items:stretch}
@media (max-width:1000px){.tmtop{grid-template-columns:minmax(0,1fr)}}
.tmtop .chart{margin:0}
.tmbarline{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:12px}
.tmseg{margin-left:auto;display:inline-flex;border:1px solid var(--border);border-radius:999px;background:var(--card);padding:2px}
.tmseg button{border:0;background:none;border-radius:999px;padding:4px 12px;font:inherit;font-size:12.5px;font-weight:600;color:var(--muted-fg);cursor:pointer}
.tmseg button.on{background:var(--muted);color:var(--fg)}
.tmsel{height:30px;border-radius:999px;border:1px solid var(--border);background:var(--card);color:var(--fg);font:inherit;font-size:12.5px;padding:0 10px}
.tmprog{display:flex;align-items:center;gap:8px}
.tmprog .tmtrack{height:6px;width:90px;border-radius:9px;background:var(--muted);overflow:hidden;flex:none}
.tmprog .tmtrack i{display:block;height:100%;border-radius:9px}
.tmprog span{font-size:12px;color:var(--muted-fg);font-variant-numeric:tabular-nums}
.tmini{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--muted);color:var(--fg);font-size:10px;font-weight:700;flex:none}
.tmlate{color:var(--t-red);font-weight:600}
.tmboard{display:grid;gap:10px;grid-template-columns:repeat(4,minmax(0,1fr));align-items:start}
@media (max-width:1100px){.tmboard{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:600px){.tmboard{grid-template-columns:minmax(0,1fr)}}
.tmcol{border:1px solid var(--border);border-radius:12px;background:var(--bg);min-height:120px;display:flex;flex-direction:column}
.tmcol.over{outline:2px dashed var(--primary);outline-offset:-2px}
.tmcol-h{display:flex;align-items:center;gap:8px;padding:9px 11px;font-size:12.5px;font-weight:700;border-bottom:1px solid var(--border)}
.tmcol-h .dot{width:9px;height:9px;border-radius:50%}
.tmcol-h .n{margin-left:auto;color:var(--muted-fg);font-weight:600}
.tmcol-b{display:flex;flex-direction:column;gap:8px;padding:8px}
.tmcol-e{font-size:12px;color:var(--muted-fg);text-align:center;padding:14px 4px}
.tmcard{border:1px solid var(--border);border-radius:10px;background:var(--card);padding:9px 10px;display:flex;flex-direction:column;gap:7px;cursor:grab}
.tmcard.dragging{opacity:.45}
.tmcard .lnk{font-size:13px;line-height:1.3}
.tmcard-m{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:11.5px;color:var(--muted-fg)}
.tmcard .tmtrack{height:5px;border-radius:9px;background:var(--muted);overflow:hidden}
.tmcard .tmtrack i{display:block;height:100%;border-radius:9px}
.tmcard-f{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted-fg);font-variant-numeric:tabular-nums}
.tmcard-f select{margin-left:auto;height:26px;border-radius:7px;border:1px solid var(--input);background:var(--card);color:var(--fg);font:inherit;font-size:11.5px;padding:0 4px;max-width:110px}
.tmtl{border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden}
.tmtl-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);font-size:12.5px}
.tmtl-h .acts{margin-left:auto;display:inline-flex;gap:6px}
.tmtl-s{overflow-x:auto}
.tmtl-g{min-width:860px}
.tmtl-r{display:grid;align-items:center;border-bottom:1px solid var(--border)}
.tmtl-r:last-child{border-bottom:0}
.tmtl-r.wk{font-size:11.5px;font-weight:700;color:var(--muted-fg)}
.tmtl-r.dy{font-size:10.5px;color:var(--muted-fg)}
.tmtl-r.row{height:38px}
.tmtl-l{grid-row:1;grid-column:1;position:sticky;left:0;z-index:2;background:var(--card);padding:0 12px;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:center}
.tmtl-l .lnk{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tmtl-l small{font-size:11px;color:var(--muted-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tmtl-c{grid-row:1;height:100%}
.tmtl-c.we{background:color-mix(in srgb,var(--muted) 55%,transparent)}
.tmtl-c.w0{border-left:1px solid var(--border)}
.tmtl-c.td{box-shadow:inset 2px 0 0 var(--t-red)}
.tmtl-d{grid-row:1;text-align:center;padding:4px 0;font-variant-numeric:tabular-nums}
.tmtl-d.we{background:color-mix(in srgb,var(--muted) 55%,transparent)}
.tmtl-d.w0{border-left:1px solid var(--border)}
.tmtl-d.td{color:var(--t-red);font-weight:700}
.tmtl-b{grid-row:1;position:relative;z-index:1;margin:0 2px;height:20px;border-radius:5px;border:1px solid;background:var(--muted);overflow:hidden;display:flex;align-items:center;cursor:pointer;padding:0}
.tmtl-b.cl{border-top-left-radius:0;border-bottom-left-radius:0}
.tmtl-b.cr{border-top-right-radius:0;border-bottom-right-radius:0}
.tmtl-b i{position:absolute;inset:0 auto 0 0;opacity:.8}
.tmtl-b span{position:relative;padding:0 6px;font-size:10.5px;font-weight:700;color:var(--fg);font-variant-numeric:tabular-nums}
.tmlegend{display:flex;flex-wrap:wrap;gap:12px;padding:8px 12px;border-top:1px solid var(--border);font-size:11.5px;color:var(--muted-fg)}
.tmlegend span{display:inline-flex;align-items:center;gap:6px}
.tmlegend i{display:inline-block;width:16px;height:9px;border-radius:2px}
.tmdetail{display:grid;gap:14px;grid-template-columns:minmax(0,1fr) minmax(0,380px);align-items:start}
@media (max-width:1000px){.tmdetail{grid-template-columns:minmax(0,1fr)}}
.tmdetail > div{display:grid;gap:14px;min-width:0}
.tmhead{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12.5px;color:var(--muted-fg);margin:-8px 0 16px}
.tmpct{display:flex;align-items:baseline;gap:12px}
.tmpct b{font-size:34px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums}
.tmpct span{font-size:13px;color:var(--muted-fg)}
.tmbig{height:12px;border-radius:99px;background:var(--muted);overflow:hidden;margin-top:12px}
.tmbig i{display:block;height:100%;border-radius:99px;background:var(--action,var(--primary));transition:width .25s}
.tmrange{width:100%;margin-top:12px;accent-color:var(--action,var(--primary))}
.tmquick{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}
.tmquick .hchip{min-width:52px;font-variant-numeric:tabular-nums}
.tmquick .btn{margin-left:auto}
.tmsts{display:flex;flex-wrap:wrap;gap:6px}
.tmsts button{height:32px;border-radius:999px;border:1px solid var(--border);background:var(--card);padding:0 14px;font:inherit;font-size:12.5px;font-weight:600;color:var(--muted-fg);cursor:pointer}
.tmsts button.on{color:#fff;border-color:transparent}
.tmsteps{list-style:none;margin:0;padding:0}
.tmsteps li{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)}
.tmsteps li:last-child{border-bottom:0}
.tmchk{flex:none;width:22px;height:22px;border-radius:50%;border:2px solid var(--input);background:var(--card);display:grid;place-items:center;cursor:pointer;padding:0;color:#fff;font-size:12px;font-weight:700}
.tmchk.on{background:var(--t-green);border-color:var(--t-green)}
.tmchk[disabled]{cursor:default}
.tmsteps .tx{flex:1;font-size:13.5px;min-width:0}
.tmsteps .tx.done{color:var(--muted-fg);text-decoration:line-through}
.tmsteps small{font-size:11.5px;color:var(--muted-fg);white-space:nowrap}
.tmact{list-style:none;margin:0;padding:0 0 0 16px;border-left:1px solid var(--border);display:grid;gap:12px}
.tmact li{position:relative;font-size:13px;line-height:1.4}
.tmact li::before{content:"";position:absolute;left:-22px;top:4px;width:11px;height:11px;border-radius:50%;border:2px solid var(--card);background:var(--dotc,var(--muted-fg))}
.tmact .pc{font-size:12px;color:var(--muted-fg);font-variant-numeric:tabular-nums}
.tmact blockquote{margin:4px 0 0;border-radius:8px;background:var(--muted);padding:6px 10px;font-size:12.5px;white-space:pre-wrap}
.tmact small{display:block;font-size:11.5px;color:var(--muted-fg);margin-top:2px}
.tmstepsed{display:grid;gap:6px}
.tmstep{display:flex;gap:6px;align-items:center}
.tmstep .n{width:20px;text-align:right;font-size:12px;color:var(--muted-fg);flex:none}
.tmstep .in{height:34px;min-height:0}
.tmstep .x{flex:none;width:30px;height:30px;border-radius:8px;border:1px solid var(--input);background:var(--card);cursor:pointer;color:var(--muted-fg);font-size:15px}
.tmform textarea.in{min-height:64px}
.tmdel{margin-top:14px;border-top:1px solid var(--border);padding-top:10px;font-size:12.5px}
.tmdel summary{cursor:pointer;color:var(--t-red);font-weight:600}
`);

/* ---------------- constants ---------------- */
const TEAM_ST = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];
const TEAM_ST_LABEL = { TODO: "To do", IN_PROGRESS: "In progress", BLOCKED: "Blocked", DONE: "Done" };
const TEAM_ST_TONE = { TODO: "teal", IN_PROGRESS: "amber", BLOCKED: "red", DONE: "green" };
const TEAM_ST_COLOR = { TODO: "var(--info, var(--ocean))", IN_PROGRESS: "var(--t-amber)", BLOCKED: "var(--t-red)", DONE: "var(--t-green)" };
const TEAM_PRI = ["LOW", "NORMAL", "HIGH", "URGENT"];
const TEAM_PRI_LABEL = { LOW: "Low", NORMAL: "Normal", HIGH: "High", URGENT: "Urgent" };
const TEAM_PRI_TONE = { LOW: "grey", NORMAL: "blue", HIGH: "amber", URGENT: "red" };
const TEAM_MAX_STEPS = 8;
const TEAM_DAYS = 28;

const teamStBadge = (s) => `<span class="badge tone-${TEAM_ST_TONE[s] || "grey"}">${esc(TEAM_ST_LABEL[s] || s)}</span>`;
const teamPriBadge = (p, suffix = "") => `<span class="badge tone-${TEAM_PRI_TONE[p] || "grey"}">${esc((TEAM_PRI_LABEL[p] || p) + suffix)}</span>`;
const teamProg = (t) => `<div class="tmprog"><div class="tmtrack"><i style="width:${t.percentDone}%;background:${TEAM_ST_COLOR[t.status]}"></i></div><span>${t.percentDone}%</span></div>`;
const teamDay = (s) => (s ? dShort(s) : "—");
const teamIsOverdue = (t, today = todayStr()) => t.status !== "DONE" && !!t.dueDate && t.dueDate < today;
const teamPctFromSteps = (steps) => (steps.length ? Math.round((steps.filter((s) => s.isDone).length / steps.length) * 100) : 0);
function teamStatusForPct(current, pct) {
  if (pct >= 100) return "DONE";
  if (current === "DONE") return pct > 0 ? "IN_PROGRESS" : "TODO";
  if (current === "TODO" && pct > 0) return "IN_PROGRESS";
  return current;
}
const teamStepsOf = (S, taskId) => S.taskSteps.filter((s) => s.taskId === taskId).sort((a, b) => a.sortOrder - b.sortOrder);
const teamEmpLive = (e) => e && e.status !== "TERMINATED" && !e.deletedAt;

/* ---------------- who sees / may change what ---------------- */
function teamAccessFor(St, auth) {
  const me = auth?.employee?.id || null;
  const reportIds = me ? St.employees.filter((e) => e.managerId === me && teamEmpLive(e)).map((e) => e.id) : [];
  return { me, reportIds, isManager: reportIds.length > 0, seesAll: can(auth, "hr.employees.edit") };
}
function teamManageFor(St, auth, t) {
  if (!t || !canSee(auth, t.companyId)) return false;
  const a = teamAccessFor(St, auth);
  if (a.seesAll) return true;
  if (!a.me) return false;
  if (t.createdById === a.me) return true;
  return !!t.assigneeId && a.reportIds.includes(t.assigneeId);
}
function teamUpdateFor(St, auth, t) {
  if (!t || !canSee(auth, t.companyId)) return false;
  const a = teamAccessFor(St, auth);
  if (a.me && t.assigneeId === a.me) return true;
  return teamManageFor(St, auth, t);
}
/** people this person may assign to: me + direct reports (HR: everyone in scope), me first */
function teamAssignableFor(St, auth, ids) {
  const a = teamAccessFor(St, auth);
  const list = a.seesAll
    ? St.employees.filter((e) => teamEmpLive(e) && (ids ? ids.includes(e.companyId) : canSee(auth, e.companyId)))
    : St.employees.filter((e) => teamEmpLive(e) && (e.id === a.me || a.reportIds.includes(e.id)));
  return list.sort((x, y) => (x.id === a.me ? -1 : y.id === a.me ? 1 : empName(x).localeCompare(empName(y))));
}
// view-side shorthands (signed-in user, active company scope)
const teamAccess = () => teamAccessFor(S, A);
function teamScope() {
  const a = teamAccess(), ids = scopeIds(S, A);
  return S.tasks.filter((t) => ids.includes(t.companyId) && (a.seesAll || (a.me && (t.assigneeId === a.me || t.createdById === a.me || a.reportIds.includes(t.assigneeId)))));
}
const teamCanManage = (t) => teamManageFor(S, A, t);
const teamCanUpdate = (t) => teamUpdateFor(S, A, t);
const teamTitle = () => { const a = teamAccess(); return a.isManager || a.seesAll ? "My Team" : "My Tasks"; };

/** For Home: my own open tasks that are overdue or due within 3 days. */
function teamAttention() {
  if (!A || !A.employee) return [];
  const today = todayStr(), soon = addDays(today, 4), ids = scopeIds(S, A);
  return S.tasks
    .filter((t) => ids.includes(t.companyId) && t.assigneeId === A.employee.id && t.status !== "DONE" && t.dueDate && t.dueDate < soon)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
    .map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate, overdue: t.dueDate < today }));
}

if (typeof H_AREAS === "object" && !H_AREAS.tasks) H_AREAS.tasks = ["Tasks", "✅", ["tasks"]];

/* ---------------- reducers ---------------- */
function teamLog(S, ctx, taskId, kind, d) {
  S.taskUpdates.push({ id: ctx.id("tku"), taskId, byName: ctx.actor.displayName, byUserId: ctx.actor.id, kind, percentDone: d.percentDone ?? null, status: d.status ?? null, note: d.note ?? null, createdAt: ctx.now });
}
function teamGet(S, ctx, id, mode) {
  const t = byId(S.tasks, id);
  if (!t) fail("That task no longer exists.");
  ctx.company(t.companyId);
  if (mode === "manage" ? !teamManageFor(S, ctx.auth, t) : !teamUpdateFor(S, ctx.auth, t)) fail(mode === "manage" ? "Only the person who set this task, their manager or HR can change it." : "You can only update tasks assigned to you or your team.");
  return t;
}
const teamValidDay = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
function teamFields(S, ctx, p) {
  const title = String(p.title || "").trim();
  if (!title) fail("Give the task a short title.");
  if (title.length > 160) fail("Keep the title under 160 characters.");
  const startDate = teamValidDay(p.startDate), dueDate = teamValidDay(p.dueDate);
  if (startDate && dueDate && dueDate < startDate) fail("The due date can't be before the start date.");
  const priority = p.priority || "NORMAL";
  if (!TEAM_PRI.includes(priority)) fail("Pick a priority.");
  const assigneeId = p.assigneeId || ctx.auth.employee?.id || "";
  const who = teamAssignableFor(S, ctx.auth).find((e) => e.id === assigneeId);
  if (!who) fail("You can only assign tasks to yourself or people on your team.");
  ctx.company(who.companyId);
  return { title, description: String(p.description || "").trim() || null, assigneeId, startDate, dueDate, priority, companyId: who.companyId, assigneeName: empName(who) };
}
Object.assign(R, {
  "task.create"(S, p, ctx) {
    const f = teamFields(S, ctx, p);
    const steps = (p.steps || []).map((s) => String(s || "").trim()).filter(Boolean).slice(0, TEAM_MAX_STEPS);
    const me = ctx.auth.employee?.id || null;
    const t = { id: ctx.id("tk"), companyId: f.companyId, title: f.title, description: f.description, assigneeId: f.assigneeId, createdById: me, createdByName: ctx.actor.displayName,
      priority: f.priority, status: "TODO", percentDone: 0, startDate: f.startDate, dueDate: f.dueDate, sortOrder: S.tasks.length, createdAt: ctx.now };
    S.tasks.push(t);
    steps.forEach((title, i) => S.taskSteps.push({ id: ctx.id("tks"), taskId: t.id, title, sortOrder: i, isDone: false }));
    teamLog(S, ctx, t.id, "CREATED", { percentDone: 0, status: "TODO", note: steps.length ? `${steps.length} step${steps.length === 1 ? "" : "s"}` : null });
    if (f.assigneeId !== me) teamLog(S, ctx, t.id, "ASSIGNED", { percentDone: 0, status: "TODO", note: f.assigneeName });
    ctx.audit({ module: "tasks", action: "CREATE", companyId: t.companyId, entityType: "Task", entityId: t.id, summary: `${ctx.actor.displayName} created task “${t.title}” for ${f.assigneeName}${f.dueDate ? `, due ${dLong(f.dueDate)}` : ""}.` });
  },
  "task.edit"(S, p, ctx) {
    const t = teamGet(S, ctx, p.taskId, "manage");
    const f = teamFields(S, ctx, p);
    const old = teamStepsOf(S, t.id);
    const wanted = (p.steps || []).map((s) => ({ id: s.id || "", title: String(s.title || "").trim() })).filter((s) => s.title).slice(0, TEAM_MAX_STEPS);
    const changes = [];
    if (f.title !== t.title) changes.push("title");
    if ((f.description || "") !== (t.description || "")) changes.push("description");
    if (f.priority !== t.priority) changes.push(`priority → ${TEAM_PRI_LABEL[f.priority]}`);
    if ((f.startDate || "") !== (t.startDate || "")) changes.push(`start → ${f.startDate ? dLong(f.startDate) : "none"}`);
    if ((f.dueDate || "") !== (t.dueDate || "")) changes.push(`due → ${f.dueDate ? dLong(f.dueDate) : "none"}`);
    const reassigned = f.assigneeId !== t.assigneeId;
    const stepsChanged = wanted.length !== old.length || wanted.some((w, i) => w.id !== old[i]?.id || w.title !== old[i]?.title);
    if (stepsChanged) changes.push("steps");
    if (!changes.length && !reassigned) fail("Nothing changed.");
    const keep = new Set(wanted.filter((s) => s.id).map((s) => s.id));
    S.taskSteps = S.taskSteps.filter((s) => s.taskId !== t.id || keep.has(s.id));
    wanted.forEach((w, i) => {
      const s = w.id && S.taskSteps.find((x) => x.id === w.id && x.taskId === t.id);
      if (s) { s.title = w.title; s.sortOrder = i; } else S.taskSteps.push({ id: ctx.id("tks"), taskId: t.id, title: w.title, sortOrder: i, isDone: false });
    });
    const steps = teamStepsOf(S, t.id);
    if (stepsChanged && steps.length) { t.percentDone = teamPctFromSteps(steps); t.status = teamStatusForPct(t.status, t.percentDone); }
    Object.assign(t, { title: f.title, description: f.description, priority: f.priority, startDate: f.startDate, dueDate: f.dueDate, assigneeId: f.assigneeId, companyId: f.companyId, updatedAt: ctx.now });
    t.completedAt = t.status === "DONE" ? t.completedAt || ctx.now : null;
    if (changes.length) teamLog(S, ctx, t.id, "EDITED", { percentDone: t.percentDone, status: t.status, note: `Changed ${changes.join(", ")}` });
    if (reassigned) teamLog(S, ctx, t.id, "ASSIGNED", { percentDone: t.percentDone, status: t.status, note: f.assigneeName });
    ctx.audit({ module: "tasks", action: "UPDATE", companyId: t.companyId, entityType: "Task", entityId: t.id, summary: `${ctx.actor.displayName} edited task “${t.title}”: ${[...changes, ...(reassigned ? [`reassigned to ${f.assigneeName}`] : [])].join(", ")}.` });
  },
  "task.delete"(S, p, ctx) {
    const t = teamGet(S, ctx, p.taskId, "manage");
    S.tasks = S.tasks.filter((x) => x.id !== t.id);
    S.taskSteps = S.taskSteps.filter((x) => x.taskId !== t.id);
    S.taskUpdates = S.taskUpdates.filter((x) => x.taskId !== t.id);
    ctx.audit({ module: "tasks", action: "DELETE", companyId: t.companyId, entityType: "Task", entityId: t.id, summary: `${ctx.actor.displayName} deleted task “${t.title}”.` });
  },
  "task.progress"(S, p, ctx) {
    const t = teamGet(S, ctx, p.taskId, "update");
    const raw = Number(p.percent);
    if (!Number.isFinite(raw)) fail("Pick how much is done.");
    const pct = Math.max(0, Math.min(100, Math.round(raw)));
    if (pct === t.percentDone) fail(`It's already at ${pct}%.`);
    const before = t.percentDone, beforeSt = t.status;
    t.percentDone = pct; t.status = teamStatusForPct(t.status, pct);
    t.completedAt = t.status === "DONE" ? ctx.now : null; t.updatedAt = ctx.now;
    teamLog(S, ctx, t.id, "PROGRESS", { percentDone: pct, status: t.status });
    ctx.audit({ module: "tasks", action: "UPDATE", companyId: t.companyId, entityType: "Task", entityId: t.id, summary: `${ctx.actor.displayName} set progress on “${t.title}”: ${before}% → ${pct}%${t.status !== beforeSt ? ` (${TEAM_ST_LABEL[t.status]})` : ""}.` });
  },
  "task.step"(S, p, ctx) {
    const s = byId(S.taskSteps, p.stepId);
    if (!s) fail("That step no longer exists.");
    const t = teamGet(S, ctx, s.taskId, "update");
    const before = t.percentDone;
    s.isDone = !s.isDone;
    s.doneByName = s.isDone ? ctx.actor.displayName : null;
    s.doneAt = s.isDone ? ctx.now : null;
    t.percentDone = teamPctFromSteps(teamStepsOf(S, t.id));
    t.status = teamStatusForPct(t.status, t.percentDone);
    t.completedAt = t.status === "DONE" ? t.completedAt || ctx.now : null; t.updatedAt = ctx.now;
    teamLog(S, ctx, t.id, "STEP", { percentDone: t.percentDone, status: t.status, note: `${s.isDone ? "Ticked" : "Unticked"} “${s.title}”` });
    ctx.audit({ module: "tasks", action: "UPDATE", companyId: t.companyId, entityType: "Task", entityId: t.id, summary: `${ctx.actor.displayName} ${s.isDone ? "completed" : "re-opened"} step “${s.title}” on “${t.title}” (${before}% → ${t.percentDone}%).` });
  },
  "task.status"(S, p, ctx) {
    const t = teamGet(S, ctx, p.taskId, "update");
    if (!TEAM_ST.includes(p.status)) fail("Pick a status.");
    if (p.status === t.status) fail(`It's already ${TEAM_ST_LABEL[p.status]}.`);
    const from = t.status;
    let pct = t.percentDone;
    if (p.status === "DONE") pct = 100;
    else if (from === "DONE" && pct >= 100) { const steps = teamStepsOf(S, t.id); pct = steps.length ? Math.min(teamPctFromSteps(steps), 90) : 90; }
    Object.assign(t, { status: p.status, percentDone: pct, completedAt: p.status === "DONE" ? ctx.now : null, updatedAt: ctx.now });
    teamLog(S, ctx, t.id, "STATUS", { percentDone: pct, status: p.status });
    ctx.audit({ module: "tasks", action: "STATUS_CHANGE", companyId: t.companyId, entityType: "Task", entityId: t.id, summary: `${ctx.actor.displayName} moved “${t.title}”: ${TEAM_ST_LABEL[from]} → ${TEAM_ST_LABEL[p.status]}.` });
  },
  "task.note"(S, p, ctx) {
    const t = teamGet(S, ctx, p.taskId, "update");
    const note = String(p.note || "").trim().slice(0, 2000);
    if (!note) fail("Write a note first.");
    t.updatedAt = ctx.now;
    teamLog(S, ctx, t.id, "NOTE", { percentDone: t.percentDone, status: t.status, note });
    ctx.audit({ module: "tasks", action: "UPDATE", companyId: t.companyId, entityType: "Task", entityId: t.id, summary: `${ctx.actor.displayName} added a note on “${t.title}”: ${note.length > 120 ? note.slice(0, 117) + "…" : note}` });
  },
});

/* ---------------- shared bits ---------------- */
const teamF = () => UI.filters.team || (UI.filters.team = {});
const teamWho = (t, me) => (t.assigneeId && t.assigneeId === me ? "Me" : t.assigneeId ? empName(byId(S.employees, t.assigneeId)) : "Unassigned");
const teamIni = (t) => { const e = byId(S.employees, t.assigneeId); return e ? initials(empName(e)).toUpperCase() : "?"; };
const teamLast = (taskId) => { let last = null; for (const u of S.taskUpdates) if (u.taskId === taskId && (!last || u.createdAt >= last.createdAt)) last = u; return last; };
function teamStepCount(taskId) { let n = 0, d = 0; for (const s of S.taskSteps) if (s.taskId === taskId) { n++; if (s.isDone) d++; } return [d, n]; }

/** the new / edit form (also used inside the modal) */
function teamForm(task, draft = {}) {
  const a = teamAccess();
  const v = { title: task?.title || "", description: task?.description || "", assigneeId: task?.assigneeId || a.me || "", startDate: task?.startDate || todayStr(), dueDate: task?.dueDate || "", priority: task?.priority || "NORMAL", ...draft };
  let people = teamAssignableFor(S, A, scopeIds(S, A));
  if (task && task.assigneeId && !people.some((p) => p.id === task.assigneeId)) { const e = byId(S.employees, task.assigneeId); if (e) people = [...people, e]; }
  const steps = draft.steps || (task ? teamStepsOf(S, task.id).map((s) => ({ id: s.id, title: s.title })) : [{ id: "", title: "" }, { id: "", title: "" }]);
  const multiCo = new Set(people.map((p) => p.companyId)).size > 1;
  return `<form class="tmform" data-f="teamSave" data-id="${esc(task?.id || "")}">
    <div class="form-grid" style="grid-template-columns:minmax(0,1fr)">
      <div class="fld"><label for="tmTitle">What needs doing?</label><input class="in" id="tmTitle" name="title" maxlength="160" required value="${esc(v.title)}" placeholder="e.g. Pre-harvest safety walk for Block 12"></div>
    </div>
    <div class="form-grid" style="margin-top:12px">
      <div class="fld"><label for="tmWho">Assign to</label><select class="in" id="tmWho" name="assigneeId">${people.map((p) => opt(p.id, `${p.id === a.me ? `Me (${empName(p)})` : empName(p)}${multiCo ? ` · ${co(p.companyId)?.displayName || ""}` : ""}`, p.id === v.assigneeId)).join("")}</select></div>
      <div class="fld"><label for="tmPri">Priority</label><select class="in" id="tmPri" name="priority">${TEAM_PRI.map((k) => opt(k, TEAM_PRI_LABEL[k], k === v.priority)).join("")}</select></div>
      <div class="fld"><label for="tmStart">Start</label><input class="in" type="date" id="tmStart" name="startDate" value="${esc(v.startDate || "")}"></div>
      <div class="fld"><label for="tmDue">Due</label><input class="in" type="date" id="tmDue" name="dueDate" value="${esc(v.dueDate || "")}"></div>
    </div>
    <div class="fld" style="margin-top:12px"><label for="tmDesc">Details <span style="font-weight:400">(optional)</span></label><textarea class="in" id="tmDesc" name="description" rows="2" placeholder="Anything the person should know">${esc(v.description || "")}</textarea></div>
    <div class="fld" style="margin-top:12px"><label>Steps <span style="font-weight:400">(up to ${TEAM_MAX_STEPS} — ticking them sets how much is done)</span></label>
      <div class="tmstepsed" id="tmSteps">${steps.map((s, i) => teamStepRow(s, i)).join("")}</div>
      <div><button type="button" class="btn sm" data-a="teamStepAdd" id="tmStepAdd"${steps.length >= TEAM_MAX_STEPS ? ' style="display:none"' : ""}>+ Add a step</button></div>
    </div>
    <div class="form-row" style="justify-content:flex-end;margin-top:16px">
      <button type="button" class="btn" data-a="${task ? "teamEditCancel" : "closeModal"}">Cancel</button>
      <button type="submit" class="btn pri">${task ? "Save changes" : "Create task"}</button>
    </div>
  </form>`;
}
const teamStepRow = (s, i) => `<div class="tmstep"><span class="n">${i + 1}.</span><input type="hidden" name="stepId" value="${esc(s.id || "")}"><input class="in" name="stepTitle" maxlength="200" value="${esc(s.title || "")}" placeholder="Step ${i + 1}" aria-label="Step ${i + 1}"><button type="button" class="x" data-a="teamStepDel" aria-label="Remove step ${i + 1}" title="Remove this step">×</button></div>`;
function teamRenumber() {
  const rows = [...document.querySelectorAll("#tmSteps .tmstep")];
  rows.forEach((r, i) => { r.querySelector(".n").textContent = `${i + 1}.`; const inp = r.querySelector("[name=stepTitle]"); inp.placeholder = `Step ${i + 1}`; inp.setAttribute("aria-label", `Step ${i + 1}`); });
  const add = document.getElementById("tmStepAdd"); if (add) add.style.display = rows.length >= TEAM_MAX_STEPS ? "none" : "";
}

/* ---------------- /team ---------------- */
const TEAM_CHIPS = [["mine", "My tasks"], ["team", "Team"], ["overdue", "Overdue"], ["done", "Done"]];
function teamFiltered() {
  const a = teamAccess(), f = teamF(), leads = a.isManager || a.seesAll, today = todayStr(), recent = addDays(today, -14);
  const chip = TEAM_CHIPS.some((c) => c[0] === f.f) && (f.f !== "team" || leads) ? f.f : leads ? "team" : "mine";
  const person = leads ? f.person || "" : "";
  let list = teamScope();
  if (chip === "mine") list = list.filter((t) => t.assigneeId === (a.me || "__none__"));
  if (chip === "overdue") list = list.filter((t) => teamIsOverdue(t, today));
  if (chip === "done") list = list.filter((t) => t.status === "DONE");
  if (chip === "mine" || chip === "team") list = list.filter((t) => t.status !== "DONE" || (t.completedAt || t.updatedAt || t.createdAt || "").slice(0, 10) >= recent);
  if (person) list = list.filter((t) => t.assigneeId === person);
  list = [...list].sort((x, y) => (x.dueDate || "9999") < (y.dueDate || "9999") ? -1 : (x.dueDate || "9999") > (y.dueDate || "9999") ? 1 : x.createdAt < y.createdAt ? -1 : 1);
  return { a, chip, person, list, leads, today };
}

function vTeam(q) {
  const f = teamF();
  if (q.view && ["board", "list", "timeline"].includes(q.view)) f.view = q.view;
  const { a, chip, person, list, leads, today } = teamFiltered();
  const view = ["list", "timeline"].includes(f.view) ? f.view : "board";
  const desc = a.isManager ? "Give your team clear tasks with dates and steps, and see how far along each one is."
    : a.seesAll ? "Every task in the companies you can see — who has what, and how far along it is."
    : "Your to-do list: tick steps, set how much is done and leave a note for your manager.";
  if (!a.me && !a.seesAll) {
    return ph("My Tasks", "") + card("", empty("Tasks belong to people", "This sign-in isn't linked to an employee record, so there are no tasks to show. Tasks appear here once you have an employee record and someone assigns you work."));
  }
  const canCreate = (a.me || a.seesAll) && teamAssignableFor(S, A, scopeIds(S, A)).length > 0;
  const acts = dlButton("tasks", "Download", { variant: "outline" }) + (canCreate ? `<button class="btn pri" data-a="teamNew">+ New task</button>` : "");
  let top = "";
  if (leads) {
    const statusItems = TEAM_ST.map((s) => { const n = list.filter((t) => t.status === s).length; return { label: TEAM_ST_LABEL[s], v: n, d: String(n), color: TEAM_ST_COLOR[s] }; });
    let left;
    if (a.isManager) {
      const mine = teamScope();
      const rows = a.reportIds.map((id) => byId(S.employees, id)).sort((x, y) => empName(x).localeCompare(empName(y))).map((e) => {
        const ts = mine.filter((t) => t.assigneeId === e.id), open = ts.filter((t) => t.status !== "DONE");
        const overdue = open.filter((t) => teamIsOverdue(t, today)).length;
        const avg = open.length ? Math.round(open.reduce((s, t) => s + t.percentDone, 0) / open.length) : null;
        return `<tr><td><button class="lnk" data-a="teamPersonPick" data-id="${e.id}" style="display:inline-flex;align-items:center;gap:8px"><span class="tmini">${esc(initials(empName(e)).toUpperCase())}</span>${esc(empName(e))}</button></td>${td(open.length, true)}<td class="r num${overdue ? " tmlate" : ""}">${overdue}</td><td>${avg == null ? `<span class="hint">No open tasks</span>` : `<div class="tmprog"><div class="tmtrack"><i style="width:${avg}%;background:var(--action,var(--primary))"></i></div><span>${avg}%</span></div>`}</td></tr>`;
      });
      left = cardFlush("Team", table(["Person", ">Open", ">Overdue", "Average progress"], rows, "No direct reports."));
    } else {
      left = card("", `<p class="hint" style="font-size:13px;margin:0">You can see and manage every task in the companies you have access to. Use the person filter to look at one employee.</p>`);
    }
    top = `<div class="tmtop"${a.isManager ? "" : ' style="align-items:start"'}>${left}<section class="card" style="display:flex;align-items:center;justify-content:center;padding:8px">${donut(statusItems, { title: "Tasks by status", total: String(list.length), caption: "tasks shown", size: 130, thick: 16 })}</section></div>`;
  }
  const people = leads ? teamAssignableFor(S, A, scopeIds(S, A)) : [];
  const chips = TEAM_CHIPS.filter((c) => c[0] !== "team" || leads).map(([k, l]) => `<button class="hchip ${chip === k ? "on" : ""}" data-a="teamSet" data-k="f" data-v="${k}" aria-pressed="${chip === k}">${esc(k === "team" && !a.isManager ? "Everyone" : l)}</button>`).join("");
  const personSel = leads && people.length > 1 ? `<select class="tmsel" data-a="teamPerson" aria-label="Show one person"><option value="">Everyone</option>${people.map((p) => opt(p.id, p.id === a.me ? `Me (${empName(p)})` : empName(p), p.id === person)).join("")}</select>` : "";
  const seg = `<div class="tmseg" role="group" aria-label="View">${[["board", "Board"], ["list", "List"], ["timeline", "Timeline"]].map(([k, l]) => `<button class="${view === k ? "on" : ""}" data-a="teamSet" data-k="view" data-v="${k}" aria-pressed="${view === k}">${l}</button>`).join("")}</div>`;
  let body;
  if (!list.length) body = card("", empty(chip === "overdue" ? "Nothing overdue" : chip === "done" ? "Nothing finished yet" : "No tasks here yet", a.me ? "Press “New task” to add one — give it a due date and a few steps so progress is easy to follow." : "Tasks appear here once people are assigned work."));
  else if (view === "board") body = teamBoard(list, a.me, today);
  else if (view === "list") body = teamList(list, a.me, today);
  else body = teamTimeline(list, a.me, today, Number(f.w) || 0);
  return ph(teamTitle(), desc, acts) + flashHtml() + top + `<div class="tmbarline">${chips}${personSel}${seg}</div>` + body;
}

function teamBoard(list, me, today) {
  return `<div class="tmboard" data-testid="board">${TEAM_ST.map((s) => {
    const cards = list.filter((t) => t.status === s);
    return `<section class="tmcol" data-tdrop="${s}" aria-label="${TEAM_ST_LABEL[s]}"><div class="tmcol-h"><span class="dot" style="background:${TEAM_ST_COLOR[s]}"></span>${TEAM_ST_LABEL[s]}<span class="n">${cards.length}</span></div><div class="tmcol-b">${cards.length ? cards.map((t) => {
      const late = teamIsOverdue(t, today), [d, n] = teamStepCount(t.id), up = teamCanUpdate(t);
      return `<article class="tmcard" ${up ? `draggable="true" data-tdrag="${t.id}"` : ""}>
        <button class="lnk" data-go="/team/${t.id}">${esc(t.title)}</button>
        <div class="tmcard-m"><span class="tmini" title="${esc(teamWho(t, me))}">${esc(teamIni(t))}</span><span>${esc(teamWho(t, me))}</span>${t.priority !== "NORMAL" ? teamPriBadge(t.priority) : ""}${t.dueDate ? `<span class="${late ? "tmlate" : ""}" style="margin-left:auto">${late ? "Overdue · " : "Due "}${esc(dShort(t.dueDate))}</span>` : ""}</div>
        <div class="tmtrack"><i style="width:${t.percentDone}%;background:${TEAM_ST_COLOR[t.status]}"></i></div>
        <div class="tmcard-f"><span>${t.percentDone}%</span>${n ? `<span>· ${d}/${n} steps</span>` : ""}${up ? `<select data-a="teamMove" data-id="${t.id}" aria-label="Move “${esc(t.title)}”">${TEAM_ST.map((k) => opt(k, TEAM_ST_LABEL[k], k === t.status)).join("")}</select>` : ""}</div>
      </article>`;
    }).join("") : `<div class="tmcol-e">Nothing here${s === "DONE" ? " yet" : ""}.<br>Drag a card here to move it.</div>`}</div></section>`;
  }).join("")}</div><p class="hint" style="margin-top:8px">Drag a card to another column, or use its status menu, to move it. Open a card to tick steps and set how much is done.</p>`;
}

function teamList(list, me, today) {
  const rows = list.map((t) => {
    const late = teamIsOverdue(t, today), [d, n] = teamStepCount(t.id), last = teamLast(t.id);
    return `<tr class="click" data-go="/team/${t.id}"><td style="max-width:320px"><strong style="color:var(--primary)">${esc(t.title)}</strong>${n ? ` <span class="hint">${d}/${n} steps</span>` : ""}</td><td style="white-space:nowrap">${esc(teamWho(t, me))}</td><td class="num" style="white-space:nowrap">${teamDay(t.startDate)}</td><td class="num ${late ? "tmlate" : ""}" style="white-space:nowrap">${teamDay(t.dueDate)}${late ? " · overdue" : ""}</td><td>${teamPriBadge(t.priority)}</td><td>${teamStBadge(t.status)}</td><td>${teamProg(t)}</td><td class="hint" style="white-space:nowrap">${last ? `by ${esc(last.byName)} · ${esc(ago(last.createdAt))}` : "—"}</td></tr>`;
  });
  return `<section class="card" data-testid="list">${table(["Task", "Assignee", "Start", "Due", "Priority", "Status", "Done", "Last update"], rows)}</section>`;
}

function teamTimeline(list, me, today, offset) {
  const monday = addDays(today, -((dowOf(today) + 6) % 7) + offset * 7);
  const days = Array.from({ length: TEAM_DAYS }, (_, i) => addDays(monday, i));
  const idx = (s) => Math.round((D(s) - D(monday)) / MS_DAY);
  const todayIdx = idx(today);
  const cols = `grid-template-columns:minmax(150px,220px) repeat(${TEAM_DAYS},minmax(22px,1fr))`;
  const rows = list.map((t) => { const s = t.startDate || t.dueDate || t.createdAt.slice(0, 10); let e = t.dueDate || s; if (e < s) e = s; return { t, s: idx(s), e: idx(e) }; }).filter((r) => r.e >= 0 && r.s < TEAM_DAYS);
  const outside = list.length - rows.length;
  const cellCls = (i) => `${i % 7 === 0 ? " w0" : ""}${i % 7 >= 5 ? " we" : ""}${i === todayIdx ? " td" : ""}`;
  const wk = `<div class="tmtl-r wk" style="${cols}"><div class="tmtl-l" style="padding:6px 12px">Task</div>${[0, 1, 2, 3].map((w) => `<div style="grid-row:1;grid-column:${w * 7 + 2} / span 7;border-left:1px solid var(--border);padding:6px 8px">Week of ${esc(dShort(days[w * 7]))}</div>`).join("")}</div>`;
  const dy = `<div class="tmtl-r dy" style="${cols}"><div class="tmtl-l"></div>${days.map((d, i) => `<div class="tmtl-d${cellCls(i)}" style="grid-column:${i + 2}">${D(d).getUTCDate()}</div>`).join("")}</div>`;
  const body = rows.length ? rows.map(({ t, s, e }) => {
    const from = Math.max(0, s), to = Math.min(TEAM_DAYS - 1, e), col = TEAM_ST_COLOR[t.status];
    return `<div class="tmtl-r row" style="${cols}"><div class="tmtl-l"><button class="lnk" data-go="/team/${t.id}" title="${esc(t.title)}">${esc(t.title)}</button><small>${esc(teamWho(t, me))}</small></div>${days.map((_, i) => `<div class="tmtl-c${cellCls(i)}" style="grid-column:${i + 2}" aria-hidden="true"></div>`).join("")}<button class="tmtl-b${s < 0 ? " cl" : ""}${e >= TEAM_DAYS ? " cr" : ""}" data-go="/team/${t.id}" data-bar="${t.id}" title="${esc(`${t.title} · ${TEAM_ST_LABEL[t.status]} · ${t.percentDone}% · ${teamDay(t.startDate)} → ${teamDay(t.dueDate)}`)}" style="grid-column:${from + 2} / ${to + 3};border-color:${col}"><i style="width:${t.status === "DONE" ? 100 : t.percentDone}%;background:${col}"></i><span>${t.percentDone}%</span></button></div>`;
  }).join("") : `<div class="empty" style="padding:26px">No tasks with dates in these four weeks.</div>`;
  return `<section class="tmtl" data-testid="timeline"><div class="tmtl-h"><strong>${esc(dShort(days[0]))} – ${esc(dLong(days[TEAM_DAYS - 1]))}</strong><span class="hint">${outside > 0 ? `${outside} task${outside === 1 ? "" : "s"} fall outside these 4 weeks` : "Bars run from start to due date"}</span><span class="acts"><button class="btn sm" data-a="teamWeek" data-v="-4">‹ Earlier</button>${offset !== 0 ? `<button class="btn sm" data-a="teamWeek" data-v="0">This week</button>` : ""}<button class="btn sm" data-a="teamWeek" data-v="4">Later ›</button></span></div>
    <div class="tmtl-s"><div class="tmtl-g">${wk}${dy}${body}</div></div>
    <div class="tmlegend">${TEAM_ST.map((s) => `<span><i style="background:${TEAM_ST_COLOR[s]}"></i>${TEAM_ST_LABEL[s]}</span>`).join("")}<span><i style="width:2px;height:12px;background:var(--t-red)"></i>Today</span></div></section>`;
}

/* ---------------- /team/:id ---------------- */
function teamWithBefore(updates) {
  let pct = null, st = null;
  return updates.map((u) => { const r = { ...u, beforePct: pct, beforeStatus: st }; if (u.percentDone != null) pct = u.percentDone; if (u.status) st = u.status; return r; });
}
function teamWhat(u) {
  switch (u.kind) {
    case "CREATED": return `created the task${u.note ? ` (${u.note})` : ""}`;
    case "ASSIGNED": return `assigned it to ${u.note || "someone"}`;
    case "PROGRESS": return "updated how much is done";
    case "STEP": return (u.note || "updated a step").replace(/^Ticked/, "ticked").replace(/^Unticked/, "unticked");
    case "STATUS": return `moved it ${u.beforeStatus ? `from ${TEAM_ST_LABEL[u.beforeStatus]} ` : ""}to ${TEAM_ST_LABEL[u.status] || u.status}`;
    case "NOTE": return "added a note";
    case "EDITED": return (u.note || "edited the task").replace(/^Changed/, "changed");
    default: return String(u.kind || "").toLowerCase();
  }
}
const teamPctWord = (p) => (p === 0 ? "Not started yet" : p >= 100 ? "All done" : p >= 75 ? "Nearly there" : p >= 50 ? "Halfway or more" : "Under way");

function vTeamTask(q, id) {
  const t = byId(S.tasks, id);
  const back = teamLeads() ? crumb("/team", teamTitle()) : crumb("/me/tasks", "My Tasks");
  if (!t) return ph("Task not found", "", "", back) + card("", empty("That task no longer exists", "It may have been deleted. The History log keeps a record."));
  if (!inView(S, A, t.companyId) || !teamCanUpdate(t)) return ph("Not available for your role", "", "", back) + card("", `<p>You can see tasks assigned to you, tasks you created and — for managers — tasks of your direct reports.</p>`);
  const manage = teamCanManage(t), editing = manage && teamF().edit === t.id;
  const late = teamIsOverdue(t);
  const steps = teamStepsOf(S, t.id), done = steps.filter((s) => s.isDone).length;
  const ups = S.taskUpdates.map((u, i) => [u, i]).filter(([u]) => u.taskId === t.id).sort((x, y) => (x[0].createdAt < y[0].createdAt ? -1 : x[0].createdAt > y[0].createdAt ? 1 : x[1] - y[1])).map(([u]) => u);
  const activity = teamWithBefore(ups).reverse();
  const assignee = byId(S.employees, t.assigneeId);
  const acts = manage && !editing ? `<button class="btn sm" data-a="teamEdit" data-id="${t.id}">Edit</button>` : "";
  const head = `<div class="tmhead">${teamStBadge(t.status)}${teamPriBadge(t.priority, " priority")}<span style="display:inline-flex;align-items:center;gap:6px"><span class="tmini">${esc(teamIni(t))}</span>${esc(assignee ? empName(assignee) : "Unassigned")}</span><span>·</span><span>${esc(t.startDate ? dLong(t.startDate) : "—")} → <span class="${late ? "tmlate" : ""}">${esc(t.dueDate ? dLong(t.dueDate) : "—")}${late ? " (overdue)" : ""}</span></span><span>·</span>${coTag(t.companyId)}</div>`;
  const edit = editing ? card("Edit task", teamForm(t) + `<details class="tmdel"><summary>Delete this task…</summary><div class="form-row" style="margin-top:8px"><span class="hint" style="font-size:12.5px">The task, its steps and its activity will be removed. The History log keeps a record.</span><button class="btn sm dng" data-a="teamDelete" data-id="${t.id}">Yes, delete it</button></div></details>`) + `<div style="height:14px"></div>` : "";
  const progress = card("How much is done?", `<form data-f="teamProgress" data-id="${t.id}">
      <div class="tmpct"><b id="tmPctV" aria-live="polite">${t.percentDone}%</b><span id="tmPctW">${teamPctWord(t.percentDone)}</span></div>
      <div class="tmbig"><i id="tmPctBar" style="width:${t.percentDone}%"></i></div>
      <input type="range" class="tmrange" id="tmPct" name="percent" min="0" max="100" step="10" value="${t.percentDone}" data-was="${t.percentDone}" aria-label="How much is done, in percent">
      <div class="tmquick">${[0, 25, 50, 75, 100].map((v) => `<button type="button" class="hchip ${t.percentDone === v ? "on" : ""}" data-a="teamPctSet" data-id="${t.id}" data-v="${v}">${v}%</button>`).join("")}<button type="submit" class="btn pri sm" id="tmPctSave" disabled>Save ${t.percentDone}%</button></div>
      ${steps.length ? `<p class="hint" style="margin:8px 0 0">Ticking a step below sets this for you (done steps ÷ all steps).</p>` : ""}
    </form>`);
  const status = card("Status", `<div class="tmsts">${TEAM_ST.map((s) => `<button class="${t.status === s ? "on" : ""}" style="${t.status === s ? `background:${TEAM_ST_COLOR[s]}` : ""}" data-a="teamStatus" data-id="${t.id}" data-s="${s}" aria-pressed="${t.status === s}">${TEAM_ST_LABEL[s]}</button>`).join("")}</div>`);
  const stepsCard = card(`Steps${steps.length ? ` <span class="hint" style="font-weight:400;font-size:12.5px">${done} of ${steps.length} done</span>` : ""}`, steps.length ? `<ul class="tmsteps">${steps.map((s) => `<li><button class="tmchk ${s.isDone ? "on" : ""}" role="checkbox" aria-checked="${!!s.isDone}" aria-label="${esc(s.title)}" data-a="teamStep" data-id="${s.id}">${s.isDone ? "✓" : ""}</button><span class="tx ${s.isDone ? "done" : ""}">${esc(s.title)}</span>${s.isDone && s.doneByName ? `<small>${esc(s.doneByName)}${s.doneAt ? ` · ${esc(ago(s.doneAt))}` : ""}</small>` : ""}</li>`).join("")}</ul>` : `<p class="hint" style="font-size:13px;margin:0">No steps on this task.${manage ? " Press Edit to add some — progress then follows the ticked steps." : ""}</p>`);
  const details = t.description ? card("Details", `<p style="margin:0;white-space:pre-wrap;font-size:13.5px">${esc(t.description)}</p>`) : "";
  const note = card("Add a note", `<form data-f="teamNote" data-id="${t.id}" style="display:grid;gap:8px"><textarea class="in" name="note" rows="2" required maxlength="2000" placeholder="e.g. Waiting on the replacement part — should arrive Tuesday" aria-label="Note"></textarea><div><button type="submit" class="btn pri sm">Add note</button></div></form>`);
  const dot = (u) => (u.kind === "STATUS" && u.status ? TEAM_ST_COLOR[u.status] : "var(--muted-fg)");
  const actCard = card("Activity", `<p class="hint" style="margin:-4px 0 12px">Who did what on this task, newest first.</p><ol class="tmact" data-testid="activity">${activity.map((u) => {
    const pc = u.percentDone != null && u.beforePct != null && u.percentDone !== u.beforePct ? `${u.beforePct}% → ${u.percentDone}%` : null;
    return `<li style="--dotc:${dot(u)}"><div><strong>${esc(u.byName || "Someone")}</strong> ${esc(teamWhat(u))}</div>${pc ? `<div class="pc">Progress ${pc}</div>` : ""}${u.kind === "NOTE" && u.note ? `<blockquote>${esc(u.note)}</blockquote>` : ""}<small title="${esc(u.createdAt)}">${esc(dTime(u.createdAt))} · ${esc(ago(u.createdAt))}</small></li>`;
  }).join("")}</ol>${t.createdByName ? `<p class="hint" style="margin:12px 0 0">Created by ${esc(t.createdByName)}${t.completedAt ? ` · finished ${esc(dLong(t.completedAt.slice(0, 10)))}` : ""}</p>` : ""}`);
  return ph(t.title, "", acts, back) + head + flashHtml() + edit + `<div class="tmdetail"><div>${progress}${status}${stepsCard}${details}</div><div>${note}${actCard}</div></div>`;
}

route("/team", null, vTeam);
route("/team/:id", null, vTeamTask);

/* ---------------- /me/tasks — my own tasks, kept light: a note on each task and its last few updates ---------------- */
const myTaskHist = (taskId) => S.taskUpdates.map((u, i) => [u, i]).filter(([u]) => u.taskId === taskId).sort((x, y) => (x[0].createdAt < y[0].createdAt ? 1 : x[0].createdAt > y[0].createdAt ? -1 : y[1] - x[1])).map(([u]) => u);
function myTaskCard(t, today) {
  const late = teamIsOverdue(t, today), [d, n] = teamStepCount(t.id), all = teamWithBefore([...myTaskHist(t.id)].reverse()).reverse();
  const open = (UI.filters.taskHist || {})[t.id], shown = open ? all : all.slice(0, 5);
  const row = (u) => `<li><strong>${esc(u.byName || "Someone")}</strong> ${esc(teamWhat(u))}${u.percentDone != null && u.beforePct != null && u.percentDone !== u.beforePct ? ` <span class="hint">(${u.beforePct}% → ${u.percentDone}%)</span>` : ""} <small>· ${esc(ago(u.createdAt))}</small>${u.kind === "NOTE" && u.note ? `<blockquote>${esc(u.note)}</blockquote>` : ""}</li>`;
  return `<article class="tcard" data-testid="mytask"><div>
      <div class="tt"><button class="lnk" data-go="/team/${t.id}">${esc(t.title)}</button>${teamStBadge(t.status)}${t.priority !== "NORMAL" ? teamPriBadge(t.priority) : ""}</div>
      <div class="tm">${t.dueDate ? `<span class="${late ? "tmlate" : ""}">${late ? "Overdue · was due" : "Due"} ${esc(dLong(t.dueDate))}</span>` : "<span>No due date</span>"}${n ? `<span>· ${d}/${n} steps</span>` : ""}<span>· set by ${esc(t.createdByName || "—")}</span>${t.status !== "DONE" ? `<select class="tmsel" data-a="teamMove" data-id="${t.id}" aria-label="Status of “${esc(t.title)}”" style="margin-left:auto">${TEAM_ST.map((k) => opt(k, TEAM_ST_LABEL[k], k === t.status)).join("")}</select>` : ""}</div>
      ${t.description ? `<p class="hint" style="margin:8px 0 0;font-size:12.5px;white-space:pre-wrap">${esc(t.description)}</p>` : ""}
      <div class="tmtrack"><i style="width:${t.percentDone}%;background:${TEAM_ST_COLOR[t.status]}"></i></div>
      <div class="tm"><span>${t.percentDone}% done</span>${t.status !== "DONE" ? `<span style="display:inline-flex;gap:4px;margin-left:auto">${[25, 50, 75, 100].map((v) => `<button type="button" class="hchip ${t.percentDone === v ? "on" : ""}" style="padding:2px 8px;font-size:11.5px" data-a="teamPctSet" data-id="${t.id}" data-v="${v}">${v}%</button>`).join("")}</span>` : ""}</div>
    </div><div>
      <div class="hl"><span>History</span>${all.length > 5 ? `<button class="lnk" style="font-size:11.5px;text-transform:none;letter-spacing:0" data-a="myTaskHist" data-id="${t.id}">${open ? "Show less" : `Show all ${all.length}`}</button>` : ""}</div>
      <ul class="hist">${shown.length ? shown.map(row).join("") : `<li class="hint">Nothing yet.</li>`}</ul>
      <form class="nf" data-f="teamNote" data-id="${t.id}"><input class="in" name="note" maxlength="2000" required placeholder="Add a note for your manager…" aria-label="Note"><button class="btn sm pri">Add note</button></form>
    </div></article>`;
}
function vMyTasks() {
  const e = A.employee, today = todayStr();
  if (!e) return ph("My Tasks", "") + card("", empty("Tasks belong to people", "This sign-in isn't linked to an employee record, so there are no tasks to show."));
  const mine = S.tasks.filter((t) => t.assigneeId === e.id && scopeIds(S, A).includes(t.companyId));
  const open = mine.filter((t) => t.status !== "DONE").sort((x, y) => ((x.dueDate || "9999") < (y.dueDate || "9999") ? -1 : (x.dueDate || "9999") > (y.dueDate || "9999") ? 1 : x.createdAt < y.createdAt ? -1 : 1));
  const done = mine.filter((t) => t.status === "DONE").sort((x, y) => ((x.completedAt || "") < (y.completedAt || "") ? 1 : -1)).slice(0, 5);
  const late = open.filter((t) => teamIsOverdue(t, today)).length;
  const acts = (teamAssignableFor(S, A, scopeIds(S, A)).length ? `<button class="btn pri" data-a="teamNew">+ New task</button>` : "") + (teamLeads() ? `<button class="btn" data-go="/team">Open My Team →</button>` : "");
  return ph("My Tasks", "Everything on your plate, soonest first. Move it along, leave a note for your manager, and see what changed.", acts) + flashHtml()
    + `<div class="stats">${stat("Open", String(open.length), late ? `${late} overdue` : "none overdue", late ? "warn" : "")}${stat("Due this week", String(open.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= addDays(today, 7)).length), "in the next 7 days")}${stat("Done lately", String(mine.filter((t) => t.status === "DONE" && (t.completedAt || "").slice(0, 10) >= addDays(today, -30)).length), "in the last 30 days", "good")}</div>`
    + (open.length ? `<div class="mtask">${open.map((t) => myTaskCard(t, today)).join("")}</div>` : card("", empty("Nothing on your list", "Tasks your manager gives you appear here; press “New task” to add your own to-do.")))
    + (done.length ? `<div class="sect-l">Done lately</div><div class="mtask">${done.map((t) => myTaskCard(t, today)).join("")}</div>` : "");
}
route("/me/tasks", null, vMyTasks);
window.ACTIONS_EXT.push({ myTaskHist(el) { const h = UI.filters.taskHist || (UI.filters.taskHist = {}); h[el.dataset.id] = !h[el.dataset.id]; safeRender(); } });

/* ---------------- forms & actions ---------------- */
function teamReadForm(f) {
  const d = fd(f);
  const steps = [...f.querySelectorAll("#tmSteps .tmstep")].map((r) => ({ id: r.querySelector("[name=stepId]").value, title: r.querySelector("[name=stepTitle]").value }));
  return { title: d.title, description: d.description, assigneeId: d.assigneeId, startDate: d.startDate, dueDate: d.dueDate, priority: d.priority, steps };
}
window.FORMS_EXT.push({
  teamSave(f) {
    const p = teamReadForm(f), id = f.dataset.id;
    if (id) {
      if (act("task.edit", { taskId: id, ...p }, "Task saved.")) { teamF().edit = null; safeRender(); }
      return;
    }
    UI.modal = `<h3 style="margin:0 0 12px">New task</h3>${teamForm(null, p)}`; // a failed save keeps what was typed
    const before = S.tasks.length;
    const who = byId(S.employees, p.assigneeId);
    if (act("task.create", { ...p, steps: p.steps.map((s) => s.title) }, null)) {
      const t = S.tasks[before];
      UI.modal = null; go(`/team/${t.id}`);
      UI.flash = { kind: "ok", text: `Task created and assigned to ${who && A.employee?.id !== who.id ? empName(who) : "you"}.` };
      toast("Done", UI.flash.text, "ok"); safeRender();
    }
  },
  teamProgress(f) { const d = fd(f); act("task.progress", { taskId: f.dataset.id, percent: Number(d.percent) }, `Saved — ${d.percent}% done.`); },
  teamNote(f) { const d = fd(f); act("task.note", { taskId: f.dataset.id, note: d.note }, "Note added."); },
});
window.ACTIONS_EXT.push({
  teamNew() { UI.modal = `<h3 style="margin:0 0 12px">New task</h3>${teamForm(null, teamF().person ? { assigneeId: teamF().person } : {})}`; UI.modalWide = false; safeRender(); setTimeout(() => document.getElementById("tmTitle")?.focus(), 30); },
  teamSet(el) { teamF()[el.dataset.k] = el.dataset.v; safeRender(); },
  teamPerson(el) { teamF().person = el.value; if (el.value) teamF().f = "team"; safeRender(); },
  teamPersonPick(el) { Object.assign(teamF(), { person: el.dataset.id, f: "team" }); safeRender(); },
  teamWeek(el) { const v = Number(el.dataset.v); teamF().w = v === 0 ? 0 : (Number(teamF().w) || 0) + v; safeRender(); },
  teamMove(el) { const t = byId(S.tasks, el.dataset.id); if (!t || t.status === el.value) return; act("task.status", { taskId: t.id, status: el.value }, `“${t.title}” moved to ${TEAM_ST_LABEL[el.value]}.`); },
  teamStep(el) { const s = byId(S.taskSteps, el.dataset.id); act("task.step", { stepId: el.dataset.id }, s ? `${s.isDone ? "Re-opened" : "Ticked"} “${s.title}”.` : ""); },
  teamStatus(el) { const t = byId(S.tasks, el.dataset.id); if (!t || t.status === el.dataset.s) return; act("task.status", { taskId: t.id, status: el.dataset.s }, `Moved to ${TEAM_ST_LABEL[el.dataset.s]}.`); },
  teamPctSet(el) { const t = byId(S.tasks, el.dataset.id); const v = Number(el.dataset.v); if (!t || t.percentDone === v) return; act("task.progress", { taskId: t.id, percent: v }, `Saved — ${v}% done.`); },
  teamEdit(el) { teamF().edit = el.dataset.id; safeRender(); },
  teamEditCancel() { teamF().edit = null; safeRender(); },
  teamDelete(el) { const t = byId(S.tasks, el.dataset.id); if (!t) return; const title = t.title; if (act("task.delete", { taskId: t.id }, null)) { teamF().edit = null; go("/team"); UI.flash = { kind: "ok", text: `Deleted “${title}”.` }; toast("Done", UI.flash.text, "ok"); safeRender(); } },
  teamStepAdd() { const box = document.getElementById("tmSteps"); if (!box) return; const n = box.querySelectorAll(".tmstep").length; if (n >= TEAM_MAX_STEPS) return; box.insertAdjacentHTML("beforeend", teamStepRow({}, n)); teamRenumber(); box.querySelectorAll("[name=stepTitle]")[n]?.focus(); },
  teamStepDel(el) { el.closest(".tmstep")?.remove(); teamRenumber(); },
});

/* live slider label (no re-render while dragging) */
document.addEventListener("input", (ev) => {
  const el = ev.target;
  if (el.id !== "tmPct") return;
  const v = Number(el.value);
  const set = (id, fn) => { const n = document.getElementById(id); if (n) fn(n); };
  set("tmPctV", (n) => { n.textContent = `${v}%`; });
  set("tmPctW", (n) => { n.textContent = teamPctWord(v); });
  set("tmPctBar", (n) => { n.style.width = `${v}%`; });
  set("tmPctSave", (n) => { n.textContent = `Save ${v}%`; n.disabled = v === Number(el.dataset.was); });
});

/* board drag & drop */
let TEAM_DRAG = null;
document.addEventListener("dragstart", (ev) => { const c = ev.target.closest?.("[data-tdrag]"); if (!c) return; TEAM_DRAG = c.dataset.tdrag; c.classList.add("dragging"); ev.dataTransfer.effectAllowed = "move"; try { ev.dataTransfer.setData("text/plain", TEAM_DRAG); } catch { /* ignore */ } });
document.addEventListener("dragend", (ev) => { ev.target.closest?.("[data-tdrag]")?.classList.remove("dragging"); document.querySelectorAll(".tmcol.over").forEach((n) => n.classList.remove("over")); TEAM_DRAG = null; });
document.addEventListener("dragover", (ev) => { if (!TEAM_DRAG) return; const z = ev.target.closest?.("[data-tdrop]"); if (!z) return; ev.preventDefault(); document.querySelectorAll(".tmcol.over").forEach((n) => n !== z && n.classList.remove("over")); z.classList.add("over"); });
document.addEventListener("drop", (ev) => {
  if (!TEAM_DRAG) return;
  const z = ev.target.closest?.("[data-tdrop]"); if (!z) return;
  ev.preventDefault(); z.classList.remove("over");
  const t = byId(S.tasks, TEAM_DRAG); TEAM_DRAG = null;
  if (t && t.status !== z.dataset.tdrop) act("task.status", { taskId: t.id, status: z.dataset.tdrop }, `“${t.title}” moved to ${TEAM_ST_LABEL[z.dataset.tdrop]}.`);
});

/* ---------------- downloads ---------------- */
EXPORTS.tasks = () => {
  const { list, a } = teamFiltered();
  return { base: `haico-tasks-${todayStr()}`, title: "Tasks", rows: [["Task", "Assignee", "Company", "Priority", "Status", "% done", "Steps done", "Start", "Due", "Overdue", "Created by", "Last update"],
    ...list.map((t) => { const [d, n] = teamStepCount(t.id), last = teamLast(t.id); return [t.title, teamWho(t, null), co(t.companyId)?.displayName || "", TEAM_PRI_LABEL[t.priority], TEAM_ST_LABEL[t.status], t.percentDone, n ? `${d}/${n}` : "", t.startDate || "", t.dueDate || "", teamIsOverdue(t) ? "Yes" : "", t.createdByName || "", last ? `${last.byName} · ${last.createdAt.slice(0, 16).replace("T", " ")}` : ""]; })] };
};
