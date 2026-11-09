/* ==========================================================================
   views-fin2.js — Finance depth: recurring journals & accruals, reversing
   any posted entry, bank matching rules with auto-match, and the period-close
   checklist with live auto-checks. Mirrors src/lib/fin-recurring.ts,
   fin-close.ts and fin-bank-rules.ts in the live app.
   ========================================================================== */
injectCss(`
.f2cls{display:inline-block;border-radius:99px;padding:1px 8px;font-size:10.5px;font-weight:700;background:var(--t-teal-bg);color:var(--t-teal);white-space:nowrap}
.f2loc{display:inline-block;border-radius:99px;padding:1px 8px;font-size:10.5px;font-weight:700;background:var(--t-amber-bg);color:var(--t-amber);white-space:nowrap}
.f2lines{display:grid;gap:2px;font-size:11.5px;min-width:230px}
.f2acts{display:flex;flex-direction:column;gap:4px;align-items:flex-end}
.f2lines div{display:flex;gap:6px;align-items:center}
.f2lines .dc{width:18px;font-family:var(--mono);font-weight:700}
.f2lines .dc.dr{color:var(--t-green)}.f2lines .dc.cr{color:var(--t-red)}
.f2lines .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.f2lines .amt{margin-left:auto;font-family:var(--mono);font-variant-numeric:tabular-nums}
.f2lines .sum{justify-content:flex-end;font-family:var(--mono);font-size:11px;font-weight:600;color:var(--muted-fg);padding-top:2px}
.f2due{display:block;font-size:11px;font-weight:700;color:var(--t-amber);margin-top:2px}
tr.f2paused td{opacity:.6}
.f2tick{flex:none;width:22px;height:22px;border-radius:6px;border:1px solid var(--input);background:var(--card);color:transparent;font-size:12px;font-weight:700;cursor:pointer;display:grid;place-items:center;margin-top:2px}
.f2tick:hover{border-color:var(--t-green);color:var(--t-green-bg)}
.f2tick.on{background:var(--t-green);border-color:var(--t-green);color:#fff}
.f2task{display:flex;gap:10px;align-items:flex-start;padding:8px 12px;border-top:1px solid var(--border)}
.f2task .tt{font-size:13px}.f2task .tt.done{color:var(--muted-fg);text-decoration:line-through}
.f2task .ac{font-size:11.5px}.f2task .ac.ok{color:var(--t-green)}.f2task .ac.bad{color:var(--t-red)}
.f2task .ac .lnk{font-size:11.5px;font-weight:700}
.f2per{padding:9px 0;border-top:1px solid var(--border)}.f2per:first-child{border-top:0}
.f2per .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.f2per .pn{width:34px;font-family:var(--mono);font-size:12px;font-weight:700}
.f2per .pd{flex:1;font-family:var(--mono);font-size:11.5px;color:var(--muted-fg);min-width:140px}
.f2per .f2cnt{font-size:11.5px;font-weight:600;color:var(--muted-fg)}.f2per .f2cnt.all{color:var(--t-green)}
.f2per details{margin-top:8px;border:1px solid var(--border);border-radius:10px;background:color-mix(in srgb,var(--muted) 40%,transparent)}
.f2per summary{cursor:pointer;user-select:none;padding:8px 12px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:10px}
.f2bar{display:inline-block;width:110px;height:6px;border-radius:99px;background:var(--muted);overflow:hidden;vertical-align:middle}
.f2bar i{display:block;height:100%;border-radius:99px;background:var(--t-green)}
.f2add{display:flex;gap:8px;padding:8px 12px;border-top:1px solid var(--border)}
.f2add .in{height:34px;font-size:13px}
.f2prog{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.f2prog .box{border:1px solid var(--border);border-radius:12px;padding:12px}
.f2prog .box .hd{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;margin-bottom:6px;white-space:nowrap}
.f2prog .box .hd .nm{overflow:hidden;text-overflow:ellipsis;min-width:0}
.f2prog .box .hd .badge{margin-left:auto}
.f2rules .in{height:34px;font-size:13px}
.f2means p{margin:0 0 8px;font-size:12.5px;color:var(--muted-fg)}.f2means strong{color:var(--fg)}
.f2rev{border:1px dashed var(--border);border-radius:12px;padding:14px 16px;margin-top:14px}
`);

