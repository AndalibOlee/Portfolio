/* ==========================================================================
   views-fin3.js — merge round (Finance): bank statement upload with drag-to-
   match reconciliation, recurring journal edit, PO cancel + PO history report,
   Invoice Files, link bill → PO on the 3-way match, sales order status chips,
   depreciation runs, stock counts, month picker on month-end close, class /
   location dimension UI removed, B naming on finance pages.
   Loads after every other view file and before app.js. Routes registered here
   replace earlier ones for the same path (f3Route puts them first).
   ========================================================================== */
injectCss(`
.f3tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.f3tools .btn{height:32px;font-size:12.5px}
.f3rec .card-b{padding-top:10px}
.f3top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start;margin-bottom:12px}
.f3top .stats{margin:0}
.f3cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}
@media(max-width:900px){.f3cols{grid-template-columns:1fr}.f3top{grid-template-columns:1fr}}
.f3col{border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden;min-width:0}
.f3col-h{display:flex;justify-content:space-between;gap:8px;align-items:baseline;padding:9px 12px;border-bottom:1px solid var(--border);background:var(--thead);font-size:12.5px;font-weight:600}
.f3col-h small{font-weight:400;color:var(--muted-fg);font-size:11.5px}
.f3col .empty{margin:0;border:0}
.f3line,.f3je{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 12px;border-top:1px solid var(--border);font-size:12.5px;background:var(--card)}
.f3line:first-of-type,.f3je:first-of-type{border-top:0}
.f3line{cursor:grab;user-select:none}
.f3line:active{cursor:grabbing}
.f3line.dragging{opacity:.45}
.f3line.sel{background:var(--info-bg);box-shadow:inset 3px 0 0 var(--info)}
.f3je{cursor:pointer}
.f3je.fit{background:var(--ok-bg)}
.f3je.over{background:var(--t-green-bg);box-shadow:inset 0 0 0 2px var(--t-green)}
.f3je.blocked{background:var(--t-red-bg);box-shadow:inset 0 0 0 2px var(--t-red)}
.f3line .dt,.f3je .dt{font-family:var(--mono);font-size:11px;color:var(--muted-fg);white-space:nowrap}
.f3line .ds,.f3je .ds{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.f3line .ds small,.f3je .ds small{display:block;font-size:11px;color:var(--muted-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.f3line .amt,.f3je .amt{font-family:var(--mono);font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap;text-align:right}
.f3line .amt.neg,.f3je .amt.neg{color:var(--t-red)}.f3line .amt.pos,.f3je .amt.pos{color:var(--t-green)}
.f3line .ops{grid-column:2/4;display:flex;gap:10px;font-size:11.5px}
.f3line .ops .lnk{font-size:11.5px}
.f3grip{display:inline-block;width:10px;color:var(--muted-fg);margin-right:4px;letter-spacing:-2px}
.f3hint{font-size:12px;color:var(--muted-fg);margin:0 0 10px}
.f3kind{height:28px;font-size:12px;padding:0 8px;width:auto;max-width:170px}
.f3chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
.f3cnt .in{height:32px;font-size:13px}
.f3diff.pos{color:var(--t-green);font-weight:700}.f3diff.neg{color:var(--t-red);font-weight:700}
.f3bar{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin:0 0 12px}
.f3bar .fld{min-width:140px}.f3bar .in{height:34px;font-size:13px;width:auto}.f3bar select.in{max-width:240px}
.f3bar .apx-q{min-width:220px;flex:1}
.f3steps{font-size:12.5px;color:var(--muted-fg);margin:0 0 10px}
.f3steps b{color:var(--fg)}
`);

/* ---------------- small helpers ---------------- */
/** register a route that wins over any earlier registration of the same pattern */
function f3Route(pattern, perm, view) {
  const re = new RegExp("^" + pattern.replace(/:(\w+)/g, "([^/]+)") + "$");
  for (let i = ROUTES.length - 1; i >= 0; i--) if (ROUTES[i].re.source === re.source) ROUTES.splice(i, 1);
  // fixed paths go first; paths with an :id go last (still ahead of app.js's) so they never shadow /finance/ap/vendors and friends
  if (pattern.includes(":")) ROUTES.push({ re, perm, view }); else ROUTES.unshift({ re, perm, view });
}
const f3Rename = (html, pairs) => pairs.reduce((h, [a, b]) => h.split(a).join(b), html);
const f3Plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const f3Ym = (d) => String(d || "").slice(0, 7);
const f3YmLabel = (ym) => { const [y, m] = String(ym).split("-").map(Number); return m ? `${FIN2_MONTH_FULL[m - 1]} ${y}` : ym; };
const f3YmEnd = (ym) => { const [y, m] = ym.split("-").map(Number); return `${ym}-${pad(fin2DaysIn(y, m), 2)}`; };
const f3NextYm = (ym) => { const [y, m] = ym.split("-").map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1, 2)}`; };
const f3PrevYm = (ym) => { const [y, m] = ym.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1, 2)}`; };
const f3Money = (c) => `<span class="amt ${c < 0 ? "neg" : "pos"}">${c < 0 ? "−" : "+"}${amount(Math.abs(c))}</span>`;
const f3Refs = (s) => new Set((String(s || "").toUpperCase().match(/[A-Z]{2,}-\d{2,}(?:-\d+)?|\b\d{4,}\b/g) || []).filter((x) => !/^(19|20)\d\d$/.test(x)));
const f3Flash = (text, kind = "ok") => { UI.flash = { kind, text }; safeRender(); };
const f3LastAudit = () => S.audit[S.audit.length - 1]?.summary || "";
const f3SrcLabel = { AR: "Customer receipt", AP: "Vendor payment", PAYROLL: "Payroll", EXPENSE: "Expense claim", BANK: "Posted from the bank", MANUAL: "Manual entry", RECURRING: "Recurring entry", INTERCO: "Inter-company", ASSETS: "Depreciation" };

/* ---------------- state: statements, depreciation runs, stock counts; seed links ---------------- */
/** cents moved through a bank account's ledger account by one entry (debit − credit) */
function f3CashOf(S, je, ba) { let c = 0; for (const l of S.journalLines) if (l.journalEntryId === je.id && l.accountId === ba.glAccountId) c += (l.debitCents || 0) - (l.creditCents || 0); return c; }
/** every posted entry that moves money in a bank account (opening balances excluded — they are the account's opening balance) */
function f3CashEntries(S, ba) {
  const out = new Map();
  for (const l of S.journalLines) { if (l.accountId !== ba.glAccountId) continue; out.set(l.journalEntryId, (out.get(l.journalEntryId) || 0) + (l.debitCents || 0) - (l.creditCents || 0)); }
  return [...out].map(([id, cents]) => ({ je: byId(S.journalEntries, id), cents })).filter((x) => x.je && x.je.status === "POSTED" && x.je.source !== "OPENING" && x.cents !== 0);
}
const f3LinkedSet = (S) => new Set(S.bankTransactions.map((t) => t.matchedJournalEntryId).filter(Boolean));
/** posted entries for this bank account that no statement line explains yet */
function f3OpenEntries(S, ba) { const linked = f3LinkedSet(S); return f3CashEntries(S, ba).filter((x) => !linked.has(x.je.id)).sort((a, b) => (a.je.date < b.je.date ? 1 : a.je.date > b.je.date ? -1 : a.je.entryNumber < b.je.entryNumber ? 1 : -1)); }
function f3LineType(l) { const d = l.description.toLowerCase(); if (/service charge|fee/.test(d)) return "FEE"; if (/interest/.test(d)) return "INTEREST"; return l.amountCents < 0 ? "WITHDRAWAL" : "DEPOSIT"; }
{
  const _fs3 = freshState;
  freshState = function () {
    const S = _fs3();
    S.bankStatements = []; S.depreciationRuns = []; S.stockCounts = [];
    // seed bank lines marked MATCHED carry no link to their ledger entry: pair each with the entry of the same amount (reference numbers break ties)
    const used = new Set();
    for (const ba of S.bankAccounts) {
      const entries = f3CashEntries(S, ba);
      for (const t of S.bankTransactions.filter((x) => x.bankAccountId === ba.id && x.status === "MATCHED" && !x.matchedJournalEntryId)) {
        const cands = entries.filter((x) => x.cents === t.amountCents && !used.has(x.je.id));
        const refs = f3Refs(t.description);
        const pick = cands.find((x) => [...f3Refs(`${x.je.memo} ${x.je.reference || ""}`)].some((r) => refs.has(r))) || (cands.length ? cands[0] : null);
        if (pick) { used.add(pick.je.id); t.matchedJournalEntryId = pick.je.id; t.matchedBy = "Bank feed"; }
      }
    }
    // assets: depreciation posted through June 2026 came with the opening balances
    for (const a of S.fixedAssets) {
      if (a.depreciatedThrough) continue;
      const monthly = Math.round((a.costCents - (a.residualCents || 0)) / a.usefulLifeMonths);
      const [py, pm] = a.purchaseDate.split("-").map(Number);
      const held = Math.max(0, Math.min(a.usefulLifeMonths, (2026 - py) * 12 + (6 - pm)));
      a.depreciatedThrough = "2026-06"; a.accumDepCents = a.accumDepCents ?? monthly * held; a.openingAccumDepCents = a.accumDepCents;
    }
    return S;
  };
}
// a payment or deposit recorded in the app lands on the bank feed already paired with its ledger entry
{
  const _bt3 = bankTxn;
  bankTxn = function (S, ctx, companyId, date, description, amountCents, type) {
    const n = S.bankTransactions.length;
    _bt3(S, ctx, companyId, date, description, amountCents, type);
    const t = S.bankTransactions[n]; if (!t) return;
    const ba = byId(S.bankAccounts, t.bankAccountId); if (!ba) return;
    const linked = f3LinkedSet(S);
    for (let i = S.journalEntries.length - 1; i >= 0; i--) {
      const je = S.journalEntries[i];
      if (je.companyId !== companyId || linked.has(je.id) || je.status !== "POSTED") continue;
      if (f3CashOf(S, je, ba) === amountCents) { t.matchedJournalEntryId = je.id; t.matchedBy = "System"; break; }
    }
  };
}

/* ==========================================================================
   1. BANK — statement upload, drag-to-match reconciliation
   ========================================================================== */
Object.assign(R, {
  "bank.statement.import"(S, p, ctx) {
    ctx.need("banking.reconcile");
    const ba = byId(S.bankAccounts, p.bankAccountId);
    if (!ba) fail("That bank account no longer exists.");
    ctx.company(ba.companyId);
    const rows = (p.lines || []).map((l) => ({ date: String(l.date || "").slice(0, 10), description: String(l.description || "").trim().slice(0, 120), amountCents: Math.round(Number(l.amountCents) || 0), reference: l.reference ? String(l.reference).slice(0, 40) : undefined })).filter((l) => l.description || l.amountCents);
    if (!rows.length) fail("The statement has no lines with a date, a description and an amount.");
    const bad = rows.find((l) => !/^\d{4}-\d{2}-\d{2}$/.test(l.date) || !l.amountCents);
    if (bad) fail(`Line "${bad.description || "?"}" needs a date (YYYY-MM-DD) and a non-zero amount.`);
    const key = (l) => `${l.date}|${l.amountCents}|${l.description.toLowerCase()}`;
    const have = new Set(S.bankTransactions.filter((t) => t.bankAccountId === ba.id).map(key));
    const st = { id: ctx.id("bst"), bankAccountId: ba.id, companyId: ba.companyId, fileName: String(p.fileName || "statement.csv").slice(0, 80), importedByName: ctx.actor.displayName, importedAt: ctx.now, lineCount: 0, skipped: 0, fromDate: null, toDate: null, totalCents: 0 };
    let n = 0, skipped = 0;
    for (const l of rows) {
      if (have.has(key(l))) { skipped++; continue; }
      have.add(key(l));
      S.bankTransactions.push({ id: ctx.id("bt"), bankAccountId: ba.id, date: l.date, description: l.description, reference: l.reference, amountCents: l.amountCents, type: f3LineType(l), status: "UNMATCHED", statementId: st.id });
      n++; st.totalCents += l.amountCents;
      if (!st.fromDate || l.date < st.fromDate) st.fromDate = l.date;
      if (!st.toDate || l.date > st.toDate) st.toDate = l.date;
    }
    if (!n) fail(`Every line in ${st.fileName} is already on ${ba.name} — nothing new to match.`);
    st.lineCount = n; st.skipped = skipped;
    S.bankStatements = S.bankStatements || []; S.bankStatements.push(st);
    ctx.audit({ module: "banking", action: "CREATE", companyId: ba.companyId, entityType: "BankStatement", entityId: st.id, summary: `${ctx.actor.displayName} uploaded ${st.fileName} to ${ba.name}: ${f3Plural(n, "statement line", "statement lines")} (${dShort(st.fromDate)} – ${dLong(st.toDate)}, net ${money(st.totalCents)})${skipped ? `, ${skipped} already on file` : ""}.` });
  },
  "bank.match"(S, p, ctx) {
    ctx.need("banking.reconcile");
    const t = byId(S.bankTransactions, p.txnId);
    if (!t) fail("That statement line no longer exists.");
    const ba = byId(S.bankAccounts, t.bankAccountId);
    ctx.company(ba.companyId);
    if (t.status !== "UNMATCHED") fail(`"${t.description}" is already matched.`);
    const je = byId(S.journalEntries, p.jeId);
    if (!je || je.companyId !== ba.companyId || je.status !== "POSTED") fail("Pick a posted ledger entry for this bank account.");
    if (f3LinkedSet(S).has(je.id)) fail(`${je.entryNumber} is already matched to a statement line.`);
    const cents = f3CashOf(S, je, ba);
    if (!cents) fail(`${je.entryNumber} doesn't move money in ${ba.name}.`);
    if (cents !== t.amountCents) fail(`The amounts don't agree: statement ${money(t.amountCents)}, ledger ${je.entryNumber} ${money(cents)} — ${money(Math.abs(cents - t.amountCents))} apart. Match lines that agree to the cent, or post the statement line as a new entry.`);
    Object.assign(t, { status: "MATCHED", matchedJournalEntryId: je.id, matchedBy: ctx.actor.displayName, matchedAt: ctx.now, matchHow: p.how || "DRAG" });
    ctx.audit({ module: "banking", action: "MATCH", companyId: ba.companyId, entityType: "BankTransaction", entityId: t.id, summary: `${ctx.actor.displayName} matched statement line "${t.description}" (${money(t.amountCents)}, ${dLong(t.date)}) with ${je.entryNumber} — ${je.memo}.` });
  },
  "bank.unmatch"(S, p, ctx) {
    ctx.need("banking.reconcile");
    const t = byId(S.bankTransactions, p.txnId);
    if (!t || t.status !== "MATCHED" || !t.matchedJournalEntryId) fail("That statement line isn't matched.");
    const ba = byId(S.bankAccounts, t.bankAccountId);
    ctx.company(ba.companyId);
    const je = byId(S.journalEntries, t.matchedJournalEntryId);
    if (je && je.source === "BANK" && je.sourceId === t.id) fail(`"${t.description}" was posted to the books from the bank (${je.entryNumber}) — reverse that entry instead of unmatching it.`);
    Object.assign(t, { status: "UNMATCHED", matchedJournalEntryId: undefined, matchedBy: undefined, matchedAt: undefined, matchHow: undefined, matchedByRuleId: undefined });
    ctx.audit({ module: "banking", action: "UNMATCH", companyId: ba.companyId, entityType: "BankTransaction", entityId: t.id, summary: `${ctx.actor.displayName} unmatched statement line "${t.description}" (${money(t.amountCents)}) from ${je?.entryNumber || "its entry"} — both are open again.` });
  },
  "bank.post"(S, p, ctx) {
    ctx.need("banking.reconcile");
    const t = byId(S.bankTransactions, p.txnId);
    if (!t) fail("That statement line no longer exists.");
    const ba = byId(S.bankAccounts, t.bankAccountId);
    ctx.company(ba.companyId);
    if (t.status !== "UNMATCHED") fail(`"${t.description}" is already matched.`);
    const glNumber = byId(S.accounts, ba.glAccountId)?.number || GL.BANK;
    const accountNumber = String(p.accountNumber || "").trim();
    const gl = S.accounts.find((a) => a.companyId === ba.companyId && a.number === accountNumber && a.isActive !== false && a.isPostable !== false);
    if (!gl) fail("Pick the account this line should post to.");
    if (gl.id === ba.glAccountId) fail("The offset account can't be the bank account itself.");
    const amt = Math.abs(t.amountCents), deposit = t.amountCents > 0;
    const memo = String(p.memo || "").trim() || t.description;
    const je = postJournal(S, ctx, { companyId: ba.companyId, date: t.date, memo, source: "BANK", sourceType: "BankTransaction", sourceId: t.id, reference: t.reference || undefined,
      lines: deposit ? [{ accountNumber: glNumber, debitCents: amt, description: t.description }, { accountNumber: gl.number, creditCents: amt, description: memo }]
        : [{ accountNumber: gl.number, debitCents: amt, description: memo }, { accountNumber: glNumber, creditCents: amt, description: t.description }] });
    Object.assign(t, { status: "MATCHED", matchedJournalEntryId: je.id, matchedBy: ctx.actor.displayName, matchedAt: ctx.now, matchHow: "POST" });
    ctx.audit({ module: "banking", action: "POST", companyId: ba.companyId, entityType: "BankTransaction", entityId: t.id, summary: `${ctx.actor.displayName} posted statement line "${t.description}" (${money(t.amountCents)}) as ${je.entryNumber} to ${gl.number} ${gl.name}.` });
  },
});
/* Auto-match: first pair statement lines with ledger entries of the same amount (reference numbers break ties), then apply the matching rules */
{
  const _auto = R["bank.autoMatch"];
  R["bank.autoMatch"] = function (S, p, ctx) {
    ctx.need("banking.reconcile");
    const ba = byId(S.bankAccounts, p.bankAccountId);
    if (!ba) fail("That bank account no longer exists.");
    ctx.company(ba.companyId);
    const lines = S.bankTransactions.filter((t) => t.bankAccountId === ba.id && t.status === "UNMATCHED").sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!lines.length) fail("Every line on this account is already matched.");
    const open = f3OpenEntries(S, ba), used = new Set();
    const paired = [];
    for (const t of lines) {
      const refs = f3Refs(t.description);
      const cands = open.filter((o) => !used.has(o.je.id) && o.cents === t.amountCents && Math.abs((D(t.date) - D(o.je.date)) / MS_DAY) <= 45);
      if (!cands.length) continue;
      const byRef = cands.filter((o) => [...f3Refs(`${o.je.memo} ${o.je.reference || ""} ${o.je.entryNumber}`)].some((r) => refs.has(r)));
      const pick = byRef.length === 1 ? byRef[0] : !byRef.length && cands.length === 1 ? cands[0] : null;
      if (!pick) continue;
      used.add(pick.je.id);
      Object.assign(t, { status: "MATCHED", matchedJournalEntryId: pick.je.id, matchedBy: "Auto-match", matchedAt: ctx.now, matchHow: "AUTO" });
      paired.push(`"${t.description}" ↔ ${pick.je.entryNumber}`);
    }
    let ruleSummary = "", ruleFail = null;
    const before = S.audit.length;
    try { _auto(S, { bankAccountId: ba.id }, ctx); ruleSummary = S.audit[S.audit.length - 1]?.summary || ""; if (S.audit.length > before) S.audit.pop(); }
    catch (e) { if (!(e instanceof ActionError)) throw e; ruleFail = e.message; }
    if (!paired.length && !ruleSummary) fail(ruleFail || "Nothing could be matched automatically.");
    const ruled = ruleSummary.match(/auto-matched (\d+) of/);
    ctx.audit({ module: "banking", action: "POST", companyId: ba.companyId, entityType: "BankAccount", entityId: ba.id, summary: `${ctx.actor.displayName} auto-matched ${paired.length + (ruled ? Number(ruled[1]) : 0)} of ${lines.length} statement line${lines.length === 1 ? "" : "s"} on ${ba.name}${paired.length ? ` — paired with ledger entries: ${paired.join(", ")}` : ""}${ruled ? `; ${ruled[1]} posted by the matching rules` : ""}.${ruleSummary.includes("Refused") ? ` ${ruleSummary.slice(ruleSummary.indexOf("Refused"))}` : ""}` });
  };
}

