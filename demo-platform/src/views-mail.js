/* ==========================================================================
   views-mail.js — Email and Calendar in the sidebar, Outlook style.
   Email: Inbox, Sent, Drafts, Archive, Deleted, Junk as submenus under Email.
   The inbox holds the platform's own emails to this person plus sample mail.
   Calendar: Month, Week, Day with stat holidays, paydays, time off, company
   events and meetings; people can add their own meetings.
   Demo only: in production these come from each person's Microsoft 365
   mailbox and Outlook calendar after sign-in. Moves, drafts and new events
   are kept in this browser per person; nothing is sent and nothing is
   permanently deleted (Deleted is a folder).
   Loads after views-fb1.js and before views-xm-core.js.
   ========================================================================== */
injectCss(`
.ml-wrap{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);height:calc(100vh - 170px);min-height:460px;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card)}
.ml-list{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--border);background:var(--bg)}
.ml-lh{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border)}
.ml-lh h2{margin:0;font-size:16px}
.ml-lh .in{flex:1;min-width:0}
.ml-items{overflow-y:auto;flex:1}
.ml-li{display:grid;gap:2px;width:100%;text-align:left;border:0;border-bottom:1px solid var(--border);background:transparent;color:var(--fg);padding:10px 12px 10px 14px;cursor:pointer;font:inherit;position:relative}
.ml-li:hover{background:var(--card)}
.ml-li.on{background:var(--card);box-shadow:inset 3px 0 0 var(--primary)}
.ml-li.unread::after{content:"";position:absolute;left:5px;top:15px;width:6px;height:6px;border-radius:50%;background:var(--primary)}
.ml-li .r1{display:flex;justify-content:space-between;gap:8px;font-size:12.5px}
.ml-li .r1 span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ml-li .r1 span:last-child{color:var(--muted-fg);white-space:nowrap;font-variant-numeric:tabular-nums}
.ml-li.unread .r1 span:first-child,.ml-li.unread .sj{font-weight:700}
.ml-li .sj{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ml-li .pv{font-size:12px;color:var(--muted-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ml-read{overflow-y:auto;padding:18px 22px;min-width:0}
.ml-read h3{font-size:18px;margin:0 0 10px;line-height:1.3}
.ml-acts{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}
.ml-body p{margin:0 0 8px;overflow-wrap:anywhere}
.ml-comp{display:grid;gap:10px;max-width:760px}
.ml-comp textarea{min-height:240px;resize:vertical}
.ml-back{display:none}
.ml-note{margin:10px 0 0}
.side .subs{display:flex;flex-direction:column;gap:1px;margin:1px 0 4px 18px;padding-left:8px;border-left:1px solid var(--side-border)}
.side .subs .item{padding:5px 10px;font-size:12.5px}
.side .subs .item.on{box-shadow:none}
.cl-wrap{display:grid;grid-template-columns:minmax(0,1fr) 290px;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card)}
.cl-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px}
.cl-head h2{margin:0 6px;font-size:18px;min-width:170px}
.cl-seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-left:auto}
.cl-seg button{border:0;background:var(--card);color:var(--fg);padding:6px 12px;cursor:pointer;font:inherit}
.cl-seg button.on{background:var(--primary);color:var(--primary-fg)}
.cl-leg{display:flex;flex-wrap:wrap;gap:12px;font-size:12.5px;color:var(--muted-fg);margin:0 0 10px}
.cl-leg span{display:inline-flex;align-items:center;gap:6px}.cl-leg i{width:10px;height:10px;border-radius:3px;display:inline-block}
.cl-main{overflow:auto;min-width:0}
.cl-month{display:grid;grid-template-columns:repeat(7,minmax(84px,1fr));min-width:600px}
.cl-dow{background:var(--thead);color:var(--muted-fg);font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:6px 8px;border-bottom:1px solid var(--border)}
.cl-cell{min-height:100px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);padding:4px 5px;display:flex;flex-direction:column;gap:3px;cursor:pointer;min-width:0;background:var(--card)}
.cl-cell:hover{background:var(--bg)}
.cl-cell.out{background:var(--bg);color:var(--muted-fg)}
.cl-cell.sel{box-shadow:inset 0 0 0 2px var(--ring)}
.cl-num{font-size:12px;align-self:flex-start;padding:0 6px;border-radius:10px;font-variant-numeric:tabular-nums}
.cl-cell.today .cl-num{background:var(--primary);color:var(--primary-fg);font-weight:700}
.cl-ev{display:block;width:100%;border:0;text-align:left;font:inherit;font-size:11.5px;border-radius:4px;padding:2px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
.cl-ev.k-meet{background:var(--t-teal-bg);color:var(--t-teal)}.cl-ev.k-leave{background:var(--t-amber-bg);color:var(--t-amber)}
.cl-ev.k-holiday{background:var(--t-red-bg);color:var(--t-red)}.cl-ev.k-payday{background:var(--t-blue-bg);color:var(--t-blue)}
.cl-ev.k-other{background:var(--t-grey-bg);color:var(--t-grey)}
.cl-more{font-size:11px;color:var(--muted-fg)}
.cl-week{display:grid;min-width:640px}
.cl-week.day{min-width:0}
.cl-ad{display:flex;flex-direction:column;gap:2px;padding:3px;border-left:1px solid var(--border);border-bottom:1px solid var(--border);min-height:28px;min-width:0}
.cl-tl{font-size:11px;color:var(--muted-fg);text-align:right;padding:2px 6px 0 0;height:44px;font-variant-numeric:tabular-nums}
.cl-col{position:relative;border-left:1px solid var(--border);min-width:0}
.cl-col.today{background:var(--bg)}
.cl-hr{height:44px;border-bottom:1px solid var(--border)}
.cl-col .cl-ev{position:absolute;left:3px;right:3px;width:auto;white-space:normal}
.cl-col .cl-ev small{display:block;opacity:.85;font-variant-numeric:tabular-nums}
.cl-side{border-left:1px solid var(--border);padding:14px 16px;background:var(--bg);min-width:0}
.cl-side h3{margin:0 0 4px;font-size:15px}
.cl-side .when{font-size:12.5px;color:var(--muted-fg);margin:0 0 10px}
.cl-ag{display:flex;flex-direction:column;gap:5px;margin:8px 0 16px}
.cl-ag .cl-ev{white-space:normal;font-size:12.5px;padding:4px 8px}
.cl-side form{display:grid;gap:8px}
.cl-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media (max-width:860px){
  .ml-wrap{grid-template-columns:minmax(0,1fr);height:auto;min-height:0}
  .ml-wrap.reading .ml-list{display:none}
  .ml-wrap:not(.reading) .ml-read{display:none}
  .ml-items{max-height:none}
  .ml-back{display:inline-flex}
  .cl-wrap{grid-template-columns:minmax(0,1fr)}
  .cl-side{border-left:0;border-top:1px solid var(--border)}
}
`);
ICON_PATHS.mail = '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>';
ICON_PATHS.send = '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>';
ICON_PATHS.pencil = '<path d="M16 3l5 5L8 21H3v-5z"/>';
ICON_PATHS.archive = '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/>';
ICON_PATHS.trash = '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>';
ICON_PATHS.ban = '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>';
ICON_PATHS.calmonth = '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>';
ICON_PATHS.calweek = '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 10v11M15 10v11"/>';
ICON_PATHS.calday = '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 15h8"/>';