/* ---------------- schedule maths (same as fin-recurring.ts) ---------------- */
const FIN2_FREQ = { MONTHLY: "Every month", QUARTERLY: "Every quarter", ANNUAL: "Every year" };
const FIN2_MONTHS = { MONTHLY: 1, QUARTERLY: 3, ANNUAL: 12 };
const FIN2_MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fin2DaysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** calendar date pinned to the schedule's day of month, clamped to the month's length */
function fin2Scheduled(y, m, dayOfMonth) { const d = Math.min(Math.max(1, dayOfMonth), fin2DaysIn(y, m)); return `${y}-${pad(m, 2)}-${pad(d, 2)}`; }
/** the run after `from`, by frequency */
function fin2Advance(from, frequency, dayOfMonth) {
  const [y, m] = from.split("-").map(Number);
  const mm = m + (FIN2_MONTHS[frequency] || 1);
  return fin2Scheduled(y + Math.floor((mm - 1) / 12), ((mm - 1) % 12) + 1, dayOfMonth);
}
/** the 1st of the month after `date` — where an accrual reversal lands */
function fin2FirstOfNext(date) { const [y, m] = date.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1, 2)}-01`; }
const fin2RunLabel = (date) => { const [y, m] = date.split("-").map(Number); return `${FIN2_MONTH_FULL[m - 1]} ${y}`; };
function fin2Balance(lines) { const debit = lines.reduce((s, l) => s + (l.debitCents || 0), 0), credit = lines.reduce((s, l) => s + (l.creditCents || 0), 0); return { debit, credit, balanced: debit > 0 && debit === credit }; }
const fin2Plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fin2AcctName = (companyId, number) => S.accounts.find((a) => a.companyId === companyId && a.number === number)?.name || "";
const fin2ClassName = (companyId, code) => S.dimensions.find((d) => d.companyId === companyId && d.type === "CLASS" && d.code === code)?.name || code;

/* ---------------- ledger helpers used by the reducers ---------------- */
/** postJournal keeps department/project on lines; carry class and location over too */
function fin2CopyDims(S, je, inputLines) {
  const posted = S.journalLines.filter((l) => l.journalEntryId === je.id);
  for (const jl of posted) { const src = inputLines[jl.sortOrder]; if (!src) continue; if (src.classCode) jl.classCode = src.classCode; if (src.locationId) jl.locationId = src.locationId; }
}
/** mirror image of an entry (debits and credits swapped), linked both ways */
function fin2PostReversal(S, ctx, original, date, memo, source = "MANUAL") {
  const acct = new Map(S.accounts.map((a) => [a.id, a]));
  const lines = S.journalLines.filter((l) => l.journalEntryId === original.id).sort((a, b) => a.sortOrder - b.sortOrder)
    .map((l) => ({ accountNumber: acct.get(l.accountId).number, debitCents: l.creditCents || 0, creditCents: l.debitCents || 0, description: l.description, departmentId: l.departmentId, projectId: l.projectId, locationId: l.locationId, classCode: l.classCode }));
  const rev = postJournal(S, ctx, { companyId: original.companyId, date, memo: memo || `Reversal of ${original.entryNumber}${original.memo ? ` — ${original.memo}` : ""}`, source, sourceType: "JournalEntry", sourceId: original.id, reference: original.entryNumber, lines });
  fin2CopyDims(S, rev, lines);
  rev.reversesEntryId = original.id;
  if (original.recurringJournalId) rev.recurringJournalId = original.recurringJournalId;
  original.reversedBy = rev.id;
  return rev;
}
/** run one recurring journal for its next run date; returns what was posted */
function fin2RunOne(S, ctx, rj) {
  if (!rj.isActive) fail(`"${rj.name}" is paused — resume it first.`);
  const lines = rj.lines || [];
  if (!fin2Balance(lines).balanced) fail(`"${rj.name}" does not balance — fix its lines first.`);
  const runDate = rj.nextRunDate;
  let entry;
  try {
    entry = postJournal(S, ctx, { companyId: rj.companyId, date: runDate, memo: `${rj.name} — ${fin2RunLabel(runDate)}`, source: "RECURRING", sourceType: "RecurringJournal", sourceId: rj.id, reference: rj.memo || undefined, lines });
  } catch (e) { if (e instanceof ActionError) fail(`Couldn't run "${rj.name}": ${e.message}`); throw e; }
  fin2CopyDims(S, entry, lines);
  entry.recurringJournalId = rj.id;
  let reversal = null;
  if (rj.autoReverse) {
    try { reversal = fin2PostReversal(S, ctx, entry, fin2FirstOfNext(runDate), `Reversal of ${entry.entryNumber} — ${rj.name} (${fin2RunLabel(runDate)})`, "RECURRING"); }
    catch (e) { if (e instanceof ActionError) fail(`Couldn't run "${rj.name}": its reversal was refused — ${e.message}`); throw e; }
  }
  const nextRunDate = fin2Advance(runDate, rj.frequency, rj.dayOfMonth);
  const expired = !!rj.endDate && nextRunDate > rj.endDate;
  Object.assign(rj, { lastRunDate: runDate, nextRunDate, runCount: (rj.runCount || 0) + 1, ...(expired ? { isActive: false } : {}) });
  return { entry, reversal, nextRunDate, expired };
}
/** the system's own view of a close task — null for tasks only a person can confirm */
function fin2AutoCheck(S, code, p) {
  const inP = (d) => d && d >= p.startDate && d <= p.endDate;
  switch (code) {
    case "NO_DRAFT_JOURNALS": { const n = S.journalEntries.filter((j) => j.companyId === p.companyId && j.status === "DRAFT" && inP(j.date)).length; return { ok: n === 0, detail: n === 0 ? "no draft journals" : `${fin2Plural(n, "draft journal", "draft journals")} still open`, href: "/finance/journals" }; }
    case "RECURRING_RUN": { const n = S.recurringJournals.filter((r) => r.companyId === p.companyId && r.isActive && r.nextRunDate <= p.endDate).length; return { ok: n === 0, detail: n === 0 ? "nothing left to run" : `${fin2Plural(n, "recurring journal", "recurring journals")} still due`, href: "/finance/recurring" }; }
    case "BANK_RECONCILED": { const bas = S.bankAccounts.filter((b) => b.companyId === p.companyId).map((b) => b.id); const n = S.bankTransactions.filter((t) => bas.includes(t.bankAccountId) && t.status === "UNMATCHED" && inP(t.date)).length; return { ok: n === 0, detail: n === 0 ? "every bank line is matched" : `${fin2Plural(n, "bank line", "bank lines")} still unmatched`, href: "/finance/banking" }; }
    case "AP_MATCHED": { const n = S.apInvoices.filter((i) => i.companyId === p.companyId && i.matchStatus === "VARIANCE" && inP(i.invoiceDate)).length; return { ok: n === 0, detail: n === 0 ? "no match variances" : `${fin2Plural(n, "bill", "bills")} with a match variance`, href: "/procurement/match" }; }
    case "PAYROLL_POSTED": { const n = S.payrollRuns.filter((r) => r.companyId === p.companyId && inP(r.payDate) && !["POSTED", "CANCELLED"].includes(r.status)).length; return { ok: n === 0, detail: n === 0 ? "every payroll run is posted" : `${fin2Plural(n, "payroll run", "payroll runs")} not posted yet`, href: "/payroll/runs" }; }
    case "REMITTANCE_PAID": { const n = (S.remittances || []).filter((r) => r.companyId === p.companyId && r.status === "DUE" && inP(r.dueDate)).length; return { ok: n === 0, detail: n === 0 ? "nothing owing to CRA" : `${fin2Plural(n, "remittance", "remittances")} still due`, href: "/payroll/remittances" }; }
    default: return null;
  }
}
const fin2PeriodLabel = (S, p) => `${byId(S.companies, p.companyId)?.displayName || p.companyId} ${p.fiscalYear}-P${p.periodNumber}`;
const fin2Tasks = (S, periodId) => S.periodCloseTasks.filter((t) => t.periodId === periodId).sort((a, b) => a.sortOrder - b.sortOrder);