/* ---- CSV reading (client side; the parsed lines travel in the event) ---- */
function f3ParseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === "," || c === ";" || c === "\t") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim()));
}
function f3Date(s) {
  s = String(s || "").trim(); let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return `${m[1]}-${pad(+m[2], 2)}-${pad(+m[3], 2)}`;
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) { const a = +m[1], b = +m[2]; const [mo, d] = a > 12 ? [b, a] : [a, b]; return `${m[3]}-${pad(mo, 2)}-${pad(d, 2)}`; }
  const t = Date.parse(s); if (!isNaN(t)) { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`; }
  return null;
}
function f3Cents(s) {
  let v = String(s ?? "").trim(); if (!v) return 0;
  let neg = false;
  if (/^\(.*\)$/.test(v)) { neg = true; v = v.slice(1, -1); }
  if (/\bDR\b/i.test(v)) neg = true;
  if (/^-|-$/.test(v)) neg = true;
  v = v.replace(/[^0-9.]/g, "");
  const c = toCents(v) || 0;
  return neg ? -c : c;
}
/** rows → {date, description, amountCents, reference}: header row optional; debit/credit columns or one signed amount column */
function f3StatementLines(rows) {
  if (!rows.length) return [];
  const norm = (h) => String(h).trim().toLowerCase().replace(/[^a-z]/g, "");
  const head = rows[0].map(norm);
  const find = (...names) => head.findIndex((h) => names.includes(h));
  let iDate = find("date", "transactiondate", "postdate", "posted"), iDesc = find("description", "memo", "details", "narrative", "payee", "particulars", "transaction"), iAmt = find("amount", "amt", "value"), iDeb = find("debit", "withdrawal", "withdrawals", "out", "moneyout", "paidout"), iCr = find("credit", "deposit", "deposits", "in", "moneyin", "paidin"), iRef = find("reference", "ref", "cheque", "chequeno", "check", "checkno");
  const hasHeader = iDate >= 0 || iAmt >= 0 || iDesc >= 0 || iDeb >= 0;
  let body = rows;
  if (hasHeader) body = rows.slice(1); else { iDate = 0; iDesc = 1; iAmt = 2; iDeb = -1; iCr = -1; iRef = -1; if (rows[0].length >= 4 && !f3Cents(rows[0][2]) && f3Cents(rows[0][3])) { iDeb = 2; iCr = 3; iAmt = -1; } }
  if (iDate < 0) iDate = 0; if (iDesc < 0) iDesc = 1;
  return body.map((r) => {
    const date = f3Date(r[iDate]);
    let amountCents = 0;
    if (iAmt >= 0) amountCents = f3Cents(r[iAmt]);
    else if (iDeb >= 0 || iCr >= 0) amountCents = (iCr >= 0 ? Math.abs(f3Cents(r[iCr])) : 0) - (iDeb >= 0 ? Math.abs(f3Cents(r[iDeb])) : 0);
    return { date, description: String(r[iDesc] ?? "").trim(), amountCents, reference: iRef >= 0 ? String(r[iRef] ?? "").trim() || undefined : undefined };
  }).filter((l) => l.date && (l.description || l.amountCents));
}
/** the demo's sample statement for a bank account: lines for entries still in the books plus the usual bank noise */
function f3SampleLines(ba) {
  const today = todayStr();
  const clamp = (d) => (d > today ? today : d);
  const words = (je) => { const m = je.memo || ""; let r;
    if ((r = m.match(/^Payment (\S+) — (.+)$/))) return `EFT OUT — ${r[2].toUpperCase()} — ${r[1]}`;
    if ((r = m.match(/^Receipt for (\S+)/))) return `DEPOSIT — ${r[1]}`;
    if ((r = m.match(/^Payroll (\S+)/))) return `PAYROLL DIRECT DEPOSITS — ${r[1]}`;
    if ((r = m.match(/^Expense (\S+)/))) return `EFT OUT — EXPENSE REIMB ${r[1]}`;
    if ((r = m.match(/^Deposit batch (\S+)/))) return `DEPOSIT — ${r[1]}`;
    if ((r = m.match(/^Payment batch (\S+)/))) return `EFT BATCH — ${r[1]}`;
    return m.toUpperCase().slice(0, 60); };
  const gen = f3OpenEntries(S, ba).slice(0, 5).map((o, i) => ({ date: clamp(addDays(o.je.date, 1 + (i % 2))), description: words(o.je), amountCents: o.cents }));
  const fixed = [
    ["2026-09-23", "E-TRANSFER IN — CREW HOUSING DEPOSIT REFUND", 65000],
    ["2026-09-24", "CARDLOCK FUEL — ISLAND DIESEL CO-OP", -42618],
    ["2026-09-25", "MERCHANT FEES — MONERIS", -8815],
    ["2026-09-26", "NSF ITEM RETURNED — FEE", -4500],
    ["2026-09-26", "WIRE FEE", -1500],
    ["2026-09-28", "DEPOSIT — CHQ 2214 HAIDA GWAII REC", 125000],
    ["2026-09-29", "LOAN INTEREST — EQUIPMENT LOAN 7718", -31240],
    ["2026-09-30", "SERVICE CHARGE — OCTOBER PLAN", -4250],
    ["2026-09-30", "INTEREST CREDIT", 9140],
  ].map(([date, description, amountCents]) => ({ date, description, amountCents }));
  return [...gen, ...fixed].slice(0, 13).sort((a, b) => (a.date < b.date ? -1 : 1));
}
async function f3ImportFile(ba, file) {
  const text = await file.text();
  const lines = f3StatementLines(f3ParseCsv(text));
  if (!lines.length) { toast("Nothing to import", "No lines with a date, description and amount were found. Columns: Date, Description, Amount (or Debit / Credit).", "err"); return; }
  if (act("bank.statement.import", { bankAccountId: ba.id, fileName: file.name, lines })) f3Flash(f3LastAudit().replace(/^\S+ \S+ uploaded /, "Uploaded "));
}
document.addEventListener("change", (ev) => { const el = ev.target; if (el.id !== "f3csv") return; const ba = byId(S.bankAccounts, el.dataset.ba); const file = el.files?.[0]; el.value = ""; if (ba && file) f3ImportFile(ba, file); });

/* ---- the Banking page: activity, reconciliation workbench, matching rules ---- */
function f3BankPostModal(t) {
  const ba = byId(S.bankAccounts, t.bankAccountId);
  const glAccts = S.accounts.filter((a) => a.companyId === ba.companyId && a.isPostable !== false && a.isActive !== false && a.id !== ba.glAccountId).sort((a, b) => a.number.localeCompare(b.number));
  const guess = fin2FindRule(S.bankMatchRules.filter((r) => r.bankAccountId === ba.id), t.description)?.accountNumber || (t.amountCents < 0 ? "5900" : "4000");
  return `<h3>Post as new entry</h3><p class="hint" style="margin:0 0 12px">${dLong(t.date)} · ${esc(t.description)} · <b class="num">${money(t.amountCents)}</b><br>Nothing in the books explains this line, so it posts as a new entry: ${t.amountCents < 0 ? "the bank is credited and the account below debited" : "the bank is debited and the account below credited"}.</p>
    <form data-f="f3BankPost" data-id="${t.id}" class="form-grid"><div class="fld" style="grid-column:1/-1"><label for="bpAcct">Post to account</label><select class="in" id="bpAcct" name="accountNumber" required>${glAccts.map((a) => opt(a.number, `${a.number} — ${a.name}`, a.number === guess)).join("")}</select></div>
    <div class="fld" style="grid-column:1/-1"><label for="bpMemo">Memo</label><input class="in" id="bpMemo" name="memo" value="${esc(t.description)}"></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Post entry</button></div></form>`;
}
function f3Recon(ba) {
  const canRec = can(A, "banking.reconcile");
  const lines = S.bankTransactions.filter((t) => t.bankAccountId === ba.id);
  const open = lines.filter((t) => t.status === "UNMATCHED").sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const matched = lines.filter((t) => t.status === "MATCHED" && t.matchedJournalEntryId).sort((a, b) => ((b.matchedAt || "") > (a.matchedAt || "") ? 1 : (b.matchedAt || "") < (a.matchedAt || "") ? -1 : a.date < b.date ? 1 : -1));
  const entries = f3OpenEntries(S, ba);
  const sel = UI.filters.f3sel && open.some((t) => t.id === UI.filters.f3sel) ? UI.filters.f3sel : null;
  const selT = sel ? byId(S.bankTransactions, sel) : null;
  const stmts = (S.bankStatements || []).filter((s) => s.bankAccountId === ba.id);
  const last = stmts[stmts.length - 1];
  const openSum = open.reduce((s, t) => s + t.amountCents, 0), bookSum = entries.reduce((s, x) => s + x.cents, 0);
  const rules = S.bankMatchRules.filter((r) => r.bankAccountId === ba.id && r.isActive !== false);
  const ready = open.filter((t) => entries.some((o) => o.cents === t.amountCents) || fin2FindRule(rules, t.description)).length;
  const tools = canRec ? `<div class="f3tools"><label class="btn" for="f3csv" style="cursor:pointer">Upload bank statement</label><input type="file" id="f3csv" data-ba="${ba.id}" accept=".csv,text/csv,text/plain" hidden><button class="btn" data-a="f3Sample" data-id="${ba.id}">Load sample statement</button><button class="btn pri" data-a="fin2AutoMatch" data-id="${ba.id}" ${open.length ? "" : "disabled"}>Auto-match${ready ? ` (${ready} ready)` : ""}</button></div>` : "";
  const chart = donut([{ label: "Matched", v: matched.length, d: f3Plural(matched.length, "line", "lines"), color: "var(--moss)" }, { label: "Still to match", v: open.length, d: f3Plural(open.length, "line", "lines"), color: "var(--ochre)" }], { title: "Statement lines", total: lines.length ? `${Math.round((matched.length / lines.length) * 100)}%` : "—", caption: "matched", size: 110, thick: 14 });
  const top = `<div class="f3top"><div class="stats">${stat("Statement lines to match", String(open.length), open.length ? `${money(openSum)} net` : "Everything on the statement is explained", open.length ? "warn" : "good")}${stat("In the books, not on a statement", String(entries.length), entries.length ? `${money(bookSum)} net` : "Every entry is on a statement", entries.length ? "warn" : "good")}${stat("Difference", money(openSum - bookSum), last ? `Last upload ${last.fileName} · ${f3Plural(last.lineCount, "line", "lines")}` : "No statement uploaded yet", openSum - bookSum === 0 ? "good" : "")}</div><div class="card" style="padding:8px 12px">${chart}</div></div>`;
  const lineRow = (t) => `<div class="f3line ${t.id === sel ? "sel" : ""}" draggable="${canRec ? "true" : "false"}" data-f3txn="${t.id}" data-cents="${t.amountCents}" tabindex="0" role="button" aria-pressed="${t.id === sel}" aria-label="Statement line ${esc(t.description)} ${money(t.amountCents)}"><span class="dt">${canRec ? `<span class="f3grip" aria-hidden="true">⋮⋮</span>` : ""}${dShort(t.date)}</span><span class="ds">${esc(t.description)}<small>${esc(t.type.toLowerCase())}${t.reference ? ` · ref ${esc(t.reference)}` : ""}${t.statementId ? "" : " · bank feed"}</small></span>${f3Money(t.amountCents)}${canRec ? `<span class="ops">${t.id === sel ? `<span class="hint">now click the ledger entry it belongs to</span>` : ""}<button type="button" class="lnk" data-a="f3PostLine" data-id="${t.id}">Post as new entry</button></span>` : ""}</div>`;
  const jeRow = (x) => `<div class="f3je ${selT && selT.amountCents === x.cents ? "fit" : ""}" data-f3je="${x.je.id}" data-cents="${x.cents}" tabindex="0" role="button" aria-label="Ledger entry ${esc(x.je.entryNumber)} ${money(x.cents)}"><span class="dt">${dShort(x.je.date)}</span><span class="ds"><b class="mono">${esc(x.je.entryNumber)}</b> ${esc(x.je.memo)}<small>${esc(f3SrcLabel[x.je.source] || x.je.source)}${x.je.reference ? ` · ${esc(x.je.reference)}` : ""} · ${goLink(`/finance/journals/${x.je.id}`, "open")}</small></span>${f3Money(x.cents)}</div>`;
  const cols = `<div class="f3cols"><div class="f3col"><div class="f3col-h"><span>Statement lines · ${open.length} to match</span><small>${canRec ? "drag a line onto its ledger entry, or click one then the other" : ""}</small></div>${open.length ? open.map(lineRow).join("") : `<div class="empty"><b>Nothing to match</b>${lines.length ? "Every statement line is explained." : "Upload a bank statement (CSV) or load the sample to start."}</div>`}</div>
    <div class="f3col"><div class="f3col-h"><span>In the books, not yet on a statement · ${entries.length}</span><small>drop a statement line here</small></div>${entries.length ? entries.map(jeRow).join("") : `<div class="empty"><b>All explained</b>Every entry that moves money in ${esc(ba.name)} is on a statement.</div>`}</div></div>`;
  const pairs = matched.slice(0, 15).map((t) => { const je = byId(S.journalEntries, t.matchedJournalEntryId); const how = t.matchHow === "POST" ? "Posted as new entry" : t.matchHow === "AUTO" || t.matchedBy === "Auto-match" ? "Auto-match" : t.matchHow === "DRAG" ? "Dragged" : t.matchHow === "CLICK" ? "Clicked" : t.matchedByRuleId ? "Matching rule" : t.matchedBy || "Bank feed"; return `<tr><td class="mono" style="white-space:nowrap">${dShort(t.date)}</td><td>${esc(t.description)}</td><td class="mono">${je ? goLink(`/finance/journals/${je.id}`, je.entryNumber) : "—"}<div class="hint" style="font-family:var(--font)">${esc(je?.memo || "")}</div></td>${td(money(t.amountCents), 1)}<td class="hint">${esc(how)}${t.matchedBy && !["Auto-match", "Bank feed", "System"].includes(t.matchedBy) && t.matchHow !== "POST" ? ` · ${esc(t.matchedBy)}` : ""}</td><td class="r">${canRec && !(je && je.source === "BANK" && je.sourceId === t.id) ? `<button class="lnk" style="font-size:12px" data-a="f3Unmatch" data-id="${t.id}">Unmatch</button>` : ""}</td></tr>`; });
  return `<section class="card f3rec"><div class="card-h"><span>Bank reconciliation · ${esc(ba.name)}</span>${tools}</div><div class="card-b"><p class="f3hint">Upload the bank's CSV (Date, Description, Amount — or Debit / Credit columns). Each statement line is then matched to the ledger entry it belongs to; lines nothing explains are posted as new entries.</p>${top}${cols}</div>
    ${cardFlush(`Matched pairs <span class="hint" style="font-weight:400">· ${matched.length}${matched.length > 15 ? ", latest 15 shown" : ""}</span>`, table(["Date", "Statement line", "Ledger entry", ">Amount", "How", ""], pairs, "No matched pairs yet."), dlButton("bank-rec", "Download", { arg: ba.id, variant: "outline" })).replace('<section class="card">', '<section class="card" style="margin-top:14px">')}</section>`;
}
function vF3Banking() {
  const accts = inScope(S.bankAccounts);
  const busy = (a) => S.bankTransactions.some((t) => t.bankAccountId === a.id && t.status === "UNMATCHED") || f3OpenEntries(S, a).length;
  const cur = UI.filters.bank && accts.some((a) => a.id === UI.filters.bank) ? UI.filters.bank : (accts.find(busy) || accts[0])?.id;
  const ba = byId(S.bankAccounts, cur);
  if (!ba) return ph("Banking", "Bank activity next to the ledger's cash balance.") + card("", empty("No bank accounts in scope"));
  const txns = S.bankTransactions.filter((t) => t.bankAccountId === cur).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const gl = cashOf([ba.companyId]);
  const bankBal = ba.openingBalanceCents + txns.reduce((s, t) => s + t.amountCents, 0);
  const unmatched = txns.filter((t) => t.status === "UNMATCHED");
  const fin2 = vFin2Banking();
  const rulesAt = fin2.indexOf('<div class="sect-l">Matching rules');
  const rules = rulesAt > 0 ? fin2.slice(rulesAt) : "";
  return ph("Banking", "Bank activity next to the ledger's cash balance. Upload the statement, match every line, and the month can close.") + flashHtml()
    + `<div class="tabs">${accts.map((a) => `<button class="${a.id === cur ? "on" : ""}" data-a="bank" data-id="${a.id}">${esc(co(a.companyId).displayName)}</button>`).join("")}</div>`
    + `<div class="stats">${stat("Bank balance", money(bankBal), `${ba.institution} ${ba.accountNumberMasked}`, "primary")}${stat("Ledger cash (1010)", money(gl), "All posted entries")}${stat("Difference", money(bankBal - gl), unmatched.length ? `${f3Plural(unmatched.length, "statement line", "statement lines")} still to match` : "Fully explained", bankBal - gl === 0 ? "good" : "warn")}</div>`
    + f3Recon(ba)
    + `<div class="sect-l">Bank activity</div>` + cardFlush("", table(["Date", "Description", "Type", ">Amount", "Status", "Ledger entry"], txns.map((t) => { const je = t.matchedJournalEntryId ? byId(S.journalEntries, t.matchedJournalEntryId) : null; return `<tr><td>${dLong(t.date)}</td><td>${esc(t.description)}</td><td><span class="badge tone-grey">${esc(t.type)}</span></td>${td(`<span style="color:${t.amountCents < 0 ? "var(--t-red)" : "var(--t-green)"}">${money(t.amountCents)}</span>`, 1)}<td>${badge(t.status)}</td><td class="mono">${je ? goLink(`/finance/journals/${je.id}`, je.entryNumber) : `<span class="hint">—</span>`}</td></tr>`; }), "No bank activity yet."))
    + rules;
}
EXPORTS["bank-rec"] = (baId) => { const ba = byId(S.bankAccounts, baId) || inScope(S.bankAccounts)[0]; const lines = S.bankTransactions.filter((t) => t.bankAccountId === ba.id).sort((a, b) => (a.date < b.date ? -1 : 1)); return { base: `haico-bank-reconciliation-${ba.companyId.toLowerCase()}-${todayStr()}`, title: `Bank reconciliation — ${ba.name}`, rows: [["Date", "Description", "Type", "Amount", "Status", "Ledger entry", "Entry memo", "Matched by"], ...lines.map((t) => { const je = t.matchedJournalEntryId ? byId(S.journalEntries, t.matchedJournalEntryId) : null; return [t.date, t.description, t.type, (t.amountCents / 100).toFixed(2), t.status, je?.entryNumber || "", je?.memo || "", t.matchedBy || ""]; })] }; };
f3Route("/finance/banking", "banking.view", vF3Banking);

/* drag a statement line onto a ledger entry; clicking one then the other does the same */
let F3_DRAG = null;
function f3Match(txnId, jeId, how) { UI.filters.f3sel = null; const t = byId(S.bankTransactions, txnId), je = byId(S.journalEntries, jeId); act("bank.match", { txnId, jeId, how }, t && je ? `"${t.description}" matched with ${je.entryNumber}.` : "Matched."); }
document.addEventListener("dragstart", (ev) => { const el = ev.target.closest?.("[data-f3txn]"); if (!el || el.getAttribute("draggable") !== "true") return; F3_DRAG = el.dataset.f3txn; el.classList.add("dragging"); ev.dataTransfer.effectAllowed = "link"; try { ev.dataTransfer.setData("text/plain", F3_DRAG); } catch { /* ignore */ } });
document.addEventListener("dragend", (ev) => { ev.target.closest?.("[data-f3txn]")?.classList.remove("dragging"); document.querySelectorAll(".f3je.over,.f3je.blocked").forEach((n) => n.classList.remove("over", "blocked")); F3_DRAG = null; });
document.addEventListener("dragover", (ev) => { const z = ev.target.closest?.("[data-f3je]"); if (!z || !F3_DRAG) return; ev.preventDefault(); const t = byId(S.bankTransactions, F3_DRAG); const ok = t && String(t.amountCents) === z.dataset.cents; z.classList.toggle("over", !!ok); z.classList.toggle("blocked", !ok); ev.dataTransfer.dropEffect = ok ? "link" : "none"; });
document.addEventListener("dragleave", (ev) => { const z = ev.target.closest?.("[data-f3je]"); if (z && !z.contains(ev.relatedTarget)) z.classList.remove("over", "blocked"); });
document.addEventListener("drop", (ev) => { const z = ev.target.closest?.("[data-f3je]"); if (!z || !F3_DRAG) return; ev.preventDefault(); const id = F3_DRAG; F3_DRAG = null; z.classList.remove("over", "blocked"); f3Match(id, z.dataset.f3je, "DRAG"); });
document.addEventListener("click", (ev) => {
  if (ev.target.closest("[data-a],[data-go],a,button,input,select,label")) return;
  const l = ev.target.closest("[data-f3txn]");
  if (l) { if (l.getAttribute("draggable") !== "true") return; UI.filters.f3sel = UI.filters.f3sel === l.dataset.f3txn ? null : l.dataset.f3txn; safeRender(); return; }
  const z = ev.target.closest("[data-f3je]");
  if (z && UI.filters.f3sel) f3Match(UI.filters.f3sel, z.dataset.f3je, "CLICK");
});
document.addEventListener("keydown", (ev) => { if (ev.key !== "Enter" && ev.key !== " ") return; const l = ev.target.closest?.("[data-f3txn]"); if (l) { ev.preventDefault(); l.click(); return; } const z = ev.target.closest?.("[data-f3je]"); if (z && UI.filters.f3sel) { ev.preventDefault(); f3Match(UI.filters.f3sel, z.dataset.f3je, "CLICK"); } });

/* ==========================================================================
   2. RECURRING — one form for new and edit (no class / location tags), recurring.update
   7. DIMS — class and location columns are gone from the manual entry and the journal pages
   ========================================================================== */
function f3RjLines(p, companyId) {
  const lines = (p.lines || []).filter((l) => l.accountNumber && ((l.debitCents || 0) > 0 || (l.creditCents || 0) > 0))
    .map((l) => ({ accountNumber: String(l.accountNumber), debitCents: Number(l.debitCents) || 0, creditCents: Number(l.creditCents) || 0, description: String(l.description || "").trim() || undefined, departmentId: l.departmentId || undefined }));
  if (lines.length < 2 || lines.length > 6) fail("A recurring journal needs between 2 and 6 lines with amounts.");
  const bal = fin2Balance(lines);
  if (!bal.balanced) fail(`The lines don't balance — debits ${money(bal.debit)} vs credits ${money(bal.credit)}.`);
  const missing = [...new Set(lines.map((l) => l.accountNumber))].filter((n) => !S.accounts.some((a) => a.companyId === companyId && a.number === n && a.isActive !== false && a.isPostable !== false));
  if (missing.length) fail(`Account ${missing.join(", ")} can't be posted to in this company.`);
  return { lines, bal };
}
Object.assign(R, {
  "recurring.update"(S, p, ctx) {
    ctx.need("finance.post");
    const rj = byId(S.recurringJournals, p.id);
    if (!rj) fail("That recurring journal no longer exists.");
    ctx.company(rj.companyId);
    const name = String(p.name || "").trim();
    if (!name) fail("Give the recurring journal a name.");
    if (!FIN2_FREQ[p.frequency]) fail("Pick a frequency.");
    const dayOfMonth = Math.min(31, Math.max(1, parseInt(p.dayOfMonth, 10) || 1));
    const [y, m] = String(p.nextRunDate || "").split("-").map(Number);
    if (!y || !m) fail("Pick the next run date.");
    const nextRunDate = fin2Scheduled(y, m, dayOfMonth);
    const endDate = p.endDate || null;
    if (endDate && endDate < nextRunDate) fail("The end date is before the next run.");
    const { lines, bal } = f3RjLines(p, rj.companyId);
    const was = { name: rj.name, memo: rj.memo || null, frequency: rj.frequency, dayOfMonth: rj.dayOfMonth, nextRunDate: rj.nextRunDate, endDate: rj.endDate || null, autoReverse: !!rj.autoReverse, total: fin2Balance(rj.lines || []).debit, n: (rj.lines || []).length };
    const now = { name, memo: String(p.memo || "").trim() || null, frequency: p.frequency, dayOfMonth, nextRunDate, endDate, autoReverse: !!p.autoReverse, total: bal.debit, n: lines.length };
    const changed = [];
    if (was.name !== now.name) changed.push(`name "${was.name}" → "${now.name}"`);
    if (was.memo !== now.memo) changed.push("memo");
    if (was.frequency !== now.frequency) changed.push(`${FIN2_FREQ[was.frequency].toLowerCase()} → ${FIN2_FREQ[now.frequency].toLowerCase()}`);
    if (was.dayOfMonth !== now.dayOfMonth) changed.push(`day ${was.dayOfMonth} → ${now.dayOfMonth}`);
    if (was.nextRunDate !== now.nextRunDate) changed.push(`next run ${dLong(was.nextRunDate)} → ${dLong(now.nextRunDate)}`);
    if (was.endDate !== now.endDate) changed.push(now.endDate ? `ends ${dLong(now.endDate)}` : "no end date");
    if (was.autoReverse !== now.autoReverse) changed.push(now.autoReverse ? "now auto-reverses" : "no longer auto-reverses");
    if (was.total !== now.total || was.n !== now.n || JSON.stringify(rj.lines) !== JSON.stringify(lines)) changed.push(`lines (${f3Plural(lines.length, "line", "lines")}, ${money(bal.debit)}${was.total !== now.total ? `, was ${money(was.total)}` : ""})`);
    if (!changed.length) fail("Nothing changed.");
    Object.assign(rj, { name, memo: now.memo, frequency: p.frequency, dayOfMonth, nextRunDate, endDate, autoReverse: now.autoReverse, lines, updatedByName: ctx.actor.displayName, updatedAt: ctx.now });
    ctx.audit({ module: "finance.gl", action: "UPDATE", companyId: rj.companyId, entityType: "RecurringJournal", entityId: rj.id, summary: `${ctx.actor.displayName} edited recurring journal "${name}" (${byId(S.companies, rj.companyId).displayName}): ${changed.join("; ")}.` });
  },
});
const f3RjDraft = (rj, cid) => rj
  ? { id: rj.id, companyId: rj.companyId, name: rj.name, memo: rj.memo || "", frequency: rj.frequency, dayOfMonth: rj.dayOfMonth, nextRunDate: rj.nextRunDate, endDate: rj.endDate || "", autoReverse: !!rj.autoReverse, lines: (rj.lines || []).map((l) => ({ accountNumber: l.accountNumber, description: l.description || "", debit: l.debitCents ? (l.debitCents / 100).toFixed(2) : "", credit: l.creditCents ? (l.creditCents / 100).toFixed(2) : "", departmentId: l.departmentId || "" })) }
  : { id: null, companyId: cid, name: "", memo: "", frequency: "MONTHLY", dayOfMonth: 1, nextRunDate: fin2FirstOfNext(todayStr()), endDate: "", autoReverse: false, lines: [{}, {}] };
