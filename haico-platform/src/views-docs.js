/* ==========================================================================
   views-docs.js — My Documents (tax slips, pay statements, company policies)
   with a Preview and a Download (PDF) on every row, a demo T4 for 2025,
   and an in-page viewer for attached files (images and PDFs) with Download.
   ========================================================================== */

injectCss(`
.docv{background:#fff;color:#1d1a16;border:1px solid var(--border);border-radius:10px;padding:22px 26px;max-height:68vh;overflow:auto;font-size:13px}
.docv h2{margin:0 0 4px;font-size:18px}.docv .dv-sub{color:#6b6257;font-size:12px;margin-bottom:12px}
.docv p{margin:0 0 10px;line-height:1.5}
.docv table{width:100%;border-collapse:collapse;font-size:12.5px;margin:4px 0 12px}
.docv td,.docv th{padding:5px 6px;border-top:1px solid #e6dfd2;text-align:left}.docv th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b6257;border-top:0}
.docv td.r,.docv th.r{text-align:right;font-variant-numeric:tabular-nums}
.docv .dv-tot td{font-weight:700;background:#f7f3ea}
.docv .dv-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 16px;margin:0 0 12px}
.docv .dv-meta div{font-size:12.5px}.docv .dv-meta span{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#6b6257}
.docv .dv-demo{display:inline-block;background:#f8efd9;color:#8a5a10;border-radius:999px;padding:1px 9px;font-size:11px;font-weight:700;letter-spacing:.04em}
.t4{border:2px solid #9e2b2b;border-radius:6px;padding:12px 14px}
.t4-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1.5px solid #9e2b2b;padding-bottom:8px;margin-bottom:10px}
.t4-top b{font-size:20px;color:#9e2b2b;letter-spacing:.04em}.t4-yr{border:1.5px solid #9e2b2b;border-radius:4px;padding:2px 12px;font-size:18px;font-weight:700;text-align:center}
.t4-yr small{display:block;font-size:9.5px;font-weight:600;color:#6b6257;text-transform:uppercase}
.t4-who{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.t4-who>div{border:1px solid #e0c9c2;border-radius:4px;padding:6px 8px;font-size:12.5px}.t4-who span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#9e2b2b;font-weight:700}
.t4-two{display:flex;gap:18px;margin-top:6px}.t4-who .t4-v{display:block;color:inherit;text-transform:none;letter-spacing:0;font-weight:400;font-size:12.5px}
.t4-boxes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.t4-box{border:1px solid #e0c9c2;border-radius:4px;padding:5px 8px;display:flex;flex-direction:column;min-height:52px}
.t4-box i{font-style:normal;font-size:10.5px;color:#6b6257}.t4-box i b{color:#9e2b2b;margin-right:4px}
.t4-box strong{margin-top:auto;text-align:right;font-size:14px;font-variant-numeric:tabular-nums}
.docv .dv-note{font-size:11.5px;color:#6b6257;margin-top:10px}
.dv-acts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}
.docrow-acts{display:flex;gap:6px;justify-content:flex-end;flex-wrap:nowrap}
.fview{background:#f3efe7;border:1px solid var(--border);border-radius:10px;max-height:68vh;overflow:auto;padding:12px;text-align:center}
.fview img{max-width:100%;display:block;margin:0 auto 10px;box-shadow:0 1px 4px rgba(0,0,0,.15);background:#fff}
.fview .fv-msg{padding:40px 16px;color:var(--muted-fg)}
@media (max-width:640px){.docv{padding:14px}.docv .dv-meta,.t4-who{grid-template-columns:1fr}.t4-two{display:flex;gap:18px;margin-top:6px}.t4-who .t4-v{display:block;color:inherit;text-transform:none;letter-spacing:0;font-weight:400;font-size:12.5px}
.t4-boxes{grid-template-columns:1fr 1fr}}
`);

/* ---------------- saving a file (artifact download capability, else a normal browser download) ---------------- */
async function docSave(filename, data, mime = "application/pdf") {
  const dl = await DOWNLOADS();
  if (dl) {
    try { await dl.save({ filename, data }); toast("Downloaded", filename, "ok"); } catch (e) { if (e?.code !== "declined") toast("Not saved", e?.message || "The file couldn't be saved.", "err"); }
    return;
  }
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Downloaded", filename, "ok");
  } catch (e) { toast("Not saved", "Saving files isn't available in this view.", "err"); }
}