const ML_FOLDERS = [["inbox", "Inbox", "inbox"], ["sent", "Sent", "send"], ["drafts", "Drafts", "pencil"], ["archive", "Archive", "archive"], ["deleted", "Deleted", "trash"], ["junk", "Junk", "ban"]];
const CL_MODES = [["month", "Month", "calmonth"], ["week", "Week", "calweek"], ["day", "Day", "calday"]];
{
  const mail = { key: "mail", label: "Email", tabs: ML_FOLDERS.map(([k, l]) => ({ href: `/mail/${k}`, label: l })) };
  const cal = { key: "calendar", label: "Calendar", tabs: CL_MODES.map(([k, l]) => ({ href: `/calendar/${k}`, label: l })) };
  for (const s of [mail, cal]) { SECTIONS.push(s); SECTION_BY_KEY[s.key] = s; }
}

/* ---- per-person demo store: folder moves, read flags, composed mail, own events ---- */
const mlKey = () => `demo-mail-v1:${A.user.id}`;
function mlStore() {
  if (UI.mlStore && UI.mlStore._k === mlKey()) return UI.mlStore;
  let v = null; try { v = JSON.parse(localStorage.getItem(mlKey()) || "null"); } catch { v = null; }
  UI.mlStore = Object.assign({ f: {}, r: {}, x: [], ev: [], hid: [] }, v || {}, { _k: mlKey() });
  return UI.mlStore;
}
function mlSave() { const s = mlStore(); try { const { _k, ...rest } = s; localStorage.setItem(_k, JSON.stringify(rest)); } catch { /* private window: keep it for this visit */ } }
const mlMe = () => ({ name: A.user.displayName, addr: (A.employee?.workEmail || A.user.email || `${A.user.displayName.toLowerCase().replace(/[^a-z]+/g, ".")}@demo.example`) });
const mlIso = (days, hm) => `${addDays(todayStr(), -days)}T${hm}:00`;

