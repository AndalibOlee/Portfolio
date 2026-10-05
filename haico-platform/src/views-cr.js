/* ==========================================================================
   views-cr.js — "Request a change": on any page of the demo, write what
   should change (optionally pointing at the exact thing), and it lands in a
   shared list Claude reads. "Send to Claude to build" posts one comment that
   brings Claude in. Demo-only: it lights up only inside the claude.ai viewer
   (db capability); everywhere else nothing is shown.
   ========================================================================== */
injectCss(`
.cr-fab{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:85;display:inline-flex;align-items:center;gap:8px;writing-mode:vertical-rl;padding:14px 9px;border-radius:10px 0 0 10px;border:1px solid var(--primary);border-right:0;background:var(--primary);color:var(--primary-fg);font:600 13px/1 var(--font, inherit);box-shadow:var(--shadow);cursor:pointer}
.cr-fab:focus-visible,.cr-panel button:focus-visible,.cr-panel textarea:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.cr-fab .cr-n{writing-mode:horizontal-tb;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--primary-fg);color:var(--primary);display:inline-grid;place-items:center;font-size:11.5px}
.cr-panel{position:fixed;top:0;right:0;bottom:0;z-index:90;width:min(420px,100vw);background:var(--card);color:var(--fg);border-left:1px solid var(--border);box-shadow:var(--shadow);display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
.cr-head{display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:1px solid var(--border)}
.cr-head h2{font-size:16px;margin:0;flex:1}
.cr-x{border:0;background:transparent;color:var(--muted-fg);font-size:20px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px}
.cr-tabs{display:flex;gap:6px;padding:10px 16px 0}
.cr-tabs button{border:1px solid var(--border);background:transparent;color:var(--fg);border-radius:999px;padding:6px 12px;font:600 12.5px/1 var(--font, inherit);cursor:pointer}
.cr-tabs button.on{background:var(--fg);color:var(--card);border-color:var(--fg)}
.cr-body{flex:1;overflow-y:auto;padding:12px 16px 16px;display:grid;gap:12px;align-content:start}
.cr-ctx{font-size:12.5px;color:var(--muted-fg);line-height:1.5}
.cr-ctx b{color:var(--fg)}
.cr-form{display:grid;gap:8px;border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--bg)}
.cr-form label{font-weight:600;font-size:13px}
.cr-form textarea{width:100%;min-height:86px;resize:vertical;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font:14px/1.45 var(--font, inherit);background:var(--card);color:var(--fg);box-sizing:border-box}
.cr-chips{display:flex;flex-wrap:wrap;gap:6px}
.cr-chips button{border:1px solid var(--border);background:var(--card);color:var(--fg);border-radius:999px;padding:5px 10px;font-size:12.5px;cursor:pointer}
.cr-chips button.on{border-color:var(--primary);background:var(--primary);color:var(--primary-fg)}
.cr-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cr-btn{border:1px solid var(--border);background:var(--card);color:var(--fg);border-radius:8px;padding:8px 12px;font:600 13px/1 var(--font, inherit);cursor:pointer}
.cr-btn.pri{background:var(--primary);color:var(--primary-fg);border-color:var(--primary)}
.cr-btn:disabled{opacity:.55;cursor:not-allowed}
.cr-tgt{display:flex;gap:6px;align-items:center;font-size:12.5px;background:var(--card);border:1px dashed var(--primary);border-radius:8px;padding:6px 8px;min-width:0}
.cr-tgt span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cr-list{display:grid;gap:8px}
.cr-item{border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:grid;gap:6px;font-size:13.5px}
.cr-item p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.cr-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11.5px;color:var(--muted-fg)}
.cr-pill{border-radius:999px;padding:2px 8px;font-weight:600;font-size:11.5px;background:var(--muted);color:var(--fg)}
.cr-pill.new,.cr-pill.planned{background:var(--warn-bg);color:var(--warn)}.cr-pill.confirmed{background:var(--ok-bg);color:var(--ok)}.cr-pill.sent,.cr-pill.building{background:var(--accent);color:var(--fg)}.cr-pill.done{background:var(--ok-bg);color:var(--ok)}.cr-pill.question{background:var(--warn-bg);color:var(--warn)}
.cr-reply{border-left:3px solid var(--primary);padding:4px 0 4px 8px;font-size:13px;color:var(--fg)}
.cr-group{display:flex;justify-content:space-between;gap:8px;align-items:center;width:100%;text-align:left;border:1px solid var(--border);background:var(--card);color:var(--fg);border-radius:10px;padding:10px 12px;cursor:pointer;font-size:13.5px}
.cr-group small{color:var(--muted-fg)}
.cr-foot{border-top:1px solid var(--border);padding:12px 16px;display:grid;gap:6px}
.cr-foot p{margin:0;font-size:12.5px;color:var(--muted-fg)}
.cr-pick,.cr-pick *{cursor:crosshair!important}
.cr-hl{position:fixed;z-index:95;pointer-events:none;border:2px solid var(--primary);border-radius:6px;background:color-mix(in srgb, var(--primary) 12%, transparent);transition:all .06s}
.cr-pickbar{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:96;background:var(--fg);color:var(--card);border-radius:999px;padding:8px 14px;font-size:13px;box-shadow:var(--shadow);max-width:calc(100vw - 32px)}
@media (prefers-reduced-motion:reduce){.cr-hl{transition:none}}
`);
const CR = { db: null, user: null, comments: null, me: null, list: [], open: false, tab: "page", draft: { text: "", kind: "change", priority: "must", target: null }, editing: null, canSend: "off", msg: "" };
const CR_KINDS = [["change", "Change"], ["add", "Add"], ["remove", "Remove"], ["bug", "Fix a problem"], ["question", "Question"]];
const CR_STATUS = { new: "New", sent: "Sent for review", planned: "Waiting for your OK", confirmed: "Confirmed — to build", building: "Being built", done: "Done", question: "Claude has a question", wontdo: "Not doing" };
const crKey = () => { const p = parseRoute(UI.route || "/").path; const r = ROUTES.find((x) => x.re.test(p)); return r ? r.re.source : p; };
const crTitle = () => (document.querySelector(".content h1")?.innerText || document.title || "").trim().slice(0, 80);
const crOpenCount = (l) => l.filter((x) => !["done", "wontdo"].includes(x.status)).length;