function f3RecurringForm(rj) {
  const cid = rj ? rj.companyId : UI.f3rj?.companyId || defCo();
  if (!UI.f3rj || UI.f3rj.id !== (rj?.id || null) || UI.f3rj.companyId !== cid) UI.f3rj = f3RjDraft(rj, cid);
  const F = UI.f3rj;
  const accts = S.accounts.filter((a) => a.companyId === cid && a.isPostable !== false && a.isActive !== false).sort((a, b) => a.number.localeCompare(b.number));
  const depts = S.departments.filter((d) => d.companyId === cid && d.isActive !== false);
  const title = rj ? `Edit · ${rj.name}` : "New recurring entry";
  const hint = rj ? `${co(rj.companyId).displayName} · ${rj.runCount || 0} run${rj.runCount === 1 ? "" : "s"} so far${rj.lastRunDate ? ` · last ${dLong(rj.lastRunDate)}` : ""}. Changes apply from the next run; entries already posted are untouched.` : "Describe the entry once. Each run posts it for the next scheduled date; accruals can undo themselves on the 1st of the following month.";
  return `<div class="crumb">${crumb("/finance/recurring", "Recurring entries")}</div>` + ph(title, hint) + flashHtml()
    + card("", `<form data-f="f3Recurring" data-id="${rj ? rj.id : ""}" id="f3RjForm"><div class="form-grid" style="margin-bottom:12px"><div class="fld"><label for="rjCo">Company</label>${rj ? `<div class="mono" style="height:38px;display:flex;align-items:center">${esc(co(rj.companyId).displayName)}</div>` : coScopeSelect("rjCo", "companyId", cid).replace('class="in"', 'class="in" data-a="f3RjCo"')}</div><div class="fld"><label for="rjName">Name</label><input class="in" id="rjName" name="name" required value="${esc(F.name)}" placeholder="e.g. Monthly insurance accrual"></div><div class="fld"><label for="rjMemo">Memo (optional)</label><input class="in" id="rjMemo" name="memo" value="${esc(F.memo)}" placeholder="What this is for"></div></div>
      <div class="form-grid" style="margin-bottom:12px"><div class="fld"><label for="rjFreq">How often</label><select class="in" id="rjFreq" name="frequency">${Object.entries(FIN2_FREQ).map(([k, l]) => opt(k, l, k === F.frequency)).join("")}</select></div><div class="fld"><label for="rjDay">Day of month</label><input class="in" id="rjDay" name="dayOfMonth" type="number" min="1" max="31" value="${esc(F.dayOfMonth)}" required><span class="hint">31 means “last day” in shorter months</span></div><div class="fld"><label for="rjNext">${rj ? "Next run" : "First run"}</label><input class="in" id="rjNext" name="nextRunDate" type="date" value="${esc(F.nextRunDate)}" required><span class="hint">The day is taken from “day of month”</span></div><div class="fld"><label for="rjEnd">Stop after (optional)</label><input class="in" id="rjEnd" name="endDate" type="date" value="${esc(F.endDate)}"></div></div>
      <label class="card" style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;margin-bottom:12px;cursor:pointer"><input type="checkbox" name="autoReverse" style="margin-top:3px" ${F.autoReverse ? "checked" : ""}><span><strong style="font-size:13px">Auto-reverse on the 1st of the next month</strong><span class="hint" style="display:block">Tick this for accruals — an estimate you book now so the month is complete, then undo when the real bill arrives.</span></span></label>
      <div class="tw"><table class="t"><thead><tr><th>Account</th><th>Note</th><th class="r">Debit</th><th class="r">Credit</th><th>Department</th><th></th></tr></thead><tbody>${F.lines.map((l, i) => `<tr><td><select class="in" style="min-width:210px" data-f3rj="accountNumber" data-i="${i}" aria-label="Account line ${i + 1}">${opt("", "— pick account —", !l.accountNumber)}${accts.map((a) => opt(a.number, `${a.number} — ${a.name}`, a.number === l.accountNumber)).join("")}</select></td><td><input class="in" style="min-width:140px" data-f3rj="description" data-i="${i}" value="${esc(l.description || "")}" aria-label="Note line ${i + 1}"></td><td><input class="in num" style="text-align:right;min-width:100px" inputmode="decimal" data-f3rj="debit" data-i="${i}" value="${esc(l.debit || "")}" aria-label="Debit line ${i + 1}"></td><td><input class="in num" style="text-align:right;min-width:100px" inputmode="decimal" data-f3rj="credit" data-i="${i}" value="${esc(l.credit || "")}" aria-label="Credit line ${i + 1}"></td><td><select class="in" style="min-width:140px" data-f3rj="departmentId" data-i="${i}" aria-label="Department line ${i + 1}" ${depts.length ? "" : "disabled"}>${opt("", "— none —", !l.departmentId)}${depts.map((d) => opt(d.id, d.name, d.id === l.departmentId)).join("")}</select></td><td>${F.lines.length > 2 ? `<button type="button" class="lnk" style="color:var(--danger);font-size:12px" data-a="f3RjDel" data-i="${i}" aria-label="Remove line ${i + 1}">remove</button>` : ""}</td></tr>`).join("")}<tr class="tot"><td colspan="2">${F.lines.length < 6 ? `<button type="button" class="lnk" data-a="f3RjAdd">+ Add line</button>` : `<span class="hint">6 lines is the maximum</span>`}</td><td class="r num" id="f3Dr"></td><td class="r num" id="f3Cr"></td><td colspan="2" id="f3Bal"></td></tr></tbody></table></div>
      <div class="form-row" style="margin-top:12px"><button class="btn pri" id="f3RjSave">${rj ? "Save changes" : "Save schedule"}</button>${rj ? `<button type="button" class="btn" data-go="/finance/recurring">Cancel</button>` : ""}<span class="hint">${rj ? "Nothing posts when you save." : "Nothing posts when you save — the first entry goes in when you press “Run now”."}</span></div></form>`);
}
function f3RjTotals() {
  const F = UI.f3rj; if (!F || !document.getElementById("f3Dr")) return;
  const dr = F.lines.reduce((s, l) => s + (toCents(l.debit) || 0), 0), cr = F.lines.reduce((s, l) => s + (toCents(l.credit) || 0), 0);
  const filled = F.lines.filter((l) => l.accountNumber && ((toCents(l.debit) || 0) > 0 || (toCents(l.credit) || 0) > 0)).length;
  const ok = dr > 0 && dr === cr && filled >= 2;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
  set("f3Dr", amount(dr)); set("f3Cr", amount(cr));
  set("f3Bal", ok ? `<span class="badge tone-green">Balanced ✓</span>` : dr === cr && dr > 0 ? `<span class="badge tone-amber">Need 2+ lines with accounts</span>` : `<span class="badge tone-amber">Off by ${amount(Math.abs(dr - cr))}</span>`);
  const b = document.getElementById("f3RjSave"); if (b) b.disabled = !ok;
}
function vF3RecurringEdit(q, id) {
  const rj = byId(S.recurringJournals, id);
  if (!rj || !canSee(A, rj.companyId)) return ph("Recurring entry not found") + card("", empty("Not in your companies"));
  return f3RecurringForm(rj);
}
function vF3RecurringNew() { return f3RecurringForm(null); }
function vF3Recurring() {
  let html = vFin2Recurring();
  html = f3Rename(html, [["<h1>Recurring &amp; Accruals</h1>", "<h1>Recurring entries</h1>"], ["+ New recurring journal", "+ New recurring entry"]]);
  if (can(A, "finance.post")) html = html.replace(/<button class="btn sm" data-a="fin2Toggle" data-id="([^"]+)">/g, (m, id) => `<button class="btn sm" data-go="/finance/recurring/${id}/edit">Edit</button>${m}`);
  return html;
}
function vF3Journal(q, id) {
  const html = vFin2Journal(q, id).split("Recurring &amp; Accruals").join("Recurring entries");
  const cut = html.indexOf('<div class="sect-l">Classes, locations');
  if (cut < 0) return html;
  const end = html.indexOf("</section>", cut);
  return html.slice(0, cut) + html.slice(end + "</section>".length);
}
f3Route("/finance/recurring", "finance.view", vF3Recurring);
f3Route("/finance/recurring/new", "finance.post", vF3RecurringNew);
f3Route("/finance/recurring/:id/edit", "finance.post", vF3RecurringEdit);
f3Route("/finance/journals", "finance.view", vJournals);
f3Route("/finance/journals/new", "finance.post", vNewJournal);
f3Route("/finance/journals/:id", "finance.view", vF3Journal);
document.addEventListener("change", (ev) => { const el = ev.target; if (el.dataset?.f3rj && UI.f3rj) { UI.f3rj.lines[+el.dataset.i][el.dataset.f3rj] = el.value; f3RjTotals(); } });
document.addEventListener("input", (ev) => { const el = ev.target; if (el.dataset?.f3rj && (el.dataset.f3rj === "debit" || el.dataset.f3rj === "credit") && UI.f3rj) { UI.f3rj.lines[+el.dataset.i][el.dataset.f3rj] = el.value; f3RjTotals(); } });
const _f3Obs = new MutationObserver(() => { if (document.getElementById("f3Dr")) f3RjTotals(); if (document.getElementById("f3CntSheet")) f3CntTotals(); });
const _f3Watch = () => { const app = document.getElementById("app"); if (app) _f3Obs.observe(app, { childList: true }); };
if (document.readyState !== "loading") _f3Watch(); else document.addEventListener("DOMContentLoaded", _f3Watch);

