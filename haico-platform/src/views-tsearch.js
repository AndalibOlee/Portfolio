/* ==========================================================================
   views-tsearch.js — a small search bar above the main table, only on the
   pages chosen in the search-box picker ("With column" style):
   a box, a "Search in" column picker and a match count. It filters the rows
   in place (no re-render), keeps the words while you stay on the page and
   clears them when you leave. Tables on the page with the same columns as the
   main one (e.g. one table per company) are filtered together.
   ========================================================================== */

const TS_PAGES = new Set([
  "/me/requests", "/me/certifications", "/me/documents",
  "/hr/departments", "/payroll/timesheet-status", "/hr/leave",
  "/hr/benefits", "/hr/pension",
  "/finance/assets", "/finance/budgets", "/finance/accounts",
  "/finance/expenses", "/hr/requests", "/finance/ar", "/finance/banking",
  "/procurement/pos", "/procurement/receiving", "/procurement/match",
  "/sales/orders", "/projects",
  "/admin/users", "/admin/audit",
]);
const TS = { path: null, q: "", col: -1 };

injectCss(`
.tsearch{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);background:var(--card)}
.tsearch.bare{padding:0 0 8px;border:0;background:none}
.tsearch .ts-in{flex:1;min-width:180px;display:flex;align-items:center;gap:6px;height:34px;border:1px solid var(--input);border-radius:8px;background:var(--card);padding:0 9px}
.tsearch .ts-in:focus-within{border-color:var(--primary);outline:2px solid color-mix(in srgb,var(--ring) 30%,transparent)}
.tsearch .ts-in svg{width:15px;height:15px;color:var(--muted-fg);flex:none}
.tsearch .ts-in input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:13.5px;color:var(--fg);height:100%}
.tsearch input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
.tsearch .ts-x{border:0;background:none;color:var(--muted-fg);cursor:pointer;font-size:14px;padding:0 2px}
.tsearch select{height:34px;border:1px solid var(--input);border-radius:8px;background:var(--card);color:var(--fg);font:inherit;font-size:13px;padding:0 6px;max-width:200px}
.tsearch .ts-n{font-size:12.5px;color:var(--muted-fg);font-variant-numeric:tabular-nums;white-space:nowrap}
tr.ts-none td{text-align:center;color:var(--muted-fg);padding:16px}
`);

const tsHeads = (t) => [...(t.tHead?.rows[0]?.cells || [])].map((c) => c.textContent.trim());
/** the visible words of a cell or row, with a space between separate pieces of text ("PO-2026-0003 Aug 20, 2026", not "PO-2026-0003Aug 20, 2026") */
function tsText(el) {
  if (!el) return "";
  const out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const t = n.nodeValue.trim(); if (t) out.push(t); }
  return out.join(" ").replace(/\s+/g, " ").toLowerCase();
}
const tsBodyRows = (t) => [...t.tBodies].flatMap((b) => [...b.rows]).filter((r) => !r.classList.contains("ts-none") && !(r.cells.length === 1 && r.cells[0].colSpan > 1));

/** the page's main table (most rows) and the tables that share its columns */
function tsTables() {
  const c = document.querySelector(".content"); if (!c) return null;
  const all = [...c.querySelectorAll("table")].filter((t) => !t.classList.contains("tsg") && t.tHead && !t.closest(".modal"));
  if (!all.length) return null;
  const main = all.reduce((a, t) => (tsBodyRows(t).length > tsBodyRows(a).length ? t : a), all[0]);
  const sig = tsHeads(main).join("|");
  return { main, tables: all.filter((t) => tsHeads(t).join("|") === sig) };
}

function tsFilter() {
  const found = tsTables(); if (!found) return;
  const t = TS.q.trim().replace(/\s+/g, " ").toLowerCase();
  let shown = 0, total = 0;
  for (const tbl of found.tables) {
    tbl.querySelectorAll("tr.ts-none").forEach((r) => r.remove());
    let here = 0;
    for (const r of tsBodyRows(tbl)) {
      total++;
      const text = tsText(TS.col >= 0 ? r.cells[TS.col] : r);
      const ok = !t || text.includes(t);
      r.hidden = !ok; if (ok) { shown++; here++; }
    }
    if (t && !here && tbl === found.main) {
      const tr = document.createElement("tr"); tr.className = "ts-none";
      const td = document.createElement("td"); td.colSpan = Math.max(1, tsHeads(tbl).length);
      td.textContent = `Nothing matches “${TS.q.trim()}”. Try fewer letters, or search in All columns.`;
      tr.appendChild(td); (tbl.tBodies[0] || tbl.createTBody()).appendChild(tr);
    }
  }
  const n = document.getElementById("tsN"); if (n) n.textContent = t ? `${shown} of ${total}` : `${total} row${total === 1 ? "" : "s"}`;
  const x = document.getElementById("tsX"); if (x) x.hidden = !TS.q;
}

/** draw the bar above the main table on a chosen page, then filter */
function tsApply() {
  const path = parseRoute(UI.route).path;
  if (path !== TS.path) { TS.path = path; TS.q = ""; TS.col = -1; }
  if (!A || !TS_PAGES.has(path)) return;
  const found = tsTables(); if (!found) return;
  const heads = tsHeads(found.main);
  if (TS.col >= heads.length || (TS.col >= 0 && !heads[TS.col])) TS.col = -1;
  const title = (document.querySelector(".content .ph h1, .content h1")?.textContent || "this list").trim();
  const bar = document.createElement("div");
  const anchor = found.main.closest(".tw") || found.main;
  const inCard = !!anchor.closest(".card");
  bar.className = "tsearch" + (inCard ? "" : " bare");
  bar.innerHTML = `<label class="ts-in">${icon("search")}<input id="tsQ" type="search" autocomplete="off" placeholder="Search ${esc(title.toLowerCase())}…" aria-label="Search this table" value="${esc(TS.q)}"><button type="button" class="ts-x" id="tsX" aria-label="Clear search"${TS.q ? "" : " hidden"}>✕</button></label>
    <select id="tsCol" aria-label="Search in"><option value="-1">All columns</option>${heads.map((h, i) => (h ? `<option value="${i}"${i === TS.col ? " selected" : ""}>${esc(h)}</option>` : "")).join("")}</select><span class="ts-n" id="tsN" aria-live="polite"></span>`;
  anchor.parentNode.insertBefore(bar, anchor);
  tsFilter();
}

document.addEventListener("input", (ev) => { if (ev.target.id === "tsQ") { TS.q = ev.target.value; tsFilter(); } });
document.addEventListener("change", (ev) => { if (ev.target.id === "tsCol") { TS.col = Number(ev.target.value); tsFilter(); } });
document.addEventListener("click", (ev) => { if (ev.target.closest("#tsX")) { TS.q = ""; const i = document.getElementById("tsQ"); if (i) { i.value = ""; i.focus(); } tsFilter(); } });
document.addEventListener("keydown", (ev) => { if (ev.target.id === "tsQ" && ev.key === "Escape" && TS.q) { ev.stopPropagation(); TS.q = ""; ev.target.value = ""; tsFilter(); } }, true);

{
  const _tsRender = render;
  render = function () { _tsRender(); try { tsApply(); } catch (e) { console.error(e); } };
}