/* ---------------- reducers ---------------- */
Object.assign(R, {
  "recurring.run"(S, p, ctx) {
    ctx.need("finance.post");
    const rj = byId(S.recurringJournals, p.id);
    if (!rj) fail("That recurring journal no longer exists.");
    ctx.company(rj.companyId);
    const runFor = rj.nextRunDate;
    const r = fin2RunOne(S, ctx, rj);
    const summary = `Posted ${r.entry.entryNumber} (${money(r.entry.totalDebitCents)}) for ${dLong(runFor)}${r.reversal ? `, and its reversal ${r.reversal.entryNumber} dated ${dLong(r.reversal.date)}` : ""}${r.expired ? ". That was the last run — the schedule has ended." : `. Next run ${dLong(r.nextRunDate)}.`}`;
    ctx.audit({ module: "finance.gl", action: "POST", companyId: rj.companyId, entityType: "RecurringJournal", entityId: rj.id, summary: `${ctx.actor.displayName} ran "${rj.name}" (${byId(S.companies, rj.companyId).displayName}): ${summary}` });
  },
  "recurring.runDue"(S, p, ctx) {
    ctx.need("finance.post");
    const today = ctx.now.slice(0, 10);
    const ids = (p.companyIds || scopeIds(S, ctx.auth)).filter((id) => canSee(ctx.auth, id));
    const due = S.recurringJournals.filter((r) => ids.includes(r.companyId) && r.isActive && r.nextRunDate <= today).sort((a, b) => (a.nextRunDate < b.nextRunDate ? -1 : 1));
    if (!due.length) fail("Nothing is due — every active schedule has already run for this period.");
    const posted = [], failed = [];
    for (const rj of due) {
      try { const r = fin2RunOne(S, ctx, rj); posted.push(`${rj.name} → ${r.entry.entryNumber}${r.reversal ? ` + ${r.reversal.entryNumber}` : ""}`); }
      catch (e) { if (!(e instanceof ActionError)) throw e; failed.push(e.message); }
    }
    if (!posted.length) fail(`Nothing posted. ${failed.join(" · ")}`);
    ctx.audit({ module: "finance.gl", action: "POST", companyId: due[0].companyId, summary: `${ctx.actor.displayName} ran ${posted.length} of ${due.length} due recurring journal${due.length === 1 ? "" : "s"}: ${posted.join(", ")}.${failed.length ? ` Could not run — ${failed.join(" · ")}` : ""}` });
  },
  "recurring.toggle"(S, p, ctx) {
    ctx.need("finance.post");
    const rj = byId(S.recurringJournals, p.id);
    if (!rj) fail("That recurring journal no longer exists.");
    ctx.company(rj.companyId);
    rj.isActive = !rj.isActive;
    ctx.audit({ module: "finance.gl", action: "STATUS_CHANGE", companyId: rj.companyId, entityType: "RecurringJournal", entityId: rj.id, summary: `${ctx.actor.displayName} ${rj.isActive ? "resumed" : "paused"} recurring journal "${rj.name}".` });
  },
  "recurring.create"(S, p, ctx) {
    ctx.need("finance.post");
    ctx.company(p.companyId);
    const name = (p.name || "").trim();
    if (!name) fail("Give the recurring journal a name.");
    if (!FIN2_FREQ[p.frequency]) fail("Pick a frequency.");
    const dayOfMonth = Math.min(31, Math.max(1, parseInt(p.dayOfMonth, 10) || 1));
    const [y, m] = String(p.firstRunDate || "").split("-").map(Number);
    if (!y || !m) fail("Pick the first run date.");
    const nextRunDate = fin2Scheduled(y, m, dayOfMonth);
    if (p.endDate && p.endDate < nextRunDate) fail("The end date is before the first run.");
    const lines = (p.lines || []).filter((l) => l.accountNumber && ((l.debitCents || 0) > 0 || (l.creditCents || 0) > 0))
      .map((l) => ({ accountNumber: String(l.accountNumber), debitCents: l.debitCents || 0, creditCents: l.creditCents || 0, description: (l.description || "").trim() || undefined, classCode: l.classCode || undefined, departmentId: l.departmentId || undefined }));
    if (lines.length < 2 || lines.length > 6) fail("A recurring journal needs between 2 and 6 lines with amounts.");
    const bal = fin2Balance(lines);
    if (!bal.balanced) fail(`The lines don't balance — debits ${money(bal.debit)} vs credits ${money(bal.credit)}.`);
    const missing = [...new Set(lines.map((l) => l.accountNumber))].filter((n) => !S.accounts.some((a) => a.companyId === p.companyId && a.number === n && a.isActive !== false && a.isPostable !== false));
    if (missing.length) fail(`Account ${missing.join(", ")} can't be posted to in this company.`);
    const rj = { id: ctx.id("rj"), companyId: p.companyId, name, memo: (p.memo || "").trim() || null, frequency: p.frequency, dayOfMonth, nextRunDate, lastRunDate: null, endDate: p.endDate || null, autoReverse: !!p.autoReverse, lines, isActive: true, runCount: 0, createdByName: ctx.actor.displayName, createdAt: ctx.now };
    S.recurringJournals.push(rj);
    ctx.audit({ module: "finance.gl", action: "CREATE", companyId: p.companyId, entityType: "RecurringJournal", entityId: rj.id, summary: `${ctx.actor.displayName} set up recurring journal "${name}" (${p.frequency.toLowerCase()}, ${money(bal.debit)}, first run ${dLong(nextRunDate)}${rj.autoReverse ? ", auto-reversing" : ""}).` });
  },
  "journal.reverse"(S, p, ctx) {
    ctx.need("finance.post");
    const j = byId(S.journalEntries, p.id);
    if (!j) fail("That entry no longer exists.");
    ctx.company(j.companyId);
    if (j.status === "REVERSED" || j.reversedBy) fail(`${j.entryNumber} was already reversed${j.reversedBy ? ` by ${byId(S.journalEntries, j.reversedBy)?.entryNumber || ""}` : ""} — it can't be reversed twice.`);
    if (j.status !== "POSTED") fail(`Only posted entries can be reversed — ${j.entryNumber} is ${String(j.status).toLowerCase()}.`);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(p.date || "") ? p.date : ctx.now.slice(0, 10);
    const rev = fin2PostReversal(S, ctx, j, date);
    ctx.audit({ module: "finance.gl", action: "POST", companyId: j.companyId, entityType: "JournalEntry", entityId: j.id, summary: `${ctx.actor.displayName} reversed ${j.entryNumber} with ${rev.entryNumber} (${money(j.totalDebitCents)}) dated ${dLong(date)}.` });
  },
  "journal.manual.dims"(S, p, ctx) {
    // the stock manual entry, plus class/location tags on its lines (postJournal only keeps department/project)
    const before = S.journalEntries.length;
    R["journal.manual"](S, p, ctx);
    const je = S.journalEntries[before];
    const kept = (p.lines || []).filter((l) => l.accountNumber && ((l.debitCents || 0) > 0 || (l.creditCents || 0) > 0));
    if (je) fin2CopyDims(S, je, kept);
  },
  "bank.rule.add"(S, p, ctx) {
    ctx.need("banking.reconcile");
    const ba = byId(S.bankAccounts, p.bankAccountId);
    if (!ba) fail("That bank account no longer exists.");
    ctx.company(ba.companyId);
    const name = (p.name || "").trim(), pattern = (p.pattern || "").trim(), accountNumber = (p.accountNumber || "").trim();
    if (!name || !pattern || !accountNumber) fail("A rule needs a name, the words to look for, and the account to post to.");
    const gl = S.accounts.find((a) => a.companyId === ba.companyId && a.number === accountNumber && a.isActive !== false && a.isPostable !== false);
    if (!gl) fail(`Account ${accountNumber} can't be posted to in this company.`);
    if (gl.id === ba.glAccountId) fail("The offset account can't be the bank account itself.");
    const rule = { id: ctx.id("bmr"), bankAccountId: ba.id, name, pattern, accountNumber, memo: (p.memo || "").trim() || null, isActive: true, matchCount: 0 };
    S.bankMatchRules.push(rule);
    ctx.audit({ module: "banking", action: "CREATE", companyId: ba.companyId, entityType: "BankMatchRule", entityId: rule.id, summary: `${ctx.actor.displayName} added matching rule "${name}" on ${ba.name}: when the description contains "${pattern}", post to ${accountNumber} ${gl.name}.` });
  },
  "bank.rule.remove"(S, p, ctx) {
    ctx.need("banking.reconcile");
    const i = S.bankMatchRules.findIndex((r) => r.id === p.id);
    if (i < 0) fail("That rule no longer exists.");
    const rule = S.bankMatchRules[i], ba = byId(S.bankAccounts, rule.bankAccountId);
    ctx.company(ba.companyId);
    S.bankMatchRules.splice(i, 1);
    ctx.audit({ module: "banking", action: "DELETE", companyId: ba.companyId, entityType: "BankMatchRule", entityId: rule.id, summary: `${ctx.actor.displayName} removed matching rule "${rule.name}" from ${ba.name} (used ${rule.matchCount || 0} times).` });
  },
  "bank.autoMatch"(S, p, ctx) {
    ctx.need("banking.reconcile");
    const ba = byId(S.bankAccounts, p.bankAccountId);
    if (!ba) fail("That bank account no longer exists.");
    ctx.company(ba.companyId);
    const glNumber = byId(S.accounts, ba.glAccountId)?.number || GL.BANK;
    const rules = S.bankMatchRules.filter((r) => r.bankAccountId === ba.id && r.isActive !== false);
    const lines = S.bankTransactions.filter((t) => t.bankAccountId === ba.id && t.status === "UNMATCHED").sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!lines.length) fail("Every line on this account is already matched.");
    if (!rules.length) fail("Add a matching rule first — there is nothing to match against.");
    let matched = 0; const failed = [];
    for (const t of lines) {
      const rule = fin2FindRule(rules, t.description);
      if (!rule) continue;
      const amount = Math.abs(t.amountCents);
      if (!amount) continue;
      const deposit = t.amountCents > 0;
      try {
        const je = postJournal(S, ctx, { companyId: ba.companyId, date: t.date, memo: (rule.memo || "").trim() || t.description, source: "BANK", sourceType: "BankTransaction", sourceId: t.id, reference: t.reference || undefined,
          lines: deposit ? [{ accountNumber: glNumber, debitCents: amount, description: t.description }, { accountNumber: rule.accountNumber, creditCents: amount, description: rule.name }]
            : [{ accountNumber: rule.accountNumber, debitCents: amount, description: rule.name }, { accountNumber: glNumber, creditCents: amount, description: t.description }] });
        Object.assign(t, { status: "MATCHED", matchedJournalEntryId: je.id, matchedByRuleId: rule.id });
        rule.matchCount = (rule.matchCount || 0) + 1;
        matched++;
      } catch (e) { if (!(e instanceof ActionError)) throw e; failed.push(`"${t.description}": ${e.message}`); }
    }
    if (!matched) fail(failed.length ? `Nothing matched. ${failed.join(" · ")}` : `No rule recognises any of the ${fin2Plural(lines.length, "unmatched line", "unmatched lines")} — add a rule with words from the description.`);
    ctx.audit({ module: "banking", action: "POST", companyId: ba.companyId, entityType: "BankAccount", entityId: ba.id, summary: `${ctx.actor.displayName} auto-matched ${matched} of ${lines.length} unmatched line${lines.length === 1 ? "" : "s"} on ${ba.name} using the matching rules.${failed.length ? ` Refused — ${failed.join(" · ")}` : ""}` });
  },
  "period.task"(S, p, ctx) {
    ctx.need("finance.periods");
    const t = byId(S.periodCloseTasks, p.taskId);
    if (!t) fail("That task no longer exists.");
    const fp = byId(S.fiscalPeriods, t.periodId);
    ctx.company(fp.companyId);
    const label = fin2PeriodLabel(S, fp);
    if (fp.status !== "OPEN") fail(`${label} is closed — reopen it before changing its checklist.`);
    if (p.done && t.autoCheck) { const r = fin2AutoCheck(S, t.autoCheck, fp); if (r && !r.ok) fail(`Can't tick "${t.title}" yet — ${r.detail}.`); }
    if (p.done) Object.assign(t, { isDone: true, doneByName: ctx.actor.displayName, doneAt: ctx.now });
    else Object.assign(t, { isDone: false, doneByName: null, doneAt: null });
    ctx.audit({ module: "finance.periods", action: "UPDATE", companyId: fp.companyId, entityType: "PeriodCloseTask", entityId: t.id, summary: `${ctx.actor.displayName} ${p.done ? "completed" : "reopened"} close task "${t.title}" for ${label}.` });
  },
  "period.task.add"(S, p, ctx) {
    ctx.need("finance.periods");
    const fp = byId(S.fiscalPeriods, p.periodId);
    if (!fp) fail("That period no longer exists.");
    ctx.company(fp.companyId);
    const title = (p.title || "").trim();
    if (!title) fail("Type what the task is before adding it.");
    if (fp.status !== "OPEN") fail(`${fin2PeriodLabel(S, fp)} is closed — reopen it to add tasks.`);
    const t = { id: ctx.id("pct"), periodId: fp.id, title, sortOrder: fin2Tasks(S, fp.id).length, autoCheck: null, isDone: false, doneByName: null, doneAt: null };
    S.periodCloseTasks.push(t);
    ctx.audit({ module: "finance.periods", action: "CREATE", companyId: fp.companyId, entityType: "PeriodCloseTask", entityId: t.id, summary: `${ctx.actor.displayName} added close task "${title}" to ${fin2PeriodLabel(S, fp)}.` });
  },
  "period.close"(S, p, ctx) {
    ctx.need("finance.periods");
    const fp = byId(S.fiscalPeriods, p.periodId);
    if (!fp) fail("That period no longer exists.");
    ctx.company(fp.companyId);
    if (fp.status !== "OPEN") fail(`${fin2PeriodLabel(S, fp)} is already closed.`);
    const open = fin2Tasks(S, fp.id).filter((t) => !t.isDone);
    if (open.length) fail(`${fin2PeriodLabel(S, fp)} can't be closed yet — ${fin2Plural(open.length, "checklist task", "checklist tasks")} still open: ${open.slice(0, 3).map((t) => `"${t.title}"`).join(", ")}${open.length > 3 ? "…" : ""}.`);
    R["period.set"](S, { periodId: fp.id, status: "CLOSED" }, ctx);
  },
});
/** first active rule whose pattern appears (case-insensitively) in the description */
function fin2FindRule(rules, description) { const hay = String(description || "").toLowerCase(); return rules.find((r) => r.isActive !== false && (r.pattern || "").trim() && hay.includes(r.pattern.trim().toLowerCase())); }

