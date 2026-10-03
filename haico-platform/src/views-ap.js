/* ==========================================================================
   views-ap.js — Accounts Payable files: invoice PDFs on each bill, vendor
   documents, vendor records, the AP attachments finder, and a searchable
   Documents library. Mirrors /finance/ap/{[id],vendors,vendors/[id],attachments}
   and /documents in the Next.js app (src/lib/ap-files.ts, finance/ap/actions.ts).
   ========================================================================== */

injectCss(`
.apx-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.apx-bar .in{height:34px;padding:0 12px;border-radius:999px;font-size:13px;width:auto}
.apx-bar .apx-q{min-width:240px}
.apx-bar .sp{flex:1}
.apx-clip{display:inline-flex;align-items:center;gap:4px;font-weight:600}
.apx-clip svg{width:13px;height:13px;flex:none}
.apx-none{color:var(--muted-fg);font-size:12px}
.apx-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 20px;padding:12px 16px;font-size:12.5px}
.apx-kv small{display:block;font-size:11px;font-weight:600;color:var(--muted-fg)}
.apx-fn{display:inline-flex;align-items:center;gap:6px;max-width:300px;border:0;background:none;padding:0;font:inherit;font-weight:600;color:var(--accent-fg,var(--fg));cursor:pointer;text-align:left}
.apx-fn:hover{text-decoration:underline}
.apx-fn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.apx-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start;margin-bottom:14px}
.apx-top .chart{margin:0}
#apFindT .lnk.mono,#apFindT td:last-child{white-space:nowrap}
@media (max-width:760px){.apx-top{grid-template-columns:1fr}.apx-bar .apx-q{min-width:0;width:100%}}
`);