/* ==========================================================================
   3. PURCHASING — cancel a PO (nothing received or billed), PO view, PO history report
   ========================================================================== */
const f3PoBills = (po) => S.apInvoices.filter((b) => b.purchaseOrderId === po.id && b.status !== "CANCELLED");
const f3PoReceived = (po) => po.status === "RECEIVED" || po.status === "PARTIALLY_RECEIVED" || invPoLines(po.id).some((l) => (l.receivedQuantity || 0) > 0) || S.goodsReceipts.some((g) => g.purchaseOrderId === po.id);
const f3PoCancellable = (po) => ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"].includes(po.status) && !f3PoReceived(po) && !f3PoBills(po).length;
Object.assign(R, {
  "po.cancel"(S, p, ctx) {
    ctx.need("procurement.create");
    const po = byId(S.purchaseOrders, p.poId);
    if (!po) fail("That purchase order no longer exists.");
    ctx.company(po.companyId);
    if (po.status === "CANCELLED") fail(`${po.poNumber} is already cancelled.`);
    if (!["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"].includes(po.status)) fail(`${po.poNumber} is ${(STATUS[po.status] || [po.status])[0].toLowerCase()} — only open orders can be cancelled.`);
    const lines = S.purchaseOrderLines.filter((l) => l.purchaseOrderId === po.id);
    if (lines.some((l) => (l.receivedQuantity || 0) > 0) || S.goodsReceipts.some((g) => g.purchaseOrderId === po.id)) fail(`Goods have already been received against ${po.poNumber} — it can't be cancelled. Close it by receiving the rest, or return the goods first.`);
    const bills = S.apInvoices.filter((b) => b.purchaseOrderId === po.id && b.status !== "CANCELLED");
    if (bills.length) fail(`${po.poNumber} already has ${f3Plural(bills.length, "bill", "bills")} against it (${bills.map((b) => b.invoiceNumber).join(", ")}) — unlink or cancel the bill first.`);
    const reason = String(p.reason || "").trim();
    if (reason.length < 3) fail("Say why the order is being cancelled.");
    const was = po.status;
    Object.assign(po, { status: "CANCELLED", cancelledAt: ctx.now, cancelledByName: ctx.actor.displayName, cancelReason: reason });
    ctx.audit({ module: "procurement", action: "STATUS_CHANGE", companyId: po.companyId, entityType: "PurchaseOrder", entityId: po.id, summary: `${ctx.actor.displayName} cancelled ${po.poNumber} (${po.vendorName || vendorName(po.vendorId)}, ${money(po.amountCents ?? po.totalCents)}, was ${(STATUS[was] || [was])[0].toLowerCase()}): ${reason}` });
  },
});
function f3PoCancelModal(po) {
  return `<h3>Cancel ${esc(po.poNumber)}?</h3><p class="hint" style="margin:0 0 12px">${esc(po.vendorName || vendorName(po.vendorId))} · ${money(po.amountCents ?? po.totalCents)} · ${esc(po.description || "")}<br>Nothing has been received or billed against it, so it can be cancelled. The supplier should be told; the order stays in the history.</p>
    <form data-f="f3PoCancel" data-id="${po.id}" class="form-grid"><div class="fld" style="grid-column:1/-1"><label for="pcReason">Reason</label><input class="in" id="pcReason" name="reason" required minlength="3" placeholder="e.g. Ordered twice — PO-2026-0003 covers it"></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Keep the order</button><button class="btn dng">Cancel purchase order</button></div></form>`;
}
function vF3POs() {
  const html = vInvPOs();
  const canCreate = can(A, "procurement.create");
  return html.replace(/<tr><td class="mono"><strong>(PO-[^<]+)<\/strong>([\s\S]*?)<td class="r">([\s\S]*?)<\/td><\/tr>/g, (m, num, mid, acts) => {
    const po = S.purchaseOrders.find((p) => p.poNumber === num); if (!po) return m;
    const cancel = canCreate && f3PoCancellable(po) ? `${acts.trim() ? " " : ""}<button class="btn sm" data-a="f3PoCancel" data-id="${po.id}">Cancel PO</button>` : "";
    return `<tr><td class="mono"><strong>${goLink(`/procurement/pos/${po.id}`, num)}</strong>${mid}<td class="r" style="white-space:nowrap">${acts}${cancel}</td></tr>`;
  }).replace("<h1>Purchase Orders</h1>", "<h1>Purchase Orders</h1>");
}
function vF3PO(q, id) {
  const po = byId(S.purchaseOrders, id);
  if (!po || !inView(S, A, po.companyId)) return ph("Purchase order not found") + card("", `<button class="btn" data-go="/procurement/pos">Back to Purchase Orders</button>`);
  const lines = invPoLines(po.id), bills = f3PoBills(po), receipts = S.goodsReceipts.filter((g) => g.purchaseOrderId === po.id);
  const pr = po.requestId ? byId(S.purchaseRequests, po.requestId) : null;
  const canCreate = can(A, "procurement.create");
  const acts = [po.status === "DRAFT" && canCreate ? `<button class="btn pri" data-a="invPoSend" data-id="${po.id}">Send to supplier</button>` : "", ["SENT", "PARTIALLY_RECEIVED"].includes(po.status) && can(A, "procurement.receive") ? `<button class="btn" data-go="/procurement/receiving">Receive</button>` : "", canCreate && f3PoCancellable(po) ? `<button class="btn" style="color:var(--t-red)" data-a="f3PoCancel" data-id="${po.id}">Cancel PO</button>` : ""].join("");
  const ordered = lines.reduce((s, l) => s + l.quantity, 0), rec = lines.reduce((s, l) => s + (l.receivedQuantity || 0), 0);
  const why = po.status === "CANCELLED" ? `<div class="msg warn">Cancelled ${dTime(po.cancelledAt)} by ${esc(po.cancelledByName || "")}${po.cancelReason ? ` — ${esc(po.cancelReason)}` : ""}.</div>` : !f3PoCancellable(po) && ["SENT", "PARTIALLY_RECEIVED", "APPROVED", "DRAFT"].includes(po.status) ? `<div class="msg info">This order can't be cancelled any more: ${f3PoReceived(po) ? "goods have been received against it" : bills.length ? "a vendor bill is tied to it" : ""}.</div>` : "";
  const history = S.audit.filter((a) => (a.entityType === "PurchaseOrder" && a.entityId === po.id) || (a.summary || "").includes(po.poNumber)).reverse();
  return ph(po.poNumber, `${po.vendorName || vendorName(po.vendorId)} · ${co(po.companyId).displayName}${po.orderDate ? ` · ordered ${dLong(po.orderDate)}` : ""} · ${po.description || ""}`, invBadge(po.status) + acts, crumb("/procurement/pos", "Purchase Orders")) + flashHtml() + why
    + `<div class="grid g3">${card("Details", `<dl class="kv"><dt>Supplier</dt><dd>${esc(po.vendorName || vendorName(po.vendorId))}</dd><dt>Requested by</dt><dd>${esc(po.requesterName || po.createdByName || "—")}</dd><dt>Terms</dt><dd>${esc(po.terms || "—")}</dd>${po.requiredDate ? `<dt>Needed by</dt><dd>${dLong(po.requiredDate)}</dd>` : ""}${pr ? `<dt>From request</dt><dd>${goLink("/procurement/requests", pr.requestNumber)}</dd>` : ""}${po.sentAt ? `<dt>Sent</dt><dd>${dTime(po.sentAt)} · ${esc(po.sentByName || "")}</dd>` : ""}${po.receivedAt ? `<dt>Received</dt><dd>${dTime(po.receivedAt)} · ${esc(po.receivedByName || "")}</dd>` : ""}</dl>`)}
      ${card("Amounts", `<dl class="kv"><dt>Before tax</dt><dd class="num">${money(po.subtotalCents ?? Math.round((po.amountCents || 0) / 1.05))}</dd><dt>GST</dt><dd class="num">${money(po.taxCents ?? (po.amountCents || 0) - Math.round((po.amountCents || 0) / 1.05))}</dd><dt>Total</dt><dd class="num"><strong>${money(po.amountCents ?? po.totalCents)}</strong></dd><dt>Received</dt><dd>${lines.length ? `${invQty(rec)} of ${invQty(ordered)} units` : po.status === "RECEIVED" ? "In full" : "Nothing yet"}</dd><dt>Billed</dt><dd class="num">${money(bills.reduce((s, b) => s + b.totalCents, 0))}${bills.length ? ` · ${f3Plural(bills.length, "bill", "bills")}` : ""}</dd></dl>`)}
      ${card("Notes", po.notes ? `<p style="margin:0;font-size:13px">${esc(po.notes)}</p>` : `<p class="hint" style="margin:0">No notes on this order.</p>`)}</div>`
    + `<div class="grid g2" style="margin-top:14px">${cardFlush("Lines", table(["Description", "Account", ">Qty", ">Each", ">Amount", ">Received"], lines.map((l) => `<tr><td>${esc(l.description)}</td><td class="mono">${esc(l.accountNumber || "")}</td>${td(invQty(l.quantity), 1)}${td(money(l.unitCents), 1)}${td(money(l.amountCents), 1)}${td(invQty(l.receivedQuantity || 0), 1)}</tr>`), "This order has no itemised lines — it was created from a purchase request."))}
      ${cardFlush("Bills and receipts", table(["Document", "Date", ">Amount", "Status"], [...bills.map((b) => `<tr class="click" data-go="/finance/ap/${b.id}"><td class="mono">Bill ${esc(b.invoiceNumber)}</td><td>${dLong(b.invoiceDate)}</td>${td(money(b.totalCents), 1)}<td>${badge(b.status)}${b.matchStatus ? ` ${invBadge(b.matchStatus)}` : ""}</td></tr>`), ...receipts.map((g) => `<tr><td class="mono">${esc(g.receiptNumber)}</td><td>${dLong(g.receivedDate)}</td>${td("—", 1)}<td>${esc(g.receivedByName || "")}</td></tr>`)], "No bills or goods receipts against this order yet."))}</div>`
    + `<div style="height:14px"></div>` + cardFlush("History", table(["When", "Who", "What happened"], history.map((a) => `<tr><td style="white-space:nowrap">${esc(dTime(a.at))}</td><td>${esc(a.actorName)}</td><td>${esc(a.summary)}</td></tr>`), "Nothing recorded for this order in this session."));
}
/* PO history report */
const f3PoF = () => (UI.filters.poh = UI.filters.poh || { q: "", vendor: "", status: "", from: "", to: "" });
function f3PoHistoryRows() {
  const F = f3PoF();
  const ql = F.q.trim().toLowerCase();
  return inScope(S.purchaseOrders).filter((p) => (!ql || `${p.poNumber} ${p.description || ""} ${p.vendorName || vendorName(p.vendorId)}`.toLowerCase().includes(ql)) && (!F.vendor || (p.vendorName || vendorName(p.vendorId)) === F.vendor) && (!F.status || p.status === F.status) && (!F.from || (p.orderDate || p.createdAt.slice(0, 10)) >= F.from) && (!F.to || (p.orderDate || p.createdAt.slice(0, 10)) <= F.to))
    .map((p) => { const ls = invPoLines(p.id), bills = f3PoBills(p); const ordered = ls.reduce((s, l) => s + l.quantity, 0), rec = ls.reduce((s, l) => s + (l.receivedQuantity || 0), 0); return { p, date: p.orderDate || p.createdAt.slice(0, 10), vendor: p.vendorName || vendorName(p.vendorId), received: ls.length ? `${invQty(rec)} / ${invQty(ordered)}` : p.status === "RECEIVED" ? "in full" : "—", billed: bills.reduce((s, b) => s + b.totalCents, 0), bills: bills.map((b) => b.invoiceNumber).join(", "), last: S.audit.filter((a) => a.entityType === "PurchaseOrder" && a.entityId === p.id).pop() }; })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.p.poNumber < b.p.poNumber ? 1 : -1));
}
function vF3PoHistory() {
  const F = f3PoF();
  const all = inScope(S.purchaseOrders);
  const vendors = [...new Set(all.map((p) => p.vendorName || vendorName(p.vendorId)))].filter(Boolean).sort();
  const statuses = [...new Set(all.map((p) => p.status))];
  const rows = f3PoHistoryRows();
  const total = rows.reduce((s, r) => s + (r.p.amountCents ?? r.p.totalCents ?? 0), 0);
  const byStatus = new Map(); for (const r of rows) byStatus.set(r.p.status, (byStatus.get(r.p.status) || 0) + (r.p.amountCents ?? r.p.totalCents ?? 0));
  return ph("Purchase order history", "Every purchase order in view — search by number, supplier, status or date, then download the list.", dlButton("po-history", "Download", { variant: "outline" }), crumb("/reports", "Reports")) + flashHtml()
    + `<form data-f="f3PoFilter" class="f3bar"><input class="in apx-q" type="search" name="q" value="${esc(F.q)}" placeholder="PO number, description or supplier…" aria-label="Search purchase orders"><div class="fld"><label for="pohV">Supplier</label><select class="in" id="pohV" name="vendor">${opt("", "All suppliers", !F.vendor)}${vendors.map((v) => opt(v, v, v === F.vendor)).join("")}</select></div><div class="fld"><label for="pohS">Status</label><select class="in" id="pohS" name="status">${opt("", "Any status", !F.status)}${statuses.map((s) => opt(s, invLabel(s), s === F.status)).join("")}</select></div><div class="fld"><label for="pohF">From</label><input class="in" type="date" id="pohF" name="from" value="${esc(F.from)}"></div><div class="fld"><label for="pohT">To</label><input class="in" type="date" id="pohT" name="to" value="${esc(F.to)}"></div><button class="btn">Apply</button>${F.q || F.vendor || F.status || F.from || F.to ? `<button type="button" class="lnk" data-a="f3PoReset">Clear</button>` : ""}</form>`
    + `<div class="inv-side"><div class="stats" style="margin:0">${stat("Purchase orders", String(rows.length), `of ${all.length} in view`)}${stat("Order value", money(total), "Including GST", "primary")}${stat("Open", String(rows.filter((r) => INV_OPEN_PO.includes(r.p.status)).length), `Draft, sent or partly received · ${rows.filter((r) => r.p.status === "CANCELLED").length} cancelled`)}</div><section class="card" style="padding:14px 16px">${donut([...byStatus.entries()].map(([s, v]) => ({ label: invLabel(s), v, d: moneyCompact(v), fmt: moneyCompact })), { title: "Value by status", total: moneyCompact(total), caption: "incl. GST", size: 120 })}</section></div>`
    + `<div style="height:14px"></div>` + cardFlush("", table(["PO", "Date", "Supplier", "Company", "What", ">Amount", "Received", ">Billed", "Status", "Last activity"], rows.map((r) => `<tr class="click" data-go="/procurement/pos/${r.p.id}"><td class="mono"><strong>${esc(r.p.poNumber)}</strong></td><td class="mono">${dLong(r.date)}</td><td>${esc(r.vendor)}</td><td>${coTag(r.p.companyId)}</td><td>${esc(r.p.description || "—")}${r.bills ? `<div class="hint">Bills: ${esc(r.bills)}</div>` : ""}</td>${td(money(r.p.amountCents ?? r.p.totalCents), 1)}<td class="mono">${esc(r.received)}</td>${td(r.billed ? money(r.billed) : "—", 1)}<td>${invBadge(r.p.status)}${r.p.status === "CANCELLED" && r.p.cancelReason ? `<div class="hint">${esc(r.p.cancelReason)}</div>` : ""}</td><td class="hint">${r.last ? `${esc(dTime(r.last.at))} · ${esc(r.last.actorName)}` : "—"}</td></tr>`), "No purchase orders match."));
}
EXPORTS["po-history"] = () => ({ base: `haico-po-history-${todayStr()}`, title: "Purchase order history", rows: [["PO", "Date", "Supplier", "Company", "Description", "Amount", "Received", "Billed", "Bills", "Status", "Created by", "Cancelled by", "Cancel reason"], ...f3PoHistoryRows().map((r) => [r.p.poNumber, r.date, r.vendor, co(r.p.companyId).displayName, r.p.description || "", ((r.p.amountCents ?? r.p.totalCents ?? 0) / 100).toFixed(2), r.received, (r.billed / 100).toFixed(2), r.bills, invLabel(r.p.status), r.p.createdByName || "", r.p.cancelledByName || "", r.p.cancelReason || ""])] });
function vF3ReportsHub() {
  const html = vReportsHub();
  if (!(can(A, "procurement.view") || can(A, "reports.view"))) return html;
  const cardHtml = `<button class="rcard" data-go="/reports/po-history"><span class="ri" aria-hidden>🧾</span><b>Purchase order history</b><small>Every PO by supplier, status and date — with what was received and billed.</small><em>Open →</em></button>`;
  const k = html.indexOf('data-go="/reports/trial-balance"');
  if (k < 0) return html + `<h2 class="h2" style="margin-top:18px">Purchasing</h2><div class="grid g3">${cardHtml}</div>`;
  const end = html.indexOf("</button>", k) + "</button>".length;
  return html.slice(0, end) + cardHtml + html.slice(end);
}
f3Route("/procurement/pos", "procurement.view", vF3POs);
f3Route("/procurement/pos/:id", "procurement.view", vF3PO);
f3Route("/reports/po-history", () => can(A, "procurement.view") || can(A, "reports.view"), vF3PoHistory);
f3Route("/reports", () => can(A, "reports.view") || Object.values(REP).some((r) => r.allowed()), vF3ReportsHub);