/* ---------- start once the viewer answers; outside claude.ai nothing appears ---------- */
(async () => {
  if (!window.claude?.use) return;
  const db = await window.claude.use("db"); if (!db) return;
  CR.db = db; CR.user = await window.claude.use("user"); CR.comments = await window.claude.use("comments");
  try { CR.me = CR.user ? await CR.user.id() : null; } catch { CR.me = null; }
  const fab = document.createElement("button");
  fab.className = "cr-fab"; fab.type = "button"; fab.id = "crFab"; fab.setAttribute("aria-haspopup", "dialog");
  fab.addEventListener("click", () => crToggle(true));
  document.body.appendChild(fab);
  db.collection("changes").onSnapshot((snap) => { CR.list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); crRender(); }, () => {});
  crRender();
})();
/* keep the button beside the sidebar and the panel on the page being shown */
{
  const _afterRenderCr = afterRender;
  afterRender = function () { const r = _afterRenderCr.apply(this, arguments); try { crPlace(); if (CR.open) crRender(); } catch {} return r; };
}
window.addEventListener("resize", () => crPlace());
function crPlace() {
  const fab = document.getElementById("crFab"); if (!fab) return;
  fab.hidden = CR.open || !A;
  const here = CR.list.filter((x) => x.pageKey === crKey());
  fab.innerHTML = `<span aria-hidden="true">✎</span> Request a change${crOpenCount(here) ? ` <span class="cr-n" aria-label="${crOpenCount(here)} on this page">${crOpenCount(here)}</span>` : ""}`;
}
function crToggle(on) { CR.open = on; CR.msg = ""; if (on) crPermCheck(); if (on && CR.comments?.canSendToClaude) CR.comments.canSendToClaude().then((v) => { CR.canSend = v; crRender(); }).catch(() => { CR.canSend = "off"; crRender(); }); crRender(); if (on) setTimeout(() => document.getElementById("crText")?.focus(), 30); else document.getElementById("crFab")?.focus(); }