/** the platform's own emails to this person, then sample mail for the other folders */
function mlBase() {
  const me = mlMe(), first = me.name.split(" ")[0];
  const erp = S.emails.filter((e) => e.userId === A.user.id).map((e) => {
    const lines = String(e.bodyText || "").split("\n");
    return { id: `erp:${e.id}`, folder: "inbox", from: "Demo Notifications", addr: "notifications@demo.example", to: `${e.toName || me.name} <${e.toEmail || me.addr}>`, subj: String(e.subject || "").replace(/^\[[^\]]+\]\s*/, ""), lines, at: e.createdAt, attach: e.attachments || [], erp: true, read: e.createdAt.slice(0, 10) < addDays(todayStr(), -2) };
  });
  const s = (id, folder, from, addr, subj, days, hm, body, o = {}) => ({ id, folder, from, addr, to: o.to || `${me.name} <${me.addr}>`, subj, lines: body.split("\n"), at: mlIso(days, hm), attach: o.attach || [], read: o.read ?? true });
  return [...erp,
    s("s1", "inbox", "Payroll", "payroll@demo.example", "Timesheets due Thursday", 0, "08:30", `Hi ${first},\n\nThe pay period has closed. Please submit your timesheet by Thursday at noon.\nBanked overtime is credited at 1.5× when you submit.\n\nPayroll team`, { read: false }),
    s("s2", "inbox", "Island Hardware Co-op", "accounts@islandhardware.example", "Invoice INV-55821", 1, "11:02", "Good morning,\n\nPlease find attached invoice INV-55821 for chainsaw chains and files.\nAmount due: $1,612.40 · Terms: Net 30\n\nThank you for your business.", { read: false, attach: [{ name: "INV-55821.pdf" }] }),
    s("s3", "inbox", "Demo IT", "it@demo.example", "Planned maintenance on Saturday", 3, "10:05", "The platform will be offline on Saturday from 07:00 to 09:00 for updates.\nNo action needed.\n\nIT"),
    s("s4", "inbox", "Finance Team", "finance@demo.example", "Q3 budget review — agenda", 2, "16:44", "Hello all,\n\nAgenda for the budget review:\n1. Q3 actuals vs budget\n2. Travel spend by department\n3. Purchase orders still open\n\nFinance", { attach: [{ name: "Q3_Summary.pdf" }] }),
    s("s5", "sent", me.name, me.addr, "Re: Board package", 1, "13:15", "Hi team,\n\nI've added my section to the board package. Let me know if anything is missing.\n\n" + first, { to: "Board Secretary <board@demo.example>" }),
    s("s6", "sent", me.name, me.addr, "Out of office next week", 4, "09:40", "Hi,\n\nA reminder that I'm away two days next week. My approvals go to the next person up while I'm out.\n\n" + first, { to: "My Team <team@demo.example>" }),
    s("s7", "drafts", me.name, me.addr, "Month-end checklist", 2, "18:02", "Team,\n\nHere's the checklist for the month-end close:\n- Bank reconciliations\n- Accruals\n- ", { to: "Finance Team <finance@demo.example>" }),
    s("s8", "archive", "North Coast Fuel", "billing@ncfuel.example", "Statement for last month", 9, "07:55", "Your statement is attached. Balance: $0.00.", { attach: [{ name: "Statement.pdf" }] }),
    s("s9", "deleted", "Office Deals", "news@example.org", "This week's office deals", 6, "06:00", "Sample promotional newsletter."),
    s("s10", "junk", "Prize Desk", "winner@prizes.example", "You have won a free cruise!!!", 3, "03:14", "Click here to claim your prize. (Sample junk mail.)", { read: false }),
  ];
}
function mlAll() {
  const st = mlStore();
  return [...mlBase(), ...st.x].map((m) => ({ ...m, folder: st.f[m.id] || m.folder, read: st.r[m.id] ?? m.read }));
}
const mlUnread = () => mlAll().filter((m) => m.folder === "inbox" && !m.read).length;
const mlWhen = (iso) => (iso.slice(0, 10) === todayStr() ? iso.slice(11, 16) : dShort(iso.slice(0, 10)));