/* ---------------- constants & helpers ---------------- */
const AP_FILE_TYPES = ["ApInvoice", "Vendor"];
const AP_BILL_CAT = "VENDOR_INVOICE";
const AP_VENDOR_CATS = { VENDOR_CONTRACT: "Contract", VENDOR_INSURANCE: "Insurance certificate", VENDOR_PRICE_LIST: "Price list", VENDOR_STATEMENT: "Statement", VENDOR_OTHER: "Other" };
const AP_CAT_LABELS = { [AP_BILL_CAT]: "Vendor invoice", ...AP_VENDOR_CATS };
const AP_REQ_TYPES = { EmployeeRequest: "Request", LeaveRequest: "Time off", ExpenseClaim: "Expense claim", PurchaseRequest: "Purchase request" };
const apClip = (n) => `<span class="apx-clip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>${n}</span>`;
const apFileIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`;
const apKind = (mime) => (mime === "application/pdf" ? "PDF" : mime === "image/png" ? "PNG" : mime === "image/jpeg" ? "JPG" : String(mime || "File").split("/").pop().toUpperCase());
const apF = (k) => (UI.filters[k] = UI.filters[k] || {});
const apLive = (f) => !f.removedAt;
/** every live AP file (bill invoices + vendor documents), unscoped */
const apFilesAll = () => (S.files || []).filter((f) => AP_FILE_TYPES.includes(f.entityType) && apLive(f));
const apBillFiles = (billId) => apFilesAll().filter((f) => f.entityType === "ApInvoice" && f.entityId === billId);
const apVendorDocs = (vendorId) => apFilesAll().filter((f) => f.entityType === "Vendor" && f.entityId === vendorId);
/** files on a bill, counting any name-only attachment kept on the bill itself (older drops) */
const apBillFileCount = (b) => apBillFiles(b.id).length + (b.attachments?.length || 0);
const apVendorOf = (f) => (f.entityType === "Vendor" ? byId(S.vendors, f.entityId) : byId(S.vendors, byId(S.apInvoices, f.entityId)?.vendorId));
const apOpenStatuses = ["PENDING_APPROVAL", "APPROVED", "PARTIALLY_PAID"];
const apVendLink = (v) => (v ? `<button class="lnk" data-go="/finance/ap/vendors/${esc(v.id)}">${esc(v.name)}</button>` : "—");
const apFileBtn = (f) => `<button type="button" class="apx-fn" data-a="openFile" data-id="${esc(f.id)}" title="Open ${esc(f.fileName)}">${apFileIcon}<span>${esc(f.fileName)}</span></button>`;
const apStrip = (h) => String(h).replace(/<[^>]*>/g, " ");

/* ---------------- seed: AP files join the shared file store ---------------- */
{
  const _fsAp = freshState;
  freshState = function () {
    const S = _fsAp();
    S.files = [...(S.files || []), ...(S.apFiles || []).map((f) => ({ ...f }))];
    return S;
  };
}

/* ---------------- reducers ---------------- */
function apSaveFiles(S, ctx, files, meta) {
  const list = (files || []).filter((f) => f && f.name);
  if (!list.length) fail("Drop or choose a file first.");
  if (list.length > 8) fail("Up to 8 files at a time.");
  for (const f of list) if (!FILE_TYPES.includes(f.type)) fail(`${f.name}: only PDF, JPG and PNG files can be attached.`);
  S.files = S.files || [];
  list.forEach((f, i) => {
    const name = String(f.name).slice(0, 120);
    S.files.push({ id: ctx.id("apf"), entityType: meta.entityType, entityId: meta.entityId, companyId: meta.companyId, fileName: name, mimeType: f.type, sizeBytes: Number(f.size) || 0, category: meta.category, title: name.replace(/\.[^.]+$/, ""), isSourceDocument: !!(meta.firstIsSource && i === 0), data: f.data && String(f.data).length < FILE_KEEP_MAX * 1.4 ? f.data : undefined, uploadedByName: ctx.actor.displayName, createdAt: ctx.now });
    ctx.audit({ module: "finance.ap", action: "ATTACH", entityType: meta.entityType, entityId: meta.entityId, companyId: meta.companyId, summary: `${ctx.actor.displayName} attached ${name} (${AP_CAT_LABELS[meta.category] || "file"}) to ${meta.label.replace(/\.$/, "")}.` });
  });
}
{
  /* a PDF dropped on Bills to Pay to start a bill becomes a real file on that bill */
  const _apCreate = R["ap.create"];
  R["ap.create"] = function (S, p, ctx) {
    const before = S.apInvoices.length;
    _apCreate(S, p, ctx);
    const inv = S.apInvoices[before];
    const a = p.attachment;
    if (!inv || !a || !a.name) return;
    S.files = S.files || [];
    S.files.push({ id: ctx.id("apf"), entityType: "ApInvoice", entityId: inv.id, companyId: inv.companyId, fileName: String(a.name).slice(0, 120), mimeType: a.type || "application/pdf", sizeBytes: Number(a.size) || 0, category: AP_BILL_CAT, title: String(a.name).replace(/\.[^.]+$/, ""), isSourceDocument: true, data: a.data && String(a.data).length < FILE_KEEP_MAX * 1.4 ? a.data : undefined, uploadedByName: ctx.actor.displayName, createdAt: ctx.now });
    inv.attachments = [];
  };
}
Object.assign(R, {
  "ap.file.attach"(S, p, ctx) {
    ctx.need("ap.create");
    const b = byId(S.apInvoices, p.billId);
    if (!b) fail("That bill no longer exists.");
    ctx.company(b.companyId);
    if (b.status === "CANCELLED") fail("This bill is cancelled — files can't be added.");
    const v = byId(S.vendors, b.vendorId);
    const hasSource = apLiveFilesIn(S, "ApInvoice", b.id).some((f) => f.isSourceDocument);
    apSaveFiles(S, ctx, p.files, { entityType: "ApInvoice", entityId: b.id, companyId: b.companyId, category: AP_BILL_CAT, firstIsSource: !hasSource, label: `bill ${b.invoiceNumber} — ${v?.name || "vendor"}` });
  },
  "ap.vendor.file"(S, p, ctx) {
    ctx.need("ap.create");
    const v = byId(S.vendors, p.vendorId);
    if (!v) fail("That vendor no longer exists.");
    ctx.company(v.companyId);
    const category = AP_VENDOR_CATS[p.category] ? p.category : "VENDOR_OTHER";
    apSaveFiles(S, ctx, p.files, { entityType: "Vendor", entityId: v.id, companyId: v.companyId, category, label: `vendor ${v.name}` });
  },
  "ap.file.remove"(S, p, ctx) {
    ctx.need("ap.create");
    const f = (S.files || []).find((x) => x.id === p.fileId);
    if (!f || f.removedAt || !AP_FILE_TYPES.includes(f.entityType)) fail("That file is already gone.");
    let label;
    if (f.entityType === "ApInvoice") { const b = byId(S.apInvoices, f.entityId); if (!b) fail("That bill no longer exists."); ctx.company(b.companyId); label = `bill ${b.invoiceNumber} — ${byId(S.vendors, b.vendorId)?.name || "vendor"}`; }
    else { const v = byId(S.vendors, f.entityId); if (!v) fail("That vendor no longer exists."); ctx.company(v.companyId); label = `vendor ${v.name}`; }
    f.removedAt = ctx.now; f.removedByName = ctx.actor.displayName;
    ctx.audit({ module: "finance.ap", action: "DETACH", entityType: f.entityType, entityId: f.entityId, companyId: f.companyId, summary: `${ctx.actor.displayName} removed ${f.fileName} (${AP_CAT_LABELS[f.category] || "file"}) from ${label.replace(/\.$/, "")}.` });
  },
  "ap.vendor.create"(S, p, ctx) {
    ctx.need("ap.create");
    const companyId = String(p.companyId || "");
    const name = String(p.name || "").trim();
    if (!companyId) fail("Pick the company this vendor sells to.");
    if (!name) fail("Type the vendor's name.");
    ctx.company(companyId);
    if (!byId(S.companies, companyId)) fail("Pick the company this vendor sells to.");
    const dup = S.vendors.find((v) => v.companyId === companyId && v.name.toLowerCase() === name.toLowerCase() && !v.deletedAt);
    if (dup) fail(`${name} is already a vendor of that company (${dup.vendorNumber}).`);
    const terms = p.paymentTermsDays === "" || p.paymentTermsDays == null ? 30 : Number(p.paymentTermsDays);
    if (!Number.isInteger(terms) || terms < 0 || terms > 180) fail("Payment terms must be between 0 and 180 days.");
    const max = S.vendors.filter((v) => v.companyId === companyId).reduce((m, v) => Math.max(m, Number(/^V-(\d+)$/.exec(v.vendorNumber)?.[1] || 0)), 0);
    const vendorNumber = `V-${String(max ? max + 1 : 5001).padStart(4, "0")}`;
    const o = (k) => String(p[k] || "").trim() || null;
    const v = { id: ctx.id("v"), companyId, vendorNumber, name, contactName: o("contactName"), email: o("email"), phone: o("phone"), taxNumber: o("taxNumber"), paymentTermsDays: terms, defaultExpenseAccountNumber: o("defaultExpenseAccountNumber"), status: "ACTIVE", createdAt: ctx.now };
    S.vendors.push(v);
    ctx.audit({ module: "finance.ap", action: "CREATE", entityType: "Vendor", entityId: v.id, companyId, summary: `${ctx.actor.displayName} added vendor ${name} (${vendorNumber}).` });
  },
});
function apLiveFilesIn(S, type, id) { return (S.files || []).filter((f) => f.entityType === type && f.entityId === id && !f.removedAt); }

/* ---------------- security: AP files open only for ap.view holders ---------------- */
{
  const _openFileAp = openFile;
  openFile = async function (id) {
    const f = (S.files || []).find((x) => x.id === id);
    if (f && AP_FILE_TYPES.includes(f.entityType) && (!A || !can(A, "ap.view") || !canSee(A, f.companyId) || f.removedAt)) {
      toast("Not available", f.removedAt ? "That file was removed." : "Only people with access to Accounts Payable can open vendor files.", "err");
      return;
    }
    return _openFileAp(id);
  };
}

/* ---------------- drop zone (files go straight onto the record) ---------------- */
function apDrop(key, title, hint) {
  return `<div class="fdrop" data-fzone="${esc(key)}" role="button" tabindex="0" aria-label="${esc(title)}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 18a4.5 4.5 0 1 1 .8-8.9A6 6 0 0 1 19 10.5 3.8 3.8 0 0 1 18 18"/><path d="M12 12v8M9 15l3-3 3 3"/></svg><b>${esc(title)}</b><small>${esc(hint)}</small></div>
    <input type="file" multiple accept="application/pdf,image/jpeg,image/png" data-fdrop="${esc(key)}" style="display:none"><div id="fchips-${esc(key)}" class="fchips"></div>`;
}
{
  /* files dropped on an AP zone are attached as soon as they are read */
  const _addFilesAp = addFiles;
  addFiles = async function (key, list) {
    await _addFilesAp(key, list);
    const m = /^ap([bv])-(.+)$/.exec(key || "");
    if (!m) return;
    const files = takeFiles(key);
    if (!files.length) return;
    const n = files.length, s = n === 1 ? "" : "s";
    if (m[1] === "b") act("ap.file.attach", { billId: m[2], files }, `${n} file${s} attached to the bill.`);
    else act("ap.vendor.file", { vendorId: m[2], files, category: document.getElementById(`apvCat-${m[2]}`)?.value || "VENDOR_OTHER" }, `${n} document${s} added to the vendor.`);
  };
}
/* keep the bytes of a PDF dropped on Bills to Pay so the new bill's file can be opened (app.js keeps name + size) */
function apKeepDraftBytes(file) {
  if (!file || file.size > FILE_KEEP_MAX || !FILE_TYPES.includes(file.type)) return;
  const r = new FileReader();
  r.onload = () => { const a = UI.apDraft?.attachment; if (a && a.name === file.name) a.data = r.result; };
  r.readAsDataURL(file);
}
document.addEventListener("drop", (ev) => { if (ev.target.closest?.("#billDrop")) apKeepDraftBytes(ev.dataTransfer?.files?.[0]); });
document.addEventListener("change", (ev) => { if (ev.target.id === "billFile") apKeepDraftBytes(ev.target.files?.[0]); });
document.addEventListener("input", (ev) => { const el = ev.target; if (el.dataset?.apq) apF(el.dataset.apq).q = el.value; });

/* ---------------- shared file table ---------------- */
function apFilesTable(files, { canEdit, legacy = [], showCat = false, empty: emptyMsg }) {
  const rows = files.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map((f) => `<tr><td>${apFileBtn(f)}<div class="hint">${apKind(f.mimeType)} · ${fmtSize(f.sizeBytes)}${f.isSourceDocument ? " · original" : ""}${f.data ? "" : " · name only in the demo"}</div></td>${showCat ? `<td>${esc(AP_CAT_LABELS[f.category] || "Other")}</td>` : ""}<td>${esc(f.uploadedByName || "System")}</td><td style="white-space:nowrap">${esc(dTime(f.createdAt))}</td><td class="r" style="white-space:nowrap"><button class="btn sm" data-a="openFile" data-id="${esc(f.id)}">Open</button>${canEdit ? ` <button class="btn sm" data-a="apFileRemove" data-id="${esc(f.id)}" aria-label="Remove ${esc(f.fileName)}">Remove</button>` : ""}</td></tr>`)
    .concat(legacy.map((a) => `<tr><td><span class="apx-fn" style="cursor:default">${apFileIcon}<span>${esc(a.name)}</span></span><div class="hint">${fmtSize(a.size || 0)} · name only in the demo</div></td>${showCat ? "<td>Vendor invoice</td>" : ""}<td>${esc(a.by || "—")}</td><td>${a.at ? esc(dTime(a.at)) : "—"}</td><td></td></tr>`));
  return table(["File", ...(showCat ? ["Category"] : []), "Uploaded by", "When", ""], rows, emptyMsg);
}

/* ---------------- bill detail: Attachments card + vendor link ---------------- */
const vBillBaseAp = vBill;
function vApBill(q, id) {
  let html = vBillBaseAp(q, id);
  const b = byId(S.apInvoices, id);
  if (!b || !canSee(A, b.companyId)) return html;
  const v = byId(S.vendors, b.vendorId);
  const files = apBillFiles(b.id), docs = v ? apVendorDocs(v.id) : [];
  const vOpen = v ? S.apInvoices.filter((x) => x.vendorId === v.id && apOpenStatuses.includes(x.status)) : [];
  const vendorCard = card("Vendor", v ? `<dl class="kv"><dt>Vendor</dt><dd>${apVendLink(v)}</dd><dt>Vendor no.</dt><dd class="mono">${esc(v.vendorNumber)}</dd><dt>Terms</dt><dd>${v.paymentTermsDays ?? 30} days</dd><dt>Owing</dt><dd class="num">${money(vOpen.reduce((s, x) => s + dueOf(x), 0))} on ${vOpen.length} bill${vOpen.length === 1 ? "" : "s"}</dd><dt>Documents</dt><dd>${docs.length ? `<button class="lnk" data-a="apVendGo" data-id="${esc(v.id)}" data-v="docs">${docs.length} on file</button>` : "None"}</dd></dl>` : `<div class="hint">Vendor not found.</div>`);
  /* the base page's name-only Attachments card is replaced by the vendor summary */
  html = html.replace(/<section class="card ?[^"]*"><div class="card-h"><span>Attachments<\/span>[\s\S]*?<\/div><\/section>/, vendorCard);
  const canEdit = can(A, "ap.create") && b.status !== "CANCELLED";
  const n = files.length + (b.attachments?.length || 0);
  const body = (canEdit ? `<div style="padding:12px 16px 4px">${apDrop(`apb-${b.id}`, "Drag & drop the vendor's invoice here, or click to choose", "PDF, JPG or PNG · attached to this bill straight away")}</div>` : "")
    + apFilesTable(files, { canEdit, legacy: b.attachments || [], empty: canEdit ? "No invoice on file yet — drop the vendor's PDF above." : "No invoice on file for this bill." });
  const att = `<div id="attachments" style="margin-top:14px">${cardFlush(`Attachments <span class="hint" style="font-weight:400">· ${n} file${n === 1 ? "" : "s"}</span>`, body, `<button class="lnk" data-go="/finance/ap/attachments">Find any AP file →</button>`)}</div>`;
  const k = html.indexOf(`<div class="grid g2" style="margin-top:14px">`);
  return k < 0 ? html + att : html.slice(0, k) + att + html.slice(k);
}

/* ---------------- bills list: Files column, missing chip, search ---------------- */
const vAPBaseAp = vAP;
function vApList(q) {
  const html = vAPBaseAp(q);
  const F = apF("apl");
  const marker = `<table class="t"><thead><tr><th class="">Bill</th><th class="">Vendor</th>`;
  const start = html.indexOf(marker);
  const bills = inScope(S.apInvoices).filter((b) => b.status !== "CANCELLED");
  const missing = bills.filter((b) => !apBillFileCount(b)).length;
  const bar = `<div class="apx-bar"><input class="in apx-q" type="search" placeholder="Search bill # or vendor…" aria-label="Search bills" value="${esc(F.q || "")}" data-apq="apl" data-filter="apBillsT">
    <button class="hchip ${F.missing ? "on" : ""}" data-a="apListMissing">Missing invoice PDF (${missing})</button></div>`;
  if (start < 0) { const t = html.indexOf(`<div class="tabs"`); return t < 0 ? html : html.slice(0, t) + bar + html.slice(t); }
  const end = html.indexOf("</table>", start);
  let seg = html.slice(start, end).replace(marker, `<table class="t" id="apBillsT"><thead><tr><th class="">Bill</th><th class="">Vendor</th>`).replace(`<th class="">Status</th></tr>`, `<th class="">Files</th><th class="">Status</th></tr>`);
  const ql = (F.q || "").toLowerCase();
  let shown = 0;
  seg = seg.replace(/<tr class="click" data-go="\/finance\/ap\/([^"/]+)">([\s\S]*?)<\/tr>/g, (row, bid, inner) => {
    const b = byId(S.apInvoices, bid);
    if (!b) return row;
    const n = apBillFileCount(b);
    if (F.missing && n) return "";
    if (ql && !apStrip(inner).toLowerCase().includes(ql)) return "";
    shown++;
    const v = byId(S.vendors, b.vendorId);
    let cells = inner.replace(" 📎", "");
    if (v) cells = cells.replace(`<td>${esc(v.name)}<div class="hint">`, `<td>${apVendLink(v)}<div class="hint">`);
    const k = cells.lastIndexOf("<td>");
    const filesTd = `<td>${n ? apClip(n) : `<span class="apx-none">None</span>`}</td>`;
    cells = k < 0 ? cells + filesTd : cells.slice(0, k) + filesTd + cells.slice(k);
    return `<tr class="click" data-go="/finance/ap/${bid}">${cells}</tr>`;
  });
  if (!shown) seg = seg.replace("<tbody>", `<tbody><tr><td colspan="8" class="hint" style="padding:18px;text-align:center">${F.missing ? "Every bill here has its invoice on file." : "No bills match that search."}</td></tr>`);
  const out = html.slice(0, start) + seg + html.slice(end);
  const t = out.indexOf(`<div class="tabs"`);
  return t < 0 ? out.slice(0, start) + bar + out.slice(start) : out.slice(0, t) + bar + out.slice(t);
}

/* ---------------- vendors ---------------- */
function apVendorStats(v) {
  const bills = S.apInvoices.filter((b) => b.vendorId === v.id);
  const open = bills.filter((b) => apOpenStatuses.includes(b.status));
  const billFiles = bills.reduce((s, b) => s + apBillFileCount(b), 0);
  const docs = apVendorDocs(v.id).length;
  const last = bills.map((b) => b.invoiceDate).sort().pop();
  return { bills, open, owing: open.reduce((s, b) => s + dueOf(b), 0), billFiles, docs, last };
}
function vApVendors() {
  const F = apF("apv");
  const cos = S.companies.filter((c) => canSee(A, c.id) && scopeIds(S, A).includes(c.id));
  let list = inScope(S.vendors).filter((v) => !v.deletedAt);
  if (F.co && !cos.some((c) => c.id === F.co)) F.co = "";
  if (F.co) list = list.filter((v) => v.companyId === F.co);
  list.sort((a, b) => co(a.companyId).displayName.localeCompare(co(b.companyId).displayName) || a.name.localeCompare(b.name));
  const ql = (F.q || "").toLowerCase();
  const rows = list.map((v) => { const s = apVendorStats(v); const files = s.billFiles + s.docs; const hide = ql && !`${v.vendorNumber} ${v.name} ${co(v.companyId).displayName}`.toLowerCase().includes(ql); return `<tr class="click" data-go="/finance/ap/vendors/${esc(v.id)}"${hide ? " hidden" : ""}><td class="mono">${esc(v.vendorNumber)}</td><td><strong>${esc(v.name)}</strong>${v.status && v.status !== "ACTIVE" ? ` ${badge(v.status)}` : ""}</td><td>${coTag(v.companyId)}</td><td>${v.paymentTermsDays ?? 30} days</td>${td(s.open.length, 1)}${td(money(s.owing), 1)}<td>${files ? apClip(files) : `<span class="apx-none">None</span>`}</td><td>${s.last ? dLong(s.last) : "—"}</td></tr>`; });
  const chips = cos.length > 1 ? [["", "All companies", inScope(S.vendors).length], ...cos.map((c) => [c.id, c.displayName, S.vendors.filter((v) => v.companyId === c.id).length])].map(([k, l, n]) => `<button class="hchip ${(F.co || "") === k ? "on" : ""}" data-a="apChip" data-k="apv" data-f="co" data-v="${esc(k)}">${esc(l)} <span>${n}</span></button>`).join("") : "";
  const acts = can(A, "ap.create") ? `<button class="btn pri" data-a="apVendorNew">+ New vendor</button>` : "";
  return ph("Vendors", "Everyone you buy from, by company — open a vendor to see its bills, documents and history.", acts) + flashHtml()
    + `<div class="apx-bar"><input class="in apx-q" type="search" placeholder="Search vendor name or number…" aria-label="Search vendors" value="${esc(F.q || "")}" data-apq="apv" data-filter="apVendT">${chips}</div>`
    + cardFlush("", rows.length ? table(["Vendor #", "Name", "Company", "Terms", ">Open bills", ">Balance owing", "Files", "Last bill"], rows).replace(`<table class="t">`, `<table class="t" id="apVendT">`) : empty("No vendors yet", can(A, "ap.create") ? " — add one with + New vendor." : ""));
}
function apVendorModal() {
  const cos = S.companies.filter((c) => canSee(A, c.id) && scopeIds(S, A).includes(c.id));
  const pre = apF("apv").co || A.activeCompanyId || "";
  return `<h3>New vendor</h3><p class="hint" style="margin:0 0 12px">The vendor number is given automatically. Bills, invoice PDFs and vendor documents then file under this vendor.</p>
    <form data-f="apVendor" class="form-grid"><div class="fld"><label for="avCo">Company</label><select class="in" id="avCo" name="companyId">${cos.map((c) => opt(c.id, c.displayName, c.id === pre)).join("")}</select></div>
    <div class="fld"><label for="avName">Vendor name</label><input class="in" id="avName" name="name" required maxlength="120"></div>
    <div class="fld"><label for="avTerms">Payment terms (days)</label><input class="in num" id="avTerms" name="paymentTermsDays" inputmode="numeric" value="30"></div>
    <div class="fld"><label for="avTax">GST / tax number</label><input class="in" id="avTax" name="taxNumber"></div>
    <div class="fld"><label for="avContact">Contact</label><input class="in" id="avContact" name="contactName"></div>
    <div class="fld"><label for="avEmail">Email</label><input class="in" id="avEmail" name="email" type="email"></div>
    <div class="fld"><label for="avPhone">Phone</label><input class="in" id="avPhone" name="phone"></div>
    <div class="fld"><label for="avAcct">Default expense account</label><input class="in mono" id="avAcct" name="defaultExpenseAccountNumber" placeholder="e.g. 5205"></div>
    <div class="form-row" style="grid-column:1/-1;justify-content:flex-end"><button type="button" class="btn" data-a="closeModal">Cancel</button><button class="btn pri">Add vendor</button></div></form>`;
}
function vApVendor(q, id) {
  const v = byId(S.vendors, id);
  if (!v || v.deletedAt || !canSee(A, v.companyId)) return `<div class="crumb">${crumb("/finance/ap/vendors", "All vendors")}</div>` + ph("Vendor not found") + card("", empty("Not in your companies"));
  const s = apVendorStats(v);
  const docs = apVendorDocs(v.id);
  const tab = ["bills", "docs", "activity"].includes(UI.filters.vend) ? UI.filters.vend : "bills";
  const billIds = new Set(s.bills.map((b) => b.id));
  const nums = s.bills.map((b) => b.invoiceNumber);
  const activity = S.audit.filter((a) => (!a.companyId || canSee(A, a.companyId)) && ((a.entityType === "Vendor" && a.entityId === v.id) || (a.entityType === "ApInvoice" && billIds.has(a.entityId)) || (a.summary || "").includes(v.name) || nums.some((n) => (a.summary || "").includes(`bill ${n}`) || (a.summary || "").includes(`Bill ${n}`)))).reverse();
  const acts = can(A, "ap.create") ? `<button class="btn pri" data-a="apNewBillFor" data-id="${esc(v.id)}">+ Enter a bill</button>` : "";
  const today = todayStr();
  const field = (k, val, mono) => `<div><small>${esc(k)}</small><span class="${mono ? "mono" : ""}">${val == null || val === "" ? `<span class="muted">—</span>` : esc(val)}</span></div>`;
  const head = `<section class="card" style="margin-bottom:14px"><div class="apx-kv">${field("GST / tax number", v.taxNumber, 1)}${field("Contact", v.contactName)}${field("Email / phone", [v.email, v.phone].filter(Boolean).join(" · "))}${field("Status", v.status === "ON_HOLD" ? "On hold" : v.status === "INACTIVE" ? "Inactive" : "Active")}${field("Still owing", `${money(s.owing)} on ${s.open.length} bill${s.open.length === 1 ? "" : "s"}`, 1)}${field("Files", `${s.billFiles} invoice file${s.billFiles === 1 ? "" : "s"} · ${docs.length} document${docs.length === 1 ? "" : "s"}`)}</div></section>`;
  const tabsHtml = `<div class="tabs" role="tablist" aria-label="Vendor record">${[["bills", "Bills", s.bills.length], ["docs", "Documents", docs.length], ["activity", "Activity", null]].map(([k, l, n]) => `<button role="tab" data-a="apVendTab" data-v="${k}" class="${tab === k ? "on" : ""}" aria-selected="${tab === k}">${l}${n != null ? `<span class="c">${n}</span>` : ""}</button>`).join("")}</div>`;
  let body;
  if (tab === "bills") {
    body = cardFlush("", table(["Bill #", "Bill date", "Due", "Status", "Files", ">Total", ">Still owing"], [...s.bills].sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : -1)).map((b) => { const n = apBillFileCount(b); const overdue = b.dueDate < today && !["PAID", "CANCELLED"].includes(b.status); return `<tr class="click" data-go="/finance/ap/${esc(b.id)}"><td class="mono"><strong>${esc(b.invoiceNumber)}</strong><div class="hint">${esc(b.description || "")}</div></td><td>${dLong(b.invoiceDate)}</td><td>${dLong(b.dueDate)}${overdue && b.status !== "DRAFT" ? ` <span class="badge tone-red">overdue</span>` : ""}</td><td>${badge(b.status)}</td><td data-files>${n ? apClip(n) : `<span class="apx-none">None</span>`}</td>${td(money(b.totalCents), 1)}${td(money(dueOf(b)), 1)}</tr>`; }), "No bills from this vendor yet."));
  } else if (tab === "docs") {
    const canEdit = can(A, "ap.create");
    body = cardFlush("", (canEdit ? `<div style="padding:12px 16px 4px"><p class="hint" style="margin:0 0 8px">Papers that belong to the vendor rather than to one bill — contract, insurance certificate, price list, statements. Invoice PDFs live on each bill (see the Bills tab).</p><div class="apx-bar" style="margin-bottom:8px"><label for="apvCat-${esc(v.id)}" class="hint" style="font-weight:600">Category</label><select class="in" id="apvCat-${esc(v.id)}">${Object.entries(AP_VENDOR_CATS).map(([k, l]) => opt(k, l, k === (UI.filters.apvCat || "VENDOR_CONTRACT"))).join("")}</select></div>${apDrop(`apv-${v.id}`, "Drag & drop vendor documents here, or click to choose", "PDF, JPG or PNG · filed under the category above")}</div>` : `<p class="hint" style="padding:12px 16px 0;margin:0">Papers that belong to the vendor rather than to one bill. Invoice PDFs live on each bill.</p>`)
      + apFilesTable(docs, { canEdit, showCat: true, empty: "No vendor documents yet." }));
  } else {
    body = cardFlush("", table(["When", "Who", "What happened"], activity.map((a) => `<tr><td style="white-space:nowrap">${esc(dTime(a.at))}</td><td>${esc(a.actorName)}</td><td>${esc(a.summary)}</td></tr>`), "Nothing recorded for this vendor in this session yet."));
  }
  return `<div class="crumb">${crumb("/finance/ap/vendors", "All vendors")}</div>` + ph(v.name, `${v.vendorNumber} · ${co(v.companyId).displayName} · terms ${v.paymentTermsDays ?? 30} days`, acts) + flashHtml() + head + tabsHtml + body;
}

/* ---------------- AP attachments finder ---------------- */
function apFinderData() {
  const F = apF("apf");
  const cos = S.companies.filter((c) => canSee(A, c.id) && scopeIds(S, A).includes(c.id));
  if (F.co && !cos.some((c) => c.id === F.co)) F.co = "";
  const inCo = (cid) => scopeIds(S, A).includes(cid) && (!F.co || cid === F.co);
  const vendors = S.vendors.filter((v) => inCo(v.companyId) && !v.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
  if (F.vendor && !vendors.some((v) => v.id === F.vendor)) F.vendor = "";
  const ql = (F.q || "").trim().toLowerCase();
  const scopeBills = S.apInvoices.filter((b) => inCo(b.companyId) && b.status !== "CANCELLED");
  const files = apFilesAll().filter((f) => inCo(f.companyId)).map((f) => {
    const bill = f.entityType === "ApInvoice" ? byId(S.apInvoices, f.entityId) : null;
    const v = apVendorOf(f);
    return { f, bill, v, kind: f.entityType === "ApInvoice" ? "Invoice" : "Vendor document" };
  }).filter((r) => (!F.vendor || r.v?.id === F.vendor) && (!F.kind || (F.kind === "invoice") === (r.kind === "Invoice"))
    && (!ql || `${r.f.fileName} ${r.f.title || ""} ${r.v?.name || ""} ${r.v?.vendorNumber || ""} ${r.bill?.invoiceNumber || ""}`.toLowerCase().includes(ql)))
    .sort((a, b) => (a.f.createdAt < b.f.createdAt ? 1 : -1));
  const missing = scopeBills.filter((b) => !apBillFileCount(b));
  const missingShown = missing.filter((b) => (!F.vendor || b.vendorId === F.vendor) && (!ql || `${b.invoiceNumber} ${vendorName(b.vendorId)}`.toLowerCase().includes(ql))).sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : -1));
  return { F, cos, vendors, files, scopeBills, missing, missingShown };
}
function vApAttachments() {
  const { F, cos, vendors, files, scopeBills, missing, missingShown } = apFinderData();
  const withFile = scopeBills.length - missing.length;
  const chip = (f, v, label) => `<button class="hchip ${(F[f] || "") === v ? "on" : ""}" data-a="apChip" data-k="apf" data-f="${f}" data-v="${esc(v)}">${label}</button>`;
  const filtered = !!(F.q || F.co || F.vendor || F.kind || F.missing);
  const bar = `<div class="apx-bar"><input class="in apx-q" type="search" placeholder="File name, vendor or bill #…" aria-label="Search files" value="${esc(F.q || "")}" data-apq="apf" data-filter="apFindT">
      ${cos.length > 1 ? `<select class="in" aria-label="Company" data-a="apSet" data-k="apf" data-f="co">${opt("", "All companies", !F.co)}${cos.map((c) => opt(c.id, c.displayName, F.co === c.id)).join("")}</select>` : ""}
      <select class="in" aria-label="Vendor" data-a="apSet" data-k="apf" data-f="vendor" style="max-width:220px">${opt("", "All vendors", !F.vendor)}${vendors.map((v) => opt(v.id, v.name, F.vendor === v.id)).join("")}</select>
      ${filtered ? `<button class="lnk" data-a="apClear" data-k="apf">Clear</button>` : ""}</div>
    <div class="apx-bar">${F.missing ? "" : chip("kind", "", "All files") + chip("kind", "invoice", "Invoices") + chip("kind", "vendor", "Vendor documents")}<button class="hchip ${F.missing ? "on" : ""}" data-a="apChip" data-k="apf" data-f="missing" data-v="${F.missing ? "" : "1"}">Bills with no attachment (${missing.length})</button></div>`;
  const pct = scopeBills.length ? Math.round((withFile / scopeBills.length) * 100) : 0;
  const chart = scopeBills.length ? donut([{ label: "Bills with a file", v: withFile, d: `${withFile} bill${withFile === 1 ? "" : "s"}`, color: "var(--moss)" }, { label: "Bills with no file", v: missing.length, d: `${missing.length} bill${missing.length === 1 ? "" : "s"}`, color: "var(--ochre)" }], { title: "Bills with / without a file", total: `${pct}%`, caption: "on file", size: 120, thick: 16 }) : "";
  let body;
  if (!F.missing) {
    body = cardFlush("", (files.length ? table(["File", "Kind", "Vendor", "Bill #", "Company", ">Amount", "Bill status", "Uploaded by", "Date"], files.map(({ f, bill, v, kind }) => `<tr><td>${apFileBtn(f)}<div class="hint">${apKind(f.mimeType)} · ${fmtSize(f.sizeBytes)}</div></td><td>${kind === "Invoice" ? "Invoice" : `Vendor document<div class="hint">${esc(AP_CAT_LABELS[f.category] || "Other")}</div>`}</td><td>${apVendLink(v)}</td><td>${bill ? `<button class="lnk mono" data-go="/finance/ap/${esc(bill.id)}">${esc(bill.invoiceNumber)}</button>` : `<span class="muted">—</span>`}</td><td>${coTag(f.companyId)}</td>${td(bill ? money(bill.totalCents) : "—", 1)}<td>${bill ? badge(bill.status) : `<span class="muted">—</span>`}</td><td>${esc(f.uploadedByName || "System")}</td><td style="white-space:nowrap">${dLong(String(f.createdAt).slice(0, 10))}</td></tr>`)).replace(`<table class="t">`, `<table class="t" id="apFindT">`)
      : empty(filtered ? "No files match" : "No AP files yet", filtered ? " — try fewer filters." : " — drop a vendor's PDF on any bill to attach it."))
      + (files.length ? `<div class="hint" style="padding:8px 16px;border-top:1px solid var(--border)">${files.length} file${files.length === 1 ? "" : "s"}</div>` : ""));
  } else {
    body = cardFlush("", missingShown.length ? table(["Bill #", "Vendor", "Company", "Bill date", "Status", ">Total", ""], missingShown.map((b) => `<tr class="click" data-go="/finance/ap/${esc(b.id)}"><td class="mono"><strong>${esc(b.invoiceNumber)}</strong></td><td>${apVendLink(byId(S.vendors, b.vendorId))}</td><td>${coTag(b.companyId)}</td><td>${dLong(b.invoiceDate)}</td><td>${badge(b.status)}</td>${td(money(b.totalCents), 1)}<td class="r"><button class="lnk" data-go="/finance/ap/${esc(b.id)}">Attach PDF →</button></td></tr>`)).replace(`<table class="t">`, `<table class="t" id="apFindT">`) : empty("Every bill has its invoice on file."));
  }
  return ph("AP attachments", "Every vendor invoice PDF and vendor document in one place — search by file, vendor or bill number.", dlButton("ap-attachments", "Download", { variant: "outline" })) + flashHtml()
    + `<div class="apx-top"><div>${bar}</div>${chart ? `<div class="card" style="padding:10px 14px">${chart}</div>` : ""}</div>` + body;
}
EXPORTS["ap-attachments"] = () => {
  const { F, files, missingShown } = apFinderData();
  if (F.missing) return { base: `haico-ap-bills-missing-files-${todayStr()}`, title: "Bills with no attachment", rows: [["Bill #", "Vendor", "Company", "Bill date", "Status", "Total"], ...missingShown.map((b) => [b.invoiceNumber, vendorName(b.vendorId), co(b.companyId)?.displayName || "", b.invoiceDate, b.status, (b.totalCents / 100).toFixed(2)])] };
  return { base: `haico-ap-attachments-${todayStr()}`, title: "AP attachments", rows: [["File", "Kind", "Category", "Vendor", "Bill #", "Company", "Amount", "Bill status", "Uploaded by", "Date", "Size (KB)"], ...files.map(({ f, bill, v, kind }) => [f.fileName, kind, AP_CAT_LABELS[f.category] || "Other", v?.name || "", bill?.invoiceNumber || "", co(f.companyId)?.displayName || "", bill ? (bill.totalCents / 100).toFixed(2) : "", bill?.status || "", f.uploadedByName || "System", String(f.createdAt).slice(0, 10), Math.max(1, Math.ceil((f.sizeBytes || 0) / 1024))])] };
};

/* ---------------- Documents: type chips + search, rows link to their record ---------------- */
function apDocRows() {
  const out = [];
  for (const d of S.documents.filter((x) => !x.entityType && (x.visibility === "ALL" || !x.companyId || canSee(A, x.companyId)))) {
    out.push({ type: "policies", typeLabel: d.category === "POLICY" ? "Policy" : pretty0(d.category), title: d.title, fileName: d.fileName, size: d.sizeBytes, by: "HR", at: d.createdAt, companyId: d.companyId || null, record: null });
  }
  if (can(A, "ap.view")) {
    for (const f of apFilesAll().filter((x) => scopeIds(S, A).includes(x.companyId))) {
      const v = apVendorOf(f), bill = f.entityType === "ApInvoice" ? byId(S.apInvoices, f.entityId) : null;
      out.push({ type: f.entityType === "ApInvoice" ? "vinv" : "vdoc", typeLabel: AP_CAT_LABELS[f.category] || "Vendor document", title: f.title || f.fileName, fileName: f.fileName, size: f.sizeBytes, by: f.uploadedByName, at: f.createdAt, companyId: f.companyId, fileId: f.id, record: bill ? [`Bill ${bill.invoiceNumber} · ${v?.name || ""}`, `/finance/ap/${bill.id}`] : v ? [`Vendor · ${v.name}`, `/finance/ap/vendors/${v.id}`] : null });
    }
  }
  const reviewer = can(A, "hr.employees.view") || can(A, "finance.view") || can(A, "expenses.view") || can(A, "leave.view") || can(A, "procurement.view");
  for (const f of (S.files || []).filter((x) => AP_REQ_TYPES[x.entityType] && !x.removedAt)) {
    const mine = !!A.employee && f.employeeId === A.employee.id;
    if (!mine && !(reviewer && canSee(A, f.companyId))) continue;
    const emp = f.employeeId ? byId(S.employees, f.employeeId) : null;
    const path = f.entityType === "EmployeeRequest" ? `/me/requests/${f.entityId}` : f.entityType === "LeaveRequest" ? (mine ? "/me/time-off" : can(A, "leave.view") ? "/hr/leave" : null) : f.entityType === "ExpenseClaim" ? (mine ? "/me/expenses" : can(A, "expenses.view") ? "/finance/expenses" : null) : can(A, "procurement.view") ? "/procurement/requests" : null;
    out.push({ type: "req", typeLabel: AP_REQ_TYPES[f.entityType], title: f.fileName.replace(/\.[^.]+$/, ""), fileName: f.fileName, size: f.sizeBytes, by: f.uploadedByName, at: f.createdAt, companyId: f.companyId, fileId: f.id, record: [`${AP_REQ_TYPES[f.entityType]}${emp ? ` · ${empName(emp)}` : ""}`, path] });
  }
  return out.sort((a, b) => (String(a.at) < String(b.at) ? 1 : -1));
}
const pretty0 = (s) => String(s || "").toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
function vApDocuments() {
  const F = apF("docs");
  const all = apDocRows();
  const types = [["", "All"], ["policies", "Policies"], ...(can(A, "ap.view") ? [["vinv", "Vendor invoices"], ["vdoc", "Vendor documents"]] : []), ["req", "Requests & claims"]];
  if (!types.some((t) => t[0] === (F.type || ""))) F.type = "";
  const ql = (F.q || "").toLowerCase();
  const list = all.filter((r) => !F.type || r.type === F.type);
  const rows = list.map((r) => { const hide = ql && !`${r.title} ${r.fileName} ${r.typeLabel} ${r.record?.[0] || ""}`.toLowerCase().includes(ql); return `<tr${hide ? " hidden" : ""}><td>${r.fileId ? `<button type="button" class="apx-fn" data-a="openFile" data-id="${esc(r.fileId)}" title="Open ${esc(r.fileName)}">${apFileIcon}<span>${esc(r.title)}</span></button>` : `<strong>${esc(r.title)}</strong>`}<div class="hint mono" style="font-size:11px">${esc(r.fileName)}</div></td><td><span class="badge tone-grey">${esc(r.typeLabel)}</span></td><td>${r.record ? (r.record[1] ? `<button class="lnk" data-go="${esc(r.record[1])}">${esc(r.record[0])}</button>` : esc(r.record[0])) : `<span class="muted">Library</span>`}</td><td>${r.companyId ? coTag(r.companyId) : `<span class="muted">Whole group</span>`}</td><td>${esc(r.by || "—")}</td><td style="white-space:nowrap">${r.at ? dLong(String(r.at).slice(0, 10)) : "—"}</td>${td(fmtSize(r.size || 0), 1)}</tr>`; });
  const chips = types.map(([k, l]) => `<button class="hchip ${(F.type || "") === k ? "on" : ""}" data-a="apChip" data-k="docs" data-f="type" data-v="${k}">${esc(l)} <span>${k ? all.filter((r) => r.type === k).length : all.length}</span></button>`).join("");
  return ph("Documents", "Policies, vendor invoices and documents, and every file attached to a request or claim — search them all here.") + flashHtml()
    + `<div class="apx-bar"><input class="in apx-q" type="search" placeholder="Search title, file or record…" aria-label="Search documents" value="${esc(F.q || "")}" data-apq="docs" data-filter="apDocsT">${chips}</div>`
    + cardFlush("", rows.length ? table(["Document", "Type", "Linked record", "Company", "Added by", "Date", ">Size"], rows).replace(`<table class="t">`, `<table class="t" id="apDocsT">`) : empty("Nothing here yet."));
}

/* ---------------- routes ----------------
   The existing AP list, bill page and Documents keep their app.js routes: app.js registers
   whatever vAP / vBill / vDocuments point to when it loads (after this file). The new pages
   are registered here, before app.js's /finance/ap/:id, so they win. */
vAP = vApList;
vBill = vApBill;
vDocuments = vApDocuments;
route("/finance/ap/vendors", "ap.view", vApVendors);
route("/finance/ap/vendors/:id", "ap.view", vApVendor);
route("/finance/ap/attachments", "ap.view", vApAttachments);

/* ---------------- forms & actions ---------------- */
window.FORMS_EXT.push({
  apVendor(f) {
    const d = fd(f);
    const before = S.vendors.length;
    if (act("ap.vendor.create", d, `${(d.name || "").trim()} added as a vendor.`)) {
      const v = S.vendors[before];
      UI.modal = null;
      if (v) { UI.filters.vend = "bills"; go(`/finance/ap/vendors/${v.id}`); UI.flash = { kind: "ok", text: `${v.name} added as ${v.vendorNumber}.` }; safeRender(); }
    }
  },
});
window.ACTIONS_EXT.push({
  apFileRemove(el) { const f = (S.files || []).find((x) => x.id === el.dataset.id); act("ap.file.remove", { fileId: el.dataset.id }, `${f?.fileName || "File"} removed.`); },
  apListMissing() { const F = apF("apl"); F.missing = !F.missing; if (F.missing) UI.tabs.ap = "ALL"; safeRender(); },
  apChip(el) { apF(el.dataset.k)[el.dataset.f] = el.dataset.v; if (el.dataset.f === "missing" && el.dataset.v) apF(el.dataset.k).kind = ""; safeRender(); },
  apSet(el) { apF(el.dataset.k)[el.dataset.f] = el.value; safeRender(); },
  apClear(el) { UI.filters[el.dataset.k] = {}; safeRender(); },
  apVendTab(el) { UI.filters.vend = el.dataset.v; safeRender(); },
  apVendGo(el) { UI.filters.vend = el.dataset.v || "bills"; go(`/finance/ap/vendors/${el.dataset.id}`); },
  apVendorNew() { UI.modal = apVendorModal(); safeRender(); setTimeout(() => document.getElementById("avName")?.focus(), 30); },
  apNewBillFor(el) { UI.apDraft = null; UI.modal = billModal({}).replace(`<option value="${esc(el.dataset.id)}">`, `<option value="${esc(el.dataset.id)}" selected>`); safeRender(); },
});
document.addEventListener("change", (ev) => { const el = ev.target; if (el.id?.startsWith?.("apvCat-")) UI.filters.apvCat = el.value; });