function crItem(x) {
  const mine = x.by && x.by === CR.me, editable = mine && x.status === "new";
  return `<div class="cr-item" data-cr-hover="${esc(x.target?.path || "")}"><div class="cr-meta"><span class="cr-pill ${esc(x.status)}">${esc(CR_STATUS[x.status] || x.status)}</span><span>${esc((CR_KINDS.find((k) => k[0] === x.kind) || ["", "Change"])[1])}</span><span>· ${x.priority === "nice" ? "Nice to have" : "Must have"}</span>${x.as?.name ? `<span>· seen as ${esc(x.as.name)}</span>` : ""}</div>
    <p>${esc(x.text)}</p>${x.target ? `<div class="cr-meta">Points at: “${esc(x.target.label)}”${x.target.section ? ` in ${esc(x.target.section)}` : ""}</div>` : ""}
    ${x.reply ? `<div class="cr-reply"><b>Claude:</b> ${esc(x.reply)}</div>` : ""}
    <div class="cr-row"><button class="cr-btn" type="button" data-cr="show" data-id="${x.id}">${x.status === "done" ? "Show me the change" : "Show me the spot"}</button>${x.as?.userId && A && x.as.userId !== A.user.id ? `<span class="cr-meta">written as ${esc(x.as.name)} — sign in as them to see exactly what they saw</span>` : ""}</div>
    ${editable ? `<div class="cr-row"><button class="cr-btn" type="button" data-cr="edit" data-id="${x.id}">Edit</button><button class="cr-btn" type="button" data-cr="del" data-id="${x.id}">Delete</button></div>` : ""}</div>`;
}
function crRender() {
  crPlace();
  let p = document.getElementById("crPanel");
  if (!CR.open) { if (p) p.remove(); return; }
  const keepText = document.getElementById("crText")?.value; if (keepText != null) CR.draft.text = keepText;
  if (!p) { p = document.createElement("aside"); p.id = "crPanel"; p.className = "cr-panel"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Request a change"); p.setAttribute("data-uncommentable", ""); document.body.appendChild(p); }
  const key = crKey(), here = CR.list.filter((x) => x.pageKey === key), d = CR.draft;
  const fresh = CR.list.filter((x) => x.status === "new");
  const groups = [...CR.list.reduce((m, x) => { const g = m.get(x.pageKey) || { title: x.pageTitle, route: x.route, items: [] }; g.items.push(x); m.set(x.pageKey, g); return m; }, new Map()).values()];
  const who = A ? `${A.user.displayName}${A.roleCodes?.length ? ` · ${A.roleCodes.map((r) => r.toLowerCase().replace(/_/g, " ")).join(", ")}` : ""}` : "nobody signed in";
  const body = CR.tab === "page"
    ? `<div class="cr-ctx">Page: <b>${esc(crTitle() || "this page")}</b> <span class="mono">${esc(parseRoute(UI.route || "/").path)}</span><br>Viewing as <b>${esc(who)}</b></div>
      <form class="cr-form" id="crForm"><label for="crText">${CR.editing ? "Edit this change" : "What should change on this page?"}</label>
        <textarea id="crText" maxlength="2000" placeholder="e.g. Put the department above the expense code, and make Description required.">${esc(d.text)}</textarea>
        <div class="cr-chips" role="group" aria-label="Kind of change">${CR_KINDS.map(([k, l]) => `<button type="button" class="${d.kind === k ? "on" : ""}" aria-pressed="${d.kind === k}" data-cr="kind" data-v="${k}">${l}</button>`).join("")}</div>
        <div class="cr-chips" role="group" aria-label="How important">${[["must", "Must have"], ["nice", "Nice to have"]].map(([k, l]) => `<button type="button" class="${d.priority === k ? "on" : ""}" aria-pressed="${d.priority === k}" data-cr="prio" data-v="${k}">${l}</button>`).join("")}</div>
        ${d.target ? `<div class="cr-tgt"><span>Points at: “${esc(d.target.label)}”</span><button type="button" class="cr-x" data-cr="untarget" aria-label="Remove the pointer">✕</button></div>` : `<button type="button" class="cr-btn" data-cr="pick">Point at something on the page</button>`}
        <div class="cr-row"><button class="cr-btn pri" type="submit">${CR.editing ? "Save" : "Add to the list"}</button>${CR.editing ? `<button type="button" class="cr-btn" data-cr="cancel">Cancel</button>` : ""}</div></form>
      ${CR.msg ? `<div class="cr-ctx" role="status">${esc(CR.msg)}</div>` : ""}
      <div class="cr-list">${here.length ? here.map(crItem).join("") : `<p class="cr-ctx" style="margin:0">Nothing written for this page yet. Each note you add shows here with its progress.</p>`}</div>`
    : `<div class="cr-ctx">${CR.list.length} change${CR.list.length === 1 ? "" : "s"} written across ${groups.length} page${groups.length === 1 ? "" : "s"}. Open a page to see and add its notes.</div>
      <div class="cr-list">${groups.length ? groups.map((g) => `<button type="button" class="cr-group" data-cr="goto" data-route="${esc(g.route)}"><span>${esc(g.title || g.route)}<br><small class="mono">${esc(g.route)}</small></span><small>${crOpenCount(g.items)} open · ${g.items.length - crOpenCount(g.items)} done</small></button>${g.items.slice().sort((x, y) => (x.status === "done") - (y.status === "done")).map(crItem).join("")}`).join("") : `<p class="cr-ctx" style="margin:0">No changes written yet. Open any page and press Request a change.</p>`}</div>`
  const sendNote = CR.canSend === "available" ? "Claude shows you each page’s requests next to the planned change. Nothing is built until you confirm." : CR.canSend === "writers_only" ? "Only the owner of this demo can send the list to Claude." : "Sending from this page isn't available right now. In the chat, say “build my changes” and Claude reads the same list.";
  p.innerHTML = `<div class="cr-head"><h2>Changes to make</h2><button type="button" class="cr-x" data-cr="close" aria-label="Close">✕</button></div>
    <div class="cr-tabs" role="tablist"><button type="button" role="tab" aria-selected="${CR.tab === "page"}" class="${CR.tab === "page" ? "on" : ""}" data-cr="tab" data-v="page">This page (${here.length})</button><button type="button" role="tab" aria-selected="${CR.tab === "all"}" class="${CR.tab === "all" ? "on" : ""}" data-cr="tab" data-v="all">All pages (${crOpenCount(CR.list)} open)</button></div>
    <div class="cr-body">${body}</div>
    <div class="cr-foot">${CR.perm === "denied" ? `<div class="cr-ctx" role="status">Sending is switched off because “Don’t allow” was chosen. Your notes are still saved. <button type="button" class="cr-btn" data-cr="perm">Turn sending back on</button></div>` : ""}<button type="button" class="cr-btn pri" data-cr="send" ${fresh.length && CR.canSend === "available" ? "" : "disabled"}>Send ${fresh.length || ""} new change${fresh.length === 1 ? "" : "s"} to Claude for review</button><p>${esc(sendNote)}</p></div>`;
  const ta = document.getElementById("crText"); if (ta && document.activeElement !== ta && keepText != null) { ta.value = CR.draft.text; }
}

/* a "Don't allow" on the comments prompt only blocks sending — notes still save. The viewer can turn it back on here. */
async function crPermCheck() {
  try { const pm = await window.claude.use("permissions"); CR.perm = pm ? await pm.state("comments") : null; } catch { CR.perm = null; }
  if (CR.open) crRender();
}
async function crPermManage() {
  try { const pm = await window.claude.use("permissions"); if (!pm) throw 0; await pm.manage(); CR.msg = ""; }
  catch { CR.msg = "Open this page’s Permissions menu in claude.ai (top of the artifact) and allow Comments, then press Send again."; }
  await crPermCheck();
  try { CR.canSend = await CR.comments.canSendToClaude(); } catch {}
  crRender();
}

/* ---------- actions ---------- */
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest?.("[data-cr]"); if (!b || !b.closest("#crPanel")) return;
  const a = b.dataset.cr, d = CR.draft;
  if (a === "close") return crToggle(false);
  if (a === "perm") return crPermManage();
  if (a === "tab") { CR.tab = b.dataset.v; return crRender(); }
  if (a === "kind") { d.kind = b.dataset.v; return crRender(); }
  if (a === "prio") { d.priority = b.dataset.v; return crRender(); }
  if (a === "untarget") { d.target = null; return crRender(); }
  if (a === "pick") return crPick();
  if (a === "cancel") { CR.editing = null; CR.draft = { text: "", kind: "change", priority: "must", target: null }; return crRender(); }
  if (a === "show") {
    const x = CR.list.find((y) => y.id === b.dataset.id); if (!x) return;
    if (parseRoute(UI.route || "/").path !== x.route) go(x.route);
    CR.tab = "page"; crRender();
    setTimeout(() => {
      let el = null; try { el = x.target?.path ? document.querySelector(x.target.path) : null; } catch {}
      el = el || document.querySelector(".content h1");
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      const r0 = el.getBoundingClientRect(), h = Object.assign(document.createElement("div"), { className: "cr-hl" });
      document.body.appendChild(h);
      const place = () => { const r = el.getBoundingClientRect(); Object.assign(h.style, { left: `${r.left - 4}px`, top: `${r.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` }); };
      place(); const t = setInterval(place, 120); setTimeout(() => { clearInterval(t); h.remove(); }, 3200); void r0;
    }, 350);
    return;
  }
  if (a === "goto") { CR.tab = "page"; go(b.dataset.route); return crRender(); }
  if (a === "edit") { const x = CR.list.find((y) => y.id === b.dataset.id); if (!x) return; CR.editing = x.id; CR.draft = { text: x.text, kind: x.kind, priority: x.priority, target: x.target || null }; return crRender(); }
  if (a === "del") {
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Delete — sure?"; return; }
    try { await CR.db.doc(`changes/${b.dataset.id}`).delete(); CR.msg = "Deleted."; } catch { CR.msg = "That couldn't be deleted. Try again in a moment."; }
    return crRender();
  }
  if (a === "send") {
    const fresh = CR.list.filter((x) => x.status === "new"); if (!fresh.length || !CR.comments) return;
    const lines = fresh.slice(0, 12).map((x, i) => `${i + 1}. [${x.pageTitle || x.route}] ${x.text.replace(/\s+/g, " ").slice(0, 140)}`);
    const text = `Please review the ${fresh.length} new change request${fresh.length === 1 ? "" : "s"} from the Changes list (collection "changes"). Show me each page with my request and the change you plan, and build only after I confirm:\n${lines.join("\n")}${fresh.length > 12 ? `\n…and ${fresh.length - 12} more in the list.` : ""}`;
    b.disabled = true;
    try {
      const anchor = await CR.comments.anchorFor(b);
      await CR.comments.sendToClaude({ anchor, text: text.slice(0, 3900) });
      const at = new Date().toISOString();
      for (const x of fresh) { try { await CR.db.doc(`changes/${x.id}`).update({ status: "sent", sentAt: at }); } catch {} }
      CR.msg = "Sent for review. Claude will show each page with your request and the planned change for you to confirm.";
    } catch (e) {
      CR.msg = e?.code === "consent_required" || e?.code === "forbidden" ? "Nothing was sent, but your notes are saved. Press “Turn sending back on”, or in the chat say “build my changes”." : "Nothing was sent, but your notes are saved. In the chat, say “build my changes” and Claude reads the same list.";
      await crPermCheck();
    }
    return crRender();
  }
});
document.addEventListener("submit", async (ev) => {
  if (ev.target.id !== "crForm") return;
  ev.preventDefault();
  const d = CR.draft, text = (document.getElementById("crText")?.value || "").trim();
  if (!text) { CR.msg = "Write what should change first."; return crRender(); }
  const now = new Date().toISOString();
  try {
    if (CR.editing) { await CR.db.doc(`changes/${CR.editing}`).update({ text, kind: d.kind, priority: d.priority, target: d.target || null, updatedAt: now }); CR.msg = "Saved."; }
    else {
      await CR.db.collection("changes").add({ pageKey: crKey(), route: parseRoute(UI.route || "/").path, pageTitle: crTitle(), as: A ? { userId: A.user.id, name: A.user.displayName, roles: A.roleCodes || [] } : null, text, kind: d.kind, priority: d.priority, target: d.target || null, status: "new", reply: "", by: CR.me, createdAt: now, updatedAt: now });
      CR.msg = "Added. Keep going on other pages and other sign-ins, then send the list for review.";
    }
    CR.editing = null; CR.draft = { text: "", kind: "change", priority: "must", target: null };
  } catch { CR.msg = "That wasn't saved — check your connection and press the button again. Your text is still in the box."; CR.draft.text = text; }
  crRender();
});
/* hovering a note outlines the thing it points at */
document.addEventListener("mouseover", (ev) => {
  const it = ev.target.closest?.("[data-cr-hover]"); const old = document.getElementById("crHover");
  if (!it || !it.dataset.crHover) { if (old && !CR.picking) old.remove(); return; }
  let el = null; try { el = document.querySelector(it.dataset.crHover); } catch {}
  if (!el) return;
  const r = el.getBoundingClientRect(), h = old || Object.assign(document.createElement("div"), { id: "crHover", className: "cr-hl" });
  Object.assign(h.style, { left: `${r.left - 3}px`, top: `${r.top - 3}px`, width: `${r.width + 6}px`, height: `${r.height + 6}px` });
  if (!old) document.body.appendChild(h);
});