function vMail(q, folder = "inbox") {
  const F = ML_FOLDERS.find((f) => f[0] === folder) || ML_FOLDERS[0]; folder = F[0];
  UI.ml = UI.ml || {};
  if (UI.ml.folder !== folder) { UI.ml = { folder, q: "", sel: null, comp: null }; }
  const M = UI.ml, find = M.q.trim().toLowerCase();
  const list = mlAll().filter((m) => m.folder === folder && (!find || `${m.from} ${m.to} ${m.subj} ${m.lines.join(" ")}`.toLowerCase().includes(find))).sort((a, b) => (a.at < b.at ? 1 : -1));
  const sel = list.find((m) => m.id === M.sel);
  const outbound = folder === "sent" || folder === "drafts";
  const items = list.length ? list.map((m) => `<button type="button" class="ml-li ${m.read ? "" : "unread"} ${sel && m.id === sel.id ? "on" : ""}" data-a="mlPick" data-id="${esc(m.id)}"><span class="r1"><span>${esc(outbound ? "To: " + m.to.replace(/\s*<.*$/, "") : m.from)}</span><span>${m.attach.length ? "📎 " : ""}${esc(mlWhen(m.at))}</span></span><span class="sj">${esc(m.subj || "(no subject)")}</span><span class="pv">${esc(m.lines.filter((l) => l.trim() && !/^Hi |^Open it here:/.test(l)).join(" ").slice(0, 110))}</span></button>`).join("")
    : `<div style="padding:24px 16px">${empty(find ? "No mail matches your search" : `${F[1]} is empty`, "")}</div>`;
  let pane;
  if (M.comp) pane = mlCompose(M.comp);
  else if (sel) {
    const body = sel.lines.map((l) => { const g = /^Open it here:\s*(\S+)/.exec(l); return g ? `<p><button type="button" class="btn sm pri" data-a="mlGo" data-go2="${esc(g[1])}">Open it in Demo</button></p>` : l.trim() ? `<p>${esc(l)}</p>` : ""; }).join("");
    const att = sel.attach.length ? `<div class="fb-att">${sel.attach.map((x) => `<button type="button" ${x.rcId ? `data-a="rcPoPdf" data-id="${esc(x.rcId)}"` : `data-a="mlAttach"`} title="${esc(x.name)}"><span class="ic">PDF</span><span><b style="display:block;font-size:13px">${esc(x.name)}</b><span class="hint">PDF document${x.rcId ? " · download" : " · sample"}</span></span></button>`).join("")}</div>` : "";
    const btn = (a, l, pri) => `<button type="button" class="btn sm ${pri ? "pri" : ""}" data-a="${a}" data-id="${esc(sel.id)}">${l}</button>`;
    const acts = folder === "drafts" ? btn("mlEdit", "Edit draft", 1) + btn("mlMove", "Delete").replace('data-a="mlMove"', 'data-a="mlMove" data-to="deleted"')
      : [btn("mlReply", "Reply", 1), btn("mlFwd", "Forward"),
        ...(folder === "deleted" || folder === "junk" || folder === "archive" ? [`<button type="button" class="btn sm" data-a="mlMove" data-to="inbox" data-id="${esc(sel.id)}">Move to Inbox</button>`] : []),
        ...(folder !== "archive" && folder !== "deleted" && folder !== "junk" ? [`<button type="button" class="btn sm" data-a="mlMove" data-to="archive" data-id="${esc(sel.id)}">Archive</button>`] : []),
        ...(folder !== "deleted" ? [`<button type="button" class="btn sm" data-a="mlMove" data-to="deleted" data-id="${esc(sel.id)}">Delete</button>`] : []),
        ...(folder === "inbox" ? [`<button type="button" class="btn sm" data-a="mlMove" data-to="junk" data-id="${esc(sel.id)}">Junk</button>`, btn("mlUnread", "Mark unread")] : [])].join("");
    pane = `<button type="button" class="btn sm ml-back" data-a="mlBack">← ${esc(F[1])}</button>
      <h3>${esc(sel.subj || "(no subject)")}</h3>
      <div style="display:flex;gap:10px;align-items:flex-start;margin:0 0 12px"><span class="fb-av" aria-hidden="true">${esc(initials(sel.from).toUpperCase() || "?")}</span><dl class="fb-hdr" style="flex:1;border:0;padding:0;margin:0"><dt>From</dt><dd><b>${esc(sel.from)}</b> &lt;${esc(sel.addr)}&gt;</dd><dt>To</dt><dd>${esc(sel.to)}</dd><dt>Sent</dt><dd>${esc(dLong(sel.at.slice(0, 10)))} ${esc(sel.at.slice(11, 16))}</dd></dl></div>
      <div class="ml-acts">${acts}</div>${att}<div class="ml-body" style="border-top:1px solid var(--border);padding-top:12px">${body}</div>
      ${folder === "deleted" ? `<p class="hint" style="margin-top:14px">Deleted mail stays in this folder. Move it back to the inbox at any time.</p>` : ""}`;
  } else pane = empty("Select a message to read it", "");
  return ph(F[1], "", `<button class="btn pri" data-a="mlNew">New mail</button>`)
    + `<div class="ml-wrap ${sel || M.comp ? "reading" : ""}"><section class="ml-list"><div class="ml-lh"><input class="in" type="search" id="mlQ" placeholder="Search ${esc(F[1].toLowerCase())}" value="${esc(M.q)}" aria-label="Search mail"></div><div class="ml-items" role="listbox" aria-label="Messages">${items}</div></section><section class="ml-read">${pane}</section></div>
    <p class="hint ml-note">Demo: sample mail and the platform's own emails to you. In production this is your Microsoft 365 mailbox; nothing here is sent anywhere.</p>`;
}
function mlCompose(c) {
  const people = [...S.users].filter((u) => u.isActive !== false).map((u) => { const e = u.employeeId ? byId(S.employees, u.employeeId) : null; return `${u.displayName} <${e?.workEmail || u.email || ""}>`; });
  return `<button type="button" class="btn sm ml-back" data-a="mlCancel">← Back</button><h3>${c.draftId ? "Edit draft" : "New message"}</h3>
    <form class="ml-comp" data-f="mlSend">
      <div class="fld"><label for="mlTo">To</label><input class="in" id="mlTo" name="to" list="mlPeople" value="${esc(c.to)}" placeholder="Start typing a name"><datalist id="mlPeople">${people.map((p) => `<option value="${esc(p)}">`).join("")}</datalist></div>
      <div class="fld"><label for="mlSub">Subject</label><input class="in" id="mlSub" name="subj" value="${esc(c.subj)}"></div>
      <div class="fld"><label for="mlBody">Message</label><textarea class="in" id="mlBody" name="body">${esc(c.body)}</textarea></div>
      <div class="ml-acts"><button class="btn pri" type="submit">Send</button><button class="btn" type="button" data-a="mlDraft">Save draft</button><button class="btn" type="button" data-a="mlCancel">Discard</button></div>
    </form>`;
}
function mlFinish(folder) {
  const v = (id) => document.getElementById(id)?.value ?? "";
  const to = v("mlTo").trim(), subj = v("mlSub").trim(), body = v("mlBody");
  if (folder === "sent" && !to) { toast("Add who the message is to", "", "err"); document.getElementById("mlTo")?.focus(); return; }
  const st = mlStore(), c = UI.ml.comp, me = mlMe();
  if (c.draftId) { st.f[c.draftId] = "deleted"; st.x = st.x.filter((m) => m.id !== c.draftId); }
  const n = new Date();
  st.x.push({ id: `x${Date.now()}`, folder, from: me.name, addr: me.addr, to: to || "(no recipient)", subj, lines: body.split("\n"), at: `${todayStr()}T${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}:00`, attach: [], read: true });
  mlSave(); UI.ml.comp = null; UI.ml.sel = null;
  if (folder === "sent") toast("Sent", "Kept in your Sent folder. In this demo nothing is emailed."); else toast("Saved to Drafts");
  safeRender();
}