/* ==========================================================================
   4. AP-FILES — "Invoice Files": kinds, filters, link a file to a bill or vendor
   ========================================================================== */
const F3_DOC_KINDS = { INVOICE: "Invoice copy", CREDIT: "Credit note", RECEIPT: "Proof of delivery", STATEMENT: "Statement", CONTRACT: "Contract / agreement", CERT: "Certificate / tax form", OTHER: "Other" };
const F3_CAT_TO_KIND = { VENDOR_INVOICE: "INVOICE", VENDOR_CONTRACT: "CONTRACT", VENDOR_INSURANCE: "CERT", VENDOR_PRICE_LIST: "OTHER", VENDOR_STATEMENT: "STATEMENT", VENDOR_OTHER: "OTHER" };
const F3_KIND_TO_CAT = { INVOICE: "VENDOR_INVOICE", CREDIT: "VENDOR_INVOICE", RECEIPT: "VENDOR_OTHER", STATEMENT: "VENDOR_STATEMENT", CONTRACT: "VENDOR_CONTRACT", CERT: "VENDOR_INSURANCE", OTHER: "VENDOR_OTHER" };
const f3KindOf = (f) => f.docType || F3_CAT_TO_KIND[f.category] || (f.entityType === "ApInvoice" ? "INVOICE" : "OTHER");
const f3KindBadge = (k) => `<span class="badge ${k === "INVOICE" ? "tone-teal" : k === "CREDIT" ? "tone-amber" : "tone-grey"}">${esc(F3_DOC_KINDS[k] || "Other")}</span>`;
const f3CanFile = (auth) => ["ap.create", "ap.approve", "ap.pay"].some((p) => can(auth, p));
function f3FileTarget(S, entityType, entityId) {
  if (entityType === "ApInvoice") { const b = byId(S.apInvoices, entityId); if (!b) fail("That bill no longer exists."); if (b.status === "CANCELLED") fail(`Bill ${b.invoiceNumber} is cancelled — files can't be linked to it.`); return { companyId: b.companyId, vendorId: b.vendorId, label: `bill ${b.invoiceNumber} from ${byId(S.vendors, b.vendorId)?.name || "the vendor"}` }; }
  if (entityType === "Vendor") { const v = byId(S.vendors, entityId); if (!v || v.deletedAt) fail("That vendor no longer exists."); return { companyId: v.companyId, vendorId: v.id, label: `vendor ${v.name}` }; }
  fail("Files can be linked to a vendor bill or to a vendor.");
}
Object.assign(R, {
  "ap.attach"(S, p, ctx) {
    if (!f3CanFile(ctx.auth)) fail("Your role can't add files to vendor bills or vendors.");
    const t = f3FileTarget(S, p.entityType, p.entityId);
    ctx.company(t.companyId);
    const kind = F3_DOC_KINDS[p.docType] ? p.docType : p.entityType === "ApInvoice" ? "INVOICE" : "OTHER";
    if (p.fileId) {
      const f = (S.files || []).find((x) => x.id === p.fileId && !x.removedAt && AP_FILE_TYPES.includes(x.entityType));
      if (!f) fail("That file is already gone.");
      if (f.companyId !== t.companyId) fail("That file belongs to another company's vendor.");
      const from = f3FileTarget(S, f.entityType, f.entityId).label;
      if (f.entityType === p.entityType && f.entityId === p.entityId) fail(`“${f.fileName}” is already linked to ${t.label}.`);
      Object.assign(f, { entityType: p.entityType, entityId: p.entityId, category: F3_KIND_TO_CAT[kind] || f.category, docType: p.docType && F3_DOC_KINDS[p.docType] ? p.docType : f.docType, isSourceDocument: p.entityType === "ApInvoice" ? !(S.files || []).some((x) => x !== f && x.entityType === "ApInvoice" && x.entityId === p.entityId && !x.removedAt && x.isSourceDocument) : false, linkedByName: ctx.actor.displayName, linkedAt: ctx.now });
      ctx.audit({ module: "finance.ap", action: "ATTACH", companyId: t.companyId, entityType: p.entityType, entityId: p.entityId, summary: `${ctx.actor.displayName} linked “${f.fileName}” (${F3_DOC_KINDS[f3KindOf(f)].toLowerCase()}) to ${t.label} — it was on ${from}.` });
      return;
    }
    const list = (p.files || []).filter((f) => f && f.name).slice(0, 8);
    if (!list.length) fail("Drop or choose a file first.");
    for (const f of list) if (!FILE_TYPES.includes(f.type)) fail(`${f.name}: only PDF, JPG and PNG files can be attached.`);
    S.files = S.files || [];
    const hasSource = p.entityType === "ApInvoice" && S.files.some((x) => x.entityType === "ApInvoice" && x.entityId === p.entityId && !x.removedAt && x.isSourceDocument);
    list.forEach((f, i) => {
      const name = String(f.name).slice(0, 120);
      S.files.push({ id: ctx.id("apf"), entityType: p.entityType, entityId: p.entityId, companyId: t.companyId, fileName: name, mimeType: f.type, sizeBytes: Number(f.size) || 0, category: F3_KIND_TO_CAT[kind], docType: kind, title: name.replace(/\.[^.]+$/, ""), isSourceDocument: kind === "INVOICE" && p.entityType === "ApInvoice" && !hasSource && i === 0, data: f.data && String(f.data).length < FILE_KEEP_MAX * 1.4 ? f.data : undefined, uploadedByName: ctx.actor.displayName, createdAt: ctx.now });
    });
    ctx.audit({ module: "finance.ap", action: "ATTACH", companyId: t.companyId, entityType: p.entityType, entityId: p.entityId, summary: `${ctx.actor.displayName} attached ${list.length === 1 ? `“${list[0].name}”` : `${list.length} files`} (${F3_DOC_KINDS[kind].toLowerCase()}) to ${t.label}.` });
  },
  "ap.detach"(S, p, ctx) {
    if (!f3CanFile(ctx.auth)) fail("Your role can't remove files from vendor bills or vendors.");
    const f = (S.files || []).find((x) => x.id === p.fileId && AP_FILE_TYPES.includes(x.entityType));
    if (!f || f.removedAt) fail("That file has already been removed.");
    ctx.company(f.companyId);
    const label = f3FileTarget(S, f.entityType, f.entityId).label;
    f.removedAt = ctx.now; f.removedByName = ctx.actor.displayName;
    ctx.audit({ module: "finance.ap", action: "DETACH", companyId: f.companyId, entityType: f.entityType, entityId: f.entityId, summary: `${ctx.actor.displayName} removed “${f.fileName}” (${F3_DOC_KINDS[f3KindOf(f)].toLowerCase()}) from ${label}.` });
  },
  "ap.fileKind"(S, p, ctx) {
    if (!f3CanFile(ctx.auth)) fail("Your role can't change files on vendor bills or vendors.");
    const f = (S.files || []).find((x) => x.id === p.fileId && !x.removedAt && AP_FILE_TYPES.includes(x.entityType));
    if (!f) fail("That file is already gone.");
    if (!F3_DOC_KINDS[p.docType]) fail("Pick what kind of document this is.");
    ctx.company(f.companyId);
    const was = f3KindOf(f);
    if (was === p.docType) fail(`“${f.fileName}” is already marked as ${F3_DOC_KINDS[was].toLowerCase()}.`);
    f.docType = p.docType; f.category = F3_KIND_TO_CAT[p.docType] || f.category;
    ctx.audit({ module: "finance.ap", action: "UPDATE", companyId: f.companyId, entityType: f.entityType, entityId: f.entityId, summary: `${ctx.actor.displayName} marked “${f.fileName}” as ${F3_DOC_KINDS[p.docType].toLowerCase()} (was ${F3_DOC_KINDS[was].toLowerCase()}).` });
  },
});
const f3ApF = () => (UI.filters.apfx = UI.filters.apfx || { q: "", vendor: "", kind: "", co: "" });
function f3ApFileRows() {
  const F = f3ApF();
  const ids = scopeIds(S, A);
  if (F.co && !ids.includes(F.co)) F.co = "";
  const ql = F.q.trim().toLowerCase();
  return apFilesAll().filter((f) => ids.includes(f.companyId) && (!F.co || f.companyId === F.co)).map((f) => ({ f, bill: f.entityType === "ApInvoice" ? byId(S.apInvoices, f.entityId) : null, v: apVendorOf(f), kind: f3KindOf(f) }))
    .filter((r) => (!F.vendor || r.v?.id === F.vendor) && (!F.kind || r.kind === F.kind) && (!ql || `${r.f.fileName} ${r.f.title || ""} ${r.v?.name || ""} ${r.v?.vendorNumber || ""} ${r.bill?.invoiceNumber || ""} ${r.f.uploadedByName || ""}`.toLowerCase().includes(ql)))
    .sort((a, b) => (a.f.createdAt < b.f.createdAt ? 1 : -1));
}
function f3FileLinkModal(f) {
  const v = apVendorOf(f);
  const bills = S.apInvoices.filter((b) => b.companyId === f.companyId && b.status !== "CANCELLED" && (!v || b.vendorId === v.id)).sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : -1));
  const vendors = S.vendors.filter((x) => x.companyId === f.companyId && !x.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
  const cur = `${f.entityType}|${f.entityId}`;
  return `<h3>Link “${esc(f.fileName)}”</h3><p class="hint" style="margin:0 0 12px">Move this file onto the bill it belongs to, or onto the vendor's own record. It is currently on ${esc(f3FileTarget(S, f.entityType, f.entityId).label)}.</p>
    <form data-f="f3FileLink" data-id="${f.id}" class="form-grid"><div class="fld" style="grid-column:1/-1"><label for="flTarget">Link to</label><select class="in" id="flTarget" name="target" required><optgroup label="Bills${v ? ` from ${esc(v.name)}` : ""}">${bills.map((b) => opt(`ApInvoice|${b.id}`, `Bill ${b.invoiceNumber} · ${dLong(b.invoiceDate)} · ${money(b.totalCents)} · ${(STATUS[b.status] || [b.status])[0]}`, cur === `ApInvoice|${b.id}`)).join("") || opt("", "— no bills from this vendor —")}</optgroup><optgroup label="Vendors">${vendors.map((x) => opt(`Vendor|${x.id}`, `Vendor record · ${x.name}`, cur === `Vendor|${x.id}`)).join("")}</optgroup></select></div>
    <div class="fld"><label for="flKind">What it is</label><select class="in" id="flKind" name="docType">${Object.entries(F3_DOC_KINDS).map(([k, l]) => opt(k, l, k === f3KindOf(f))).join("")}</select></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Link file</button></div></form>`;
}
function vF3ApFiles() {
  const F = f3ApF();
  const rows = f3ApFileRows();
  const ids = scopeIds(S, A), cos = S.companies.filter((c) => ids.includes(c.id));
  const vendors = [...new Set(apFilesAll().filter((f) => ids.includes(f.companyId)).map((f) => apVendorOf(f)?.id))].map((id) => byId(S.vendors, id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  const openBills = inScope(S.apInvoices).filter((b) => apOpenStatuses.includes(b.status)), missing = openBills.filter((b) => !apBillFileCount(b));
  const canEdit = f3CanFile(A);
  const filtered = !!(F.q || F.vendor || F.kind || F.co);
  const chart = openBills.length ? donut([{ label: "Open bills with their invoice", v: openBills.length - missing.length, d: f3Plural(openBills.length - missing.length, "bill", "bills"), color: "var(--moss)" }, { label: "Still need a copy", v: missing.length, d: f3Plural(missing.length, "bill", "bills"), color: "var(--ochre)" }], { title: "Open bills with their invoice", total: `${Math.round(((openBills.length - missing.length) / openBills.length) * 100)}%`, caption: "on file", size: 110, thick: 14 }) : "";
  const kindCount = (k) => rows.filter((r) => !k || r.kind === k).length;
  const bar = `<div class="f3bar"><input class="in apx-q" type="search" placeholder="Search files — vendor, bill number, file name, who added it" aria-label="Search files" value="${esc(F.q)}" data-apq="apfx" data-filter="f3FilesT">
      ${cos.length > 1 ? `<select class="in" aria-label="Company" data-a="f3ApSet" data-f="co">${opt("", "All companies", !F.co)}${cos.map((c) => opt(c.id, c.displayName, F.co === c.id)).join("")}</select>` : ""}
      <select class="in" aria-label="Vendor" data-a="f3ApSet" data-f="vendor" style="max-width:220px">${opt("", "All vendors", !F.vendor)}${vendors.map((v) => opt(v.id, v.name, F.vendor === v.id)).join("")}</select>
      ${filtered ? `<button class="lnk" data-a="f3ApClear">Clear</button>` : ""}</div>
    <div class="f3chips"><button class="hchip ${!F.kind ? "on" : ""}" data-a="f3ApSet" data-f="kind" data-v="">Every kind of file <span>${apFilesAll().filter((f) => ids.includes(f.companyId)).length}</span></button>${Object.entries(F3_DOC_KINDS).map(([k, l]) => `<button class="hchip ${F.kind === k ? "on" : ""}" data-a="f3ApSet" data-f="kind" data-v="${k}">${esc(l)} <span>${apFilesAll().filter((f) => ids.includes(f.companyId) && f3KindOf(f) === k).length}</span></button>`).join("")}</div>`;
  const body = rows.length ? table(["File", "What it is", "Vendor", "Bill", ">Amount", "Bill status", ""], rows.map(({ f, bill, v, kind }) => `<tr><td>${apFileBtn(f)}<div class="hint">${apKind(f.mimeType)} · ${fmtSize(f.sizeBytes)}${f.isSourceDocument ? " · original" : ""} · ${coTag(f.companyId)} · added by ${esc(f.uploadedByName || "System")} ${dShort(String(f.createdAt).slice(0, 10))}</div></td><td>${canEdit ? `<select class="in f3kind" data-a="f3FileKind" data-id="${esc(f.id)}" aria-label="Kind of ${esc(f.fileName)}">${Object.entries(F3_DOC_KINDS).map(([k, l]) => opt(k, l, k === kind)).join("")}</select>` : f3KindBadge(kind)}</td><td>${apVendLink(v)}</td><td>${bill ? `<button class="lnk mono" data-go="/finance/ap/${esc(bill.id)}">${esc(bill.invoiceNumber)}</button><div class="hint">${dLong(bill.invoiceDate)}</div>` : `<span class="hint">vendor document</span>`}</td>${td(bill ? money(bill.totalCents) : "—", 1)}<td>${bill ? badge(bill.status) : `<span class="hint">—</span>`}</td><td class="r" style="white-space:nowrap"><button class="btn sm" data-a="openFile" data-id="${esc(f.id)}">Open</button>${canEdit ? ` <button class="lnk" style="font-size:12px;margin-left:6px" data-a="f3FileLink" data-id="${esc(f.id)}">Link…</button> <button class="lnk" style="font-size:12px;margin-left:6px;color:var(--danger)" data-a="f3FileDetach" data-id="${esc(f.id)}" aria-label="Remove ${esc(f.fileName)}">Remove</button>` : ""}</td></tr>`)).replace(`<table class="t">`, `<table class="t" id="f3FilesT">`)
    : empty(filtered ? "No files match" : "No files yet", filtered ? " — change the vendor or kind." : " — open a bill and drag the vendor's PDF onto it.");
  const add = canEdit ? card("Add a file", `<p class="hint" style="margin:0 0 10px">Pick the bill or vendor the file belongs to and what it is, then drop the PDF.</p><div class="f3bar"><div class="fld" style="flex:1;min-width:240px"><label for="f3apTarget">Belongs to</label><select class="in" id="f3apTarget" data-a="f3ApTarget">${opt("", "— pick a bill or vendor —", !UI.filters.f3apTarget)}<optgroup label="Bills">${inScope(S.apInvoices).filter((b) => b.status !== "CANCELLED").sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : -1)).map((b) => opt(`ApInvoice|${b.id}`, `Bill ${b.invoiceNumber} · ${vendorName(b.vendorId)} · ${money(b.totalCents)}`, UI.filters.f3apTarget === `ApInvoice|${b.id}`)).join("")}</optgroup><optgroup label="Vendors">${inScope(S.vendors).filter((v) => !v.deletedAt).sort((a, b) => a.name.localeCompare(b.name)).map((v) => opt(`Vendor|${v.id}`, `Vendor · ${v.name}`, UI.filters.f3apTarget === `Vendor|${v.id}`)).join("")}</optgroup></select></div><div class="fld"><label for="f3apKind">What it is</label><select class="in" id="f3apKind" data-a="f3ApKind">${Object.entries(F3_DOC_KINDS).map(([k, l]) => opt(k, l, k === (UI.filters.f3apKind || "INVOICE"))).join("")}</select></div></div>${apDrop("f3ap", "Drag & drop the file here, or click to choose", "PDF, JPG or PNG · attached when you press Attach")}<div class="form-row" style="margin-top:10px"><button class="btn pri" data-a="f3ApAttach">Attach</button></div>`, "", "inv-soft") : "";
  return ph("Invoice Files", "Every vendor invoice and document in one place. Search by vendor, bill number or file name — then open it, mark what it is, or link it to the right bill.", dlButton("ap-files", "Download", { variant: "outline" })) + flashHtml()
    + `<div class="apx-top"><div><div class="stats" style="margin:0 0 12px">${stat("Files", String(rows.length), filtered ? `of ${apFilesAll().filter((f) => ids.includes(f.companyId)).length} in view` : "invoice copies and vendor documents")}${stat("Open bills without a copy", String(missing.length), missing.length ? "attach the invoice before paying" : "every open bill has its invoice", missing.length ? "warn" : "good")}</div>${bar}</div>${chart ? `<div class="card" style="padding:10px 14px">${chart}</div>` : ""}</div>`
    + cardFlush("", body + (rows.length ? `<div class="hint" style="padding:8px 16px;border-top:1px solid var(--border)">${f3Plural(rows.length, "file", "files")}</div>` : ""))
    + (missing.length ? `<div class="sect-l">Open bills without an invoice copy (${missing.length})</div>` + cardFlush("", table(["Bill", "Vendor", "Due", ">Total", ""], missing.map((b) => `<tr><td class="mono"><strong>${goLink(`/finance/ap/${b.id}`, b.invoiceNumber)}</strong></td><td>${esc(vendorName(b.vendorId))}<div class="hint">${esc(b.description)}</div></td><td>${dLong(b.dueDate)}</td>${td(money(b.totalCents), 1)}<td class="r">${canEdit ? `<button class="btn sm" data-go="/finance/ap/${b.id}">Attach the invoice</button>` : ""}</td></tr>`))) : "")
    + (add ? `<div style="height:14px"></div>${add}` : "");
}
EXPORTS["ap-files"] = () => ({ base: `haico-invoice-files-${todayStr()}`, title: "Invoice Files", rows: [["File", "What it is", "Vendor", "Bill", "Company", "Amount", "Bill status", "Added by", "Date", "Size (KB)"], ...f3ApFileRows().map(({ f, bill, v, kind }) => [f.fileName, F3_DOC_KINDS[kind], v?.name || "", bill?.invoiceNumber || "", co(f.companyId)?.displayName || "", bill ? (bill.totalCents / 100).toFixed(2) : "", bill?.status || "", f.uploadedByName || "System", String(f.createdAt).slice(0, 10), Math.max(1, Math.ceil((f.sizeBytes || 0) / 1024))])] });
f3Route("/finance/ap/attachments", "ap.view", vF3ApFiles);
f3Route("/finance/ap-files", "ap.view", vF3ApFiles);

/* ==========================================================================
   5. MATCH — link a bill to a purchase order, then run the 3-way match
   ========================================================================== */
Object.assign(R, {
  "ap.linkPo"(S, p, ctx) {
    if (!can(ctx.auth, "ap.create") && !can(ctx.auth, "ap.approve")) fail("Your role doesn't allow this.");
    const inv = byId(S.apInvoices, p.invoiceId);
    if (!inv) fail("That bill no longer exists.");
    ctx.company(inv.companyId);
    if (inv.status === "CANCELLED") fail(`Bill ${inv.invoiceNumber} is cancelled.`);
    if (!p.poId) {
      if (!inv.purchaseOrderId) fail(`${inv.invoiceNumber} isn't tied to a purchase order.`);
      const old = byId(S.purchaseOrders, inv.purchaseOrderId);
      delete inv.purchaseOrderId; delete inv.matchStatus; delete inv.matchNote; delete inv.matchedAt;
      ctx.audit({ module: "procurement", action: "UPDATE", companyId: inv.companyId, entityType: "ApInvoice", entityId: inv.id, summary: `${ctx.actor.displayName} unlinked bill ${inv.invoiceNumber} from ${old?.poNumber || "its purchase order"}.` });
      return;
    }
    const po = byId(S.purchaseOrders, p.poId);
    if (!po || po.companyId !== inv.companyId) fail("Choose a purchase order from the same company as the bill.");
    if (po.status === "CANCELLED") fail(`${po.poNumber} was cancelled — pick another order.`);
    if (po.vendorId && po.vendorId !== inv.vendorId) fail(`${po.poNumber} is with ${po.vendorName || vendorName(po.vendorId)}, not ${vendorName(inv.vendorId)}.`);
    if (inv.purchaseOrderId === po.id) fail(`${inv.invoiceNumber} is already tied to ${po.poNumber}.`);
    inv.purchaseOrderId = po.id; delete inv.matchStatus; delete inv.matchNote; delete inv.matchedAt;
    ctx.audit({ module: "procurement", action: "UPDATE", companyId: inv.companyId, entityType: "ApInvoice", entityId: inv.id, summary: `${ctx.actor.displayName} linked bill ${inv.invoiceNumber} (${vendorName(inv.vendorId)}, ${money(inv.totalCents)}) to ${po.poNumber} (${money(po.amountCents ?? po.totalCents)}).` });
  },
});
function vF3Match() {
  let html = vMatch().replace("<h1>3-Way Match</h1>", "<h1>3-way match</h1>");
  const canLink = can(A, "ap.create") || can(A, "ap.approve");
  const unlinked = inScope(S.apInvoices).filter((i) => !i.purchaseOrderId && !["PAID", "CANCELLED", "VOID"].includes(i.status)).sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : -1));
  const section = `<div class="sect-l">Bills not tied to a purchase order</div>` + cardFlush("", table(["Bill", "Vendor", ">Before tax", ">Total", "Status", "Purchase order", ""], unlinked.map((i) => { const pos = S.purchaseOrders.filter((p) => p.companyId === i.companyId && p.status !== "CANCELLED" && (!p.vendorId || p.vendorId === i.vendorId)).sort((a, b) => (a.poNumber < b.poNumber ? 1 : -1)); return `<tr><td class="mono"><strong>${goLink(`/finance/ap/${i.id}`, i.invoiceNumber)}</strong><div class="hint" style="font-family:var(--font)">${dLong(i.invoiceDate)}</div></td><td>${esc(vendorName(i.vendorId))}<div class="hint">${esc(i.description)}</div></td>${td(money(i.subtotalCents), 1)}${td(money(i.totalCents), 1)}<td>${badge(i.status)}</td><td>${pos.length ? `<select class="in" style="height:30px;max-width:320px" id="ulk_${i.id}" aria-label="Purchase order for ${esc(i.invoiceNumber)}">${pos.map((p) => opt(p.id, `${p.poNumber} · ${p.description || ""} · ${money(p.amountCents ?? p.totalCents)} · ${invLabel(p.status)}`)).join("")}</select>` : `<span class="hint">no orders with ${esc(vendorName(i.vendorId))}</span>`}</td><td class="r">${pos.length && canLink ? `<button class="btn sm pri" data-a="f3LinkPo" data-id="${i.id}" data-sel="ulk_${i.id}">Link and match</button>` : ""}</td></tr>`; }), "Every open bill is tied to a purchase order."));
  const k = html.indexOf('<section class="card inv-soft">');
  return k > 0 ? html.slice(0, k) + section + html.slice(k) : html + section;
}
f3Route("/procurement/match", () => can(A, "procurement.view") || can(A, "ap.view"), vF3Match);