/* ---------------- views: recurring & accruals ---------------- */
function fin2LinesPreview(rj) {
  const total = rj.lines.reduce((s, l) => s + (l.debitCents || 0), 0);
  return `<div class="f2lines">${rj.lines.map((l) => `<div><span class="dc ${l.debitCents ? "dr" : "cr"}">${l.debitCents ? "Dr" : "Cr"}</span><span class="mono hint">${esc(l.accountNumber)}</span><span class="nm">${esc(fin2AcctName(rj.companyId, l.accountNumber) || l.description || "")}</span>${l.classCode ? `<span class="f2cls">${esc(l.classCode)}</span>` : ""}<span class="amt">${amount(l.debitCents || l.creditCents)}</span></div>`).join("")}<div class="sum">${money(total)}</div></div>`;
}
function vFin2Recurring() {
  const today = todayStr(), canPost = can(A, "finance.post");
  const rows = inScope(S.recurringJournals);
  const active = rows.filter((r) => r.isActive), due = active.filter((r) => r.nextRunDate <= today), accruals = active.filter((r) => r.autoReverse);
  const cos = S.companies.filter((c) => inView(S, A, c.id) && rows.some((r) => r.companyId === c.id));
  const recent = inScope(S.journalEntries).filter((j) => j.recurringJournalId || j.sourceType === "RecurringJournal").sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1)).slice(0, 8);
  const acts = [canPost && due.length ? `<button class="btn" data-a="fin2RunDue">Run all due (${due.length})</button>` : "", canPost ? `<button class="btn pri" data-go="/finance/recurring/new">+ New recurring journal</button>` : ""].join("");
  const rowHtml = (r) => { const isDue = r.isActive && r.nextRunDate <= today; return `<tr class="${r.isActive ? "" : "f2paused"}"><td><strong>${esc(r.name)}</strong><div class="hint">${esc(r.memo || "")}</div></td><td>${esc(FIN2_FREQ[r.frequency] || r.frequency)}<div class="hint">on day ${r.dayOfMonth}</div></td><td class="mono">${dLong(r.nextRunDate)}${isDue ? `<span class="f2due">Due now</span>` : ""}<div class="hint" style="font-family:var(--font)">${r.lastRunDate ? `last ${dShort(r.lastRunDate)} · ` : ""}${r.runCount || 0} run${r.runCount === 1 ? "" : "s"}${r.endDate ? ` · until ${dShort(r.endDate)}` : ""}</div></td><td>${fin2LinesPreview(r)}</td><td>${r.isActive ? badge("ACTIVE") : `<span class="badge tone-grey">Paused</span>`}${r.autoReverse ? `<div style="margin-top:4px"><span class="badge tone-blue">Auto-reverses</span></div>` : ""}</td>${canPost ? `<td class="r"><div class="f2acts">${r.isActive ? `<button class="btn sm pri" data-a="fin2Run" data-id="${r.id}">Run now</button>` : ""}<button class="btn sm" data-a="fin2Toggle" data-id="${r.id}">${r.isActive ? "Pause" : "Resume"}</button></div></td>` : ""}</tr>`; };
  const heads = ["Schedule", "How often", "Next run", "What it posts", "Status", ...(canPost ? [">Actions"] : [])];
  return ph("Recurring & Accruals", "Entries that repeat on a schedule — depreciation, accruals, management fees. Run them each month instead of typing them again.", acts) + flashHtml()
    + `<div class="stats">${stat("Active schedules", String(active.length), `${rows.length - active.length} paused`)}${stat("Due now", String(due.length), due.length ? "Ready to run — nothing posts until you say so" : "Nothing waiting on you", due.length ? "warn" : "good")}${stat("Auto-reversing accruals", String(accruals.length), "Reversed on the 1st of the next month", "primary")}</div>`
    + (rows.length ? cos.map((c) => cardFlush(coTag(c.id), table(heads, rows.filter((r) => r.companyId === c.id).sort((a, b) => Number(b.isActive) - Number(a.isActive) || (a.nextRunDate < b.nextRunDate ? -1 : 1)).map(rowHtml)))).join("")
      : card("", empty("No recurring journals yet", "Set one up for anything you post the same way every month — depreciation, prepaid insurance, management fees.")))
    + `<div class="grid g-main" style="margin-top:14px">${cardFlush("Recently generated entries", recent.length ? table(["Entry", "Date", "From schedule", "Status", ">Amount"], recent.map((j) => { const rj = byId(S.recurringJournals, j.recurringJournalId); const rev = j.reversesEntryId ? byId(S.journalEntries, j.reversesEntryId) : null; return `<tr class="click" data-go="/finance/journals/${j.id}"><td class="mono"><strong>${esc(j.entryNumber)}</strong>${rev ? `<div class="hint" style="font-family:var(--font)">reverses ${esc(rev.entryNumber)}</div>` : ""}</td><td>${dLong(j.date)}</td><td>${coTag(j.companyId)} ${esc(rj?.name || "")}</td><td>${badge(j.reversedBy ? "REVERSED" : j.status)}</td>${td(money(j.totalDebitCents), 1)}</tr>`; })) : `<div class="card-b hint">Nothing has been run yet — press “Run now” on a schedule to post its first entry.</div>`)}
      ${card("What this means", `<div class="f2means"><p><strong>Run now</strong> posts the entry for the next run date and moves the schedule forward. Nothing posts on its own.</p><p><strong>Auto-reverse</strong> is for accruals: the entry is undone on the 1st of the following month, so the real bill replaces the estimate.</p><p><strong>Pause</strong> keeps the schedule but skips it until you resume. The period-close checklist flags anything still due.</p></div>`)}</div>`;
}
function vFin2RecurringNew() {
  const cid = UI.fin2rj?.companyId || defCo();
  if (!UI.fin2rj || UI.fin2rj.companyId !== cid) UI.fin2rj = { companyId: cid, lines: [{}, {}] };
  const F = UI.fin2rj;
  const accts = S.accounts.filter((a) => a.companyId === cid && a.isPostable !== false && a.isActive !== false).sort((a, b) => a.number.localeCompare(b.number));
  const classes = S.dimensions.filter((d) => d.companyId === cid && d.type === "CLASS" && d.isActive !== false);
  const depts = S.departments.filter((d) => d.companyId === cid && d.isActive !== false);
  const t = todayStr(); const firstNext = fin2FirstOfNext(t);
  return `<div class="crumb">${crumb("/finance/recurring", "Recurring & Accruals")}</div>` + ph("New recurring journal", "Describe the entry once. Each run posts it for the next scheduled date; accruals can undo themselves on the 1st of the following month.") + flashHtml()
    + card("", `<form data-f="fin2Recurring" id="fin2Form"><div class="form-grid" style="margin-bottom:12px"><div class="fld"><label for="rjCo">Company</label>${coScopeSelect("rjCo", "companyId", cid).replace('class="in"', 'class="in" data-a="fin2Co"')}</div><div class="fld"><label for="rjName">Name</label><input class="in" id="rjName" name="name" required placeholder="e.g. Monthly insurance accrual"></div><div class="fld"><label for="rjMemo">Memo (optional)</label><input class="in" id="rjMemo" name="memo" placeholder="What this is for"></div></div>
      <div class="form-grid" style="margin-bottom:12px"><div class="fld"><label for="rjFreq">How often</label><select class="in" id="rjFreq" name="frequency">${Object.entries(FIN2_FREQ).map(([k, l]) => opt(k, l, k === "MONTHLY")).join("")}</select></div><div class="fld"><label for="rjDay">Day of month</label><input class="in" id="rjDay" name="dayOfMonth" type="number" min="1" max="31" value="1" required><span class="hint">31 means “last day” in shorter months</span></div><div class="fld"><label for="rjFirst">First run (month)</label><input class="in" id="rjFirst" name="firstRunDate" type="date" value="${firstNext}" required><span class="hint">The day is taken from “day of month”</span></div><div class="fld"><label for="rjEnd">Stop after (optional)</label><input class="in" id="rjEnd" name="endDate" type="date"></div></div>
      <label class="card" style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;margin-bottom:12px;cursor:pointer"><input type="checkbox" name="autoReverse" style="margin-top:3px"><span><strong style="font-size:13px">Auto-reverse on the 1st of the next month</strong><span class="hint" style="display:block">Tick this for accruals — an estimate you book now so the month is complete, then undo when the real bill arrives.</span></span></label>
      <div class="tw"><table class="t"><thead><tr><th>Account</th><th>Note</th><th class="r">Debit</th><th class="r">Credit</th><th>Class</th><th>Department</th><th></th></tr></thead><tbody>${F.lines.map((l, i) => `<tr><td><select class="in" style="min-width:210px" data-rj="accountNumber" data-i="${i}" aria-label="Account line ${i + 1}">${opt("", "— pick account —", !l.accountNumber)}${accts.map((a) => opt(a.number, `${a.number} — ${a.name}`, a.number === l.accountNumber)).join("")}</select></td><td><input class="in" style="min-width:140px" data-rj="description" data-i="${i}" value="${esc(l.description || "")}" aria-label="Note line ${i + 1}"></td><td><input class="in num" style="text-align:right;min-width:100px" inputmode="decimal" data-rj="debit" data-i="${i}" value="${esc(l.debit || "")}" aria-label="Debit line ${i + 1}"></td><td><input class="in num" style="text-align:right;min-width:100px" inputmode="decimal" data-rj="credit" data-i="${i}" value="${esc(l.credit || "")}" aria-label="Credit line ${i + 1}"></td><td><select class="in" style="min-width:130px" data-rj="classCode" data-i="${i}" aria-label="Class line ${i + 1}" ${classes.length ? "" : "disabled"}>${opt("", "— none —", !l.classCode)}${classes.map((c) => opt(c.code, c.name, c.code === l.classCode)).join("")}</select></td><td><select class="in" style="min-width:140px" data-rj="departmentId" data-i="${i}" aria-label="Department line ${i + 1}" ${depts.length ? "" : "disabled"}>${opt("", "— none —", !l.departmentId)}${depts.map((d) => opt(d.id, d.name, d.id === l.departmentId)).join("")}</select></td><td>${F.lines.length > 2 ? `<button type="button" class="lnk" style="color:var(--danger);font-size:12px" data-a="fin2LineDel" data-i="${i}" aria-label="Remove line ${i + 1}">remove</button>` : ""}</td></tr>`).join("")}<tr class="tot"><td colspan="2">${F.lines.length < 6 ? `<button type="button" class="lnk" data-a="fin2LineAdd">+ Add line</button>` : `<span class="hint">6 lines is the maximum</span>`}</td><td class="r num" id="rjDr"></td><td class="r num" id="rjCr"></td><td colspan="3" id="rjBal"></td></tr></tbody></table></div>
      <div class="form-row" style="margin-top:12px"><button class="btn pri" id="rjSave">Save schedule</button><span class="hint">Nothing posts when you save — the first entry goes in when you press “Run now”.</span></div></form>`);
}
function fin2Totals() {
  const F = UI.fin2rj; if (!F || !document.getElementById("rjDr")) return;
  const dr = F.lines.reduce((s, l) => s + (toCents(l.debit) || 0), 0), cr = F.lines.reduce((s, l) => s + (toCents(l.credit) || 0), 0);
  const filled = F.lines.filter((l) => l.accountNumber && ((toCents(l.debit) || 0) > 0 || (toCents(l.credit) || 0) > 0)).length;
  const ok = dr > 0 && dr === cr && filled >= 2;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
  set("rjDr", amount(dr)); set("rjCr", amount(cr));
  set("rjBal", ok ? `<span class="badge tone-green">Balanced ✓</span>` : dr === cr && dr > 0 ? `<span class="badge tone-amber">Need 2+ lines with accounts</span>` : `<span class="badge tone-amber">Off by ${amount(Math.abs(dr - cr))}</span>`);
  const b = document.getElementById("rjSave"); if (b) b.disabled = !ok;
}