/* ---------------- Calendar ---------------- */
const CL_K = { meet: "Meetings", leave: "Time off", holiday: "Stat holidays", payday: "Paydays", other: "Company events" };
const clMon = (s) => { const d = D(s); const k = (d.getUTCDay() + 6) % 7; return addDays(s, -k); };
const clDow = (s) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][D(s).getUTCDay()];
function clEvents(from, to) {
  const st = mlStore(), out = [], seen = new Set(), e = A.employee;
  const add = (x) => { const k = `${x.date}|${x.title}|${x.start || ""}`; if (seen.has(k) || st.hid.includes(x.id)) return; seen.add(k); if ((x.end || x.date) >= from && x.date <= to) out.push(x); };
  for (const h of S.statHolidays || []) add({ id: `h:${h.id || h.date}`, kind: "holiday", title: h.name, date: h.date, note: "Stat holiday · office closed", fixed: true });
  for (const r of S.payrollRuns || []) if (r.status !== "CANCELLED" && (!e || r.companyId === e.companyId) && r.payDate) add({ id: `p:${r.id}`, kind: "payday", title: "Payday", date: r.payDate, note: `Pay period ending ${dLong(r.periodEnd)}`, fixed: true });
  if (e) for (const l of S.leaveRequests || []) {
    if (!["APPROVED", "PENDING_APPROVAL"].includes(l.status)) continue;
    const who = byId(S.employees, l.employeeId); if (!who || (l.employeeId !== e.id && (who.departmentId !== e.departmentId || l.status !== "APPROVED"))) continue;
    add({ id: `l:${l.id}`, kind: "leave", title: l.employeeId === e.id ? `My time off${l.status === "APPROVED" ? "" : " (waiting)"}` : `${who.firstName} ${who.lastName} away`, date: l.startDate, end: l.endDate, note: l.status === "APPROVED" ? "Approved time off" : "Waiting for approval", fixed: true });
  }
  try { for (const x of upcomingEventsA(365)) if (!["holiday", "payday", "timeoff"].includes(x.k)) add({ id: `u:${x.at}:${x.t}`, kind: "other", title: x.t, date: x.at, note: x.d, fixed: true }); } catch { /* no events for this person */ }
  // a weekly stand-up and a monthly planning meeting, plus the person's own meetings
  for (let d = clMon(from); d <= to; d = addDays(d, 7)) { add({ id: `m:su:${d}`, kind: "meet", title: "Team stand-up", date: addDays(d, 1), start: "09:00", finish: "09:30", where: "Teams" }); add({ id: `m:su2:${d}`, kind: "meet", title: "Team stand-up", date: addDays(d, 3), start: "09:00", finish: "09:30", where: "Teams" }); }
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = addDays(m + "-28", 7).slice(0, 7)) { let d = m + "-01"; while (clDow(d) !== "Wed") d = addDays(d, 1); add({ id: `m:pl:${m}`, kind: "meet", title: "Monthly planning", date: addDays(d, 7), start: "13:30", finish: "15:00", where: "Boardroom" }); }
  for (const x of st.ev) add(x);
  return out.sort((a, b) => (a.date + (a.start || "00")).localeCompare(b.date + (b.start || "00")));
}
const clOn = (list, d) => list.filter((x) => d >= x.date && d <= (x.end || x.date));
const clLabel = (x) => `${x.start ? x.start + " " : ""}${x.title}`;
function vCalendar(q, mode = "month") {
  if (!CL_MODES.some((m) => m[0] === mode)) mode = "month";
  UI.cl = UI.cl || { cur: todayStr(), pick: todayStr(), ev: null };
  const C = UI.cl, cur = C.cur, t0 = todayStr();
  let title, grid, list;
  const evBtn = (x, extra = "", style = "") => `<button type="button" class="cl-ev k-${x.kind}" data-a="clEv" data-id="${esc(x.id)}" data-d="${x.date}" title="${esc(clLabel(x))}"${style ? ` style="${style}"` : ""}>${extra || esc(clLabel(x))}</button>`;
  if (mode === "month") {
    const first = cur.slice(0, 8) + "01", start = clMon(first);
    const n = addDays(start, 35).slice(0, 7) === first.slice(0, 7) ? 42 : 35;
    list = clEvents(start, addDays(start, n - 1));
    title = `${MON_LONG[D(first).getUTCMonth()]} ${first.slice(0, 4)}`;
    let cells = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="cl-dow">${d}</div>`).join("");
    for (let i = 0; i < n; i++) {
      const d = addDays(start, i), evs = clOn(list, d);
      cells += `<div class="cl-cell ${d.slice(0, 7) !== first.slice(0, 7) ? "out" : ""} ${d === t0 ? "today" : ""} ${d === C.pick ? "sel" : ""}" data-a="clPick" data-d="${d}"><span class="cl-num">${Number(d.slice(8))}</span>${evs.slice(0, 3).map((x) => evBtn(x)).join("")}${evs.length > 3 ? `<span class="cl-more">+${evs.length - 3} more</span>` : ""}</div>`;
    }
    grid = `<div class="cl-month">${cells}</div>`;
  } else {
    const days = mode === "week" ? [...Array(7)].map((_, i) => addDays(clMon(cur), i)) : [cur];
    list = clEvents(days[0], days[days.length - 1]);
    title = mode === "week" ? `${dShort(days[0])} – ${dLong(days[6])}` : `${clDow(cur)}, ${dLong(cur)}`;
    const H0 = 8, H1 = 18, PX = 44, cols = `56px repeat(${days.length},minmax(0,1fr))`;
    const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const head = `<div></div>${days.map((d) => `<div class="cl-dow" style="border-left:1px solid var(--border)">${clDow(d)} ${Number(d.slice(8))}</div>`).join("")}`;
    const allday = `<div class="cl-tl" style="height:auto;padding-top:6px">all day</div>${days.map((d) => `<div class="cl-ad">${clOn(list, d).filter((x) => !x.start).map((x) => evBtn(x)).join("")}</div>`).join("")}`;
    const hours = `<div>${[...Array(H1 - H0)].map((_, i) => `<div class="cl-tl">${String(H0 + i).padStart(2, "0")}:00</div>`).join("")}</div>`;
    const colsHtml = days.map((d) => `<div class="cl-col ${d === t0 ? "today" : ""}">${[...Array(H1 - H0)].map(() => `<div class="cl-hr"></div>`).join("")}${clOn(list, d).filter((x) => x.start).map((x) => {
      const top = Math.max(0, (toMin(x.start) - H0 * 60) / 60 * PX), h = Math.max(22, (toMin(x.finish || x.start) - toMin(x.start)) / 60 * PX - 2);
      return evBtn(x, `${esc(x.title)}${h >= 40 ? `<small>${x.start}–${x.finish}</small>` : ""}`, `top:${top}px;height:${h}px`);
    }).join("")}</div>`).join("");
    grid = `<div class="cl-week ${mode === "day" ? "day" : ""}" style="grid-template-columns:${cols}">${head}${allday}${hours}${colsHtml}</div>`;
  }
  const ev = C.ev ? clEvents(addDays(C.pick, -40), addDays(C.pick, 40)).find((x) => x.id === C.ev) : null;
  const pickList = clOn(clEvents(C.pick, C.pick), C.pick);
  const side = ev ? `<h3>${esc(ev.title)}</h3><p class="when">${esc(CL_K[ev.kind])} · ${esc(dLong(ev.date))}${ev.end && ev.end !== ev.date ? " – " + esc(dLong(ev.end)) : ""} · ${ev.start ? `${ev.start}–${ev.finish}` : "All day"}</p>
      ${ev.where ? `<p style="margin:0 0 6px">Where: ${esc(ev.where)}</p>` : ""}${ev.note ? `<p style="margin:0 0 6px">${esc(ev.note)}</p>` : ""}
      <div class="ml-acts" style="margin-top:12px">${ev.fixed ? `<span class="hint">Comes from the platform; change it where it was made.</span>` : `<button type="button" class="btn sm" data-a="clDel" data-id="${esc(ev.id)}">Remove from my calendar</button>`}<button type="button" class="btn sm" data-a="clClose">Close</button></div>`
    : `<h3>${esc(clDow(C.pick))}, ${esc(dLong(C.pick))}</h3>
      <div class="cl-ag">${pickList.map((x) => evBtn(x, esc(clLabel(x)) + (x.where ? ` · ${esc(x.where)}` : ""))).join("") || `<span class="hint">Nothing scheduled.</span>`}</div>
      <h3>New meeting</h3>
      <form data-f="clAdd"><div class="fld"><label for="clT">Title</label><input class="in" id="clT" name="title" required placeholder="e.g. Budget check-in"></div>
        <div class="fld"><label for="clD">Date</label><input class="in" type="date" id="clD" name="date" value="${C.pick}" required></div>
        <div class="cl-row2"><div class="fld"><label for="clS">Start</label><input class="in" type="time" id="clS" name="start" value="10:00" required></div><div class="fld"><label for="clE">End</label><input class="in" type="time" id="clE" name="finish" value="11:00" required></div></div>
        <div class="fld"><label for="clW">Where</label><input class="in" id="clW" name="where" placeholder="Teams, room or phone"></div>
        <button class="btn pri" type="submit">Add to calendar</button></form>`;
  const legend = Object.entries(CL_K).map(([k, l]) => `<span><i class="cl-ev k-${k}" style="padding:0;width:10px;height:10px;background:currentColor"></i>${esc(l)}</span>`).join("");
  return ph("Calendar", "")
    + `<div class="cl-head"><button class="btn sm" data-a="clNav" data-k="0">Today</button><button class="btn sm" data-a="clNav" data-k="-1" aria-label="Previous">‹</button><button class="btn sm" data-a="clNav" data-k="1" aria-label="Next">›</button><h2>${esc(title)}</h2>
      <div class="cl-seg">${CL_MODES.map(([k, l]) => `<button type="button" data-go="/calendar/${k}" data-sec="calendar" class="${k === mode ? "on" : ""}">${l}</button>`).join("")}</div></div>
    <div class="cl-leg">${legend}</div>
    <div class="cl-wrap"><div class="cl-main">${grid}</div><aside class="cl-side">${side}</aside></div>
    <p class="hint ml-note">Demo: the platform's own dates plus sample meetings. In production this is your Outlook calendar from Microsoft 365.</p>`;
}
const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

hr3Route("/mail", null, (q) => vMail(q, "inbox"));
hr3Route("/mail/:folder", null, vMail);
hr3Route("/calendar", null, (q) => vCalendar(q, "month"));
hr3Route("/calendar/:mode", null, vCalendar);

/* ---- sidebar: Email and Calendar under Home and Approvals, with their submenus open while you are in them ---- */
{
  const _buildNavMl = buildNav;
  buildNav = function () {
    const groups = _buildNavMl();
    const home = groups.find((g) => g.label === "Home") || (groups.unshift({ label: "Home", flat: true, items: [] }), groups[0]);
    home.items.push({ title: "Email", href: "/mail/inbox", icon: "mail", section: "mail", badge: navSafe(mlUnread) }, { title: "Calendar", href: "/calendar/month", icon: "calendar", section: "calendar", badge: 0 });
    return groups;
  };
  const _sidebarMl = sidebar;
  sidebar = function (path) {
    let h = _sidebarMl(path);
    const sub = (key, rows) => {
      const at = h.search(new RegExp(`<button class="item[^"]*" data-go="[^"]*" data-sec="${key}"`)); if (at < 0) return;
      const end = h.indexOf("</button>", at) + 9;
      const html = `<div class="subs">${rows.map(([href, label, ic, n]) => `<button class="item ${path === href ? "on" : ""}" data-go="${href}" data-sec="${key}"${path === href ? ' aria-current="page"' : ""}>${icon(ic)}<span>${esc(label)}</span>${n ? `<span class="bdg">${n}</span>` : ""}</button>`).join("")}</div>`;
      h = h.slice(0, end) + html + h.slice(end);
    };
    if (/^\/mail(\/|$)/.test(path)) { const all = mlAll(); sub("mail", ML_FOLDERS.map(([k, l, ic]) => [`/mail/${k}`, l, ic, k === "drafts" ? all.filter((m) => m.folder === "drafts").length : all.filter((m) => m.folder === k && !m.read).length])); }
    if (/^\/calendar(\/|$)/.test(path)) sub("calendar", CL_MODES.map(([k, l, ic]) => [`/calendar/${k}`, l, ic, 0]));
    return h;
  };
  // the submenus live in the sidebar, so these two pages skip the tab bar
  const _tabsMl = sectionTabsHtml;
  sectionTabsHtml = function (path) { return /^\/(mail|calendar)(\/|$)/.test(path) ? "" : _tabsMl(path); };
  // search keeps the cursor where you are typing
  document.addEventListener("input", (ev) => { if (ev.target.id === "mlQ") { UI.ml.q = ev.target.value; UI.ml.sel = null; safeRenderKeepFocus(ev.target); } });
}

window.ACTIONS_EXT.push({
  mlPick(el) { const st = mlStore(); st.r[el.dataset.id] = true; mlSave(); UI.ml.sel = el.dataset.id; UI.ml.comp = null; safeRender(); },
  mlBack() { UI.ml.sel = null; safeRender(); },
  mlGo(el) { go(el.dataset.go2); },
  mlAttach() { toast("Sample attachment", "In production this opens the file from the email."); },
  mlNew() { UI.ml.comp = { to: "", subj: "", body: "" }; UI.ml.sel = null; safeRender(); },
  mlCancel() { UI.ml.comp = null; safeRender(); },
  mlDraft() { mlFinish("drafts"); },
  mlMove(el) { const st = mlStore(); st.f[el.dataset.id] = el.dataset.to; mlSave(); UI.ml.sel = null; toast(`Moved to ${ML_FOLDERS.find((f) => f[0] === el.dataset.to)[1]}`); safeRender(); },
  mlUnread(el) { const st = mlStore(); st.r[el.dataset.id] = false; mlSave(); UI.ml.sel = null; safeRender(); },
  mlReply(el) { const m = mlAll().find((x) => x.id === el.dataset.id); UI.ml.comp = { to: `${m.from} <${m.addr}>`, subj: /^re:/i.test(m.subj) ? m.subj : `Re: ${m.subj}`, body: `\n\n— On ${dLong(m.at.slice(0, 10))}, ${m.from} wrote:\n${m.lines.join("\n")}` }; safeRender(); },
  mlFwd(el) { const m = mlAll().find((x) => x.id === el.dataset.id); UI.ml.comp = { to: "", subj: `Fw: ${m.subj}`, body: `\n\n— Forwarded message from ${m.from}:\n${m.lines.join("\n")}` }; safeRender(); },
  mlEdit(el) { const m = mlAll().find((x) => x.id === el.dataset.id); UI.ml.comp = { to: m.to, subj: m.subj, body: m.lines.join("\n"), draftId: m.id }; safeRender(); },
  clPick(el, ev) { if (ev?.target.closest(".cl-ev")) return; UI.cl.pick = el.dataset.d; UI.cl.ev = null; safeRender(); },
  clEv(el) { UI.cl.ev = el.dataset.id; UI.cl.pick = el.dataset.d; safeRender(); },
  clClose() { UI.cl.ev = null; safeRender(); },
  clDel(el) { const st = mlStore(); if (st.ev.some((x) => x.id === el.dataset.id)) st.ev = st.ev.filter((x) => x.id !== el.dataset.id); else st.hid.push(el.dataset.id); mlSave(); UI.cl.ev = null; toast("Removed from your calendar"); safeRender(); },
  clNav(el) {
    const k = Number(el.dataset.k), C = UI.cl, mode = (parseRoute(UI.route).path.split("/")[2]) || "month";
    if (!k) { C.cur = todayStr(); C.pick = todayStr(); }
    else if (mode === "month") { const d = D(C.cur.slice(0, 8) + "01"); d.setUTCMonth(d.getUTCMonth() + k); C.cur = ymd(d); }
    else { C.cur = addDays(C.cur, k * (mode === "week" ? 7 : 1)); if (mode === "day") C.pick = C.cur; }
    C.ev = null; safeRender();
  },
});
window.FORMS_EXT.push({
  mlSend() { mlFinish("sent"); },
  clAdd(f) {
    const v = (n) => f.elements[n].value.trim();
    if (!v("title")) { toast("Give the meeting a title", "", "err"); return; }
    if (v("finish") <= v("start")) { toast("End time must be after the start time", "", "err"); return; }
    const st = mlStore(); st.ev.push({ id: `my:${Date.now()}`, kind: "meet", title: v("title"), date: v("date"), start: v("start"), finish: v("finish"), where: v("where") }); mlSave();
    UI.cl.pick = v("date"); UI.cl.cur = v("date"); UI.cl.ev = null; toast("Added to your calendar"); safeRender();
  },
});