/* ==========================================================================
   9. SALES — B's status chips on the sales orders list (A's layout kept)
   ========================================================================== */
const F3_SO_GROUPS = { OPENISH: ["Open", (o) => ["DRAFT", "CONFIRMED", "PARTIALLY_SHIPPED"].includes(o.status)], CONFIRM: ["To confirm", (o) => o.status === "DRAFT"], SHIP: ["To ship", (o) => ["CONFIRMED", "PARTIALLY_SHIPPED"].includes(o.status)], BILL: ["To invoice", (o) => o.status !== "CANCELLED" && soLines(o).some((l) => l.shippedQuantity > (l.invoicedQuantity || 0) + 1e-9)], DONE: ["Invoiced", (o) => ["INVOICED", "CLOSED"].includes(o.status)], ALL: ["All", () => true] };
function vF3SalesOrders() {
  const cur = F3_SO_GROUPS[UI.filters.so3] ? UI.filters.so3 : "OPENISH";
  const all = inScope(S.salesOrders).sort((a, b) => (a.orderDate < b.orderDate ? 1 : a.orderDate > b.orderDate ? -1 : a.orderNumber < b.orderNumber ? 1 : -1));
  const list = all.filter(F3_SO_GROUPS[cur][1]);
  const live = all.filter((o) => o.status !== "CANCELLED");
  const toConfirm = all.filter(F3_SO_GROUPS.CONFIRM[1]).length, toShip = all.filter(F3_SO_GROUPS.SHIP[1]), toBill = all.filter(F3_SO_GROUPS.BILL[1]).length;
  const invoicedYear = inScope(S.arInvoices).filter((i) => i.salesOrderId && String(i.invoiceDate).startsWith(todayStr().slice(0, 4))).reduce((s, i) => s + i.totalCents, 0);
  const byStatus = new Map(); for (const o of live) byStatus.set(o.status, (byStatus.get(o.status) || 0) + o.totalCents);
  return ph("Sales orders", "Order → confirm → ship → invoice → cash. Confirming sets the stock aside; shipping takes it out of the warehouse; invoicing posts the sale to receivables.", `${dlButton("sales-orders", "Download", { variant: "outline" })}${can(A, "ar.create") ? `<button class="btn pri" data-go="/sales/orders/new">+ New sales order</button>` : ""}`) + flashHtml()
    + `<div class="inv-side"><div class="stats" style="margin:0">${stat("To confirm", String(toConfirm), "stock not set aside yet", toConfirm ? "warn" : "")}${stat("Waiting to ship", String(toShip.length), moneyCompact(toShip.reduce((s, o) => s + o.totalCents, 0)), "primary")}${stat("Shipped, not invoiced", String(toBill), toBill ? "ready to bill" : "")}${stat("Invoiced this year", moneyCompact(invoicedYear), "from sales orders")}</div>
      <section class="card" style="padding:14px 16px">${donut([...byStatus.entries()].map(([s, v]) => ({ label: invLabel(s), v, d: moneyCompact(v), fmt: moneyCompact })), { title: "Pipeline by status", total: moneyCompact(live.reduce((s, o) => s + o.totalCents, 0)), caption: "incl. GST", size: 130 })}</section></div>`
    + `<div class="form-row" style="margin:14px 0 10px">${Object.entries(F3_SO_GROUPS).map(([k, [l, fn]]) => `<button class="hchip ${k === cur ? "on" : ""}" data-a="f3SoChip" data-v="${k}">${esc(l)} <span>${all.filter(fn).length}</span></button>`).join("")}</div>`
    + cardFlush("", table(["Order", "Customer", "Company", "Ordered", "Wanted by", "Items", ">Total", "Shipped", "Status"], list.map((o) => { const ls = soLines(o), inv = o.arInvoiceId ? byId(S.arInvoices, o.arInvoiceId) : null; return `<tr class="click" data-go="/sales/orders/${o.id}"><td class="mono"><strong>${esc(o.orderNumber)}</strong>${o.customerPo ? `<div class="hint">PO ${esc(o.customerPo)}</div>` : ""}</td><td>${esc(customerName(o.customerId))}</td><td>${coTag(o.companyId)}</td><td class="mono">${dLong(o.orderDate)}</td><td class="mono">${o.requiredDate ? dLong(o.requiredDate) : "—"}</td><td style="font-size:12px">${esc(ls.map((l) => `${byId(S.items, l.itemId)?.sku || l.description} × ${invQty(l.quantity)}`).join(", "))}</td>${td(`<strong>${money(o.totalCents)}</strong>`, 1)}<td>${soProgress(o)}</td><td>${invBadge(o.status)}${inv ? ` <span class="hint mono">${esc(inv.invoiceNumber)}</span>` : ""}</td></tr>`; }), cur === "OPENISH" ? "No open orders." : `No orders under “${F3_SO_GROUPS[cur][0]}”.`));
}
f3Route("/sales/orders", "ar.view", vF3SalesOrders);

/* ==========================================================================
   10. ASSETS — run depreciation for a month (one entry per company, 5600 / 1600)
   ========================================================================== */