/* ---------- point at something ---------- */
function crPath(el) {
  const parts = [];
  for (let n = el; n && n.nodeType === 1 && n !== document.body && parts.length < 6; n = n.parentElement) {
    if (n.id && !/^(app)$/.test(n.id)) { parts.unshift(`#${CSS.escape(n.id)}`); break; }
    let s = n.tagName.toLowerCase(); const p = n.parentElement;
    if (p) { const same = [...p.children].filter((c) => c.tagName === n.tagName); if (same.length > 1) s += `:nth-of-type(${same.indexOf(n) + 1})`; }
    parts.unshift(s);
  }
  return parts.join(" > ");
}
function crLabel(el) {
  const lab = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
  const t = (el.getAttribute("aria-label") || lab?.innerText || el.getAttribute("placeholder") || el.innerText || el.value || el.getAttribute("title") || el.tagName).replace(/\s+/g, " ").trim();
  return t.slice(0, 90) || el.tagName.toLowerCase();
}
function crPick() {
  CR.picking = true; const panel = document.getElementById("crPanel"); if (panel) panel.hidden = true;
  const hl = document.createElement("div"); hl.className = "cr-hl"; hl.id = "crHover"; document.body.appendChild(hl);
  const bar = document.createElement("div"); bar.className = "cr-pickbar"; bar.textContent = "Click the thing you mean · Esc to cancel"; document.body.appendChild(bar);
  document.body.classList.add("cr-pick");
  const ok = (el) => el && !el.closest("#crPanel,.cr-pickbar,#crFab") && el !== document.body && el !== document.documentElement;
  const move = (e) => { const el = e.target; if (!ok(el)) return; const r = el.getBoundingClientRect(); Object.assign(hl.style, { left: `${r.left - 3}px`, top: `${r.top - 3}px`, width: `${r.width + 6}px`, height: `${r.height + 6}px` }); };
  const done = (el) => {
    document.removeEventListener("mousemove", move, true); document.removeEventListener("click", click, true); document.removeEventListener("keydown", key, true);
    document.body.classList.remove("cr-pick"); hl.remove(); bar.remove(); CR.picking = false; if (panel) panel.hidden = false;
    if (el) { const sec = el.closest(".card, section, form")?.querySelector(".card-h span, h2, h3, legend")?.innerText?.trim(); CR.draft.target = { label: crLabel(el), path: crPath(el), section: (sec || "").slice(0, 60), text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 160) }; }
    crRender();
  };
  const click = (e) => { if (!ok(e.target)) return; e.preventDefault(); e.stopPropagation(); done(e.target); };
  const key = (e) => { if (e.key === "Escape") { e.preventDefault(); done(null); } };
  document.addEventListener("mousemove", move, true); document.addEventListener("click", click, true); document.addEventListener("keydown", key, true);
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && CR.open && !CR.picking) crToggle(false); });
