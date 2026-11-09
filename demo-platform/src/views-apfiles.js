/* ==========================================================================
   views-apfiles.js — attachments when a bill is entered: New Bill takes one
   or more PDFs / images, and every row of Batch Entry can carry its own files.
   They land on the bill (Attachments card), where they open and download.
   ========================================================================== */

/** a slim line under each Batch Entry row: attach the bill's files (drop or choose) and see them */
function apbFilesRow(r, i) {
  if (!r.fk) { UI.apbSeq = (UI.apbSeq || 0) + 1; r.fk = `bbrow${UI.apbSeq}`; }
  return `<tr class="apb-files"><td></td><td colspan="8"><div class="apb-fl"><button type="button" class="btn sm" data-fzone="${r.fk}" aria-label="Attach files to bill ${i + 1}">📎 Attach invoice files</button><input type="file" multiple accept="application/pdf,image/jpeg,image/png" data-fdrop="${r.fk}" style="display:none"><div id="fchips-${r.fk}" class="fchips">${pendingChips(r.fk)}</div><span class="hint">PDF, JPG or PNG · one or more · drop them on the button</span></div></td></tr>`;
}
injectCss(`
tr.apb-files td{border-top:0;padding-top:0}
.apb-fl{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.apb-fl .fchips{margin:0}
.apb-fl .hint{font-size:11.5px}
`);
const apFilesOk = (files, where) => { const list = (files || []).filter((f) => f && f.name); if (list.length > 8) fail(`${where}up to 8 files per bill.`); for (const f of list) if (!FILE_TYPES.includes(f.type)) fail(`${where}${f.name} isn't a PDF, JPG or PNG.`); return list; };

{
  const _apCreateFiles = R["ap.create"];
  R["ap.create"] = function (S, p, ctx) {
    const files = apFilesOk(p.files, "");
    const before = S.apInvoices.length;
    _apCreateFiles(S, p, ctx);
    const inv = S.apInvoices[before];
    if (inv && files.length) apSaveFiles(S, ctx, files, { entityType: "ApInvoice", entityId: inv.id, companyId: inv.companyId, category: AP_BILL_CAT, firstIsSource: !apLiveFilesIn(S, "ApInvoice", inv.id).some((f) => f.isSourceDocument), label: `bill ${inv.invoiceNumber}` });
  };
  const _apBatchFiles = R["ap.batchEntry"];
  R["ap.batchEntry"] = function (S, p, ctx) {
    const all = p.rows || [];
    all.forEach((r, i) => {
      const list = apFilesOk(r.files, `Row ${i + 1}: `);
      if (list.length && !(r.vendorId || r.invoiceNumber || r.subtotalCents)) fail(`Row ${i + 1} has files but no bill — fill the row in or remove its files.`);
    });
    const kept = all.filter((r) => r.vendorId || r.invoiceNumber || r.subtotalCents);
    const before = S.apBatches.length;
    _apBatchFiles(S, p, ctx);
    const batch = S.apBatches[before];
    if (!batch) return;
    kept.forEach((r, i) => {
      const inv = byId(S.apInvoices, batch.items[i]);
      const list = (r.files || []).filter((f) => f && f.name);
      if (inv && list.length) apSaveFiles(S, ctx, list, { entityType: "ApInvoice", entityId: inv.id, companyId: inv.companyId, category: AP_BILL_CAT, firstIsSource: true, label: `bill ${inv.invoiceNumber}` });
    });
  };
}