const f3DepMonthly = (a) => Math.round((a.costCents - (a.residualCents || 0)) / a.usefulLifeMonths);
/** months still to post for an asset up to `through` (YYYY-MM): [{ym, cents}] */
function f3DepDue(a, through) {
  const out = []; if (a.status !== "ACTIVE") return out;
  let ym = f3NextYm(a.depreciatedThrough || "2026-06"), acc = a.accumDepCents || 0;
  const cap = a.costCents - (a.residualCents || 0), monthly = f3DepMonthly(a);
  while (ym <= through && acc < cap) { const c = Math.min(monthly, cap - acc); if (c > 0) out.push({ ym, cents: c }); acc += c; ym = f3NextYm(ym); }
  return out;
}
function f3DepPlan(S, ids, through) {
  const plan = new Map();
  for (const a of S.fixedAssets) { if (!ids.includes(a.companyId)) continue; for (const d of f3DepDue(a, through)) { const k = `${a.companyId}|${d.ym}`; const e = plan.get(k) || { companyId: a.companyId, ym: d.ym, assets: [], cents: 0 }; e.assets.push({ a, cents: d.cents }); e.cents += d.cents; plan.set(k, e); } }
  return [...plan.values()].sort((x, y) => (x.companyId < y.companyId ? -1 : x.companyId > y.companyId ? 1 : x.ym < y.ym ? -1 : 1));
}
Object.assign(R, {
  "assets.depreciate"(S, p, ctx) {
    ctx.need("assets.manage");
    const through = /^\d{4}-\d{2}$/.test(p.through || "") ? p.through : f3PrevYm(f3Ym(ctx.now));
    if (through > f3Ym(ctx.now)) fail("Depreciation can't be posted for a month that hasn't started.");
    const ids = (p.companyIds || scopeIds(S, ctx.auth)).filter((id) => canSee(ctx.auth, id));
    const plan = f3DepPlan(S, ids, through);
    if (!plan.length) fail(`Nothing to depreciate — every asset is posted through ${f3YmLabel(through)}.`);
    const made = []; let total = 0;
    for (const run of plan) {
      const je = postJournal(S, ctx, { companyId: run.companyId, date: f3YmEnd(run.ym), memo: `Depreciation — ${f3YmLabel(run.ym)}`, source: "ASSETS", sourceType: "DepreciationRun", reference: `DEP-${run.ym}`,
        lines: [...run.assets.map((x) => ({ accountNumber: x.a.glDepExpenseAccountNumber || "5600", debitCents: x.cents, description: `${x.a.assetNumber} ${x.a.description}` })), { accountNumber: run.assets[0].a.glAccumDepAccountNumber || "1600", creditCents: run.cents, description: "Accumulated depreciation" }] });
      for (const x of run.assets) { x.a.accumDepCents = (x.a.accumDepCents || 0) + x.cents; x.a.depreciatedThrough = run.ym; if (x.a.accumDepCents >= x.a.costCents - (x.a.residualCents || 0)) x.a.status = "FULLY_DEPRECIATED"; }
      S.depreciationRuns = S.depreciationRuns || [];
      S.depreciationRuns.push({ id: ctx.id("dep"), companyId: run.companyId, period: run.ym, journalEntryId: je.id, totalCents: run.cents, lines: run.assets.map((x) => ({ assetId: x.a.id, amountCents: x.cents })), postedByName: ctx.actor.displayName, postedAt: ctx.now });
      total += run.cents; made.push(`${byId(S.companies, run.companyId).code} ${f3YmLabel(run.ym)} ${je.entryNumber}`);
    }
    ctx.audit({ module: "finance.assets", action: "POST", companyId: ids.length === 1 ? ids[0] : undefined, summary: `${ctx.actor.displayName} ran depreciation through ${f3YmLabel(through)}: ${f3Plural(made.length, "entry", "entries")} (${made.join(", ")}), ${money(total)} in total.` });
  },
});
function vF3Assets() {
  const ids = scopeIds(S, A);
  const list = S.fixedAssets.filter((a) => ids.includes(a.companyId)).sort((a, b) => a.companyId.localeCompare(b.companyId) || a.assetNumber.localeCompare(b.assetNumber));
  const months = []; for (let ym = "2026-07"; ym <= f3Ym(todayStr()); ym = f3NextYm(ym)) months.push(ym);
  const through = months.includes(UI.filters.f3dep) ? UI.filters.f3dep : f3PrevYm(f3Ym(todayStr()));
  const plan = f3DepPlan(S, ids, through), dueTotal = plan.reduce((s, r) => s + r.cents, 0);
  const runs = (S.depreciationRuns || []).filter((r) => ids.includes(r.companyId)).sort((a, b) => (a.postedAt < b.postedAt ? 1 : a.postedAt > b.postedAt ? -1 : a.period < b.period ? 1 : -1)).slice(0, 12);
  const bal = balances(ids), gl = (n) => { const r = bal.find((x) => x.number === n); return r ? rowTotal(r) : 0; };
  const cost = list.reduce((s, a) => s + a.costCents, 0), acc = list.reduce((s, a) => s + (a.accumDepCents || 0), 0), posted = list.reduce((s, a) => s + ((a.accumDepCents || 0) - (a.openingAccumDepCents || 0)), 0);
  const canRun = can(A, "assets.manage");
  const acts = canRun ? `<div class="f3tools"><select class="in" style="height:34px;width:auto" data-a="f3DepYm" aria-label="Depreciate through">${months.map((m) => opt(m, `through ${f3YmLabel(m)}`, m === through)).join("")}</select><button class="btn pri" data-a="f3DepRun" data-ym="${through}" ${plan.length ? "" : "disabled"}>Run depreciation${plan.length ? ` · ${money(dueTotal)}` : ""}</button></div>` : "";
  const lastThrough = list.map((a) => a.depreciatedThrough).filter(Boolean).sort()[0];
  return ph("Fixed Assets", "Straight-line depreciation from cost, residual value and useful life — posted to the ledger month by month (5600 / 1600).", acts) + flashHtml()
    + (plan.length ? `<div class="msg warn">Depreciation not yet posted: ${[...new Set(plan.map((r) => r.companyId))].map((c) => `${esc(co(c).displayName)} (${plan.filter((r) => r.companyId === c).map((r) => f3YmLabel(r.ym).split(" ")[0]).join(", ")})`).join(" · ")} — ${money(dueTotal)}. One entry per company per month, dated the last day of the month.</div>` : `<div class="msg ok">Depreciation is posted through ${f3YmLabel(lastThrough || through)} for every asset in view.</div>`)
    + `<div class="stats">${stat("Cost", moneyCompact(cost), `Ledger 1500: ${money(gl("1500"))}`, "primary")}${stat("Accumulated depreciation", moneyCompact(acc), `Ledger 1600 (posted runs): ${money(-gl("1600"))}${-gl("1600") === posted ? " ✓" : ""}`)}${stat("Book value", moneyCompact(cost - acc))}${stat("Assets", String(list.length), `${list.filter((a) => a.status === "ACTIVE").length} still depreciating`)}</div>`
    + cardFlush("", table(["Asset", "Company", "Category", "Bought", ">Cost", ">Monthly", "Posted through", ">Accumulated", ">Book value", "Status"], list.map((a) => `<tr><td class="mono">${esc(a.assetNumber)}<div style="font-family:var(--font)"><strong>${esc(a.description)}</strong></div></td><td>${coTag(a.companyId)}</td><td>${esc(a.category)}</td><td>${dLong(a.purchaseDate)}</td>${td(money(a.costCents), 1)}${td(money(f3DepMonthly(a)), 1)}<td>${a.depreciatedThrough ? f3YmLabel(a.depreciatedThrough) : "—"}</td>${td(money(a.accumDepCents || 0), 1)}${td(money(a.costCents - (a.accumDepCents || 0)), 1)}<td>${badge(a.status)}</td></tr>`)))
    + `<div class="sect-l">Depreciation runs</div>` + cardFlush("", table(["Month", "Company", "Entry", ">Amount", "Posted by"], runs.map((r) => `<tr class="click" data-go="/finance/journals/${r.journalEntryId}"><td>${f3YmLabel(r.period)}</td><td>${coTag(r.companyId)}</td><td class="mono">${esc(byId(S.journalEntries, r.journalEntryId)?.entryNumber || "")}</td>${td(money(r.totalCents), 1)}<td>${esc(r.postedByName)} · ${esc(ago(r.postedAt))}</td></tr>`), "No runs posted yet — accumulated depreciation to June 2026 came in with the opening balances."));
}
f3Route("/finance/assets", "assets.view", vF3Assets);

/* ==========================================================================
   11. INVENTORY — stock counts: start → count → post adjustments
   ========================================================================== */
Object.assign(R, {
  "inv.countStart"(S, p, ctx) {
    invNeedMover(ctx);
    const wh = byId(S.warehouses, p.warehouseId);
    if (!wh) fail("Pick the warehouse to count.");
    ctx.company(wh.companyId);
    S.stockCounts = S.stockCounts || [];
    const open = S.stockCounts.find((c) => c.warehouseId === wh.id && c.status === "OPEN");
    if (open) fail(`${open.number} is already open for ${wh.name} — finish or cancel it first.`);
    const items = S.items.filter((i) => i.companyId === wh.companyId && i.type === "STOCK" && i.isActive !== false).sort((a, b) => a.sku.localeCompare(b.sku));
    if (!items.length) fail(`${co(wh.companyId).displayName} has no stock items to count.`);
    const number = nextNum(S.stockCounts.map((c) => c.number), "CNT-2026", 4);
    const c = { id: ctx.id("cnt"), number, companyId: wh.companyId, warehouseId: wh.id, date: p.date || ctx.now.slice(0, 10), note: String(p.note || "").trim() || undefined, status: "OPEN", startedByName: ctx.actor.displayName, startedAt: ctx.now, lines: items.map((it) => ({ itemId: it.id, expected: S.stockLevels.find((l) => l.warehouseId === wh.id && l.itemId === it.id)?.onHand || 0, counted: null })) };
    S.stockCounts.push(c);
    ctx.audit({ module: "inventory", action: "CREATE", companyId: wh.companyId, entityType: "StockCount", entityId: c.id, summary: `${ctx.actor.displayName} started stock count ${number} at ${wh.name}: ${f3Plural(items.length, "item", "items")} to count.` });
  },
  "inv.countPost"(S, p, ctx) {
    invNeedMover(ctx);
    const c = (S.stockCounts || []).find((x) => x.id === p.countId);
    if (!c) fail("That count no longer exists.");
    ctx.company(c.companyId);
    if (c.status !== "OPEN") fail(`${c.number} is already ${c.status.toLowerCase()}.`);
    const wh = byId(S.warehouses, c.warehouseId);
    const reason = String(p.reason || "").trim() || `Stock count ${c.number}`;
    const entered = new Map((p.counts || []).filter((x) => x.counted !== "" && x.counted != null).map((x) => [x.itemId, Number(x.counted)]));
    if (!entered.size) fail("Enter at least one counted quantity.");
    for (const [, v] of entered) if (!Number.isFinite(v) || v < 0) fail("Counted quantities must be zero or more.");
    let changed = 0, net = 0; const notes = [];
    for (const l of c.lines) {
      if (!entered.has(l.itemId)) continue;
      const item = byId(S.items, l.itemId); if (!item) continue;
      const lvl = invLvl(S, ctx, wh.id, item.id);
      const counted = entered.get(l.itemId), delta = Math.round((counted - lvl.onHand) * 1000) / 1000;
      l.counted = counted; l.postedDelta = delta;
      if (!delta) continue;
      if (lvl.onHand + delta < lvl.reserved - 1e-9) fail(`${item.name}: ${invQty(lvl.reserved)} ${item.unit} are promised to confirmed orders — a count of ${invQty(counted)} would leave too few. Ship or cancel those orders first.`);
      lvl.onHand += delta;
      invMove(S, ctx, { companyId: wh.companyId, itemId: item.id, warehouseId: wh.id, type: "ADJUSTMENT", quantity: delta, unitCostCents: item.costCents, date: c.date, reference: `${c.number} — ${reason}`, sourceType: "StockCount", sourceId: c.id });
      changed++; net += Math.round(delta * item.costCents); notes.push(`${item.name} ${delta > 0 ? "+" : ""}${invQty(delta)}`);
    }
    Object.assign(c, { status: "POSTED", postedByName: ctx.actor.displayName, postedAt: ctx.now, reason, adjustments: changed, netValueCents: net });
    ctx.audit({ module: "inventory", action: "UPDATE", companyId: c.companyId, entityType: "StockCount", entityId: c.id, summary: `${ctx.actor.displayName} posted stock count ${c.number} at ${wh.name}: ${changed ? `${f3Plural(changed, "adjustment", "adjustments")} (${notes.join(", ")}), ${net >= 0 ? "+" : "−"}${money(Math.abs(net))} at cost` : "every count matched — no adjustments"}.` });
  },
  "inv.countCancel"(S, p, ctx) {
    invNeedMover(ctx);
    const c = (S.stockCounts || []).find((x) => x.id === p.countId);
    if (!c) fail("That count no longer exists.");
    ctx.company(c.companyId);
    if (c.status !== "OPEN") fail(`${c.number} is already ${c.status.toLowerCase()}.`);
    Object.assign(c, { status: "CANCELLED", cancelledByName: ctx.actor.displayName, cancelledAt: ctx.now });
    ctx.audit({ module: "inventory", action: "STATUS_CHANGE", companyId: c.companyId, entityType: "StockCount", entityId: c.id, summary: `${ctx.actor.displayName} cancelled stock count ${c.number} — nothing was adjusted.` });
  },
});
function f3CntTotals() {
  const host = document.getElementById("f3CntSheet"); if (!host) return;
  const c = (S.stockCounts || []).find((x) => x.id === host.dataset.id); if (!c) return;
  const draft = (UI.f3cnt && UI.f3cnt[c.id]) || {};
  let n = 0, net = 0;
  for (const l of c.lines) {
    const item = byId(S.items, l.itemId); const lvl = S.stockLevels.find((x) => x.warehouseId === c.warehouseId && x.itemId === l.itemId); const here = lvl?.onHand || 0;
    const v = draft[l.itemId]; const cell = host.querySelector(`[data-f3diff="${l.itemId}"]`), val = host.querySelector(`[data-f3val="${l.itemId}"]`);
    if (v === undefined || v === "") { if (cell) cell.innerHTML = "—"; if (val) val.textContent = "—"; continue; }
    const delta = Math.round((Number(v) - here) * 1000) / 1000, cents = Math.round(delta * (item?.costCents || 0));
    if (cell) cell.innerHTML = delta ? `<span class="f3diff ${delta > 0 ? "pos" : "neg"}">${delta > 0 ? "+" : ""}${invQty(delta)}</span>` : `<span class="hint">matches</span>`;
    if (val) val.textContent = delta ? money(cents) : "—";
    if (delta) { n++; net += cents; }
  }
  const t = document.getElementById("f3CntNet"); if (t) t.innerHTML = `${f3Plural(n, "adjustment", "adjustments")} · ${net >= 0 ? "+" : "−"}${money(Math.abs(net))} at cost`;
}
function vF3Count() {
  const whs = inScope(S.warehouses).filter((w) => w.isActive !== false).sort((a, b) => co(a.companyId).displayName.localeCompare(co(b.companyId).displayName) || a.code.localeCompare(b.code));
  const counts = (S.stockCounts || []).filter((c) => inView(S, A, c.companyId)).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  const open = counts.filter((c) => c.status === "OPEN");
  const canDo = invCanMove();
  const cur = open.find((c) => c.id === UI.filters.f3cntId) || open[0];
  const sheet = cur ? (() => {
    const wh = byId(S.warehouses, cur.warehouseId); const draft = (UI.f3cnt = UI.f3cnt || {})[cur.id] || (UI.f3cnt[cur.id] = {});
    const rows = cur.lines.map((l) => { const item = byId(S.items, l.itemId); const lvl = S.stockLevels.find((x) => x.warehouseId === wh.id && x.itemId === l.itemId); const here = lvl?.onHand || 0; return `<tr><td>${goLink(`/inventory/items/${l.itemId}`, item?.name || "—")} <span class="hint mono">${esc(item?.sku || "")}</span></td>${td(`${invQty(l.expected)} ${esc(item?.unit || "")}`, 1)}${td(invQty(here), 1)}<td class="r"><input class="in num" style="width:120px;text-align:right;display:inline-block" type="number" step="any" min="0" data-f3cnt="${l.itemId}" value="${esc(draft[l.itemId] ?? "")}" placeholder="${invQty(here)}" aria-label="Counted ${esc(item?.sku || "")}" ${canDo ? "" : "disabled"}></td><td class="r" data-f3diff="${l.itemId}">—</td><td class="r num" data-f3val="${l.itemId}">—</td></tr>`; });
    return card(`${invSq(cur.companyId)}${esc(cur.number)} · ${esc(wh.name)} <span class="hint" style="font-weight:400">· started ${esc(dTime(cur.startedAt))} by ${esc(cur.startedByName)}</span>`, `<p class="f3steps"><b>Step 2 — count.</b> Type what you counted; leave a row blank if it matched. <b>Step 3 — post:</b> the differences become stock adjustments at cost, with the count number on every movement.</p><form data-f="f3CountPost" data-id="${cur.id}"><div class="tw" id="f3CntSheet" data-id="${cur.id}"><table class="t f3cnt"><thead><tr><th>Item</th><th class="r">On hand at start</th><th class="r">On hand now</th><th class="r">Counted</th><th class="r">Difference</th><th class="r">Value</th></tr></thead><tbody>${rows.join("")}<tr class="tot"><td colspan="5">Net change in stock value</td><td class="r num" id="f3CntNet">—</td></tr></tbody></table></div>
      <div class="form-row" style="margin-top:12px"><input class="in" name="reason" placeholder="Reason, e.g. Month-end count — 3 damaged" style="flex:1;min-width:220px" aria-label="Reason">${canDo ? `<button class="btn pri">Post adjustments</button><button type="button" class="btn" data-a="f3CountCancel" data-id="${cur.id}">Cancel count</button>` : ""}</div></form>`, open.length > 1 ? `<select class="in" style="height:32px;width:auto" data-a="f3CountPick" aria-label="Open count">${open.map((c) => opt(c.id, `${c.number} · ${byId(S.warehouses, c.warehouseId)?.name}`, c.id === cur.id)).join("")}</select>` : "", "inv-add");
  })() : "";
  const start = canDo ? card("Start a count", `<p class="f3steps"><b>Step 1 — start.</b> Pick the warehouse. The count sheet freezes what the books say is on hand right now, so you can compare as you go.</p><form data-f="f3CountStart" class="form-grid"><div class="fld"><label for="csWh">Warehouse</label>${invWhSelect("csWh", "warehouseId", whs.filter((w) => !open.some((c) => c.warehouseId === w.id)), "")}</div><div class="fld"><label for="csDate">Count date</label><input class="in" type="date" id="csDate" name="date" value="${todayStr()}"></div><div class="fld"><label for="csNote">Note (optional)</label><input class="in" id="csNote" name="note" placeholder="e.g. Month-end cycle count"></div><div class="form-row" style="align-items:flex-end"><button class="btn pri">Start count</button></div></form>`, "", "inv-soft") : "";
  return ph("Count or adjust stock", "Count what is physically in a warehouse, enter the numbers, and post the differences as adjustments. Every change leaves a movement you can trace.", "", crumb("/inventory/stock", "Stock")) + flashHtml()
    + `<div class="stats">${stat("Open counts", String(open.length), open.length ? open.map((c) => c.number).join(", ") : "Nothing in progress", open.length ? "warn" : "")}${stat("Counts posted", String(counts.filter((c) => c.status === "POSTED").length), "This session")}${stat("Warehouses", String(whs.length), [...new Set(whs.map((w) => co(w.companyId).code))].join(" · "))}</div>`
    + sheet + (sheet ? `<div style="height:14px"></div>` : "") + start + (start ? `<div style="height:14px"></div>` : "")
    + cardFlush("Counts", table(["Count", "Warehouse", "Date", "Started by", ">Items", ">Adjustments", ">Net value", "Status"], counts.map((c) => `<tr><td class="mono"><strong>${esc(c.number)}</strong>${c.note ? `<div class="hint" style="font-family:var(--font)">${esc(c.note)}</div>` : ""}</td><td>${invSq(c.companyId)}${esc(byId(S.warehouses, c.warehouseId)?.name || "—")}</td><td class="mono">${dLong(c.date)}</td><td>${esc(c.startedByName)}</td>${td(c.lines.length, 1)}${td(c.status === "POSTED" ? c.adjustments : "—", 1)}${td(c.status === "POSTED" ? `${c.netValueCents >= 0 ? "+" : "−"}${money(Math.abs(c.netValueCents))}` : "—", 1)}<td>${c.status === "OPEN" ? `<span class="badge tone-amber">Counting</span>` : badge(c.status)}</td></tr>`), "No stock counts yet — start one above."));
}
function vF3Stock() { return vInvStock().replace('<div class="acts">', `<div class="acts">${invCanMove() ? `<button class="btn" data-go="/inventory/count">Stock count</button>` : ""}`); }
f3Route("/inventory/count", invCanView, vF3Count);
f3Route("/inventory/stock", invCanView, vF3Stock);
document.addEventListener("input", (ev) => { const el = ev.target; if (!el.dataset?.f3cnt) return; const host = el.closest("#f3CntSheet"); if (!host) return; (UI.f3cnt = UI.f3cnt || {})[host.dataset.id] = UI.f3cnt[host.dataset.id] || {}; UI.f3cnt[host.dataset.id][el.dataset.f3cnt] = el.value; f3CntTotals(); });