/* ---------------- a small portrait PDF writer (Letter, Helvetica) ---------------- */
function docPdf(title) {
  const W = 612, H = 792, M = 48;
  const pages = []; let ops = [];
  const clean = (s) => String(s ?? "").replace(/[—–−]/g, "-").replace(/·/g, "-").replace(/•/g, "*").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/→/g, "to").replace(/×/g, "x").replace(/…/g, "...").replace(/[^\x20-\x7e]/g, "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const cw = (ch) => (/[0-9]/.test(ch) ? 0.556 : ch === " " || ch === "." || ch === "," || ch === ":" || ch === ";" || ch === "'" || ch === "|" || ch === "i" || ch === "l" ? 0.278 : /[A-Z]/.test(ch) ? 0.667 : ch === "m" || ch === "w" ? 0.833 : /[a-z]/.test(ch) ? 0.52 : 0.55);
  const tw = (s, size, bold) => [...String(s)].reduce((a, ch) => a + cw(ch), 0) * size * (bold ? 1.05 : 1);
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `${((n >> 16) / 255).toFixed(3)} ${(((n >> 8) & 255) / 255).toFixed(3)} ${((n & 255) / 255).toFixed(3)}`; };
  const P = {
    W, H, M, tw,
    text(x, y, size, s, o = {}) {
      const t = clean(s); let xx = x;
      if (o.align === "r") xx = x - tw(t, size, o.bold); else if (o.align === "c") xx = x - tw(t, size, o.bold) / 2;
      ops.push(`BT /${o.bold ? "F2" : "F1"} ${size} Tf ${rgb(o.color || "#1d1a16")} rg ${xx.toFixed(1)} ${(H - y).toFixed(1)} Td (${t}) Tj ET`);
    },
    rect(x, y, w, h, fill) { ops.push(`${rgb(fill)} rg ${x.toFixed(1)} ${(H - y - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`); },
    box(x, y, w, h, stroke, lw = 0.8) { ops.push(`${lw} w ${rgb(stroke)} RG ${x.toFixed(1)} ${(H - y - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`); },
    line(x1, y1, x2, y2, stroke, lw = 0.8) { ops.push(`${lw} w ${rgb(stroke)} RG ${x1.toFixed(1)} ${(H - y1).toFixed(1)} m ${x2.toFixed(1)} ${(H - y2).toFixed(1)} l S`); },
    wrap(s, width, size) {
      const out = []; let cur = "";
      for (const w of String(s).split(/\s+/).filter(Boolean)) { const nx = cur ? cur + " " + w : w; if (tw(clean(nx), size) > width && cur) { out.push(cur); cur = w; } else cur = nx; }
      if (cur) out.push(cur);
      return out;
    },
    page() { if (ops.length) pages.push(ops.join("\n")); ops = []; },
    bytes() {
      P.page();
      const objs = []; const add = (s) => { objs.push(s); return objs.length; };
      const fA = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
      const fB = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
      const cids = pages.map((c) => add(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`));
      const parent = objs.length + pages.length + 1, pids = [];
      for (const cid of cids) pids.push(add(`<< /Type /Page /Parent ${parent} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${cid} 0 R /Resources << /Font << /F1 ${fA} 0 R /F2 ${fB} 0 R >> >> >>`));
      const pid = add(`<< /Type /Pages /Kids [${pids.map((i) => `${i} 0 R`).join(" ")}] /Count ${pids.length} >>`);
      const cat = add(`<< /Type /Catalog /Pages ${pid} 0 R >>`);
      const info = add(`<< /Title (${clean(title)}) /Creator (DEMO Group platform - demo) >>`);
      let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"; const offs = [];
      objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
      const xref = out.length;
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      const b = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 255;
      return b;
    },
  };
  return P;
}
const DOC_INK = "#1d1a16", DOC_MUTED = "#6b6257", DOC_CEDAR = "#9e2b2b", DOC_OCEAN = "#17566b", DOC_LINE = "#e0d6c4";
/** shared header + footer for statement and policy PDFs */
function docPdfHead(P, kicker, title, right) {
  P.rect(0, 0, P.W, 6, DOC_OCEAN);
  P.text(P.M, 46, 9, kicker.toUpperCase(), { bold: true, color: DOC_MUTED });
  P.text(P.M, 68, 18, title, { bold: true });
  if (right) P.text(P.W - P.M, 46, 9, right, { align: "r", color: DOC_MUTED });
  P.rect(P.W - P.M - 92, 56, 92, 16, "#f8efd9"); P.text(P.W - P.M - 46, 67.5, 8.5, "DEMO DOCUMENT", { bold: true, color: "#8a5a10", align: "c" });
  P.line(P.M, 82, P.W - P.M, 82, DOC_LINE, 1);
  return 100;
}
function docPdfFoot(P, note) {
  P.line(P.M, P.H - 52, P.W - P.M, P.H - 52, DOC_LINE);
  P.wrap(note, P.W - P.M * 2, 7.5).slice(0, 3).forEach((l, i) => P.text(P.M, P.H - 40 + i * 10, 7.5, l, { color: DOC_MUTED }));
}
/** a simple table: cols = [[label, width, "r"?]], rows = arrays of strings; returns the new y */
function docPdfTable(P, y, cols, rows, opts = {}) {
  const x0 = P.M; let x;
  P.rect(x0, y, P.W - P.M * 2, 16, "#f1ebdf");
  x = x0; cols.forEach(([l, w, al]) => { P.text(al === "r" ? x + w - 6 : x + 6, y + 11, 7.5, l.toUpperCase(), { bold: true, color: DOC_MUTED, align: al === "r" ? "r" : undefined }); x += w; });
  y += 16;
  rows.forEach((r, ri) => {
    const tot = opts.totalLast && ri === rows.length - 1;
    if (tot) P.rect(x0, y, P.W - P.M * 2, 16, "#f7f3ea");
    x = x0; cols.forEach(([, w, al], i) => { P.text(al === "r" ? x + w - 6 : x + 6, y + 11.5, 9, r[i] ?? "", { bold: tot, align: al === "r" ? "r" : undefined }); x += w; });
    y += 16; P.line(x0, y, P.W - P.M, y, DOC_LINE, 0.5);
  });
  return y + 8;
}

/* ---------------- the demo T4 (tax year 2025), worked out from the person's pay ---------------- */
const T4_YEAR = 2025;
const T4_RULES = { ympe: 7130000, ybe: 350000, cppRate: 0.0595, yampe: 8120000, cpp2Rate: 0.04, eiMax: 6570000, eiRate: 0.0164 };
function t4Tax(income, cppBase, ei, cppEnh) {
  const net = Math.max(0, income - cppEnh) / 100;
  const band = (x, bands) => { let t = 0, lo = 0; for (const [hi, r] of bands) { if (x > lo) t += (Math.min(x, hi) - lo) * r; lo = hi; } return t; };
  const fed = band(net, [[57375, 0.145], [114750, 0.205], [177882, 0.26], [253414, 0.29], [Infinity, 0.33]]) - 0.145 * (16129 + cppBase / 100 + ei / 100 + 1471);
  const bc = band(net, [[49279, 0.0506], [98560, 0.077], [113158, 0.105], [137407, 0.1229], [186306, 0.147], [259829, 0.168], [Infinity, 0.205]]) - 0.0506 * (12932 + cppBase / 100 + ei / 100);
  return Math.round((Math.max(0, fed) + Math.max(0, bc)) * 100);
}
/** null when the person started after the tax year (no slip yet) */
function t4For(emp) {
  if (!emp) return null;
  if (emp.startDate && emp.startDate > `${T4_YEAR}-12-31`) return null;
  const comp = S.compensations.filter((c) => c.employeeId === emp.id).sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))[0];
  if (!comp) return null;
  const hours = emp.employmentType === "SEASONAL" ? 1300 : emp.employmentType === "PART_TIME" ? 1040 : 2080;
  let gross = comp.payType === "SALARY" ? Math.round((comp.annualSalaryCents || 0) / 1.03) : Math.round(((comp.hourlyRateCents || 0) / 1.03) * hours);
  if (emp.startDate && emp.startDate > `${T4_YEAR}-01-01`) { const d = D(emp.startDate); gross = Math.round(gross * (12 - d.getUTCMonth()) / 12); }
  gross = Math.round(gross / 100) * 100;
  const R4 = T4_RULES;
  const pensionable = Math.min(gross, R4.ympe);
  const cpp = Math.round(Math.max(0, pensionable - R4.ybe) * R4.cppRate);
  const cpp2 = gross > R4.ympe ? Math.round((Math.min(gross, R4.yampe) - R4.ympe) * R4.cpp2Rate) : 0;
  const insurable = Math.min(gross, R4.eiMax);
  const ei = Math.round(insurable * R4.eiRate);
  const cppBase = Math.round(cpp * (4.95 / 5.95)), cppEnh = cpp - cppBase + cpp2;
  const tax = t4Tax(gross, cppBase, ei, cppEnh);
  const pensionPlan = (S.benefits || []).some((b) => b.employeeId === emp.id && /RRSP|PENSION/i.test(byId(S.benefitPlans, b.planId)?.type || byId(S.benefitPlans, b.planId)?.category || ""));
  return { year: T4_YEAR, gross, cpp, cpp2, ei, tax, insurable, pensionable, hours, dental: emp.employmentType === "FULL_TIME" ? "3" : "1", pensionPlan, rpp: 0 };
}
const t4Sin = (emp) => { const n = (parseInt(String(emp.employeeNumber || emp.id).replace(/\D/g, ""), 10) || 7) * 37 % 1000; return `*** *** ${String(n).padStart(3, "0")}`; };
const t4Dollars = (c) => (c / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const T4_BOXES = (t) => [
  ["14", "Employment income", t4Dollars(t.gross)], ["22", "Income tax deducted", t4Dollars(t.tax)], ["16", "Employee's CPP contributions", t4Dollars(t.cpp)],
  ["16A", "Employee's second CPP contributions", t4Dollars(t.cpp2)], ["18", "Employee's EI premiums", t4Dollars(t.ei)], ["24", "EI insurable earnings", t4Dollars(t.insurable)],
  ["26", "CPP/QPP pensionable earnings", t4Dollars(t.pensionable)], ["10", "Province of employment", "BC"], ["45", "Employer-offered dental benefits", t.dental],
  ["20", "RPP contributions", "0.00"], ["44", "Union dues", "0.00"], ["52", "Pension adjustment", "0.00"],
];
function t4Html(emp, t) {
  const c = co(emp.companyId);
  return `<div class="docv"><div class="t4"><div class="t4-top"><div><b>T4</b><div style="font-weight:700">Statement of Remuneration Paid</div><div class="dv-sub" style="margin:0">État de la rémunération payée · <span class="dv-demo">DEMO SLIP</span></div></div><div class="t4-yr"><small>Year</small>${t.year}</div></div>
    <div class="t4-who"><div><span>Employer's name</span><strong>${esc(c.legalName)}</strong><br>${esc(c.city)}, ${esc(c.province || "BC")}<div class="t4-two"><div><span>Payroll account number (BN)</span><span class="mono t4-v">${esc(c.businessNumber || "—")}</span></div></div></div>
    <div><span>Employee</span><strong>${esc(empName(emp))}</strong><br>${esc(emp.city || "")}${emp.province ? `, ${esc(emp.province)}` : ""}<div class="t4-two"><div><span>Social insurance number</span><span class="mono t4-v">${esc(t4Sin(emp))}</span></div><div><span>Employee number</span><span class="mono t4-v">${esc(emp.employeeNumber || "")}</span></div></div></div></div>
    <div class="t4-boxes">${T4_BOXES(t).map(([n, l, v]) => `<div class="t4-box"><i><b>${n}</b>${esc(l)}</i><strong>${esc(v)}</strong></div>`).join("")}</div></div>
    <p class="dv-note">Demo figures worked out from ${esc(empName(emp).split(" ")[0])}'s ${t.year} pay rate using the ${t.year} CPP, EI and BC/federal tax rules — illustrative only, not a filed CRA slip. On the live site this is the slip filed with the CRA by the end of February.</p></div>`;
}
function t4Pdf(emp, t) {
  const c = co(emp.companyId), P = docPdf(`T4 ${t.year} - ${empName(emp)}`);
  const red = DOC_CEDAR, L = P.M, R = P.W - P.M;
  P.box(L, 40, R - L, 470, red, 1.6);
  P.text(L + 14, 72, 26, "T4", { bold: true, color: red });
  P.text(L + 66, 62, 12, "Statement of Remuneration Paid", { bold: true });
  P.text(L + 66, 77, 9, "Etat de la remuneration payee", { color: DOC_MUTED });
  P.box(R - 94, 50, 80, 36, red, 1.2); P.text(R - 54, 61, 7, "YEAR / ANNEE", { align: "c", color: DOC_MUTED, bold: true }); P.text(R - 54, 80, 15, String(t.year), { align: "c", bold: true });
  P.rect(R - 210, 58, 100, 16, "#f8efd9"); P.text(R - 160, 69.5, 8, "DEMO SLIP", { bold: true, color: "#8a5a10", align: "c" });
  P.line(L, 96, R, 96, red, 1.2);
  const half = (R - L - 30) / 2;
  P.box(L + 10, 106, half, 86, "#e0c9c2"); P.box(L + 20 + half, 106, half, 86, "#e0c9c2");
  P.text(L + 18, 120, 7.5, "EMPLOYER'S NAME", { bold: true, color: red });
  P.text(L + 18, 136, 10.5, c.legalName, { bold: true }); P.text(L + 18, 150, 9.5, `${c.city}, ${c.province || "BC"}`);
  P.text(L + 18, 168, 7.5, "PAYROLL ACCOUNT NUMBER (BN)", { bold: true, color: red }); P.text(L + 18, 182, 10, c.businessNumber || "-");
  const ex = L + 28 + half;
  P.text(ex, 120, 7.5, "EMPLOYEE", { bold: true, color: red });
  P.text(ex, 136, 10.5, empName(emp), { bold: true }); P.text(ex, 150, 9.5, `${emp.city || ""}${emp.province ? ", " + emp.province : ""}`);
  P.text(ex, 168, 7.5, "SOCIAL INSURANCE NUMBER", { bold: true, color: red }); P.text(ex, 182, 10, `${t4Sin(emp)}   -   Employee no. ${emp.employeeNumber || ""}`);
  const bw = (R - L - 20 - 16) / 3, bh = 58;
  T4_BOXES(t).forEach(([n, l, v], i) => {
    const x = L + 10 + (i % 3) * (bw + 8), y = 206 + Math.floor(i / 3) * (bh + 8);
    P.box(x, y, bw, bh, "#e0c9c2");
    P.text(x + 6, y + 13, 9, n, { bold: true, color: red }); P.text(x + 6 + P.tw(n, 9, true) + 5, y + 13, 7.5, l, { color: DOC_MUTED });
    P.text(x + bw - 8, y + bh - 10, 13, v, { bold: true, align: "r" });
  });
  P.wrap(`Demo figures worked out from the ${t.year} pay rate using the ${t.year} CPP, EI and BC/federal tax rules - illustrative only, not a filed CRA slip. On the live site this is the slip filed with the CRA by the end of February.`, R - L - 20, 8).forEach((l, i) => P.text(L + 10, 482 + i * 11, 8, l, { color: DOC_MUTED }));
  P.text(L, 540, 9, "Keep this slip with your tax records. Report box 14 on line 10100 of your return.", { color: DOC_MUTED });
  docPdfFoot(P, "DEMO - produced by HGWEB for the Demo Group platform. Amounts are illustrative and are not certified CRA payroll calculations.");
  return P.bytes();
}

/* ---------------- pay statements ---------------- */
function stmtPdf(p) {
  const run = byId(S.payrollRuns, p.payrollRunId), emp = byId(S.employees, p.employeeId), c = co(emp.companyId);
  const dep = byId(S.departments, emp.departmentId), prof = S.payProfiles.find((x) => x.employeeId === emp.id);
  const lines = S.payrollLines.filter((l) => l.payrollEntryId === p.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const P = docPdf(`Pay statement ${run.runNumber}`);
  let y = docPdfHead(P, c.legalName, "Pay statement", `${run.runNumber} - ${emp.employeeNumber || ""}`);
  const meta = [["Employee", empName(emp)], ["Department", dep?.name || "-"], ["Payment", prof?.directDepositActive ? `Direct deposit ${prof.bankAccountMasked || ""}` : "Cheque"], ["Pay period", `${dLong(run.periodStart)} to ${dLong(run.periodEnd)}`], ["Pay day", dLong(run.payDate)], ["Company", c.displayName]];
  const cw3 = (P.W - P.M * 2) / 3;
  meta.forEach(([k, v], i) => { const x = P.M + (i % 3) * cw3, yy = y + Math.floor(i / 3) * 30; P.text(x, yy, 7.5, k.toUpperCase(), { bold: true, color: DOC_MUTED }); P.text(x, yy + 13, 10, v); });
  y += 70;
  const W = P.W - P.M * 2;
  P.text(P.M, y, 11, "Earnings", { bold: true, color: DOC_OCEAN }); y += 8;
  const earn = lines.filter((l) => l.kind === "EARNING");
  y = docPdfTable(P, y, [["Description", W - 270], ["Hours", 80, "r"], ["Rate", 90, "r"], ["This pay", 100, "r"]], [...earn.map((l) => [l.description, l.hours ? hrs(l.hours) : "-", l.rateCents ? money(l.rateCents) : "-", money(l.amountCents)]), ["Total earnings", hrs(p.insurableHours), "", money(p.grossCents)]], { totalLast: true });
  P.text(P.M, y + 12, 11, "Taken off your pay", { bold: true, color: DOC_OCEAN }); y += 20;
  const ded = lines.filter((l) => l.kind === "DEDUCTION");
  y = docPdfTable(P, y, [["Description", W - 100], ["This pay", 100, "r"]], [...ded.map((l) => [l.description, money(l.amountCents)]), ["Total taken off", money(p.totalDeductionsCents)]], { totalLast: true });
  const emc = lines.filter((l) => l.kind === "EMPLOYER_COST");
  if (emc.length) { P.text(P.M, y + 12, 11, "Paid by the company for you", { bold: true, color: DOC_OCEAN }); y += 20; y = docPdfTable(P, y, [["Description", W - 100], ["This pay", 100, "r"]], emc.map((l) => [l.description, money(l.amountCents)])); }
  P.rect(P.M, y + 4, W, 40, "#e2edef");
  P.text(P.M + 12, y + 20, 8, "GROSS PAY", { bold: true, color: DOC_MUTED }); P.text(P.M + 12, y + 35, 12, money(p.grossCents), { bold: true });
  P.text(P.M + 180, y + 20, 8, "TOTAL TAKEN OFF", { bold: true, color: DOC_MUTED }); P.text(P.M + 180, y + 35, 12, money(p.totalDeductionsCents), { bold: true });
  P.text(P.W - P.M - 12, y + 20, 8, "TAKE-HOME PAY", { bold: true, color: DOC_MUTED, align: "r" }); P.text(P.W - P.M - 12, y + 37, 15, money(p.netCents), { bold: true, color: DOC_OCEAN, align: "r" });
  P.text(P.M, y + 64, 8.5, `Insurable earnings this pay: ${money(p.eiInsurableCents)}  -  Pensionable: ${money(p.cppPensionableCents)}`, { color: DOC_MUTED });
  docPdfFoot(P, "DEMO - produced by HGWEB for the Demo Group platform. Amounts are illustrative and are not certified CRA payroll calculations.");
  return P.bytes();
}
const stmtPreviewHtml = (p) => `<div class="docv" style="padding:0;border:0;background:transparent">${vStatement(p.id, "/me/documents").replace(/^<div class="crumb">[\s\S]*?<\/div>/, "")}</div>`;

/* ---------------- company policies (demo text) ---------------- */
const POLICY_TEXT = {
  "Employee Handbook 2026": [
    ["Welcome", "This handbook explains how we work across the Demo Group companies — Demo Corporate, Taan Forest, Haida Gwaii Tourism and Haida Gwaii Seafoods. It applies to every employee, full-time, part-time and seasonal."],
    ["Hours and pay", "Pay is every two weeks by direct deposit. Hours are recorded on your timesheet and approved by your manager before payroll closes. Overtime is paid at 1.5× after 8 hours in a day or 40 in a week, and 2× after 12 hours in a day, as BC rules require."],
    ["Time off", "Vacation, sick and personal days are requested in the platform and approved by your manager. Your balances are always shown on Home and under My Requests."],
    ["Safety", "Everyone has the right to refuse unsafe work. Report incidents and near misses to your supervisor the same day. Keep your tickets and certificates current — the platform reminds you 60 days before one expires."],
    ["Respect", "We work on Haida Gwaii and respect Haida culture, land and waters. Harassment and discrimination are not tolerated; speak to your manager or HR in confidence."],
  ],
  "Remote & Field Work Policy": [
    ["Who it covers", "Staff who work from home, from a camp, a lodge or a vessel for part of their week, and anyone travelling between communities for work."],
    ["Check-in", "Field crews check in at the start and end of each shift. Lone workers use the check-in schedule agreed with their supervisor."],
    ["Equipment", "Company laptops and phones must use a passcode and the company sign-in. Report a lost device to IT the same day."],
    ["Expenses", "Mileage, meals and lodging for field work are claimed through Expense claims with receipts attached."],
  ],
  "Expense & Travel Policy": [
    ["Before you travel", "Send a travel request before you book. Your request goes through the approval steps set on the Approval rules page; you are told who approves it when you submit."],
    ["Claiming", "Claim within 30 days of the expense. Attach a receipt for anything over $25. Mileage is paid at the CRA rate for the year."],
    ["Per diem", "Meals on overnight travel are covered by the daily allowance in place of receipts. Alcohol is not reimbursed."],
    ["Company cards", "Card purchases need a credit card purchase request first, and the receipt is attached to the statement line each month."],
  ],
};
const policyParas = (d) => POLICY_TEXT[d.title] || [["Summary", d.contentText || "Company policy."]];
function policyHtml(d) {
  return `<div class="docv"><h2>${esc(d.title)}</h2><div class="dv-sub">Company policy · version ${esc(d.version || 1)} · ${esc(dLong(String(d.createdAt || "").slice(0, 10)))} · <span class="dv-demo">DEMO TEXT</span></div>${policyParas(d).map(([h, t]) => `<p><strong>${esc(h)}.</strong> ${esc(t)}</p>`).join("")}</div>`;
}
function policyPdf(d) {
  const P = docPdf(d.title);
  let y = docPdfHead(P, "Demo Group · company policy", d.title, `Version ${d.version || 1}`);
  for (const [h, t] of policyParas(d)) {
    if (y > P.H - 120) { docPdfFoot(P, "DEMO TEXT - sample policy for the Demo Group platform demo."); P.page(); y = docPdfHead(P, "Demo Group · company policy", d.title, "continued"); }
    P.text(P.M, y, 11, h, { bold: true, color: DOC_OCEAN }); y += 16;
    for (const l of P.wrap(t, P.W - P.M * 2, 10)) { P.text(P.M, y, 10, l); y += 14; }
    y += 10;
  }
  docPdfFoot(P, "DEMO TEXT - sample policy for the Demo Group platform demo.");
  return P.bytes();
}

/* ---------------- the page ---------------- */
const docFileName = (s) => String(s).replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
function docActs(kind, id, label) {
  return `<div class="docrow-acts"><button class="btn sm" data-a="docPreview" data-k="${kind}" data-id="${esc(id)}" aria-label="Preview ${esc(label)}">Preview</button><button class="btn sm" data-a="docDownload" data-k="${kind}" data-id="${esc(id)}" aria-label="Download ${esc(label)}">⬇ Download</button></div>`;
}
const DOC_HEADS = ["Document", "Details", "Date", ">"];
function vMyDocs2() {
  const e = A.employee;
  const docs = S.documents.filter((d) => d.visibility === "ALL");
  const pays = e ? myEntries(e.id) : [];
  const t4 = e ? t4For(e) : null;
  const taxRows = t4 ? [`<tr><td><strong>T4 ${t4.year} — Statement of Remuneration Paid</strong> <span class="badge tone-amber">Demo</span><div class="hint">${esc(co(e.companyId).legalName)}</div></td><td>Employment income ${money(t4.gross)} · tax deducted ${money(t4.tax)}</td><td style="white-space:nowrap">Feb 27, 2026</td><td class="r">${docActs("t4", e.id, `T4 ${t4.year}`)}</td></tr>`] : [];
  const payRows = pays.map(({ p, run }) => `<tr><td><strong>Pay statement ${esc(run.runNumber)}</strong><div class="hint">${dLong(run.periodStart)} → ${dLong(run.periodEnd)}</div></td><td>Take-home ${money(p.netCents)} · gross ${money(p.grossCents)}</td><td style="white-space:nowrap">${dLong(run.payDate)}</td><td class="r">${docActs("stmt", p.id, `pay statement ${run.runNumber}`)}</td></tr>`);
  const polRows = docs.map((d) => `<tr><td><strong>${esc(d.title)}</strong><div class="hint mono" style="font-size:11px">${esc(d.fileName)}</div></td><td>Company policy · version ${esc(d.version || 1)}</td><td style="white-space:nowrap">${dLong(String(d.createdAt || "").slice(0, 10))}</td><td class="r">${docActs("policy", d.id, d.title)}</td></tr>`);
  const noT4 = e ? (e.startDate > `${T4_YEAR}-12-31` ? `You started on ${dLong(e.startDate)}, so your first T4 (for ${T4_YEAR + 1}) arrives by the end of February ${T4_YEAR + 2}.` : "No T4 on file yet.") : "This account isn't linked to an employee, so there are no tax slips.";
  return ph("My Documents", "Your tax slips and pay statements, and the company policies. Preview any document here or download it as a PDF.") + flashHtml()
    + cardFlush("Tax slips", table(DOC_HEADS, taxRows, noT4))
    + `<div style="height:14px"></div>` + cardFlush("Pay statements", table(DOC_HEADS, payRows, e ? "None yet — your statements appear here after each pay day." : "This account isn't linked to an employee."))
    + `<div style="height:14px"></div>` + cardFlush("Company policies", table(DOC_HEADS, polRows, "No policies published yet."));
}
hr3Route("/me/documents", null, vMyDocs2);

/** what a row's Preview / Download works on — only the signed-in person's own slips and statements */
function docTarget(kind, id) {
  const e = A?.employee;
  if (kind === "t4") { if (!e || e.id !== id) return null; const t = t4For(e); return t && { title: `T4 ${t.year}`, file: `T4-${t.year}-${docFileName(empName(e))}.pdf`, html: () => t4Html(e, t), pdf: () => t4Pdf(e, t) }; }
  if (kind === "stmt") { const p = byId(S.payrollEntries, id); if (!p || !e || p.employeeId !== e.id) return null; const run = byId(S.payrollRuns, p.payrollRunId); return { title: `Pay statement ${run.runNumber}`, file: `Pay-statement-${run.runNumber}-${run.payDate}.pdf`, html: () => stmtPreviewHtml(p), pdf: () => stmtPdf(p) }; }
  if (kind === "policy") { const d = byId(S.documents, id); if (!d || d.visibility !== "ALL") return null; return { title: d.title, file: `${docFileName(d.title)}.pdf`, html: () => policyHtml(d), pdf: () => policyPdf(d) }; }
  return null;
}

/* ==========================================================================
   Attached files: an in-page viewer (image or PDF pages) with Download
   ========================================================================== */
const FV = { cache: {}, lib: null };
function fvLoadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("load")); document.head.appendChild(s); }); }
async function fvPdfLib() {
  if (FV.lib) return FV.lib;
  const base = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  FV.lib = (async () => {
    if (!window.pdfjsWorker) await fvLoadScript(base + "pdf.worker.min.js"); // run in the page (no separate worker needed)
    if (!window.pdfjsLib) await fvLoadScript(base + "pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.js";
    return window.pdfjsLib;
  })();
  FV.lib.catch(() => { FV.lib = null; });
  return FV.lib;
}
async function fvRenderPdf(data) {
  const lib = await fvPdfLib();
  const bin = atob(String(data).split(",")[1] || ""); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const doc = await lib.getDocument({ data: bytes, isEvalSupported: false }).promise;
  const out = [];
  for (let i = 1; i <= Math.min(doc.numPages, 12); i++) {
    const page = await doc.getPage(i), vp = page.getViewport({ scale: 1.6 });
    const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
    await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    out.push(cv.toDataURL("image/png"));
  }
  return { pages: out, total: doc.numPages };
}
function fvHtml(f, body) {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px"><div style="min-width:0"><h3 style="margin:0;overflow-wrap:anywhere">${esc(f.fileName)}</h3><div class="hint">${f.mimeType === "application/pdf" ? "PDF" : "Image"} · ${fmtSize(f.sizeBytes)}${f.uploadedByName ? ` · attached by ${esc(f.uploadedByName)}` : ""}${f.createdAt ? ` · ${esc(dTime(f.createdAt))}` : ""}</div></div><button class="btn" data-a="closeModal" aria-label="Close">✕</button></div>
    <div class="fview" id="fview">${body}</div><div class="dv-acts"><button class="btn" data-a="closeModal">Close</button><button class="btn pri" data-a="fileDownload" data-id="${esc(f.id)}">⬇ Download</button></div>`;
}
async function fileView(f) {
  UI.fileViewId = f.id; UI.modalWide = true;
  if (f.mimeType.startsWith("image/")) { UI.modal = fvHtml(f, `<img src="${f.data}" alt="${esc(f.fileName)}">`); safeRender(); return; }
  const cached = FV.cache[f.id];
  if (cached) { UI.modal = fvHtml(f, cached); safeRender(); return; }
  UI.modal = fvHtml(f, `<div class="fv-msg">Opening the PDF…</div>`); safeRender();
  let body;
  try {
    const r = await fvRenderPdf(f.data);
    body = r.pages.map((src, i) => `<img src="${src}" alt="Page ${i + 1} of ${esc(f.fileName)}">`).join("") + (r.total > r.pages.length ? `<div class="hint">Showing the first ${r.pages.length} of ${r.total} pages — download to see the rest.</div>` : "");
    FV.cache[f.id] = body;
  } catch (e) {
    body = `<div class="fv-msg">This PDF can't be shown inside the page here.<br>Use <strong>Download</strong> to open it.</div>`;
  }
  if (UI.fileViewId === f.id && UI.modal) { UI.modal = fvHtml(f, body); safeRender(); }
}
{
  /* replaces the old "images in a popup, PDFs straight to download" — the AP security check stays */
  openFile = async function (id) {
    const f = (S.files || []).find((x) => x.id === id);
    if (!f) return;
    if (AP_FILE_TYPES.includes(f.entityType) && (!A || !can(A, "ap.view") || !canSee(A, f.companyId) || f.removedAt)) {
      toast("Not available", f.removedAt ? "That file was removed." : "Only people with access to Accounts Payable can open vendor files.", "err");
      return;
    }
    if (!f.data) { toast("Name only in the demo", `${f.fileName} (${fmtSize(f.sizeBytes)}) was bigger than the demo keeps — on the live site the whole file is stored.`, ""); return; }
    return fileView(f);
  };
}

window.ACTIONS_EXT.push({
  docPreview(el) {
    const t = docTarget(el.dataset.k, el.dataset.id);
    if (!t) { toast("Not available", "That document isn't yours to open.", "err"); return; }
    UI.modal = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px"><h3 style="margin:0">${esc(t.title)}</h3><button class="btn" data-a="closeModal" aria-label="Close">✕</button></div>${t.html()}<div class="dv-acts"><button class="btn" data-a="closeModal">Close</button><button class="btn pri" data-a="docDownload" data-k="${esc(el.dataset.k)}" data-id="${esc(el.dataset.id)}">⬇ Download PDF</button></div>`;
    UI.modalWide = true; safeRender();
  },
  docDownload(el) {
    const t = docTarget(el.dataset.k, el.dataset.id);
    if (!t) { toast("Not available", "That document isn't yours to download.", "err"); return; }
    docSave(t.file, t.pdf());
  },
  async fileDownload(el) {
    const f = (S.files || []).find((x) => x.id === el.dataset.id);
    if (!f?.data) return;
    try { const blob = await (await fetch(f.data)).blob(); await docSave(f.fileName, blob, f.mimeType); } catch (e) { toast("Not saved", e?.message || "The file couldn't be saved.", "err"); }
  },
});