/* ---------------- views: journal detail with reversal + dimensions ---------------- */
function vFin2Journal(q, id) {
  const base = vJournal(q, id);
  const j = byId(S.journalEntries, id);
  if (!j || !canSee(A, j.companyId)) return base;
  const rev = j.reversedBy ? byId(S.journalEntries, j.reversedBy) : null;
  const orig = j.reversesEntryId ? byId(S.journalEntries, j.reversesEntryId) : null;
  const rj = j.recurringJournalId ? byId(S.recurringJournals, j.recurringJournalId) : null;
  let notes = flashHtml();
  if (rev) notes += `<div class="msg warn">This entry was reversed by ${goLink(`/finance/journals/${rev.id}`, rev.entryNumber)} dated ${dLong(rev.date)} — the two net to zero. It can't be reversed twice.</div>`;
  if (orig) notes += `<div class="msg info">Reverses ${goLink(`/finance/journals/${orig.id}`, orig.entryNumber)} (${dLong(orig.date)}) — debits and credits swapped so the books net to zero.</div>`;
  if (rj) notes += `<div class="msg info">Generated from the recurring journal “${esc(rj.name)}” · ${goLink("/finance/recurring", "Recurring & Accruals")}</div>`;
  const { acct } = ledgerIdx();
  const lines = S.journalLines.filter((l) => l.journalEntryId === j.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const dims = lines.some((l) => l.classCode || l.locationId || l.departmentId) ? `<div class="sect-l">Classes, locations &amp; departments on this entry</div>` + cardFlush("", table(["Account", "Class", "Location", "Department", ">Amount"], lines.map((l) => { const a = acct.get(l.accountId); const loc = l.locationId ? byId(S.locations, l.locationId) : null; const dep = l.departmentId ? byId(S.departments, l.departmentId) : null; return `<tr><td><span class="mono">${esc(a.number)}</span> ${esc(a.name)}</td><td>${l.classCode ? `<span class="f2cls">${esc(fin2ClassName(j.companyId, l.classCode))}</span>` : `<span class="hint">—</span>`}</td><td>${loc ? `<span class="f2loc">${esc(loc.name)}</span>` : `<span class="hint">—</span>`}</td><td>${dep ? esc(dep.name) : `<span class="hint">—</span>`}</td>${td(amount(l.debitCents || l.creditCents), 1)}</tr>`; }))) : "";
  const reverse = can(A, "finance.post") && j.status === "POSTED" && !rev ? `<div class="f2rev"><div style="font-weight:600;font-size:13.5px">Made a mistake? Reverse this entry</div><p class="hint" style="margin:4px 0 10px">Posts a mirror-image entry (debits and credits swapped) so the books net to zero, and marks this one as reversed. Nothing is deleted — both entries stay in the ledger and the audit trail.</p><form data-f="fin2Reverse" data-id="${j.id}" class="form-row"><div class="fld"><label for="rvDate">Reversal date</label><input class="in" type="date" id="rvDate" name="date" value="${todayStr()}" style="width:170px"></div><button class="btn" style="align-self:flex-end">Reverse this entry</button></form></div>` : "";
  // slot the notes in right after the page header so they read before the lines
  const cut = base.indexOf('<section class="card"');
  return (cut > 0 ? base.slice(0, cut) + notes + base.slice(cut) : base + notes) + dims + reverse;
}

/* ---------------- views: banking + matching rules ---------------- */
function vFin2Banking() {
  const base = vBanking();
  const accts = inScope(S.bankAccounts);
  const cur = UI.filters.bank && accts.some((a) => a.id === UI.filters.bank) ? UI.filters.bank : accts[0]?.id;
  const ba = byId(S.bankAccounts, cur);
  if (!ba) return base;
  const canRec = can(A, "banking.reconcile");
  const rules = S.bankMatchRules.filter((r) => r.bankAccountId === ba.id);
  const unmatched = S.bankTransactions.filter((t) => t.bankAccountId === ba.id && t.status === "UNMATCHED");
  const ready = unmatched.filter((t) => fin2FindRule(rules, t.description));
  const glNumber = byId(S.accounts, ba.glAccountId)?.number || GL.BANK;
  const glAccts = S.accounts.filter((a) => a.companyId === ba.companyId && a.isPostable !== false && a.isActive !== false && a.number !== glNumber).sort((a, b) => a.number.localeCompare(b.number));
  const right = canRec && unmatched.length && rules.length ? `<button class="btn sm pri" data-a="fin2AutoMatch" data-id="${ba.id}">Auto-match${ready.length ? ` (${ready.length} ready)` : ""}</button>` : "";
  const body = `<div class="card-b"><p class="hint" style="margin:0 0 10px">When a bank line's description contains these words, Auto-match posts it to the account shown and ticks it off — no typing.${unmatched.length ? ` ${fin2Plural(unmatched.length, "line is", "lines are")} unmatched on ${esc(ba.name)}${ready.length ? `; ${ready.length} would be matched by a rule` : "; no rule recognises them yet"}.` : " Every line on this account is matched."}</p></div>`
    + table(["Rule", "When the description contains", "Posts to", "Memo", ">Times used", ...(canRec ? [""] : [])], rules.map((r) => `<tr><td><strong>${esc(r.name)}</strong></td><td>“<span class="mono">${esc(r.pattern)}</span>”</td><td><span class="mono hint">${esc(r.accountNumber)}</span> ${esc(fin2AcctName(ba.companyId, r.accountNumber))}</td><td class="hint">${esc(r.memo || "—")}</td>${td(r.matchCount || 0, 1)}${canRec ? `<td class="r"><button class="lnk" style="color:var(--danger);font-size:12px" data-a="fin2RuleRemove" data-id="${r.id}">Remove</button></td>` : ""}</tr>`), "No rules yet for this account.")
    + (canRec ? `<div class="card-b f2rules"><form data-f="fin2RuleAdd" data-id="${ba.id}" class="form-grid"><input class="in" name="name" required placeholder="Rule name, e.g. Island Diesel" aria-label="Rule name"><input class="in" name="pattern" required placeholder="Words to look for, e.g. diesel" aria-label="Words to look for"><select class="in" name="accountNumber" required aria-label="Post to account">${opt("", "Post to account…", true)}${glAccts.map((a) => opt(a.number, `${a.number} — ${a.name}`)).join("")}</select><input class="in" name="memo" placeholder="Memo on the entry (optional)" aria-label="Memo"><button class="btn" style="height:34px">+ Add rule</button></form></div>` : "");
  const matchedLinks = S.bankTransactions.filter((t) => t.bankAccountId === ba.id && t.matchedJournalEntryId).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  const posted = matchedLinks.length ? `<div class="sect-l">Posted by Auto-match</div>` + cardFlush("", table(["Date", "Bank line", "Ledger entry", ">Amount"], matchedLinks.map((t) => { const je = byId(S.journalEntries, t.matchedJournalEntryId); return `<tr class="click" data-go="/finance/journals/${t.matchedJournalEntryId}"><td>${dLong(t.date)}</td><td>${esc(t.description)}</td><td class="mono">${esc(je?.entryNumber || "")}<div class="hint" style="font-family:var(--font)">${esc(je?.memo || "")}</div></td>${td(money(t.amountCents), 1)}</tr>`; }))) : "";
  const tabsAt = base.indexOf('<div class="tabs">');
  const withFlash = tabsAt > 0 ? base.slice(0, tabsAt) + flashHtml() + base.slice(tabsAt) : flashHtml() + base;
  return withFlash + `<div class="sect-l">Matching rules · ${esc(ba.name)}</div>` + cardFlush("Matching rules", body, right) + posted;
}

/* ---------------- views: period close checklist ---------------- */
function fin2TaskRow(t, fp) {
  const r = t.autoCheck ? fin2AutoCheck(S, t.autoCheck, fp) : null;
  const canDo = can(A, "finance.periods");
  return `<div class="f2task">${canDo ? `<button class="f2tick ${t.isDone ? "on" : ""}" data-a="fin2Task" data-id="${t.id}" data-done="${t.isDone ? "0" : "1"}" aria-label="${t.isDone ? `Reopen ${esc(t.title)}` : `Mark ${esc(t.title)} done`}" title="${t.isDone ? "Click to reopen" : "Click to mark done"}">✓</button>` : `<span class="f2tick ${t.isDone ? "on" : ""}" aria-hidden>✓</span>`}<div style="min-width:0;flex:1"><div class="tt ${t.isDone ? "done" : ""}">${esc(t.title)}</div>${r && !t.isDone ? `<div class="ac ${r.ok ? "ok" : "bad"}">${r.ok ? "✔ checked automatically — " : "✖ "}${esc(r.detail)}${r.ok ? "" : ` · <button class="lnk" data-go="${esc(r.href)}">fix it →</button>`}</div>` : ""}${t.isDone && t.doneByName ? `<div class="hint">done by ${esc(t.doneByName)} · ${dTime(t.doneAt)}</div>` : ""}</div></div>`;
}
function vFin2Periods() {
  const today = todayStr(), canDo = can(A, "finance.periods");
  const cos = S.companies.filter((c) => inView(S, A, c.id));
  const openState = UI.filters.fin2open || (UI.filters.fin2open = {});
  const periodsOf = (cid) => S.fiscalPeriods.filter((p) => p.companyId === cid).sort((a, b) => a.periodNumber - b.periodNumber);
  const overview = cos.map((c) => ({ c, p: periodsOf(c.id).find((p) => p.startDate <= today && p.endDate >= today) })).filter((x) => x.p);
  const progress = overview.length ? card("Close progress — this month", `<p class="hint" style="margin:0 0 10px">How far along each company's current checklist is. Auto-checked tasks tick themselves off once the system finds nothing outstanding.</p><div class="f2prog">${overview.map(({ c, p }) => {
    const tasks = fin2Tasks(S, p.id); const doneN = tasks.filter((t) => t.isDone).length;
    const autoOk = tasks.filter((t) => !t.isDone && t.autoCheck && fin2AutoCheck(S, t.autoCheck, p)?.ok).length;
    const left = tasks.length - doneN - autoOk;
    return `<div class="box"><div class="hd"><span class="nm">${coTag(c.id)} · P${p.periodNumber}</span>${badge(p.status)}</div>${tasks.length ? donut([{ label: "Done", v: doneN, d: String(doneN) }, { label: "Checked automatically", v: autoOk, d: String(autoOk) }, { label: "Still to do", v: left, d: String(left) }], { total: `${doneN} of ${tasks.length}`, caption: "tasks done", size: 120, thick: 15 }) : `<p class="hint">No checklist for this month yet.</p>`}</div>`; }).join("")}</div>`) : "";
  const perCo = cos.map((c) => card(coTag(c.id), periodsOf(c.id).map((p) => {
    const tasks = fin2Tasks(S, p.id); const doneN = tasks.filter((t) => t.isDone).length;
    const isCurrent = p.startDate <= today && p.endDate >= today;
    const canClose = p.status === "OPEN" && doneN === tasks.length;
    const isOpen = openState[p.id] != null ? openState[p.id] : isCurrent;
    const btn = !canDo ? "" : p.status === "OPEN" ? `<button class="btn sm ${canClose ? "pri" : ""}" data-a="fin2Close" data-id="${p.id}" title="${canClose ? "" : "Finish the checklist first"}">Close period</button>` : `<button class="btn sm" data-a="period" data-id="${p.id}" data-st="OPEN">Reopen</button>`;
    return `<div class="f2per"><div class="row"><span class="pn">P${p.periodNumber}</span><span class="pd">${dShort(p.startDate)} → ${dLong(p.endDate)}${p.status === "CLOSED" && p.closedByName ? `<div class="hint" style="font-family:var(--font)">closed by ${esc(p.closedByName)} · ${dTime(p.closedAt)}</div>` : ""}</span>${tasks.length && p.status === "OPEN" ? `<span class="f2cnt ${doneN === tasks.length ? "all" : ""}">${doneN} of ${tasks.length} done</span>` : ""}${badge(p.status)}${btn}</div>
      ${p.status === "OPEN" && (tasks.length || isCurrent) ? `<details data-fin2per="${p.id}" ${isOpen ? "open" : ""}><summary>Close checklist${tasks.length ? `<span class="f2bar"><i style="width:${(doneN / tasks.length) * 100}%"></i></span>` : ""}</summary>${tasks.map((t) => fin2TaskRow(t, p)).join("")}${tasks.length ? "" : `<p class="hint" style="padding:8px 12px;margin:0;border-top:1px solid var(--border)">No tasks yet — add the first one below.</p>`}${canDo ? `<form class="f2add" data-f="fin2TaskAdd" data-id="${p.id}"><input class="in" name="title" required placeholder="Add a task, e.g. Review accruals with the GM" aria-label="New task"><button class="btn sm" style="height:34px">+ Add</button></form>` : ""}</details>` : ""}</div>`; }).join(""))).join("");
  return ph("Period Close · 2026", "Work through the checklist, then close the month. Nothing can be posted into a closed month — that's how finished months stay finished. Every open/close is logged.") + flashHtml() + progress + `<div class="grid g2" style="margin-top:14px">${perCo}</div>`;
}

/* ---------------- views: journal list with "postings by class", manual entry with class/location ---------------- */
/** expense spend tagged with a class this year, in scope — the same spend split by business line */
function fin2ClassSpend() {
  const year = todayStr().slice(0, 4);
  const jes = new Map(inScope(S.journalEntries).filter((j) => j.status === "POSTED" && j.date.slice(0, 4) === year).map((j) => [j.id, j]));
  const { acct } = ledgerIdx();
  const byCode = new Map();
  for (const l of S.journalLines) {
    if (!l.classCode) continue; const j = jes.get(l.journalEntryId); if (!j) continue;
    if (acct.get(l.accountId)?.type !== "EXPENSE") continue;
    byCode.set(l.classCode, (byCode.get(l.classCode) || 0) + (l.debitCents || 0) - (l.creditCents || 0));
  }
  return [...byCode].filter(([, v]) => v > 0).map(([code, v]) => ({ label: S.dimensions.find((d) => d.type === "CLASS" && d.code === code)?.name || code, v, d: money(v), fmt: money }));
}
function vFin2Journals() {
  const base = vJournals();
  const items = fin2ClassSpend(), total = items.reduce((s, i) => s + i.v, 0);
  const classes = inScope(S.dimensions).filter((d) => d.type === "CLASS" && d.isActive !== false);
  const chart = items.length ? donut(items, { total: money(total), caption: "tagged spend", size: 150, thick: 20 })
    : `<div class="empty"><b>Nothing tagged yet this year</b>${classes.length ? `Tag an expense line with a class on a manual entry or a recurring journal — ${classes.slice(0, 4).map((c) => c.name).join(", ")}${classes.length > 4 ? "…" : ""} — and it shows up here.` : "This scope has no classes set up."}</div>`;
  const cardHtml = card("Postings by class (this year)", `<p class="hint" style="margin:0 0 10px">Expense lines tagged with a business line — the same spend split a different way, without extra accounts. Anything beyond six classes folds into “Other”.</p>${chart}`);
  const cut = base.indexOf('<div class="tabs"');
  return cut > 0 ? base.slice(0, cut) + cardHtml + base.slice(cut) : base + cardHtml;
}
function vFin2NewJournal() {
  const base = vNewJournal();
  const cid = UI.je?.companyId;
  const classes = S.dimensions.filter((d) => d.companyId === cid && d.type === "CLASS" && d.isActive !== false);
  const locs = S.locations.filter((l) => l.companyId === cid && l.isActive !== false);
  if (!classes.length && !locs.length) return base;
  const cell = (i) => { const l = UI.je.lines[i] || {}; return `<td><select class="in" style="min-width:120px" data-je2="classCode" data-i="${i}" aria-label="Class ${i + 1}" ${classes.length ? "" : "disabled"}>${opt("", "— none —", !l.classCode)}${classes.map((c) => opt(c.code, c.name, c.code === l.classCode)).join("")}</select></td><td><select class="in" style="min-width:130px" data-je2="locationId" data-i="${i}" aria-label="Location ${i + 1}" ${locs.length ? "" : "disabled"}>${opt("", "— none —", !l.locationId)}${locs.map((x) => opt(x.id, x.name, x.id === l.locationId)).join("")}</select></td>`; };
  return base
    .replace('data-f="journal"', 'data-f="fin2Journal"')
    .replace('<th class="r">Credit</th><th></th></tr></thead>', '<th class="r">Credit</th><th>Class</th><th>Location</th><th></th></tr></thead>')
    .replace(/aria-label="Credit (\d+)"><\/td>/g, (m, n) => m + cell(+n - 1))
    .replace('<td id="jeBal"></td>', '<td id="jeBal" colspan="3"></td>')
    .replace('<span class="hint" id="jeHint"></span>', '<span class="hint" id="jeHint">Class and location are optional tags — they split the same spend by business line and site without extra accounts.</span>');
}

/* ---------------- routes (registered before app.js, so they win the lookup) ---------------- */
route("/finance/recurring", "finance.view", vFin2Recurring);
route("/finance/recurring/new", "finance.post", vFin2RecurringNew);
route("/finance/journals", "finance.view", vFin2Journals);
route("/finance/journals/new", "finance.post", vFin2NewJournal);
route("/finance/journals/:id", "finance.view", vFin2Journal);
route("/finance/banking", "banking.view", vFin2Banking);
route("/finance/periods", "finance.periods", vFin2Periods);

/* ---------------- form + click handlers ---------------- */
window.FORMS_EXT.push({
  fin2Recurring(f) {
    const d = fd(f);
    const lines = (UI.fin2rj?.lines || []).map((l) => ({ accountNumber: l.accountNumber, description: l.description, debitCents: toCents(l.debit) || 0, creditCents: toCents(l.credit) || 0, classCode: l.classCode, departmentId: l.departmentId }));
    if (act("recurring.create", { companyId: UI.fin2rj.companyId, name: d.name, memo: d.memo, frequency: d.frequency, dayOfMonth: d.dayOfMonth, firstRunDate: d.firstRunDate, endDate: d.endDate || null, autoReverse: !!d.autoReverse, lines }, `"${d.name}" is set up — press Run now when its first date comes round.`)) { const fl = UI.flash; UI.fin2rj = null; go("/finance/recurring"); UI.flash = fl; safeRender(); }
  },
  fin2Reverse(f) {
    const d = fd(f); const before = S.journalEntries.length; const j = byId(S.journalEntries, f.dataset.id);
    if (act("journal.reverse", { id: f.dataset.id, date: d.date })) { const rev = S.journalEntries[before]; const msg = `${j?.entryNumber || "Entry"} reversed — this is the reversing entry ${rev?.entryNumber || ""}, dated ${dLong(rev?.date || d.date)}.`; toast("Done", msg, "ok"); go(`/finance/journals/${rev.id}`); UI.flash = { kind: "ok", text: msg }; safeRender(); }
  },

  fin2Journal(f) {
    const d = fd(f); const before = S.journalEntries.length;
    const lines = UI.je.lines.map((l) => ({ accountNumber: l.accountNumber, description: l.description, debitCents: toCents(l.debit) || 0, creditCents: toCents(l.credit) || 0, classCode: l.classCode || undefined, locationId: l.locationId || undefined }));
    if (act("journal.manual.dims", { companyId: UI.je.companyId, date: d.date, memo: d.memo, lines }, "Entry posted.")) { const je = S.journalEntries[before]; UI.je = null; go(`/finance/journals/${je.id}`); UI.flash = { kind: "ok", text: `${je.entryNumber} posted (${money(je.totalDebitCents)}).` }; safeRender(); }
  },
  fin2RuleAdd(f) { const d = fd(f); if (act("bank.rule.add", { bankAccountId: f.dataset.id, name: d.name, pattern: d.pattern, accountNumber: d.accountNumber, memo: d.memo }, `Rule "${d.name}" added — lines containing "${d.pattern}" will post to ${d.accountNumber}.`)) safeRender(); },
  fin2TaskAdd(f) { const d = fd(f); const fp = byId(S.fiscalPeriods, f.dataset.id); UI.filters.fin2open = { ...(UI.filters.fin2open || {}), [f.dataset.id]: true }; act("period.task.add", { periodId: f.dataset.id, title: d.title }, `Added "${d.title}" to the ${fp ? co(fp.companyId).displayName + " P" + fp.periodNumber : ""} checklist.`); },
});
window.ACTIONS_EXT.push({
  fin2Run(el) { const rj = byId(S.recurringJournals, el.dataset.id); if (act("recurring.run", { id: el.dataset.id })) { const s = S.audit[S.audit.length - 1]?.summary || ""; UI.flash = { kind: "ok", text: `"${rj?.name}" — ${s.slice(s.indexOf("): ") + 3) || "posted."}` }; safeRender(); } },
  fin2RunDue() { if (act("recurring.runDue", { companyIds: scopeIds(S, A) })) { const s = S.audit[S.audit.length - 1]?.summary || "Ran every due schedule."; UI.flash = { kind: "ok", text: s.replace(/^\S+ \S+ ran /, "Ran ") }; safeRender(); } },
  fin2Toggle(el) { const rj = byId(S.recurringJournals, el.dataset.id); const resuming = rj && !rj.isActive; act("recurring.toggle", { id: el.dataset.id }, resuming ? `"${rj.name}" resumed — it will run again on ${dLong(rj.nextRunDate)}.` : `"${rj?.name}" paused — it won't run until you resume it.`); },
  fin2Co(el) { UI.fin2rj = { companyId: el.value, lines: [{}, {}] }; safeRender(); },
  fin2LineAdd() { if (UI.fin2rj.lines.length < 6) UI.fin2rj.lines.push({}); safeRender(); },
  fin2LineDel(el) { UI.fin2rj.lines.splice(+el.dataset.i, 1); safeRender(); },
  fin2AutoMatch(el) { if (act("bank.autoMatch", { bankAccountId: el.dataset.id })) { const s = S.audit[S.audit.length - 1]?.summary || ""; UI.flash = { kind: "ok", text: s.replace(/^\S+ \S+ auto-matched /, "Auto-matched ") }; safeRender(); } },
  fin2RuleRemove(el) { const r = byId(S.bankMatchRules, el.dataset.id); act("bank.rule.remove", { id: el.dataset.id }, `Rule "${r?.name}" removed. Already-matched lines are untouched.`); },
  fin2Task(el) { const t = byId(S.periodCloseTasks, el.dataset.id); const done = el.dataset.done === "1"; const fp = t && byId(S.fiscalPeriods, t.periodId); if (fp) UI.filters.fin2open = { ...(UI.filters.fin2open || {}), [fp.id]: true }; act("period.task", { taskId: el.dataset.id, done }, done ? `"${t?.title}" ticked off${fp ? ` for ${co(fp.companyId).displayName} P${fp.periodNumber}` : ""}.` : `"${t?.title}" reopened.`); },
  fin2Close(el) { const fp = byId(S.fiscalPeriods, el.dataset.id); if (fp) UI.filters.fin2open = { ...(UI.filters.fin2open || {}), [fp.id]: true }; act("period.close", { periodId: el.dataset.id }, fp ? `${co(fp.companyId).displayName} ${fp.fiscalYear}-P${fp.periodNumber} is closed. Nothing more can be posted into it.` : "Period closed."); },
});
// the recurring-journal line grid keeps its own draft; totals update as you type
document.addEventListener("change", (ev) => { const el = ev.target; if (el.dataset?.rj && UI.fin2rj) { UI.fin2rj.lines[+el.dataset.i][el.dataset.rj] = el.value; fin2Totals(); } });
document.addEventListener("input", (ev) => { const el = ev.target; if (el.dataset?.rj && (el.dataset.rj === "debit" || el.dataset.rj === "credit") && UI.fin2rj) { UI.fin2rj.lines[+el.dataset.i][el.dataset.rj] = el.value; fin2Totals(); } });
// class / location tags on the manual entry grid live on the same draft lines app.js uses
document.addEventListener("change", (ev) => { const el = ev.target; if (el.dataset?.je2 && UI.je?.lines?.[+el.dataset.i]) UI.je.lines[+el.dataset.i][el.dataset.je2] = el.value; });
// remember which checklists are open across re-renders ('toggle' doesn't bubble, so capture it)
document.addEventListener("toggle", (ev) => { const d = ev.target; if (d?.dataset?.fin2per) (UI.filters.fin2open || (UI.filters.fin2open = {}))[d.dataset.fin2per] = d.open; }, true);
// totals on first paint of the form
const _fin2Observer = new MutationObserver(() => { if (document.getElementById("rjDr")) fin2Totals(); });
document.addEventListener("DOMContentLoaded", () => { const app = document.getElementById("app"); if (app) _fin2Observer.observe(app, { childList: true }); });
if (document.readyState !== "loading") { const app = document.getElementById("app"); if (app) _fin2Observer.observe(app, { childList: true }); }