/* ==========================================================================
   12. CLOSE — A's checklist with a month picker (B)
   ========================================================================== */
function vF3Periods() {
  const today = todayStr();
  const cos = S.companies.filter((c) => inView(S, A, c.id));
  const months = [...new Set(inScope(S.fiscalPeriods).map((p) => f3Ym(p.startDate)))].sort();
  const cur = months.includes(UI.filters.f3ym) ? UI.filters.f3ym : f3Ym(today);
  if (UI.filters.f3ym && UI.filters.f3ym === cur && !UI.filters.f3ymApplied) {
    UI.filters.fin2open = Object.fromEntries(inScope(S.fiscalPeriods).map((p) => [p.id, f3Ym(p.startDate) === cur]));
    UI.filters.f3ymApplied = true;
  }
  // the month picker replaces the four progress donuts: one tile per company for the chosen month
  const tiles = cos.map((c) => { const p = S.fiscalPeriods.find((x) => x.companyId === c.id && f3Ym(x.startDate) === cur); if (!p) return stat(c.displayName, "—", "No period"); const tasks = fin2Tasks(S, p.id), done = tasks.filter((t) => t.isDone).length, autoOk = tasks.filter((t) => !t.isDone && t.autoCheck && fin2AutoCheck(S, t.autoCheck, p)?.ok).length; return stat(c.displayName, p.status === "CLOSED" ? "Closed" : tasks.length ? `${done} of ${tasks.length}` : "Open", p.status === "CLOSED" ? `by ${p.closedByName || ""}` : tasks.length ? `${autoOk} checked automatically · ${tasks.length - done - autoOk} still to do` : "No checklist yet", p.status === "CLOSED" || (tasks.length && done === tasks.length) ? "good" : tasks.length - done - autoOk ? "warn" : ""); }).join("");
  const picker = `<div class="form-row" style="margin:0 0 12px;align-items:flex-end"><div class="fld"><label for="f3ym">Month</label><select class="in" id="f3ym" data-a="f3CloseYm" style="width:auto;height:36px">${months.map((m) => opt(m, f3YmLabel(m), m === cur)).join("")}</select></div><span class="hint" style="padding-bottom:9px">Pick a month to open its checklist for every company. Auto-checked tasks tick themselves off once the system finds nothing outstanding.</span></div><div class="stats">${tiles}</div>`;
  let html = vFin2Periods().replace("<h1>Period Close · 2026</h1>", "<h1>Month-end close</h1>");
  const pk = html.indexOf('<section class="card "><div class="card-h"><span>Close progress');
  if (pk > 0) { const pe = html.indexOf("</section>", pk) + "</section>".length; html = html.slice(0, pk) + html.slice(pe); }
  const k = html.indexOf('<div class="grid g2"');
  return k > 0 ? html.slice(0, k) + picker + html.slice(k) : html + picker;
}
f3Route("/finance/periods", "finance.periods", vF3Periods);

/* ==========================================================================
   14. NAMING — B's titles on the finance pages A keeps
   ========================================================================== */
const F3_AP_NAMES = [["<h1>Bills to Pay · AP</h1>", "<h1>Accounts Payable</h1>"], ["← Bills to Pay</button>", "← Accounts Payable</button>"], ["Find any AP file →", "Invoice Files →"]];
const F3_AR_NAMES = [["<h1>Customer Invoices · AR</h1>", "<h1>Accounts Receivable</h1>"], ["← Customer Invoices</button>", "← Accounts Receivable</button>"]];
const f3Wrap = (fn, pairs) => (...a) => f3Rename(fn(...a), pairs);
f3Route("/finance/ap", "ap.view", f3Wrap((q) => vAP(q), F3_AP_NAMES));
f3Route("/finance/ap/:id", "ap.view", f3Wrap((q, id) => vBill(q, id), F3_AP_NAMES));
f3Route("/finance/ap/batch", "ap.create", f3Wrap(() => vAPBatch(), F3_AP_NAMES));
f3Route("/finance/ap/pay", "ap.pay", f3Wrap(() => vPayBatch(), F3_AP_NAMES));
f3Route("/finance/ap/batches/:id", "ap.view", f3Wrap((q, id) => vAPBatchDetail(q, id), F3_AP_NAMES));
f3Route("/finance/ar", "ar.view", f3Wrap(() => vAR(), F3_AR_NAMES));
f3Route("/finance/ar/batch", "ar.create", f3Wrap(() => vARBatch(), F3_AR_NAMES));
f3Route("/finance/ar/deposit", "ar.receive", f3Wrap(() => vDepositBatch(), F3_AR_NAMES));
f3Route("/inventory/items", invCanView, f3Wrap(() => vInvItems(), [["<h1>Items &amp; Prices</h1>", "<h1>Items &amp; stock</h1>"]]));
f3Route("/inventory/items/:id", invCanView, f3Wrap((q, id) => vInvItem(q, id), [["← All items</button>", "← Items &amp; stock</button>"]]));
f3Route("/finance/accounts", "finance.view", f3Wrap(() => vAccounts(), [["<h1>Chart of Accounts</h1>", "<h1>Chart of Accounts</h1>"]]));

/* ==========================================================================
   forms & actions
   ========================================================================== */
window.FORMS_EXT.push({
  f3BankPost(f) { const d = fd(f); const t = byId(S.bankTransactions, f.dataset.id); if (act("bank.post", { txnId: f.dataset.id, accountNumber: d.accountNumber, memo: d.memo })) { UI.modal = null; f3Flash(`"${t?.description}" posted to ${d.accountNumber} and matched.`); } },
  f3Recurring(f) {
    const d = fd(f); const F = UI.f3rj;
    const lines = (F?.lines || []).map((l) => ({ accountNumber: l.accountNumber, description: l.description, debitCents: toCents(l.debit) || 0, creditCents: toCents(l.credit) || 0, departmentId: l.departmentId || undefined }));
    if (f.dataset.id) { if (act("recurring.update", { id: f.dataset.id, name: d.name, memo: d.memo, frequency: d.frequency, dayOfMonth: d.dayOfMonth, nextRunDate: d.nextRunDate, endDate: d.endDate || null, autoReverse: !!d.autoReverse, lines })) { const s = f3LastAudit(); UI.f3rj = null; go("/finance/recurring"); f3Flash(`"${d.name}" updated — ${s.slice(s.indexOf("): ") + 3) || "saved."}`); } }
    else if (act("recurring.create", { companyId: F.companyId, name: d.name, memo: d.memo, frequency: d.frequency, dayOfMonth: d.dayOfMonth, firstRunDate: d.nextRunDate, endDate: d.endDate || null, autoReverse: !!d.autoReverse, lines })) { UI.f3rj = null; go("/finance/recurring"); f3Flash(`"${d.name}" is set up — press Run now when its first date comes round.`); }
  },
  f3PoCancel(f) { const d = fd(f); const po = byId(S.purchaseOrders, f.dataset.id); if (act("po.cancel", { poId: f.dataset.id, reason: d.reason }, `${po?.poNumber} cancelled.`)) { UI.modal = null; safeRender(); } },
  f3PoFilter(f) { const d = fd(f); Object.assign(f3PoF(), { q: d.q || "", vendor: d.vendor || "", status: d.status || "", from: d.from || "", to: d.to || "" }); safeRender(); },
  f3FileLink(f) { const d = fd(f); const [entityType, entityId] = String(d.target || "").split("|"); const file = (S.files || []).find((x) => x.id === f.dataset.id); if (act("ap.attach", { fileId: f.dataset.id, entityType, entityId, docType: d.docType }, `“${file?.fileName}” linked.`)) { UI.modal = null; safeRender(); } },
  f3CountStart(f) { const d = fd(f); const before = (S.stockCounts || []).length; if (act("inv.countStart", { warehouseId: d.warehouseId, date: d.date, note: d.note })) { const c = S.stockCounts[before]; UI.filters.f3cntId = c?.id; f3Flash(`${c?.number} started for ${byId(S.warehouses, d.warehouseId)?.name} — enter what you counted, then post.`); } },
  f3CountPost(f) { const d = fd(f); const c = (S.stockCounts || []).find((x) => x.id === f.dataset.id); const draft = (UI.f3cnt && UI.f3cnt[f.dataset.id]) || {}; const counts = Object.entries(draft).map(([itemId, counted]) => ({ itemId, counted })); if (act("inv.countPost", { countId: f.dataset.id, counts, reason: d.reason })) { const s = f3LastAudit(); if (UI.f3cnt) delete UI.f3cnt[f.dataset.id]; f3Flash(`${c?.number} posted — ${s.slice(s.indexOf(": ") + 2) || "done."}`); } },
});
window.ACTIONS_EXT.push({
  f3Sample(el) { const ba = byId(S.bankAccounts, el.dataset.id); if (!ba) return; const lines = f3SampleLines(ba); if (act("bank.statement.import", { bankAccountId: ba.id, fileName: `${co(ba.companyId).code.toLowerCase()}-statement-sep-2026.csv`, lines })) f3Flash(f3LastAudit().replace(/^\S+ \S+ uploaded /, "Loaded sample statement ")); },
  f3PostLine(el) { const t = byId(S.bankTransactions, el.dataset.id); if (!t) return; UI.modal = f3BankPostModal(t); safeRender(); setTimeout(() => document.getElementById("bpAcct")?.focus(), 30); },
  f3Unmatch(el) { const t = byId(S.bankTransactions, el.dataset.id); act("bank.unmatch", { txnId: el.dataset.id }, `"${t?.description}" unmatched — both sides are open again.`); },
  f3RjCo(el) { UI.f3rj = f3RjDraft(null, el.value); safeRender(); },
  f3RjAdd() { if (UI.f3rj && UI.f3rj.lines.length < 6) UI.f3rj.lines.push({}); safeRender(); },
  f3RjDel(el) { if (UI.f3rj) UI.f3rj.lines.splice(+el.dataset.i, 1); safeRender(); },
  f3PoCancel(el) { const po = byId(S.purchaseOrders, el.dataset.id); if (!po) return; UI.modal = f3PoCancelModal(po); safeRender(); setTimeout(() => document.getElementById("pcReason")?.focus(), 30); },
  f3PoReset() { UI.filters.poh = null; safeRender(); },
  f3ApSet(el) { f3ApF()[el.dataset.f] = el.dataset.v != null ? el.dataset.v : el.value; safeRender(); },
  f3ApClear() { UI.filters.apfx = null; safeRender(); },
  f3FileKind(el) { const f = (S.files || []).find((x) => x.id === el.dataset.id); if (!act("ap.fileKind", { fileId: el.dataset.id, docType: el.value }, `“${f?.fileName}” marked as ${(F3_DOC_KINDS[el.value] || "").toLowerCase()}.`)) safeRender(); },
  f3FileLink(el) { const f = (S.files || []).find((x) => x.id === el.dataset.id); if (!f) return; UI.modal = f3FileLinkModal(f); safeRender(); },
  f3FileDetach(el) { const f = (S.files || []).find((x) => x.id === el.dataset.id); if (!f) return; UI.modal = `<h3>Remove “${esc(f.fileName)}”?</h3><p class="hint">It disappears from the bill or vendor and from Invoice Files. The history keeps a note that you removed it.</p><div class="form-row" style="justify-content:flex-end"><button class="btn" data-a="closeModal">Keep it</button><button class="btn dng" data-a="f3FileDetachYes" data-id="${f.id}">Remove file</button></div>`; safeRender(); },
  f3FileDetachYes(el) { UI.modal = null; const f = (S.files || []).find((x) => x.id === el.dataset.id); act("ap.detach", { fileId: el.dataset.id }, `“${f?.fileName}” removed.`); },
  f3ApTarget(el) { UI.filters.f3apTarget = el.value; },
  f3ApKind(el) { UI.filters.f3apKind = el.value; },
  f3ApAttach() { const [entityType, entityId] = String(UI.filters.f3apTarget || "").split("|"); if (!entityType) { toast("Pick a bill or vendor", "Choose what the file belongs to first.", "err"); return; } const files = takeFiles("f3ap"); if (!files.length) { toast("Nothing to attach", "Drop or choose a file first.", "err"); return; } if (!act("ap.attach", { entityType, entityId, docType: UI.filters.f3apKind || "INVOICE", files }, `${files.length === 1 ? `“${files[0].name}”` : `${files.length} files`} attached.`)) UI.files.f3ap = files; },
  f3LinkPo(el) { const sel = document.getElementById(el.dataset.sel); const poId = sel?.value; const b = byId(S.apInvoices, el.dataset.id); if (!poId) return; if (act("ap.linkPo", { invoiceId: el.dataset.id, poId })) { if (act("match.run", { billId: el.dataset.id })) { const bb = byId(S.apInvoices, el.dataset.id); f3Flash(`${bb.invoiceNumber} linked to ${byId(S.purchaseOrders, poId)?.poNumber} and checked: ${bb.matchStatus === "MATCHED" ? "matched" : "variance found"}. ${bb.matchNote}`); } else f3Flash(`${b?.invoiceNumber} linked to ${byId(S.purchaseOrders, poId)?.poNumber}.`); } },
  f3SoChip(el) { UI.filters.so3 = el.dataset.v; safeRender(); },
  f3DepYm(el) { UI.filters.f3dep = el.value; safeRender(); },
  f3DepRun(el) { if (act("assets.depreciate", { companyIds: scopeIds(S, A), through: el.dataset.ym })) f3Flash(f3LastAudit().replace(/^\S+ \S+ ran /, "Ran ")); },
  f3CountPick(el) { UI.filters.f3cntId = el.value; safeRender(); },
  f3CountCancel(el) { const c = (S.stockCounts || []).find((x) => x.id === el.dataset.id); act("inv.countCancel", { countId: el.dataset.id }, `${c?.number} cancelled — nothing was adjusted.`); },
  f3CloseYm(el) { UI.filters.f3ym = el.value; UI.filters.f3ymApplied = false; safeRender(); },
});
