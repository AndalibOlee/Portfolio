/* ==========================================================================
   views-inv.js — Inventory & selling: items and price lists, stock on hand
   (reorder alerts, adjustments, transfers), sales orders → shipments →
   invoices, and the 3-way match (PO ↔ goods received ↔ vendor bill).
   Mirrors src/lib/inv-pricing.ts, inv-stock.ts and inv-match.ts in the live app.
   All names are prefixed inv / so / match to stay out of other files' way.
   ========================================================================== */
injectCss(`
.inv-side{display:grid;gap:14px;grid-template-columns:minmax(0,1fr) 400px;align-items:start}
@media(max-width:1000px){.inv-side{grid-template-columns:minmax(0,1fr)}}
.inv-pos{color:var(--t-green)}.inv-neg{color:var(--t-red)}.inv-warn{color:var(--t-amber);font-weight:700}
.inv-prog{display:flex;align-items:center;gap:8px;min-width:120px}
.inv-prog .tr{flex:1;height:6px;border-radius:99px;background:var(--muted);overflow:hidden}
.inv-prog .tr i{display:block;height:100%;border-radius:99px;background:var(--t-green)}
.inv-prog small{width:34px;text-align:right;font-family:var(--mono);font-size:11px}
.inv-steps{display:flex;flex-wrap:wrap;gap:4px 0;align-items:center;font-size:12px;margin:0 0 14px;padding:0;list-style:none}
.inv-steps li{display:flex;align-items:center;gap:6px}
.inv-steps .n{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:700;border:1px solid var(--border);background:var(--card);color:var(--muted-fg)}
.inv-steps li.done .n{background:var(--t-green);border-color:var(--t-green);color:#fff}
.inv-steps li.done span:last-child{font-weight:600}
.inv-steps li:not(.done) span:last-child{color:var(--muted-fg)}
.inv-steps .ln{width:24px;height:1px;background:var(--border);margin:0 8px}
.inv-tl{list-style:none;margin:0;padding:0;display:grid;gap:10px;font-size:12.5px}
.inv-tl li{display:flex;gap:10px}
.inv-tl .dot{flex:none;width:10px;height:10px;border-radius:50%;margin-top:4px;background:var(--muted-fg)}
.inv-tl .dot.ship{background:var(--t-blue)}.inv-tl .dot.inv{background:var(--t-green)}.inv-tl .dot.bad{background:var(--t-red)}
.inv-tl .sub{display:block;font-size:11.5px;color:var(--muted-fg)}
.inv-sum{margin:12px 0 0 auto;width:min(100%,260px);font-size:13px;display:grid;gap:4px}
.inv-sum div{display:flex;justify-content:space-between}
.inv-sum .tot{border-top:1px solid var(--border);padding-top:4px;font-weight:700;font-size:14px}
.inv-alert{background:var(--t-amber-bg);border-color:transparent}
.inv-soft{background:color-mix(in srgb,var(--muted) 45%,transparent)}
.inv-sol .in{height:34px}
.inv-sol td{vertical-align:middle}
.inv-note{font-size:12px;color:var(--muted-fg);min-width:230px;max-width:440px;white-space:normal}
.inv-mini{display:block;font-size:10.5px;color:var(--muted-fg);font-family:var(--font);font-weight:400}
.inv-search{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0 12px}
.inv-search .in{border-radius:999px;height:38px;max-width:340px}
.inv-add{background:var(--t-teal-bg);border-color:transparent}
.inv-nm .lnk{display:inline}
`);

/* ---------------- labels & small helpers ---------------- */
const INV_STATUS = {
  CONFIRMED: ["Confirmed", "teal"], PARTIALLY_SHIPPED: ["Partly shipped", "blue"], SHIPPED: ["Shipped", "blue"], INVOICED: ["Invoiced", "green"],
  PARTIALLY_RECEIVED: ["Partly received", "blue"], VARIANCE: ["Variance", "amber"], UNMATCHED: ["Not matched", "amber"], MATCHED: ["Matched", "teal"],
  OK: ["OK", "green"], REORDER: ["Reorder", "amber"], STOCK: ["Stock", "teal"], SERVICE: ["Service", "grey"], DRAFT: ["Draft", "grey"],
  RECEIPT: ["Received", "green"], SHIPMENT: ["Shipped", "blue"], ADJUSTMENT: ["Adjusted", "amber"], TRANSFER: ["Transferred", "teal"],
};
const invBadge = (s, extra = "") => { const m = INV_STATUS[s] || STATUS[s] || [s || "—", "grey"]; return `<span class="badge tone-${m[1]} ${extra}">${esc(m[0])}</span>`; };
const invLabel = (s) => (INV_STATUS[s] || STATUS[s] || [s])[0];
const invQty = (n) => (n == null ? "—" : Number(n).toLocaleString("en-CA", { maximumFractionDigits: 2 }));
const invSq = (companyId) => `<span class="sq" style="display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px;vertical-align:middle;background:${esc(co(companyId)?.colorTag || "#17566B")}"></span>`;
const invAvail = (l) => (l ? l.onHand - l.reserved : 0);
const invLevelsOf = (itemId, St = S) => St.stockLevels.filter((l) => l.itemId === itemId);
const invOnHand = (itemId, St = S) => invLevelsOf(itemId, St).reduce((s, l) => s + l.onHand, 0);
const invAvailable = (itemId, St = S) => invLevelsOf(itemId, St).reduce((s, l) => s + invAvail(l), 0);
const invCanEdit = () => can(A, "ar.create") || can(A, "procurement.create");
const invCanView = () => can(A, "ar.view") || can(A, "procurement.view");
const invCanMove = () => invCanEdit() || can(A, "procurement.receive");
const INV_OPEN_PO = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "PARTIALLY_RECEIVED"];
const invPoLines = (poId, St = S) => St.purchaseOrderLines.filter((l) => l.purchaseOrderId === poId);
const invSkuOf = (description) => { const m = String(description || "").match(/\(([A-Z0-9][A-Z0-9-]*)\)\s*$/i); return m ? m[1].toUpperCase() : null; };
/** open purchase order that already covers an item (by SKU in a line description) */
const invOpenPoFor = (item, St = S) => St.purchaseOrders.find((p) => p.companyId === item.companyId && INV_OPEN_PO.includes(p.status) && invPoLines(p.id, St).some((l) => invSkuOf(l.description) === item.sku));
const invSortMoves = (list) => [...list].map((m, i) => [m, i]).sort((a, b) => (a[0].date < b[0].date ? 1 : a[0].date > b[0].date ? -1 : b[1] - a[1])).map((x) => x[0]);
if (typeof H_AREAS === "object" && !H_AREAS.inventory) H_AREAS.inventory = ["Inventory & selling", "📦", ["inventory", "sales"]];

/* ---------------- pricing: customer's price list → best qty break ≤ qty → list price ---------------- */
function invPriceFor(customerId, itemId, qty, St = S) {
  const item = byId(St.items, itemId);
  if (!item) return { priceCents: 0, source: "list-price" };
  const cu = byId(St.customers, customerId);
  const plId = cu?.priceListId;
  if (plId) {
    const pl = byId(St.priceLists, plId);
    let best = null;
    for (const r of St.priceListItems) {
      if (r.priceListId !== plId || r.itemId !== itemId || r.minQuantity > qty) continue;
      if (!best || r.minQuantity > best.minQuantity) best = r;
    }
    if (pl && best) return { priceCents: best.priceCents, source: "price-list", priceListName: pl.name, minQuantity: best.minQuantity };
  }
  return { priceCents: item.priceCents, source: "list-price" };
}

/* ---------------- 3-way match arithmetic (same rules as inv-match.ts) ---------------- */
function invReceivedValue(lines) { return lines.reduce((s, l) => s + Math.round(l.receivedQuantity * l.unitCents) + (l.quantity > 0 ? Math.round((l.taxCents * l.receivedQuantity) / l.quantity) : 0), 0); }
const invTolerance = (receivedCents) => Math.max(500, Math.round(receivedCents * 0.01));
function invComputeMatch(po, poLines, bill, billLines) {
  const receivedCents = invReceivedValue(poLines), tol = invTolerance(receivedCents), billedCents = bill.totalCents;
  const poTotalCents = po.totalCents ?? po.amountCents ?? 0;
  const diff = billedCents - receivedCents, overPo = billedCents > poTotalCents + tol;
  const base = { poTotalCents, receivedCents, billedCents, diffCents: diff, toleranceCents: tol };
  if (Math.abs(diff) <= tol && !overPo) {
    return { ...base, status: "MATCHED", note: `PO, receipt and bill agree (${poLines.map((l) => `${invQty(l.receivedQuantity)} × ${money(l.unitCents)}`).join("; ")}${Math.abs(diff) > 0 ? `; ${money(Math.abs(diff))} within tolerance` : ""}).` };
  }
  const causes = [], same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  const qtyDiffs = [], priceDiffs = []; let matchedLines = 0;
  for (const bl of billLines) {
    const pl = poLines.find((l) => same(l.description, bl.description));
    if (!pl) continue;
    matchedLines++;
    if (bl.quantity > pl.receivedQuantity + 1e-9) qtyDiffs.push(`billed for ${invQty(bl.quantity)} × ${bl.description}, only ${invQty(pl.receivedQuantity)} received${pl.quantity > pl.receivedQuantity ? ` (${invQty(pl.quantity - pl.receivedQuantity)} still to come)` : ""}`);
    if (pl.unitCents !== bl.unitCents) priceDiffs.push(`${bl.description} billed at ${money(bl.unitCents)} vs ${money(pl.unitCents)} on the PO`);
  }
  if (diff > tol && qtyDiffs.length) causes.push(qtyDiffs.join("; "));
  if (priceDiffs.length) causes.push(`price differs — ${priceDiffs.join("; ")}`);
  if (!matchedLines && diff > tol) {
    const billedQty = billLines.reduce((s, l) => s + l.quantity, 0), receivedQty = poLines.reduce((s, l) => s + l.receivedQuantity, 0), orderedQty = poLines.reduce((s, l) => s + l.quantity, 0);
    if (billedQty > receivedQty + 1e-9) causes.push(`billed for ${invQty(billedQty)} units in total, only ${invQty(receivedQty)} received${orderedQty > receivedQty ? ` (${invQty(orderedQty - receivedQty)} still to come)` : ""}`);
  }
  if (overPo) causes.push(`bill ${money(billedCents)} exceeds the PO total ${money(poTotalCents)}`);
  if (diff < -tol) causes.push(`bill ${money(billedCents)} is ${money(-diff)} less than the ${money(receivedCents)} received — partial bill?`);
  if (!causes.length) causes.push(`bill ${money(billedCents)} differs from received value ${money(receivedCents)} by ${money(Math.abs(diff))}`);
  const text = causes.join("; ");
  return { ...base, status: "VARIANCE", note: text.charAt(0).toUpperCase() + text.slice(1) + "." };
}
const invMatchAccepted = (b) => b.matchStatus === "MATCHED" && String(b.matchNote || "").startsWith("Variance accepted");
function invMatchRows(St = S) {
  return inScope(St.apInvoices).filter((b) => b.purchaseOrderId && b.status !== "CANCELLED").map((b) => {
    const po = byId(St.purchaseOrders, b.purchaseOrderId);
    return { b, po, r: po ? invComputeMatch(po, invPoLines(po.id, St), b, St.apLines.filter((l) => l.apInvoiceId === b.id)) : null, stored: b.matchStatus === "MATCHED" || b.matchStatus === "VARIANCE" ? b.matchStatus : "UNMATCHED" };
  }).sort((a, b) => (a.b.invoiceDate < b.b.invoiceDate ? 1 : -1));
}

/* ==========================================================================
   Reducers (deterministic: ctx.now / ctx.id only)
   ========================================================================== */
function invNeedEditor(ctx) { if (!can(ctx.auth, "ar.create") && !can(ctx.auth, "procurement.create")) fail("Your role doesn't allow this."); }
function invNeedMover(ctx) { if (!can(ctx.auth, "ar.create") && !can(ctx.auth, "procurement.create") && !can(ctx.auth, "procurement.receive")) fail("Your role doesn't allow this."); }
function invLvl(S, ctx, warehouseId, itemId) {
  let l = S.stockLevels.find((x) => x.warehouseId === warehouseId && x.itemId === itemId);
  if (!l) { l = { id: ctx.id("sl"), warehouseId, itemId, onHand: 0, reserved: 0 }; S.stockLevels.push(l); }
  return l;
}
function invMove(S, ctx, o) { const m = { id: ctx.id("sm"), byName: ctx.actor.displayName, createdAt: ctx.now, date: ctx.now.slice(0, 10), ...o }; S.stockMovements.push(m); return m; }
function invGuard(S, ctx, itemId, warehouseId) {
  const item = byId(S.items, itemId), wh = byId(S.warehouses, warehouseId);
  if (!item) fail("Pick an item.");
  if (!wh) fail("Pick a warehouse.");
  if (item.companyId !== wh.companyId) fail("Item and warehouse must belong to the same company.");
  ctx.company(wh.companyId);
  return { item, wh };
}
function invReadItem(p) {
  const sku = String(p.sku || "").trim().toUpperCase(), name = String(p.name || "").trim();
  const costCents = Number(p.costCents) || 0, priceCents = Number(p.priceCents) || 0;
  if (!sku || !name) fail("An item needs a SKU and a name.");
  if (!Number.isFinite(costCents) || !Number.isFinite(priceCents) || costCents < 0 || priceCents < 0) fail("Cost and price can't be negative.");
  return { sku, name, type: p.type === "SERVICE" ? "SERVICE" : "STOCK", unit: String(p.unit || "").trim() || "ea", costCents, priceCents, reorderPoint: Math.max(0, Number(p.reorderPoint) || 0), reorderQuantity: Math.max(0, Number(p.reorderQuantity) || 0), preferredVendorId: p.preferredVendorId || undefined, revenueAccountNumber: String(p.revenueAccountNumber || "").trim() || "4000", expenseAccountNumber: String(p.expenseAccountNumber || "").trim() || "5205" };
}
function invArInvoiceFromOrder(S, ctx, o) {
  // mirrors R["ar.create"]: Dr 1200 receivable / Cr revenue (by item account) / Cr 2410 GST — one posting per invoice
  const cu = byId(S.customers, o.customerId);
  const lines = S.salesOrderLines.filter((l) => l.salesOrderId === o.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const toBill = lines.map((l) => ({ l, qty: l.shippedQuantity - (l.invoicedQuantity || 0) })).filter((x) => x.qty > 1e-9);
  if (!toBill.length) fail(`Nothing to invoice on ${o.orderNumber} — everything shipped so far has already been billed.`);
  const withGst = o.taxCents > 0 || lines.some((l) => l.taxCents > 0);
  const invLines = toBill.map(({ l, qty }) => { const amountCents = Math.round(qty * l.unitCents); const taxCents = withGst ? Math.round(amountCents * 0.05) : 0; return { description: l.description, accountNumber: byId(S.items, l.itemId)?.revenueAccountNumber || GL.REVENUE, quantity: qty, unitCents: l.unitCents, amountCents, taxCode: withGst ? "GST" : "NONE", taxCents }; });
  const sub = invLines.reduce((s, l) => s + l.amountCents, 0), tax = invLines.reduce((s, l) => s + l.taxCents, 0), total = sub + tax;
  const date = ctx.now.slice(0, 10);
  const num = nextNum(S.arInvoices.map((i) => i.invoiceNumber), "INV-2026", 4);
  const memo = `Sales order ${o.orderNumber}${o.customerPo ? ` · your PO ${o.customerPo}` : ""}`;
  const byAccount = new Map();
  for (const l of invLines) byAccount.set(l.accountNumber, (byAccount.get(l.accountNumber) || 0) + l.amountCents);
  const je = postJournal(S, ctx, { companyId: o.companyId, date, memo: `Invoice ${num} — ${cu.name} (${o.orderNumber})`, source: "AR", sourceType: "ArInvoice", reference: num, lines: [
    { accountNumber: GL.AR, debitCents: total, description: cu.name },
    ...[...byAccount.entries()].map(([accountNumber, creditCents]) => ({ accountNumber, creditCents, description: `Sales — ${o.orderNumber}` })),
    ...(tax ? [{ accountNumber: GL.GST_PAY, creditCents: tax, description: "GST collected" }] : []),
  ] });
  const inv = { id: ctx.id("ar"), companyId: o.companyId, customerId: cu.id, invoiceNumber: num, type: "INVOICE", invoiceDate: date, dueDate: addDays(date, cu.paymentTermsDays || 30), memo, subtotalCents: sub, taxCents: tax, totalCents: total, paidCents: 0, status: "SENT", journalEntryId: je.id, salesOrderId: o.id, postedAt: ctx.now, sentAt: ctx.now };
  S.arInvoices.push(inv);
  invLines.forEach((l) => S.arLines.push({ id: ctx.id("arl"), arInvoiceId: inv.id, ...l }));
  for (const { l, qty } of toBill) l.invoicedQuantity = (l.invoicedQuantity || 0) + qty;
  const fully = lines.every((l) => (l.invoicedQuantity || 0) >= l.quantity - 1e-9);
  return { inv, je, fully, nLines: toBill.length };
}

Object.assign(R, {
  /* ---- items & prices ---- */
  "inv.item.add"(S, p, ctx) {
    invNeedEditor(ctx);
    const c = byId(S.companies, p.companyId);
    if (!c) fail("Pick the company this item belongs to.");
    ctx.company(c.id);
    const f = invReadItem(p);
    if (S.items.some((i) => i.companyId === c.id && i.sku === f.sku)) fail(`SKU ${f.sku} already exists in ${c.displayName}.`);
    if (f.preferredVendorId && byId(S.vendors, f.preferredVendorId)?.companyId !== c.id) fail("That vendor belongs to a different company.");
    const item = { id: ctx.id("it"), companyId: c.id, ...f, isActive: true, createdAt: ctx.now };
    S.items.push(item);
    ctx.audit({ module: "inventory", action: "CREATE", companyId: c.id, entityType: "Item", entityId: item.id, summary: `${ctx.actor.displayName} added item ${f.sku} — ${f.name} (${f.type === "STOCK" ? "stock" : "service"}, cost ${money(f.costCents)}, price ${money(f.priceCents)}) to ${c.displayName}.` });
  },
  "inv.item.edit"(S, p, ctx) {
    invNeedEditor(ctx);
    const item = byId(S.items, p.itemId);
    if (!item) fail("That item no longer exists.");
    ctx.company(item.companyId);
    const f = invReadItem(p);
    if (f.sku !== item.sku && S.items.some((i) => i.companyId === item.companyId && i.sku === f.sku)) fail(`SKU ${f.sku} is already used by another item.`);
    if (f.type === "SERVICE" && item.type === "STOCK" && invOnHand(item.id, S) > 0) fail("This item still has stock on hand — adjust it to zero before making it a service.");
    if (f.preferredVendorId && byId(S.vendors, f.preferredVendorId)?.companyId !== item.companyId) fail("That vendor belongs to a different company.");
    const changed = Object.keys(f).filter((k) => (item[k] ?? undefined) !== (f[k] ?? undefined));
    const isActive = p.isActive !== false && p.isActive !== "";
    if (isActive !== (item.isActive !== false)) changed.push("isActive");
    Object.assign(item, f, { isActive });
    ctx.audit({ module: "inventory", action: "UPDATE", companyId: item.companyId, entityType: "Item", entityId: item.id, summary: `${ctx.actor.displayName} updated item ${f.sku} — ${f.name}${changed.length ? ` (${changed.join(", ")})` : " (no changes)"}.` });
  },
  "inv.price.set"(S, p, ctx) {
    invNeedEditor(ctx);
    const pl = byId(S.priceLists, p.priceListId), item = byId(S.items, p.itemId);
    if (!pl) fail("Pick a price list.");
    if (!item) fail("Pick an item.");
    ctx.company(pl.companyId);
    if (item.companyId !== pl.companyId) fail(`${item.name} belongs to a different company than the "${pl.name}" price list.`);
    const priceCents = Number(p.priceCents), minQuantity = Math.max(0, Number(p.minQuantity) || 0);
    if (!(priceCents > 0)) fail("Enter a price above zero.");
    let row = S.priceListItems.find((r) => r.priceListId === pl.id && r.itemId === item.id && r.minQuantity === minQuantity);
    if (row) row.priceCents = priceCents; else { row = { id: ctx.id("pli"), priceListId: pl.id, itemId: item.id, minQuantity, priceCents }; S.priceListItems.push(row); }
    ctx.audit({ module: "inventory", action: "UPDATE", companyId: pl.companyId, entityType: "PriceListItem", entityId: row.id, summary: `${ctx.actor.displayName} set ${item.name} to ${money(priceCents)} on "${pl.name}"${minQuantity > 0 ? ` from ${invQty(minQuantity)} ${item.unit}` : ""}.` });
  },
  "inv.price.remove"(S, p, ctx) {
    invNeedEditor(ctx);
    const i = S.priceListItems.findIndex((r) => r.id === p.priceListItemId);
    if (i < 0) fail("That price is already gone.");
    const row = S.priceListItems[i], pl = byId(S.priceLists, row.priceListId), item = byId(S.items, row.itemId);
    ctx.company(pl.companyId);
    S.priceListItems.splice(i, 1);
    ctx.audit({ module: "inventory", action: "DELETE", companyId: pl.companyId, entityType: "PriceListItem", entityId: row.id, summary: `${ctx.actor.displayName} removed ${item?.name || "an item"} (${money(row.priceCents)}${row.minQuantity > 0 ? ` from ${invQty(row.minQuantity)}` : ""}) from "${pl.name}".` });
  },

  /* ---- stock ---- */
  "inv.adjust"(S, p, ctx) {
    invNeedMover(ctx);
    const { item, wh } = invGuard(S, ctx, p.itemId, p.warehouseId);
    const qty = Number(p.qty), reason = String(p.reason || "").trim();
    if (!reason) fail("Say why the count changed (e.g. “Yard count — 3 damaged”).");
    if (!qty || !Number.isFinite(qty)) fail("Enter the quantity to add (+) or remove (−).");
    if (item.type !== "STOCK") fail(`${item.name} is a service — it has no stock to adjust.`);
    const lvl = invLvl(S, ctx, wh.id, item.id);
    if (lvl.onHand + qty < 0) fail(`Only ${invQty(lvl.onHand)} ${item.name} on hand — can't remove ${invQty(-qty)}.`);
    lvl.onHand += qty;
    const m = invMove(S, ctx, { companyId: wh.companyId, itemId: item.id, warehouseId: wh.id, type: "ADJUSTMENT", quantity: qty, unitCostCents: item.costCents, reference: reason, sourceType: "Adjustment" });
    ctx.audit({ module: "inventory", action: "UPDATE", companyId: wh.companyId, entityType: "StockMovement", entityId: m.id, summary: `${ctx.actor.displayName} adjusted ${item.name} at ${wh.name} by ${qty > 0 ? "+" : ""}${invQty(qty)} ${item.unit} — ${reason}.` });
  },
  "inv.transfer"(S, p, ctx) {
    invNeedMover(ctx);
    const { item, wh: from } = invGuard(S, ctx, p.itemId, p.fromWarehouseId);
    const to = byId(S.warehouses, p.toWarehouseId);
    if (!to) fail("Pick the warehouse to move to.");
    if (to.id === from.id) fail("Pick two different warehouses.");
    if (to.companyId !== from.companyId) fail("Stock can only move between warehouses of the same company.");
    const qty = Number(p.qty);
    if (!(qty > 0)) fail("Enter how many to move.");
    if (item.type !== "STOCK") fail(`${item.name} is a service — nothing to move.`);
    const a = invLvl(S, ctx, from.id, item.id);
    if (invAvail(a) < qty) fail(`Only ${invQty(invAvail(a))} ${item.name} available to move (on hand ${invQty(a.onHand)}, promised ${invQty(a.reserved)}).`);
    const b = invLvl(S, ctx, to.id, item.id);
    a.onHand -= qty; b.onHand += qty;
    const note = String(p.reference || "").trim();
    const m = invMove(S, ctx, { companyId: from.companyId, itemId: item.id, warehouseId: from.id, toWarehouseId: to.id, type: "TRANSFER", quantity: qty, unitCostCents: item.costCents, reference: note || undefined, sourceType: "Transfer" });
    ctx.audit({ module: "inventory", action: "UPDATE", companyId: from.companyId, entityType: "StockMovement", entityId: m.id, summary: `${ctx.actor.displayName} moved ${invQty(qty)} ${item.unit} of ${item.name} from ${from.name} to ${to.name}${note ? ` — ${note}` : ""}.` });
  },
  "inv.reorder.po"(S, p, ctx) {
    ctx.need("procurement.create");
    const item = byId(S.items, p.itemId);
    if (!item) fail("That item no longer exists.");
    ctx.company(item.companyId);
    if (!item.preferredVendorId) fail(`${item.name} has no preferred vendor — set one on the item first, then create the PO.`);
    const vendor = byId(S.vendors, item.preferredVendorId);
    if (!vendor || vendor.companyId !== item.companyId) fail(`The preferred vendor for ${item.name} is no longer available — pick another on the item.`);
    const available = invAvailable(item.id, S);
    const qty = item.reorderQuantity > 0 ? item.reorderQuantity : Math.max(1, item.reorderPoint - available);
    if (!(item.costCents > 0)) fail(`${item.name} has no cost set — add a cost on the item so the PO has a price.`);
    const open = invOpenPoFor(item, S);
    if (open) fail(`${open.poNumber} is already open for ${item.name} — receive or cancel it before ordering more.`);
    const subtotal = Math.round(qty * item.costCents), tax = Math.round(subtotal * 0.05);
    const poNumber = nextNum(S.purchaseOrders.map((r) => r.poNumber), "PO-2026", 4);
    const po = { id: ctx.id("po"), companyId: item.companyId, poNumber, vendorId: vendor.id, vendorName: vendor.name, requesterName: ctx.actor.displayName, createdByName: ctx.actor.displayName, orderDate: ctx.now.slice(0, 10), terms: `Net ${vendor.paymentTermsDays || 30}`, description: `${item.name} (${item.sku}) × ${invQty(qty)} ${item.unit} — reorder`, subtotalCents: subtotal, taxCents: tax, totalCents: subtotal + tax, amountCents: subtotal + tax, status: "DRAFT", notes: `Reorder from stock alert: ${item.sku} available ${invQty(available)} ${item.unit}, reorder point ${invQty(item.reorderPoint)}.`, createdAt: ctx.now };
    S.purchaseOrders.push(po);
    S.purchaseOrderLines.push({ id: ctx.id("pol"), purchaseOrderId: po.id, description: `${item.name} (${item.sku})`, accountNumber: item.expenseAccountNumber || "5205", quantity: qty, unitCents: item.costCents, taxCents: tax, amountCents: subtotal, receivedQuantity: 0 });
    ctx.audit({ module: "procurement", action: "CREATE", companyId: item.companyId, entityType: "PurchaseOrder", entityId: po.id, summary: `${ctx.actor.displayName} created draft ${poNumber} for ${vendor.name} from a reorder alert: ${invQty(qty)} ${item.unit} of ${item.name} at ${money(item.costCents)} (${money(subtotal + tax)} with GST).` });
  },
  "inv.po.send"(S, p, ctx) {
    ctx.need("procurement.create");
    const po = byId(S.purchaseOrders, p.poId);
    if (!po || po.status !== "DRAFT") fail("Only draft purchase orders can be sent to the supplier.");
    ctx.company(po.companyId);
    Object.assign(po, { status: "SENT", sentAt: ctx.now, sentByName: ctx.actor.displayName });
    ctx.audit({ module: "procurement", action: "STATUS_CHANGE", companyId: po.companyId, entityType: "PurchaseOrder", entityId: po.id, summary: `${ctx.actor.displayName} sent ${po.poNumber} to ${po.vendorName || "the supplier"} (${money(po.amountCents)}).` });
  },

  /* ---- sales orders ---- */
  "so.create"(S, p, ctx) {
    ctx.need("ar.create");
    const cu = byId(S.customers, p.customerId);
    if (!cu) fail("Pick a customer.");
    ctx.company(cu.companyId);
    if (cu.status === "ON_HOLD") fail(`${cu.name} is on credit hold — no new orders until that is cleared.`);
    const wh = p.warehouseId ? byId(S.warehouses, p.warehouseId) : null;
    if (p.warehouseId && (!wh || wh.companyId !== cu.companyId)) fail("That warehouse belongs to a different company than the customer.");
    const withGst = p.gst !== false && p.gst !== "" && p.gst !== "off";
    const lines = [];
    (p.lines || []).slice(0, 6).forEach((raw, i) => {
      const itemId = String(raw.itemId || "").trim(), qty = Number(raw.qty) || 0;
      if (!itemId && !qty) return;
      if (!itemId) fail(`Line ${i + 1}: pick an item.`);
      const item = byId(S.items, itemId);
      if (!item || item.companyId !== cu.companyId) fail(`Line ${i + 1}: that item isn't sold by ${cu.name}'s company.`);
      if (item.isActive === false) fail(`Line ${i + 1}: ${item.name} is inactive.`);
      if (!(qty > 0)) fail(`Line ${i + 1}: enter a quantity for ${item.name}.`);
      const unitCents = raw.unitCents != null && raw.unitCents !== "" ? Number(raw.unitCents) : invPriceFor(cu.id, item.id, qty, S).priceCents;
      if (!(unitCents >= 0)) fail(`Line ${i + 1}: price can't be negative.`);
      const amountCents = Math.round(qty * unitCents);
      lines.push({ itemId: item.id, description: item.name, quantity: qty, unitCents, amountCents, taxCents: withGst ? Math.round(amountCents * 0.05) : 0, shippedQuantity: 0, invoicedQuantity: 0, sortOrder: lines.length, isStock: item.type === "STOCK" });
    });
    if (!lines.length) fail("Add at least one line.");
    if (lines.some((l) => l.isStock) && !wh) fail("Pick the warehouse the stock items will ship from.");
    const subtotal = lines.reduce((s, l) => s + l.amountCents, 0), tax = lines.reduce((s, l) => s + l.taxCents, 0);
    const orderNumber = nextNum(S.salesOrders.map((o) => o.orderNumber), "SO-2026", 4);
    const o = { id: ctx.id("so"), companyId: cu.companyId, orderNumber, customerId: cu.id, warehouseId: wh?.id, orderDate: ctx.now.slice(0, 10), requiredDate: p.requiredDate || undefined, customerPo: String(p.customerPo || "").trim() || undefined, notes: String(p.notes || "").trim() || undefined, status: "DRAFT", subtotalCents: subtotal, taxCents: tax, totalCents: subtotal + tax, createdByName: ctx.actor.displayName, createdAt: ctx.now };
    S.salesOrders.push(o);
    lines.forEach(({ isStock, ...l }) => S.salesOrderLines.push({ id: ctx.id("sol"), salesOrderId: o.id, ...l }));
    const pl = cu.priceListId ? byId(S.priceLists, cu.priceListId) : null;
    ctx.audit({ module: "sales", action: "CREATE", companyId: cu.companyId, entityType: "SalesOrder", entityId: o.id, summary: `${ctx.actor.displayName} created sales order ${orderNumber} for ${cu.name}: ${lines.length} line${lines.length === 1 ? "" : "s"}, ${money(subtotal + tax)}${pl ? ` (priced from "${pl.name}")` : ""}.` });
  },
  "so.confirm"(S, p, ctx) {
    ctx.need("ar.create");
    const o = byId(S.salesOrders, p.orderId);
    if (!o) fail("That order no longer exists.");
    ctx.company(o.companyId);
    if (o.status !== "DRAFT") fail(`${o.orderNumber} is already ${invLabel(o.status).toLowerCase()} — only drafts can be confirmed.`);
    const lines = S.salesOrderLines.filter((l) => l.salesOrderId === o.id).map((l) => ({ l, item: byId(S.items, l.itemId) })).filter((x) => x.item?.type === "STOCK");
    if (lines.length && !o.warehouseId) fail("Pick a warehouse before confirming — the stock lines need somewhere to ship from.");
    for (const { l, item } of lines) {
      const lvl = invLvl(S, ctx, o.warehouseId, item.id);
      if (invAvail(lvl) < l.quantity) fail(`Can't confirm ${o.orderNumber}: only ${invQty(invAvail(lvl))} ${item.unit} of ${item.name} available (on hand ${invQty(lvl.onHand)}, already promised ${invQty(lvl.reserved)}) — need ${invQty(l.quantity)}.`);
    }
    for (const { l, item } of lines) invLvl(S, ctx, o.warehouseId, item.id).reserved += l.quantity;
    o.status = "CONFIRMED"; o.confirmedAt = ctx.now;
    const wh = byId(S.warehouses, o.warehouseId);
    ctx.audit({ module: "sales", action: "STATUS_CHANGE", companyId: o.companyId, entityType: "SalesOrder", entityId: o.id, summary: `${ctx.actor.displayName} confirmed ${o.orderNumber} for ${byId(S.customers, o.customerId)?.name} and reserved ${lines.length} stock line${lines.length === 1 ? "" : "s"}${wh ? ` at ${wh.name}` : ""}.` });
  },
  "so.ship"(S, p, ctx) {
    ctx.need("ar.create");
    const o = byId(S.salesOrders, p.orderId);
    if (!o) fail("That order no longer exists.");
    ctx.company(o.companyId);
    if (!["CONFIRMED", "PARTIALLY_SHIPPED"].includes(o.status)) fail(`${o.orderNumber} must be confirmed before it can ship.`);
    const wh = byId(S.warehouses, o.warehouseId);
    if (!wh) fail("Pick a warehouse before shipping.");
    const lines = S.salesOrderLines.filter((l) => l.salesOrderId === o.id);
    const picks = [];
    for (const l of lines) {
      const qty = Number((p.picks || []).find((x) => x.lineId === l.id)?.qty || 0), remaining = l.quantity - l.shippedQuantity;
      if (!(qty > 0)) continue;
      if (qty > remaining + 1e-9) fail(`${l.description}: only ${invQty(remaining)} left to ship, you entered ${invQty(qty)}.`);
      picks.push({ l, qty });
    }
    if (!picks.length) fail("Enter a quantity on at least one line to ship.");
    const shipDate = p.shipDate || ctx.now.slice(0, 10);
    for (const { l, qty } of picks) {
      const item = byId(S.items, l.itemId);
      if (item?.type !== "STOCK") continue;
      const lvl = invLvl(S, ctx, wh.id, item.id);
      if (lvl.onHand < qty) fail(`Couldn't ship ${o.orderNumber}: only ${invQty(lvl.onHand)} ${item.name} on hand — can't ship ${invQty(qty)}.`);
    }
    const shipmentNumber = nextNum(S.shipments.map((s) => s.shipmentNumber), "SH-2026", 4);
    const sh = { id: ctx.id("shp"), salesOrderId: o.id, shipmentNumber, warehouseId: wh.id, shipDate, carrier: String(p.carrier || "").trim() || undefined, trackingNumber: String(p.trackingNumber || "").trim() || undefined, shippedByName: ctx.actor.displayName, createdAt: ctx.now };
    S.shipments.push(sh);
    for (const { l, qty } of picks) {
      S.shipmentLines.push({ id: ctx.id("shl"), shipmentId: sh.id, soLineId: l.id, quantity: qty });
      const item = byId(S.items, l.itemId);
      if (item?.type === "STOCK") {
        const lvl = invLvl(S, ctx, wh.id, item.id);
        lvl.onHand -= qty; lvl.reserved -= Math.min(lvl.reserved, qty);
        invMove(S, ctx, { companyId: o.companyId, itemId: item.id, warehouseId: wh.id, type: "SHIPMENT", quantity: qty, unitCostCents: item.costCents, date: shipDate, reference: `${o.orderNumber} · ${shipmentNumber}`, sourceType: "Shipment", sourceId: sh.id });
      }
      l.shippedQuantity += qty;
    }
    const all = lines.every((l) => l.shippedQuantity >= l.quantity - 1e-9);
    o.status = all ? "SHIPPED" : "PARTIALLY_SHIPPED";
    ctx.audit({ module: "sales", action: "CREATE", companyId: o.companyId, entityType: "Shipment", entityId: sh.id, summary: `${ctx.actor.displayName} shipped ${shipmentNumber} for ${o.orderNumber} (${byId(S.customers, o.customerId)?.name}): ${picks.map((x) => `${invQty(x.qty)} × ${x.l.description}`).join(", ")}${sh.carrier ? ` via ${sh.carrier}` : ""}. Order is now ${all ? "fully shipped" : "partly shipped"}.` });
  },
  "so.invoice"(S, p, ctx) {
    ctx.need("ar.create");
    const o = byId(S.salesOrders, p.orderId);
    if (!o) fail("That order no longer exists.");
    ctx.company(o.companyId);
    if (["DRAFT", "CANCELLED"].includes(o.status)) fail(`${o.orderNumber} hasn't shipped anything yet — confirm and ship it first.`);
    const { inv, je, fully } = invArInvoiceFromOrder(S, ctx, o);
    o.arInvoiceId = inv.id;
    if (fully) o.status = "INVOICED";
    ctx.audit({ module: "finance.ar", action: "CREATE", companyId: o.companyId, entityType: "ArInvoice", entityId: inv.id, summary: `${ctx.actor.displayName} invoiced ${byId(S.customers, o.customerId)?.name} ${money(inv.totalCents)} (${inv.invoiceNumber}) from ${o.orderNumber} and posted ${je.entryNumber}.${fully ? " The order is fully invoiced." : ""}` });
  },
  "so.cancel"(S, p, ctx) {
    ctx.need("ar.create");
    const o = byId(S.salesOrders, p.orderId);
    if (!o) fail("That order no longer exists.");
    ctx.company(o.companyId);
    if (!["DRAFT", "CONFIRMED"].includes(o.status)) fail(`${o.orderNumber} has shipments against it — it can't be cancelled, only closed once invoiced.`);
    if (o.status === "CONFIRMED" && o.warehouseId) for (const l of S.salesOrderLines.filter((x) => x.salesOrderId === o.id)) {
      const item = byId(S.items, l.itemId);
      if (item?.type !== "STOCK") continue;
      const lvl = S.stockLevels.find((x) => x.warehouseId === o.warehouseId && x.itemId === item.id);
      if (lvl) lvl.reserved -= Math.min(lvl.reserved, l.quantity - l.shippedQuantity);
    }
    const was = o.status;
    o.status = "CANCELLED"; o.cancelledAt = ctx.now;
    ctx.audit({ module: "sales", action: "STATUS_CHANGE", companyId: o.companyId, entityType: "SalesOrder", entityId: o.id, summary: `${ctx.actor.displayName} cancelled ${o.orderNumber} for ${byId(S.customers, o.customerId)?.name}${was === "CONFIRMED" ? " and released its reserved stock" : ""}.` });
  },

  /* ---- 3-way match ---- */
  "match.run"(S, p, ctx) {
    ctx.need("ap.approve");
    const bills = p.billId ? [byId(S.apInvoices, p.billId)].filter(Boolean) : S.apInvoices.filter((b) => b.purchaseOrderId && b.status !== "CANCELLED" && canSee(ctx.auth, b.companyId));
    if (p.billId && !bills.length) fail("That bill no longer exists.");
    let matched = 0, variance = 0, skipped = 0; const changes = []; let last = null;
    for (const b of bills) {
      ctx.company(b.companyId);
      const po = byId(S.purchaseOrders, b.purchaseOrderId);
      if (!po) { skipped++; continue; }
      if (!p.billId && invMatchAccepted(b)) { matched++; continue; } // an accepted variance stays accepted on a bulk run
      const r = invComputeMatch(po, invPoLines(po.id, S), b, S.apLines.filter((l) => l.apInvoiceId === b.id));
      if (b.matchStatus !== r.status) changes.push(`${b.invoiceNumber} → ${r.status === "MATCHED" ? "matched" : "variance"}`);
      Object.assign(b, { matchStatus: r.status, matchNote: r.note, matchedAt: ctx.now, matchType: b.matchType || "THREE_WAY" });
      if (r.status === "MATCHED") matched++; else variance++;
      last = { b, po, r };
      ctx.audit({ module: "procurement", action: "UPDATE", companyId: b.companyId, entityType: "ApInvoice", entityId: b.id, summary: `${ctx.actor.displayName} ran the 3-way match on ${vendorName(b.vendorId)} bill ${b.invoiceNumber} against ${po.poNumber}: ${r.status === "MATCHED" ? "matched" : "variance"} (billed ${money(r.billedCents)} vs received ${money(r.receivedCents)}). ${r.note}` });
    }
    if (p.billId) { if (!last) fail(`${bills[0].invoiceNumber} has no purchase order to match against.`); return; }
    ctx.audit({ module: "procurement", action: "UPDATE", companyId: ctx.auth.activeCompanyId || undefined, summary: `${ctx.actor.displayName} ran the 3-way match on ${bills.length} bill${bills.length === 1 ? "" : "s"}: ${matched} matched, ${variance} with a variance${skipped ? `, ${skipped} skipped (no PO)` : ""}.${changes.length ? ` Changed: ${changes.join(", ")}.` : " Nothing changed."}` });
  },
  "match.accept"(S, p, ctx) {
    ctx.need("ap.approve");
    const b = byId(S.apInvoices, p.billId);
    if (!b) fail("That bill no longer exists.");
    ctx.company(b.companyId);
    const po = byId(S.purchaseOrders, b.purchaseOrderId);
    if (!po) fail(`${b.invoiceNumber} has no purchase order — nothing to accept.`);
    if (b.matchStatus !== "VARIANCE") fail(`${b.invoiceNumber} isn't showing a variance — run the match first.`);
    const reason = String(p.reason || "").trim();
    if (reason.length < 5) fail("Say why the difference is acceptable (a few words, e.g. “Back-order agreed with vendor, bill in full”).");
    const r = invComputeMatch(po, invPoLines(po.id, S), b, S.apLines.filter((l) => l.apInvoiceId === b.id));
    Object.assign(b, { matchStatus: "MATCHED", matchNote: `Variance accepted by ${ctx.actor.displayName}: ${reason} (was: ${r.note.replace(/\.$/, "")}; difference ${money(Math.abs(r.diffCents))}).`, matchedAt: ctx.now });
    ctx.audit({ module: "procurement", action: "APPROVE", companyId: b.companyId, entityType: "ApInvoice", entityId: b.id, summary: `${ctx.actor.displayName} accepted the ${money(Math.abs(r.diffCents))} 3-way match variance on ${vendorName(b.vendorId)} bill ${b.invoiceNumber} (${po.poNumber}): ${reason}` });
  },
});

/* ---- receiving a PO that has lines: book the goods receipt and put SKU lines into stock ---- */
const invReceiveBase = R["po.receive"];
R["po.receive"] = function (S, p, ctx) {
  const po = byId(S.purchaseOrders, p.poId);
  const lines = po ? invPoLines(po.id, S) : [];
  if (po && po.status === "PARTIALLY_RECEIVED" && lines.length) {
    ctx.need("procurement.receive"); ctx.company(po.companyId);
    Object.assign(po, { status: "RECEIVED", receivedAt: ctx.now, receivedByName: ctx.actor.displayName });
    ctx.audit({ module: "procurement", action: "RECEIVE", companyId: po.companyId, summary: `${ctx.actor.displayName} received the rest of ${po.poNumber}.` });
  } else invReceiveBase(S, p, ctx);
  if (!po || !lines.length) return;
  const open = lines.filter((l) => l.quantity - (l.receivedQuantity || 0) > 1e-9);
  if (!open.length) return;
  const date = ctx.now.slice(0, 10);
  const gr = { id: ctx.id("gr"), purchaseOrderId: po.id, receiptNumber: nextNum(S.goodsReceipts.map((g) => g.receiptNumber), "GR-2026", 4), receivedDate: date, receivedByName: ctx.actor.displayName, createdAt: ctx.now };
  S.goodsReceipts.push(gr);
  const wh = S.warehouses.find((w) => w.companyId === po.companyId && w.isActive !== false);
  const stocked = [];
  for (const l of open) {
    const qty = l.quantity - (l.receivedQuantity || 0);
    S.goodsReceiptLines.push({ id: ctx.id("grl"), goodsReceiptId: gr.id, poLineId: l.id, quantityReceived: qty });
    l.receivedQuantity = l.quantity;
    const sku = invSkuOf(l.description);
    const item = sku ? S.items.find((i) => i.companyId === po.companyId && i.sku === sku && i.type === "STOCK") : null;
    if (item && wh) {
      invLvl(S, ctx, wh.id, item.id).onHand += qty;
      invMove(S, ctx, { companyId: po.companyId, itemId: item.id, warehouseId: wh.id, type: "RECEIPT", quantity: qty, unitCostCents: l.unitCents, date, reference: `${po.poNumber} · ${gr.receiptNumber}`, sourceType: "GoodsReceipt", sourceId: gr.id });
      stocked.push(`${invQty(qty)} ${item.unit} of ${item.name}`);
    }
  }
  if (stocked.length) ctx.audit({ module: "inventory", action: "UPDATE", companyId: po.companyId, entityType: "GoodsReceipt", entityId: gr.id, summary: `${ctx.actor.displayName} received ${po.poNumber} (${gr.receiptNumber}) and put ${stocked.join(", ")} into ${wh.name}.` });
};

/* ==========================================================================
   Views
   ========================================================================== */
const invItemSelect = (id, name, items, sel, withCo = true) => `<select class="in" id="${id}" name="${name}" required>${opt("", "Item…", !sel)}${items.map((i) => opt(i.id, `${withCo ? co(i.companyId)?.code + " · " : ""}${i.sku} — ${i.name}`, i.id === sel)).join("")}</select>`;
const invWhSelect = (id, name, whs, sel, placeholder = "Warehouse…") => `<select class="in" id="${id}" name="${name}" required>${opt("", placeholder, !sel)}${whs.map((w) => opt(w.id, `${co(w.companyId)?.code} · ${w.code} — ${w.name}`, w.id === sel)).join("")}</select>`;
const invMoveQty = (m) => { const signed = m.type === "SHIPMENT" ? -m.quantity : m.quantity; return m.type === "TRANSFER" ? `<span class="num">${invQty(m.quantity)}</span>` : `<span class="num ${signed < 0 ? "inv-neg" : "inv-pos"}"><strong>${signed > 0 ? "+" : "−"}${invQty(Math.abs(signed))}</strong></span>`; };
const invMoveRows = (list, withItem = true) => list.map((m) => { const it = byId(S.items, m.itemId), w = byId(S.warehouses, m.warehouseId), tw = m.toWarehouseId ? byId(S.warehouses, m.toWarehouseId) : null; return `<tr><td class="mono" style="white-space:nowrap">${dLong(m.date)}</td><td>${invBadge(m.type)}</td>${withItem ? `<td><span class="inv-nm">${invSq(m.companyId)}${goLink(`/inventory/items/${it?.id}`, it?.name || "—")}</span> <span class="hint mono">${esc(it?.sku || "")}</span></td>` : ""}<td class="mono">${esc(w?.code || "—")}${tw ? ` → ${esc(tw.code)}` : ""}</td>${td(`${invMoveQty(m)} ${esc(it?.unit || "")}`, 1)}${td(money(Math.round(Math.abs(m.quantity) * (m.unitCostCents || 0))), 1)}<td>${esc(m.reference || "—")}</td><td class="hint">${esc(m.byName || "—")}</td></tr>`; });

function invItemForm(item, vendors, companies) {
  const v = item || {}, cur = (k, d = "") => esc(v[k] ?? d);
  const cents = (k) => (v[k] != null ? (v[k] / 100).toFixed(2) : "");
  return `<form data-f="${item ? "invItemEdit" : "invItem"}" data-id="${esc(v.id || "")}" class="form-grid">
    ${item ? "" : `<div class="fld"><label for="iiCo">Company</label><select class="in" id="iiCo" name="companyId" required>${companies.map((c) => opt(c.id, c.displayName, c.id === defCo())).join("")}</select></div>`}
    <div class="fld"><label for="iiSku">SKU</label><input class="in mono" id="iiSku" name="sku" value="${cur("sku")}" placeholder="e.g. FISH-COD" required></div>
    <div class="fld" style="grid-column:span 2"><label for="iiName">Name</label><input class="in" id="iiName" name="name" value="${cur("name")}" placeholder="What it is, as customers see it" required></div>
    <div class="fld"><label for="iiType">Kind</label><select class="in" id="iiType" name="type">${opt("STOCK", "Stock (counted in a warehouse)", v.type !== "SERVICE")}${opt("SERVICE", "Service (never stocked)", v.type === "SERVICE")}</select></div>
    <div class="fld"><label for="iiUnit">Unit</label><input class="in" id="iiUnit" name="unit" value="${cur("unit", "ea")}" placeholder="ea, kg, L, m³, night…"></div>
    <div class="fld"><label for="iiCost">Cost (each)</label><input class="in num" id="iiCost" name="cost" inputmode="decimal" value="${cents("costCents")}" placeholder="0.00"></div>
    <div class="fld"><label for="iiPrice">List price (each)</label><input class="in num" id="iiPrice" name="price" inputmode="decimal" value="${cents("priceCents")}" placeholder="0.00"></div>
    <div class="fld"><label for="iiRp">Reorder when available ≤</label><input class="in num" id="iiRp" name="reorderPoint" type="number" step="any" min="0" value="${cur("reorderPoint", "")}" placeholder="0"></div>
    <div class="fld"><label for="iiRq">Reorder quantity</label><input class="in num" id="iiRq" name="reorderQuantity" type="number" step="any" min="0" value="${cur("reorderQuantity", "")}" placeholder="0"></div>
    <div class="fld"><label for="iiVen">Preferred vendor</label><select class="in" id="iiVen" name="preferredVendorId">${opt("", "None", !v.preferredVendorId)}${vendors.map((x) => opt(x.id, `${item ? "" : co(x.companyId)?.code + " · "}${x.name}`, x.id === v.preferredVendorId)).join("")}</select></div>
    <div class="fld"><label for="iiRev">Revenue account</label><input class="in mono" id="iiRev" name="revenueAccountNumber" value="${cur("revenueAccountNumber", "4000")}"></div>
    <div class="fld"><label for="iiExp">Expense account</label><input class="in mono" id="iiExp" name="expenseAccountNumber" value="${cur("expenseAccountNumber", "5205")}"></div>
    ${item ? `<label class="form-row" style="grid-column:1/-1;font-size:13px;gap:8px"><input type="checkbox" name="isActive" value="1" ${v.isActive !== false ? "checked" : ""}> Active — can be put on new orders</label>` : ""}
    <div class="form-row" style="grid-column:1/-1"><button class="btn pri">${item ? "Save changes" : "Save item"}</button>${item ? "" : `<button type="button" class="btn" data-a="invAddToggle">Cancel</button>`}<span class="hint">Stock items sit in a warehouse and are counted; services (lodge nights, tree planting) are sold but never stocked.</span></div></form>`;
}

function vInvItems() {
  const items = inScope(S.items).sort((a, b) => co(a.companyId).displayName.localeCompare(co(b.companyId).displayName) || a.sku.localeCompare(b.sku));
  const stockItems = items.filter((i) => i.type === "STOCK");
  const stockValue = stockItems.reduce((s, i) => s + Math.round(invOnHand(i.id) * i.costCents), 0);
  const below = stockItems.filter((i) => i.reorderPoint > 0 && invAvailable(i.id) <= i.reorderPoint).length;
  const lists = inScope(S.priceLists).sort((a, b) => a.name.localeCompare(b.name));
  const onList = lists.reduce((s, pl) => s + S.customers.filter((c) => c.priceListId === pl.id).length, 0);
  const canEdit = invCanEdit(), showAdd = canEdit && !!UI.filters.invAdd;
  const vendors = inScope(S.vendors).filter((v) => v.status !== "INACTIVE").sort((a, b) => a.name.localeCompare(b.name));
  const companies = S.companies.filter((c) => canSee(A, c.id) && (!A.activeCompanyId || c.id === A.activeCompanyId));
  const groups = new Map();
  for (const it of items) { if (!groups.has(it.companyId)) groups.set(it.companyId, []); groups.get(it.companyId).push(it); }
  const acts = `${dlButton("stock-on-hand", "Stock list", { variant: "outline" })}${canEdit && !showAdd ? `<button class="btn pri" data-a="invAddToggle">+ Add item</button>` : ""}`;
  return ph("Items & Prices", "What each company sells and stocks — one record per SKU with its cost, selling price and reorder point. Price lists give customers their own prices and quantity breaks.", acts) + flashHtml()
    + `<div class="stats">${stat("Items", String(items.length), `${stockItems.length} stocked · ${items.length - stockItems.length} services`)}${stat("Stock value at cost", money(stockValue), "Across every warehouse in view", "primary")}${stat("Below reorder point", String(below), below ? "See Stock on Hand for suggested orders" : "Nothing needs reordering", below ? "warn" : "good")}${stat("Price lists", String(lists.length), `${onList} customer${onList === 1 ? "" : "s"} on a list`)}</div>`
    + (showAdd ? card("Add an item", invItemForm(null, vendors, companies), "", "inv-add") : "")
    + `<div class="inv-search"><input class="in" data-filter="invItemsTbl" placeholder="Search by SKU or name…" aria-label="Search items"><span class="hint" style="margin-left:auto">${items.length} item${items.length === 1 ? "" : "s"} · typing filters the lists below</span></div>`
    + `<div id="invItemsTbl">${[...groups.entries()].map(([cid, rows]) => `<div class="sect-l">${coTag(cid)} · ${rows.length} item${rows.length === 1 ? "" : "s"}</div>` + cardFlush("", table(["SKU", "Item", "Kind", "Unit", ">Cost", ">List price", ">Reorder at", "Preferred vendor", ">On hand", ""], rows.map((it) => {
      const onHand = invOnHand(it.id), avail = invAvailable(it.id), low = it.type === "STOCK" && it.reorderPoint > 0 && avail <= it.reorderPoint;
      return `<tr class="click" data-go="/inventory/items/${it.id}" ${it.isActive === false ? 'style="opacity:.6"' : ""}><td class="mono"><strong>${esc(it.sku)}</strong></td><td>${esc(it.name)}${it.isActive === false ? ` <span class="badge tone-grey">inactive</span>` : ""}</td><td>${invBadge(it.type)}</td><td class="hint">${esc(it.unit)}</td>${td(money(it.costCents), 1)}${td(it.priceCents ? money(it.priceCents) : `<span class="hint">—</span>`, 1)}${td(it.type === "STOCK" && it.reorderPoint > 0 ? invQty(it.reorderPoint) : `<span class="hint">—</span>`, 1)}<td>${it.preferredVendorId ? esc(vendorName(it.preferredVendorId)) : `<span class="hint">—</span>`}</td>${td(it.type === "STOCK" ? `<span class="${low ? "inv-warn" : ""}">${invQty(onHand)}${low ? ` <small>↓ reorder</small>` : ""}</span>` : `<span class="hint">n/a</span>`, 1)}<td class="r"><button class="lnk" data-go="/inventory/items/${it.id}">${canEdit ? "Edit" : "Open"}</button></td></tr>`;
    }), "No items in this view yet."))).join("") || empty("No items in this view yet.")}</div>`
    + `<div class="sect-l">Price lists</div><p class="hint" style="margin:-4px 0 10px">A customer on a price list pays these prices instead of the list price. Add a row with a minimum quantity to give a volume break.</p>`
    + `<div class="grid g2">${lists.map((pl) => { const rows = S.priceListItems.filter((r) => r.priceListId === pl.id).map((r) => ({ r, item: byId(S.items, r.itemId) })).filter((x) => x.item).sort((a, b) => a.item.sku.localeCompare(b.item.sku) || a.r.minQuantity - b.r.minQuantity); const cus = S.customers.filter((c) => c.priceListId === pl.id); return cardFlush(`${invSq(pl.companyId)}${esc(pl.name)}${pl.isDefault ? ` <span class="badge tone-teal">default for ${esc(co(pl.companyId).displayName)}</span>` : ""}<div class="hint" style="font-weight:400">${pl.notes ? esc(pl.notes) + " · " : ""}${cus.length ? `Used by ${esc(cus.map((c) => c.name).join(", "))}` : "No customer is on this list yet"}</div>`, rows.length ? table(["Item", ">From qty", ">Price", ">vs list", ...(canEdit ? [""] : [])], rows.map(({ r, item }) => { const delta = item.priceCents ? Math.round(((r.priceCents - item.priceCents) / item.priceCents) * 100) : null; return `<tr><td><span class="hint mono">${esc(item.sku)}</span> ${esc(item.name)}</td>${td(r.minQuantity > 0 ? `${invQty(r.minQuantity)}+ ${esc(item.unit)}` : "any", 1)}${td(`<strong>${money(r.priceCents)}</strong>`, 1)}${td(delta == null ? `<span class="hint">—</span>` : delta === 0 ? `<span class="hint">same</span>` : `<span class="${delta < 0 ? "inv-pos" : "inv-warn"}">${delta > 0 ? "+" : ""}${delta}%</span>`, 1)}${canEdit ? `<td class="r"><button class="lnk" style="color:var(--t-red)" data-a="invPriceRemove" data-id="${r.id}">Remove</button></td>` : ""}</tr>`; })) : `<p class="hint" style="padding:0 16px 14px">No prices set yet — every item falls back to its list price.</p>`, `<span class="hint">${esc(pl.currency || "CAD")}</span>`); }).join("") || empty("No price lists in this view.")}</div>`
    + (canEdit && lists.length ? card("Set a price", `<p class="hint" style="margin:0 0 10px">Leave “from quantity” at 0 for the everyday price; use 1000 (for example) for a volume break. Setting the same item and quantity again replaces the price.</p><form data-f="invPrice" class="form-grid"><div class="fld"><label for="ipPl">Price list</label><select class="in" id="ipPl" name="priceListId" required>${opt("", "Price list…", true)}${lists.map((p) => opt(p.id, `${co(p.companyId).code} · ${p.name}`)).join("")}</select></div><div class="fld" style="grid-column:span 2"><label for="ipIt">Item</label>${invItemSelect("ipIt", "itemId", items.filter((i) => i.isActive !== false), "")}</div><div class="fld"><label for="ipMq">From quantity</label><input class="in num" id="ipMq" name="minQuantity" type="number" step="any" min="0" placeholder="0"></div><div class="fld"><label for="ipPr">Price</label><input class="in num" id="ipPr" name="price" inputmode="decimal" placeholder="0.00" required></div><div class="form-row" style="align-items:flex-end"><button class="btn pri">Set price</button></div></form>`, "", "inv-soft") : "");
}

function vInvItem(q, id) {
  const item = byId(S.items, id);
  if (!item || !inView(S, A, item.companyId)) return ph("Item not found", "") + card("", `<button class="btn" data-go="/inventory/items">Back to Items & Prices</button>`);
  const canEdit = invCanEdit();
  const vendors = S.vendors.filter((v) => v.companyId === item.companyId).sort((a, b) => a.name.localeCompare(b.name));
  const lists = S.priceLists.filter((p) => p.companyId === item.companyId).sort((a, b) => a.name.localeCompare(b.name));
  const whs = S.warehouses.filter((w) => w.companyId === item.companyId && w.isActive !== false).sort((a, b) => a.code.localeCompare(b.code));
  const onHand = invOnHand(item.id), reserved = invLevelsOf(item.id).reduce((s, l) => s + l.reserved, 0), available = onHand - reserved;
  const low = item.type === "STOCK" && item.reorderPoint > 0 && available <= item.reorderPoint;
  const vendor = item.preferredVendorId ? byId(S.vendors, item.preferredVendorId) : null;
  const prices = S.priceListItems.filter((r) => r.itemId === item.id).map((r) => ({ r, pl: byId(S.priceLists, r.priceListId) })).filter((x) => x.pl).sort((a, b) => a.pl.name.localeCompare(b.pl.name) || a.r.minQuantity - b.r.minQuantity);
  const moves = invSortMoves(S.stockMovements.filter((m) => m.itemId === item.id)).slice(0, 20);
  const isStock = item.type === "STOCK";
  return ph(`${item.sku} — ${item.name}`, `${co(item.companyId).displayName} · ${isStock ? "stock item" : "service"} · sold per ${item.unit}`, invBadge(item.type) + (item.isActive === false ? invBadge("INACTIVE") : ""), crumb("/inventory/items", "All items")) + flashHtml()
    + `<div class="stats">${stat("On hand", isStock ? `${invQty(onHand)} ${item.unit}` : "n/a", isStock ? `${invQty(reserved)} promised to orders · ${invQty(available)} free` : "Services are never stocked")}${stat("Value at cost", money(Math.round(onHand * item.costCents)), `${money(item.costCents)} per ${item.unit}`, "primary")}${stat("List price", item.priceCents ? money(item.priceCents) : "—", prices.length ? `${prices.length} price-list price${prices.length === 1 ? "" : "s"}` : "No price-list overrides")}${stat("Reorder", isStock && item.reorderPoint > 0 ? `at ${invQty(item.reorderPoint)}` : "not set", low ? `Below point — suggest ordering ${invQty(item.reorderQuantity)} ${item.unit}${vendor ? ` from ${vendor.name}` : ""}` : item.reorderQuantity ? `Order ${invQty(item.reorderQuantity)} ${item.unit} at a time` : "", low ? "warn" : "")}</div>`
    + `<div class="grid g2">${card(`${invSq(item.companyId)}Item details`, (canEdit ? "" : `<p class="hint" style="margin:0 0 10px">You can view this item but not change it.</p>`) + (canEdit ? invItemForm(item, vendors, []) : `<dl class="kv"><dt>SKU</dt><dd class="mono">${esc(item.sku)}</dd><dt>Kind</dt><dd>${invBadge(item.type)}</dd><dt>Unit</dt><dd>${esc(item.unit)}</dd><dt>Cost</dt><dd class="num">${money(item.costCents)}</dd><dt>List price</dt><dd class="num">${money(item.priceCents)}</dd><dt>Reorder</dt><dd>${isStock && item.reorderPoint > 0 ? `when available ≤ ${invQty(item.reorderPoint)} · order ${invQty(item.reorderQuantity)}` : "not set"}</dd><dt>Preferred vendor</dt><dd>${esc(vendor?.name || "None")}</dd><dt>Accounts</dt><dd class="mono">${esc(item.revenueAccountNumber)} revenue · ${esc(item.expenseAccountNumber)} expense</dd></dl>`))}
      <div style="display:grid;gap:14px;align-content:start">${cardFlush("Prices on price lists", `<p class="hint" style="padding:0 16px 10px;margin:0">Customers on these lists pay these prices instead of the list price.</p>` + (prices.length ? table(["Price list", ">From qty", ">Price", ...(canEdit ? [""] : [])], prices.map(({ r, pl }) => { const cus = S.customers.filter((c) => c.priceListId === pl.id); return `<tr><td>${esc(pl.name)}${cus.length ? `<div class="hint">${esc(cus.map((c) => c.name).join(", "))}</div>` : ""}</td>${td(r.minQuantity > 0 ? `${invQty(r.minQuantity)}+` : "any", 1)}${td(`<strong>${money(r.priceCents)}</strong>`, 1)}${canEdit ? `<td class="r"><button class="lnk" style="color:var(--t-red)" data-a="invPriceRemove" data-id="${r.id}">Remove</button></td>` : ""}</tr>`; })) : `<p class="hint" style="padding:0 16px 12px">Not on any price list — everyone pays the list price${item.priceCents ? ` of ${money(item.priceCents)}` : ""}.</p>`) + (canEdit && lists.length ? `<form data-f="invPrice" data-item="${item.id}" class="form-row" style="padding:10px 16px 14px"><select class="in" name="priceListId" required aria-label="Price list" style="flex:1.3;min-width:150px">${opt("", "Price list…", true)}${lists.map((p) => opt(p.id, p.name)).join("")}</select><input class="in num" name="minQuantity" type="number" step="any" min="0" placeholder="From qty (0)" aria-label="From quantity" style="width:120px"><input class="in num" name="price" inputmode="decimal" placeholder="Price" aria-label="Price" required style="width:110px"><button class="btn pri sm">Set price</button></form>` : ""))}
      ${isStock ? cardFlush("Stock by warehouse", table(["Warehouse", ">On hand", ">Promised", ">Available", ">Value"], whs.map((w) => { const l = invLevelsOf(item.id).find((x) => x.warehouseId === w.id); return `<tr><td><span class="hint mono">${esc(w.code)}</span> ${esc(w.name)}</td>${td(invQty(l?.onHand || 0), 1)}${td(invQty(l?.reserved || 0), 1)}${td(`<strong>${invQty(invAvail(l))}</strong>`, 1)}${td(money(Math.round((l?.onHand || 0) * item.costCents)), 1)}</tr>`; }), `No warehouses for ${co(item.companyId).displayName}.`) + `<p class="hint" style="padding:8px 16px 12px;margin:0">Adjust counts or move stock from ${goLink("/inventory/stock", "Stock on Hand")}.</p>`) : ""}</div></div>`
    + (isStock ? `<div style="height:14px"></div>` + cardFlush("Recent movements", table(["Date", "What happened", "Warehouse", ">Quantity", ">Value", "Reference", "By"], invMoveRows(moves, false), "No movements yet."), `<span class="hint">The last 20 receipts, shipments, adjustments and transfers for this item.</span>`) : "");
}

function invAlerts() {
  return inScope(S.items).filter((i) => i.type === "STOCK" && i.isActive !== false).map((it) => { const available = invAvailable(it.id); return { it, available, onHand: invOnHand(it.id), suggested: it.reorderQuantity > 0 ? it.reorderQuantity : Math.max(1, it.reorderPoint - available) }; }).filter((a) => a.it.reorderPoint > 0 && a.available <= a.it.reorderPoint);
}
function vInvStock() {
  const whs = inScope(S.warehouses).filter((w) => w.isActive !== false).sort((a, b) => co(a.companyId).displayName.localeCompare(co(b.companyId).displayName) || a.code.localeCompare(b.code));
  const items = inScope(S.items).filter((i) => i.type === "STOCK" && i.isActive !== false).sort((a, b) => co(a.companyId).code.localeCompare(co(b.companyId).code) || a.sku.localeCompare(b.sku));
  const levelsIn = (w) => S.stockLevels.filter((l) => l.warehouseId === w.id).map((l) => ({ l, item: byId(S.items, l.itemId) })).filter((x) => x.item?.type === "STOCK").sort((a, b) => a.item.sku.localeCompare(b.item.sku));
  const whValue = whs.map((w) => ({ w, value: levelsIn(w).reduce((s, { l, item }) => s + Math.round(l.onHand * item.costCents), 0) }));
  const totalValue = whValue.reduce((s, x) => s + x.value, 0);
  const totalReserved = whs.reduce((s, w) => s + levelsIn(w).reduce((t, { l, item }) => t + Math.round(l.reserved * item.costCents), 0), 0);
  const lineCount = whs.reduce((s, w) => s + levelsIn(w).length, 0);
  const alerts = invAlerts(), canMove = invCanMove(), canPo = can(A, "procurement.create");
  const moves = invSortMoves(inScope(S.stockMovements)).slice(0, 50);
  return ph("Stock on Hand", "What is physically in each warehouse, what is already promised to confirmed orders, and what needs reordering. Every count change leaves a movement you can trace.", dlButton("stock-on-hand", "Stock list", { variant: "outline" })) + flashHtml()
    + `<div class="stats">${stat("Stock value at cost", money(totalValue), `${lineCount} item/warehouse line${lineCount === 1 ? "" : "s"}`, "primary")}${stat("Promised to orders", money(totalReserved), "Reserved by confirmed sales orders")}${stat("Needs reordering", String(alerts.length), alerts.length ? "At or below reorder point" : "Nothing to reorder", alerts.length ? "warn" : "good")}${stat("Warehouses", String(whs.length), [...new Set(whs.map((w) => co(w.companyId).code))].join(" · "))}</div>`
    + `<div class="inv-side">${cardFlush("Reorder alerts", `<p class="hint" style="padding:0 16px 10px;margin:0">${alerts.length ? "Available stock (on hand minus promised) is at or below the reorder point. One click drafts a purchase order to the preferred vendor." : "Nothing waiting on you — every stock item is above its reorder point."}</p>` + (alerts.length ? table(["Item", ">Available", ">Reorder at", ">Suggested order", "Preferred vendor", ...(canPo ? [""] : [])], alerts.map(({ it, available, suggested }) => { const vendor = it.preferredVendorId ? byId(S.vendors, it.preferredVendorId) : null, open = invOpenPoFor(it); return `<tr><td><span class="inv-nm">${invSq(it.companyId)}${goLink(`/inventory/items/${it.id}`, it.name)}</span> <span class="hint mono">${esc(it.sku)}</span></td>${td(`<span class="inv-warn">${invQty(available)} ${esc(it.unit)}</span>`, 1)}${td(invQty(it.reorderPoint), 1)}${td(`${invQty(suggested)} ${esc(it.unit)}<span class="inv-mini">≈ ${money(Math.round(suggested * it.costCents))}</span>`, 1)}<td>${vendor ? esc(vendor.name) : `<span class="inv-neg">No preferred vendor</span>`}</td>${canPo ? `<td class="r">${open ? `${goLink("/procurement/pos", `${open.poNumber} already open`)}<span class="inv-mini">${invBadge(open.status)}</span>` : vendor ? `<button class="btn sm pri" data-a="invReorderPo" data-id="${it.id}">Create purchase order</button>` : goLink(`/inventory/items/${it.id}`, "Set a vendor")}</td>` : ""}</tr>`; })) : "")).replace('<section class="card">', `<section class="card ${alerts.length ? "inv-alert" : ""}">`)}
      <section class="card" style="padding:14px 16px">${donut(whValue.map((x) => ({ label: `${x.w.code} · ${x.w.name}`, v: x.value, d: moneyCompact(x.value), fmt: moneyCompact })), { title: "Stock value by warehouse", total: moneyCompact(totalValue), caption: "at cost today", size: 130 })}</section></div>`
    + whs.map((w) => { const rows = levelsIn(w), value = rows.reduce((s, { l, item }) => s + Math.round(l.onHand * item.costCents), 0), tOn = rows.reduce((s, { l }) => s + l.onHand, 0), tRes = rows.reduce((s, { l }) => s + l.reserved, 0), nLow = rows.filter(({ l, item }) => item.reorderPoint > 0 && invAvail(l) <= item.reorderPoint).length; return `<div class="sect-l">${coTag(w.companyId)} · ${esc(w.name)} <span class="mono" style="text-transform:none;font-weight:400">${esc(w.code)}</span><span style="float:right;font-weight:400;text-transform:none">${rows.length} item${rows.length === 1 ? "" : "s"} · ${money(value)} at cost</span></div>` + cardFlush("", table(["Item", ">On hand", ">Promised", ">Available", ">Reorder at", "Status", ">Value at cost"], rows.map(({ l, item }) => { const avail = invAvail(l), low = item.reorderPoint > 0 && avail <= item.reorderPoint; return `<tr><td>${goLink(`/inventory/items/${item.id}`, item.name)} <span class="hint mono">${esc(item.sku)} · ${esc(item.unit)}</span></td>${td(invQty(l.onHand), 1)}${td(`<span class="hint">${invQty(l.reserved)}</span>`, 1)}${td(`<strong>${invQty(avail)}</strong>`, 1)}${td(item.reorderPoint > 0 ? invQty(item.reorderPoint) : "—", 1)}<td>${invBadge(low ? "REORDER" : "OK")}</td>${td(money(Math.round(l.onHand * item.costCents)), 1)}</tr>`; }).concat(rows.length ? [`<tr class="tot"><td>Total</td>${td(invQty(tOn), 1)}${td(invQty(tRes), 1)}${td(invQty(tOn - tRes), 1)}<td></td><td class="hint" style="font-weight:400">${nLow} to reorder</td>${td(money(value), 1)}</tr>`] : []), "Nothing stocked here yet.")); }).join("")
    + (canMove ? `<div class="grid g2" style="margin-top:14px">${card("Adjust a count", `<p class="hint" style="margin:0 0 10px">After a physical count, damage or spoilage. Use + to add and − to remove; the reason goes on the movement.</p><form data-f="invAdjust" class="form-grid"><div class="fld"><label for="iaWh">Warehouse</label>${invWhSelect("iaWh", "warehouseId", whs, "")}</div><div class="fld"><label for="iaIt">Item</label>${invItemSelect("iaIt", "itemId", items, "")}</div><div class="fld"><label for="iaQ">± quantity</label><input class="in num" id="iaQ" name="qty" type="number" step="any" placeholder="e.g. -3" required></div><div class="fld"><label for="iaR">Reason</label><input class="in" id="iaR" name="reason" placeholder="e.g. Yard count — 3 damaged" required></div><div class="form-row" style="align-items:flex-end"><button class="btn pri">Adjust</button></div></form>`, "", "inv-soft")}
      ${card("Move stock between warehouses", `<p class="hint" style="margin:0 0 10px">Same company only. Only stock that isn't promised to an order can move.</p><form data-f="invTransfer" class="form-grid"><div class="fld"><label for="itFrom">From</label>${invWhSelect("itFrom", "fromWarehouseId", whs, "", "From…")}</div><div class="fld"><label for="itTo">To</label>${invWhSelect("itTo", "toWarehouseId", whs, "", "To…")}</div><div class="fld"><label for="itIt">Item</label>${invItemSelect("itIt", "itemId", items, "")}</div><div class="fld"><label for="itQ">Quantity</label><input class="in num" id="itQ" name="qty" type="number" step="any" min="0" placeholder="Qty" required></div><div class="fld"><label for="itN">Note (optional)</label><input class="in" id="itN" name="reference" placeholder="e.g. Restock gift shop"></div><div class="form-row" style="align-items:flex-end"><button class="btn">Move</button></div></form>`, "", "inv-soft")}</div>` : "")
    + `<div style="height:14px"></div>` + cardFlush(`Stock movements <span class="hint" style="font-weight:400">· last 50</span>`, table(["Date", "What happened", "Item", "Warehouse", ">Quantity", ">Value", "Reference", "By"], invMoveRows(moves), "No movements yet."), dlButton("stock-movements", "Download", { variant: "outline" }));
}

/* ---------------- sales orders ---------------- */
const SO_CHIPS = [["all", "All", []], ["draft", "Draft", ["DRAFT"]], ["confirmed", "Confirmed", ["CONFIRMED"]], ["partly", "Partly shipped", ["PARTIALLY_SHIPPED"]], ["shipped", "Shipped", ["SHIPPED"]], ["invoiced", "Invoiced", ["INVOICED", "CLOSED"]]];
const soLines = (o, St = S) => St.salesOrderLines.filter((l) => l.salesOrderId === o.id).sort((a, b) => a.sortOrder - b.sortOrder);
const soProgress = (o) => { const ls = soLines(o), ordered = ls.reduce((s, l) => s + l.quantity, 0), shipped = ls.reduce((s, l) => s + l.shippedQuantity, 0); const pct = ordered ? Math.round((shipped / ordered) * 100) : 0; return `<div class="inv-prog"><div class="tr"><i style="width:${pct}%"></i></div><small>${pct}%</small></div>`; };
function vSalesOrders() {
  const cur = UI.filters.so || "all", chip = SO_CHIPS.find((c) => c[0] === cur) || SO_CHIPS[0];
  const all = inScope(S.salesOrders).sort((a, b) => (a.orderDate < b.orderDate ? 1 : a.orderDate > b.orderDate ? -1 : a.orderNumber < b.orderNumber ? 1 : -1));
  const list = chip[2].length ? all.filter((o) => chip[2].includes(o.status)) : all;
  const live = all.filter((o) => o.status !== "CANCELLED");
  const openValue = live.filter((o) => !["INVOICED", "CLOSED"].includes(o.status)).reduce((s, o) => s + o.totalCents, 0);
  const toShip = live.filter((o) => ["CONFIRMED", "PARTIALLY_SHIPPED"].includes(o.status)).length;
  const toInvoice = live.filter((o) => soLines(o).some((l) => l.shippedQuantity > (l.invoicedQuantity || 0) + 1e-9)).length;
  const byStatus = new Map(); for (const o of live) byStatus.set(o.status, (byStatus.get(o.status) || 0) + o.totalCents);
  const count = (sts) => (sts.length ? all.filter((o) => sts.includes(o.status)).length : all.length);
  return ph("Sales Orders", "Orders from customers, from draft through shipping to the invoice. Confirming an order sets stock aside for it.", `${dlButton("sales-orders", "Download", { variant: "outline" })}${can(A, "ar.create") ? `<button class="btn pri" data-go="/sales/orders/new">+ New sales order</button>` : ""}`) + flashHtml()
    + `<div class="inv-side"><div class="stats" style="margin:0">${stat("Open order value", money(openValue), "Not yet invoiced (incl. GST)", "primary")}${stat("Waiting to ship", String(toShip), "Confirmed or partly shipped", toShip ? "warn" : "")}${stat("Ready to invoice", String(toInvoice), "Shipped but not yet billed", toInvoice ? "good" : "")}</div>
      <section class="card" style="padding:14px 16px">${donut([...byStatus.entries()].map(([s, v]) => ({ label: invLabel(s), v, d: moneyCompact(v), fmt: moneyCompact })), { title: "Pipeline by status", total: moneyCompact(live.reduce((s, o) => s + o.totalCents, 0)), caption: "incl. GST", size: 130 })}</section></div>`
    + `<div class="form-row" style="margin:14px 0 10px">${SO_CHIPS.map(([k, l, sts]) => `<button class="hchip ${k === chip[0] ? "on" : ""}" data-a="soChip" data-v="${k}">${esc(l)} <span>${count(sts)}</span></button>`).join("")}</div>`
    + cardFlush("", table(["Order", "Customer", "Date", "Ship from", ">Lines", ">Amount", "Shipped", "Status"], list.map((o) => { const ls = soLines(o), inv = o.arInvoiceId ? byId(S.arInvoices, o.arInvoiceId) : null; return `<tr class="click" data-go="/sales/orders/${o.id}"><td class="mono">${invSq(o.companyId)}<strong>${esc(o.orderNumber)}</strong>${o.customerPo ? `<span class="inv-mini">PO ${esc(o.customerPo)}</span>` : ""}</td><td>${esc(customerName(o.customerId))}</td><td class="mono">${dLong(o.orderDate)}</td><td class="mono">${esc(byId(S.warehouses, o.warehouseId)?.code || "—")}</td>${td(ls.length, 1)}${td(`<strong>${money(o.totalCents)}</strong>`, 1)}<td>${soProgress(o)}</td><td>${invBadge(o.status)}${inv ? ` <span class="hint mono">${esc(inv.invoiceNumber)}</span>` : ""}</td></tr>`; }), `No ${chip[0] === "all" ? "" : chip[1].toLowerCase() + " "}orders in this view.`));
}
function vSalesOrderNew(q) {
  const cus = inScope(S.customers).filter((c) => c.status !== "INACTIVE").sort((a, b) => co(a.companyId).displayName.localeCompare(co(b.companyId).displayName) || a.name.localeCompare(b.name));
  const whs = inScope(S.warehouses).filter((w) => w.isActive !== false).sort((a, b) => a.code.localeCompare(b.code));
  const items = inScope(S.items).filter((i) => i.isActive !== false).sort((a, b) => a.sku.localeCompare(b.sku));
  const selCu = byId(S.customers, q.customer) || cus[0];
  const cid = selCu?.companyId;
  const plName = selCu?.priceListId ? byId(S.priceLists, selCu.priceListId)?.name : null;
  const whOpts = (sel) => `${opt("", "No warehouse (services only)", !sel)}${whs.map((w) => `<option value="${w.id}" data-co="${w.companyId}" ${w.companyId !== cid ? "hidden" : ""} ${w.id === sel ? "selected" : ""}>${esc(`${w.code} — ${w.name}`)}</option>`).join("")}`;
  const itOpts = () => `${opt("", "— pick an item —", true)}${items.map((i) => `<option value="${i.id}" data-co="${i.companyId}" ${i.companyId !== cid ? "hidden" : ""}>${esc(`${i.sku} — ${i.name} (${i.unit})`)}</option>`).join("")}`;
  return ph("New sales order", "Pick the customer, then the items. Prices fill in from the customer's price list (or the list price) and are checked again when you save.", "", crumb("/sales/orders", "All orders")) + flashHtml()
    + card("", `<form data-f="soNew" id="soNewForm"><div class="form-grid"><div class="fld" style="grid-column:span 2"><label for="snCu">Customer</label><select class="in" id="snCu" name="customerId" data-a="soCust" required>${cus.map((c) => `<option value="${c.id}" data-co="${c.companyId}" data-pl="${esc(c.priceListId ? byId(S.priceLists, c.priceListId)?.name || "" : "")}" ${c.id === selCu?.id ? "selected" : ""}>${esc(`${c.name} · ${co(c.companyId).displayName}`)}</option>`).join("")}</select><span class="hint" id="soPlHint">${plName ? `Prices from the “${esc(plName)}” price list.` : "No price list — list prices apply."}</span></div>
      <div class="fld"><label for="snWh">Ship from</label><select class="in" id="snWh" name="warehouseId">${whOpts(whs.find((w) => w.companyId === cid)?.id)}</select></div>
      <div class="fld"><label for="snDate">Required by</label><input class="in" type="date" id="snDate" name="requiredDate" value="${addDays(todayStr(), 10)}"></div>
      <div class="fld"><label for="snPo">Customer PO</label><input class="in" id="snPo" name="customerPo" placeholder="optional"></div>
      <div class="fld"><label for="snGst">GST</label><select class="in" id="snGst" name="gst" data-inv-line="gst">${opt("1", "Charge 5% GST", true)}${opt("", "No GST")}</select></div></div>
      <div class="sect-l">Lines</div><div class="tw"><table class="t inv-sol"><thead><tr><th style="width:30px">#</th><th>Item</th><th class="r" style="width:120px">Quantity</th><th class="r" style="width:120px">Each</th><th class="r" style="width:130px">Amount</th></tr></thead><tbody>${[0, 1, 2, 3, 4, 5].map((i) => `<tr><td class="hint">${i + 1}</td><td><select class="in" name="item-${i}" data-inv-line="item" data-i="${i}" aria-label="Item ${i + 1}">${itOpts()}</select></td><td class="r"><input class="in num" style="text-align:right" name="qty-${i}" type="number" step="any" min="0" data-inv-line="qty" data-i="${i}" aria-label="Quantity ${i + 1}"></td><td class="r num" id="soPrice-${i}"><span class="hint">—</span></td><td class="r num" id="soAmt-${i}"><span class="hint">—</span></td></tr>`).join("")}</tbody></table></div>
      <div class="inv-sum"><div><span>Before tax</span><span class="num" id="soSub">$0.00</span></div><div><span>GST (5%)</span><span class="num" id="soTax">$0.00</span></div><div class="tot"><span>Total</span><span class="num" id="soTot">$0.00</span></div></div>
      <div class="form-row" style="margin-top:14px"><button class="btn pri">Save as draft</button><button type="button" class="btn" data-go="/sales/orders">Cancel</button><span class="hint">Saved as a draft. Confirm it afterwards to reserve stock.</span></div></form>`);
}
function soRecalc() {
  const f = document.getElementById("soNewForm"); if (!f) return;
  const cuSel = f.querySelector("#snCu"), customerId = cuSel.value, cid = cuSel.selectedOptions[0]?.dataset.co;
  const hint = document.getElementById("soPlHint"); const pl = cuSel.selectedOptions[0]?.dataset.pl;
  if (hint) hint.textContent = pl ? `Prices from the “${pl}” price list.` : "No price list — list prices apply.";
  f.querySelectorAll("#snWh option[data-co], select[data-inv-line=item] option[data-co]").forEach((o) => { o.hidden = o.dataset.co !== cid; });
  const wh = f.querySelector("#snWh"); if (wh.selectedOptions[0]?.hidden) wh.value = [...wh.options].find((o) => !o.hidden && o.value)?.value || "";
  const gst = f.querySelector("#snGst").value !== "";
  let sub = 0, tax = 0;
  for (let i = 0; i < 6; i++) {
    const sel = f.querySelector(`select[name=item-${i}]`), qtyEl = f.querySelector(`input[name=qty-${i}]`);
    if (sel.selectedOptions[0]?.hidden) sel.value = "";
    const itemId = sel.value, qty = Number(qtyEl.value) || 0;
    const pc = document.getElementById(`soPrice-${i}`), ac = document.getElementById(`soAmt-${i}`);
    if (!itemId) { pc.innerHTML = ac.innerHTML = `<span class="hint">—</span>`; continue; }
    const r = invPriceFor(customerId, itemId, qty);
    pc.innerHTML = `${money(r.priceCents)}<span class="inv-mini">${r.source === "price-list" ? `${esc(r.priceListName)}${r.minQuantity > 0 ? ` · ${invQty(r.minQuantity)}+ break` : ""}` : "list price"}</span>`;
    const amt = Math.round(qty * r.priceCents); ac.textContent = qty > 0 ? money(amt) : "—";
    if (qty > 0) { sub += amt; if (gst) tax += Math.round(amt * 0.05); }
  }
  document.getElementById("soSub").textContent = money(sub); document.getElementById("soTax").textContent = money(tax); document.getElementById("soTot").textContent = money(sub + tax);
}
document.addEventListener("input", (ev) => { if (ev.target.dataset?.invLine) soRecalc(); });
document.addEventListener("change", (ev) => { if (ev.target.dataset?.invLine) soRecalc(); });

const SO_STEPS = [["DRAFT", "Draft"], ["CONFIRMED", "Confirmed"], ["PARTIALLY_SHIPPED", "Shipping"], ["SHIPPED", "Shipped"], ["INVOICED", "Invoiced"]];
function vSalesOrder(q, id) {
  const o = byId(S.salesOrders, id);
  if (!o || !inView(S, A, o.companyId)) return ph("Order not found", "") + card("", `<button class="btn" data-go="/sales/orders">Back to Sales Orders</button>`);
  const cu = byId(S.customers, o.customerId), wh = byId(S.warehouses, o.warehouseId), pl = cu?.priceListId ? byId(S.priceLists, cu.priceListId) : null;
  const lines = soLines(o).map((l) => ({ l, item: byId(S.items, l.itemId) }));
  const ships = S.shipments.filter((s) => s.salesOrderId === o.id).sort((a, b) => (a.shipDate < b.shipDate ? -1 : a.shipDate > b.shipDate ? 1 : a.shipmentNumber < b.shipmentNumber ? -1 : 1));
  const invoices = S.arInvoices.filter((i) => i.companyId === o.companyId && i.customerId === o.customerId && (i.salesOrderId === o.id || String(i.memo || "").includes(o.orderNumber))).sort((a, b) => (a.invoiceDate < b.invoiceDate ? -1 : 1));
  const canAct = can(A, "ar.create"), s = o.status;
  const stepIdx = SO_STEPS.findIndex((x) => x[0] === (s === "CLOSED" ? "INVOICED" : s));
  const canConfirm = s === "DRAFT", canShip = ["CONFIRMED", "PARTIALLY_SHIPPED"].includes(s) && !!wh, canCancel = ["DRAFT", "CONFIRMED"].includes(s);
  const toInvoice = lines.filter(({ l }) => l.shippedQuantity > (l.invoicedQuantity || 0) + 1e-9), canInvoice = !["DRAFT", "CANCELLED"].includes(s) && toInvoice.length > 0;
  const ordered = lines.reduce((t, { l }) => t + l.quantity, 0), shipped = lines.reduce((t, { l }) => t + l.shippedQuantity, 0);
  const invoiceable = toInvoice.reduce((t, { l }) => t + Math.round((l.shippedQuantity - (l.invoicedQuantity || 0)) * l.unitCents), 0);
  const invTotal = invoiceable + (o.taxCents > 0 ? Math.round(invoiceable * 0.05) : 0);
  const stockLines = lines.filter((x) => x.item?.type === "STOCK");
  return ph(`Sales order ${o.orderNumber}`, `${co(o.companyId).displayName} → ${cu?.name || "—"} · ordered ${dLong(o.orderDate)}${o.requiredDate ? ` · needed by ${dLong(o.requiredDate)}` : ""} · by ${o.createdByName || "—"}`, invBadge(o.status), crumb("/sales/orders", "All orders")) + flashHtml()
    + (s !== "CANCELLED" ? `<ol class="inv-steps">${SO_STEPS.map(([k, l], i) => `<li class="${i <= stepIdx ? "done" : ""}"><span class="n">${i <= stepIdx ? "✓" : i + 1}</span><span>${l}</span>${i < SO_STEPS.length - 1 ? `<span class="ln"></span>` : ""}</li>`).join("")}</ol>` : "")
    + `<div class="inv-side"><div style="display:grid;gap:14px">${cardFlush(`${invSq(o.companyId)}Lines`, table(["Item", ">Ordered", ">Shipped", ">Invoiced", ">Each", ">Amount"], lines.map(({ l, item }) => `<tr><td>${esc(l.description)}${item ? ` <span class="hint mono">${esc(item.sku)} · ${item.type === "STOCK" ? "stock" : "service"}</span>` : ""}</td>${td(`${invQty(l.quantity)} ${esc(item?.unit || "")}`, 1)}${td(`<span class="${l.shippedQuantity >= l.quantity ? "inv-pos" : l.shippedQuantity > 0 ? "" : "hint"}">${invQty(l.shippedQuantity)}</span>`, 1)}${td(`<span class="${(l.invoicedQuantity || 0) >= l.quantity ? "inv-pos" : "hint"}">${invQty(l.invoicedQuantity || 0)}</span>`, 1)}${td(money(l.unitCents), 1)}${td(`<strong>${money(l.amountCents)}</strong>`, 1)}</tr>`)) + `<div style="padding:0 16px 14px;display:flex"><div class="inv-sum"><div><span>Before tax</span><span class="num">${money(o.subtotalCents)}</span></div><div><span>GST (5%)</span><span class="num">${money(o.taxCents)}</span></div><div class="tot"><span>Total</span><span class="num">${money(o.totalCents)}</span></div></div></div>`, `<span class="hint">${invQty(shipped)} of ${invQty(ordered)} units shipped</span>`)}
      ${canAct && canShip ? card(`Ship from ${esc(wh.name)}`, `<p class="hint" style="margin:0 0 10px">Quantities default to what is still owed. Shipping takes the stock out of the warehouse and releases its reservation.</p><form data-f="soShip" data-id="${o.id}">${table(["Item", ">Still to ship", ">Ship now"], lines.map(({ l, item }) => { const rem = l.quantity - l.shippedQuantity; return `<tr><td>${esc(l.description)}</td>${td(`${invQty(rem)} ${esc(item?.unit || "")}`, 1)}<td class="r"><input class="in num" style="width:110px;text-align:right;display:inline-block" name="qty-${l.id}" type="number" step="any" min="0" max="${rem}" value="${rem > 0 ? rem : 0}" ${rem <= 0 ? "disabled" : ""} aria-label="Ship ${esc(l.description)}"></td></tr>`; }))}<div class="form-grid" style="margin-top:12px"><div class="fld"><label for="shDate">Ship date</label><input class="in" type="date" id="shDate" name="shipDate" value="${todayStr()}"></div><div class="fld"><label for="shCar">Carrier</label><input class="in" id="shCar" name="carrier" placeholder="e.g. Barge – Skidegate"></div><div class="fld"><label for="shTr">Tracking #</label><input class="in" id="shTr" name="trackingNumber" placeholder="optional"></div><div class="form-row" style="align-items:flex-end"><button class="btn pri">Record shipment</button></div></div></form>`, "", "inv-add") : ""}
      ${card("Timeline", `<ol class="inv-tl"><li><span class="dot"></span><span><strong>Order created</strong> ${dLong(o.orderDate)} by ${esc(o.createdByName || "—")}${o.customerPo ? ` · customer PO ${esc(o.customerPo)}` : ""}</span></li>${ships.map((sh) => { const sl = S.shipmentLines.filter((x) => x.shipmentId === sh.id); return `<li><span class="dot ship"></span><span><strong>${esc(sh.shipmentNumber)}</strong> shipped ${dLong(sh.shipDate)} from ${esc(byId(S.warehouses, sh.warehouseId)?.code || "—")}${sh.carrier ? ` via ${esc(sh.carrier)}` : ""}${sh.trackingNumber ? ` · tracking ${esc(sh.trackingNumber)}` : ""} · by ${esc(sh.shippedByName || "—")}<span class="sub">${esc(sl.map((x) => `${invQty(x.quantity)} × ${byId(S.salesOrderLines, x.soLineId)?.description || ""}`).join(", "))}</span></span></li>`; }).join("")}${invoices.map((inv) => `<li><span class="dot inv"></span><span>${goLink("/finance/ar", inv.invoiceNumber)} for ${money(inv.totalCents)} on ${dLong(inv.invoiceDate)} · ${badge(inv.status)}</span></li>`).join("")}${s === "CANCELLED" ? `<li><span class="dot bad"></span><span><strong>Cancelled</strong> ${o.cancelledAt ? dTime(o.cancelledAt) : ""}</span></li>` : ""}</ol>`)}</div>
      <div style="display:grid;gap:14px">${card("What's next", (!canAct ? `<p class="hint">You can view this order but not act on it.</p>` : "") + (canAct && canConfirm ? `<button class="btn pri" style="width:100%" data-a="soConfirm" data-id="${o.id}">Confirm order</button><p class="hint" style="margin:6px 0 12px">Sets stock aside${wh ? ` at ${esc(wh.name)}` : ""} so it can't be sold twice. Refused if there isn't enough free stock${stockLines.length ? ` (${stockLines.map(({ l, item }) => `${invQty(invAvail(invLevelsOf(item.id).find((x) => x.warehouseId === o.warehouseId)))} ${item.unit} of ${item.name} free`).join("; ")})` : ""}.</p>` : "") + (canAct && canShip ? `<p class="hint">Use the <strong>Ship</strong> box on the left to record what went out.</p>` : "") + (canAct && ["CONFIRMED", "PARTIALLY_SHIPPED"].includes(s) && !wh ? `<p class="inv-neg">This order has no warehouse, so it can't ship.</p>` : "") + (canAct && canInvoice ? `<button class="btn pri" style="width:100%" data-a="soInvoice" data-id="${o.id}">Create invoice for ${money(invTotal)}</button><p class="hint" style="margin:6px 0 12px">Bills the ${toInvoice.length} line${toInvoice.length === 1 ? "" : "s"} shipped but not yet invoiced and posts it to the books (receivable, revenue, GST).</p>` : "") + (canAct && !canInvoice && ["SHIPPED", "PARTIALLY_SHIPPED"].includes(s) ? `<p class="hint">Everything shipped so far has been invoiced.</p>` : "") + (s === "INVOICED" ? `<p class="inv-pos" style="font-weight:600">Done — fully shipped and invoiced.</p>` : "") + (s === "CANCELLED" ? `<p class="hint">This order was cancelled.</p>` : "") + (canAct && canCancel ? `<button class="btn" style="width:100%;color:var(--t-red)" data-a="soCancel" data-id="${o.id}">Cancel order</button>` : ""))}
      ${card("Customer", `<div style="font-weight:600">${esc(cu?.name || "—")} <span class="hint mono">#${esc(cu?.customerNumber || "")}</span></div><div class="hint">Terms: net ${cu?.paymentTermsDays || 30} days · price list: ${pl ? esc(pl.name) : "none (list prices)"}</div><div class="hint">Ship from: ${wh ? `${esc(wh.code)} · ${esc(wh.name)}` : "not set"}</div>${o.notes ? `<div class="msg" style="margin-top:8px">${esc(o.notes)}</div>` : ""}`)}
      ${o.arInvoiceId && byId(S.arInvoices, o.arInvoiceId) ? card("Invoice", (() => { const inv = byId(S.arInvoices, o.arInvoiceId); return `${goLink("/finance/ar", inv.invoiceNumber)} · ${money(inv.totalCents)} · ${badge(inv.status)}<div class="hint" style="margin-top:4px">Posted as ${esc(byId(S.journalEntries, inv.journalEntryId)?.entryNumber || "—")}</div>`; })()) : ""}</div></div>`;
}

function vShipments() {
  const orderIds = new Set(inScope(S.salesOrders).map((o) => o.id));
  const list = S.shipments.filter((s) => orderIds.has(s.salesOrderId)).sort((a, b) => (a.shipDate < b.shipDate ? 1 : a.shipDate > b.shipDate ? -1 : a.shipmentNumber < b.shipmentNumber ? 1 : -1));
  const since = addDays(todayStr(), -30), recent = list.filter((s) => s.shipDate >= since);
  const unitsOf = (s) => S.shipmentLines.filter((x) => x.shipmentId === s.id).reduce((u, x) => u + x.quantity, 0);
  const carriers = new Set(list.map((s) => s.carrier).filter(Boolean));
  const shipping = new Set(list.filter((s) => byId(S.salesOrders, s.salesOrderId)?.status === "PARTIALLY_SHIPPED").map((s) => s.salesOrderId)).size;
  return ph("Shipments", "Everything that has left a warehouse against a sales order — when, how, and what was in it.", dlButton("shipments", "Download", { variant: "outline" })) + flashHtml()
    + `<div class="stats">${stat("Shipments · last 30 days", String(recent.length), `${invQty(recent.reduce((t, s) => t + unitsOf(s), 0))} units`, "primary")}${stat("All time in view", String(list.length), `${carriers.size} carrier${carriers.size === 1 ? "" : "s"} used`)}${stat("Orders still shipping", String(shipping), "Partly shipped — more to go")}</div>`
    + cardFlush("", table(["Shipment", "Order", "Customer", "Date", "From", "Carrier", "Tracking", ">Lines", ">Units", "By"], list.map((s) => { const o = byId(S.salesOrders, s.salesOrderId), sl = S.shipmentLines.filter((x) => x.shipmentId === s.id); return `<tr><td class="mono">${invSq(o.companyId)}<strong>${esc(s.shipmentNumber)}</strong></td><td class="mono">${goLink(`/sales/orders/${o.id}`, o.orderNumber)}</td><td>${esc(customerName(o.customerId))}</td><td class="mono">${dLong(s.shipDate)}</td><td class="mono">${esc(byId(S.warehouses, s.warehouseId)?.code || "—")}</td><td>${esc(s.carrier || "—")}</td><td class="mono">${esc(s.trackingNumber || "—")}</td>${td(sl.length, 1)}<td class="r num" title="${esc(sl.map((x) => `${invQty(x.quantity)} × ${byId(S.salesOrderLines, x.soLineId)?.description || ""}`).join("\n"))}">${invQty(unitsOf(s))}</td><td class="hint">${esc(s.shippedByName || "—")}</td></tr>`; }), "No shipments yet."));
}

/* ---------------- 3-way match ---------------- */
function vMatch() {
  const rows = invMatchRows(), canAct = can(A, "ap.approve");
  const nMatched = rows.filter((x) => x.stored === "MATCHED").length, nVar = rows.filter((x) => x.stored === "VARIANCE").length, nUn = rows.length - nMatched - nVar;
  const varValue = rows.filter((x) => x.stored === "VARIANCE").reduce((s, x) => s + Math.abs(x.r?.diffCents || 0), 0);
  const stale = rows.filter((x) => x.r && x.stored !== "UNMATCHED" && !invMatchAccepted(x.b) && x.r.status !== x.b.matchStatus).length;
  return ph("3-Way Match", "Before a vendor bill is paid, it is checked against the purchase order and what was actually received. Matched bills are safe to pay; a variance needs a look.", canAct && rows.length ? `<button class="btn pri" data-a="matchRun">Run match on all ${rows.length}</button>` : "") + flashHtml()
    + `<div class="inv-side"><div class="stats" style="margin:0">${stat("Bills with a PO", String(rows.length), "In this view")}${stat("Matched", String(nMatched), "Safe to pay", "good")}${stat("Variance", String(nVar), nVar ? `${money(varValue)} in question` : "None open", nVar ? "warn" : "")}${stat("Not yet checked", String(nUn), stale ? `${stale} result${stale === 1 ? "" : "s"} may be out of date — run the match` : "Run the match to check", nUn || stale ? "warn" : "")}</div>
      <section class="card" style="padding:14px 16px">${donut([["Matched", nMatched], ["Variance", nVar], ["Not matched", nUn]].map(([label, v]) => ({ label, v, d: String(v) })), { title: "Bills by match result", total: String(rows.length), caption: "bills with a PO", size: 130 })}</section></div>`
    + `<div class="sect-l">Workbench</div>` + cardFlush("", table(["Bill", "PO", ">Received value", ">Billed", ">Difference", "Result", "What it means"], rows.map(({ b, po, r, stored }) => { const diff = r?.diffCents || 0, receipts = po ? S.goodsReceipts.filter((g) => g.purchaseOrderId === po.id) : []; return `<tr style="vertical-align:top"><td class="mono"><span class="inv-nm">${invSq(b.companyId)}${goLink(`/finance/ap/${b.id}`, b.invoiceNumber)}</span><span class="inv-mini" style="font-size:12.5px;color:var(--fg)">${esc(vendorName(b.vendorId))}</span><span class="inv-mini">${dLong(b.invoiceDate)} · ${badge(b.status)}</span></td><td class="mono">${po ? goLink("/procurement/pos", po.poNumber) : "—"}<span class="inv-mini">PO total ${money(r?.poTotalCents || 0)}</span><span class="inv-mini">${receipts.length ? esc(receipts.map((g) => `${g.receiptNumber} ${dShort(g.receivedDate)}`).join(", ")) : `<span class="inv-warn" style="font-weight:600">nothing received yet</span>`}</span></td>${td(money(r?.receivedCents || 0), 1)}${td(`<strong>${money(b.totalCents)}</strong>`, 1)}${td(diff === 0 ? "—" : `<strong class="${Math.abs(diff) <= (r?.toleranceCents || 0) ? "inv-pos" : "inv-neg"}">${diff > 0 ? "+" : "−"}${money(Math.abs(diff))}</strong>`, 1)}<td>${invBadge(stored)}${b.matchedAt ? `<span class="inv-mini">checked ${dLong(b.matchedAt.slice(0, 10))}</span>` : ""}${invMatchAccepted(b) ? `<span class="inv-mini">variance accepted</span>` : ""}${r && stored !== "UNMATCHED" && !invMatchAccepted(b) && r.status !== stored ? `<span class="inv-mini inv-warn">now looks like ${r.status === "MATCHED" ? "a match" : "a variance"} — re-run</span>` : ""}${canAct && po ? `<div style="margin-top:6px"><button class="btn sm" data-a="matchRun" data-id="${b.id}">Run match</button></div>` : ""}</td><td class="inv-note">${esc(b.matchNote || (r ? `Not checked yet. ${r.note}` : "No purchase order on this bill."))}${canAct && stored === "VARIANCE" ? `<form data-f="matchAccept" data-id="${b.id}" class="form-row" style="margin-top:8px"><input class="in" name="reason" required minlength="5" placeholder="Why it's OK to pay, e.g. back-order agreed" aria-label="Reason" style="height:32px;font-size:12px;flex:1"><button class="btn sm" style="white-space:nowrap">Accept variance</button></form>` : ""}</td></tr>`; }), "No vendor bills are tied to a purchase order in this view."))
    + card("How the check works", `<p class="hint" style="margin:0"><strong>Received value</strong> = quantity received on each PO line × the PO price, plus the same share of GST. A bill is <strong>matched</strong> when it is within the larger of $5 or 1% of the received value and does not exceed the PO total. Otherwise it is a <strong>variance</strong>, with the reason spelled out: more billed than received, a different price, or a bill over the PO. Accepting a variance records who agreed to it and why, and the bill then counts as matched for the period-close checklist.</p>`, "", "inv-soft");
}

/* ---------------- purchase orders & receiving, now line-aware ---------------- */
const vPOsBase = vPOs, vReceivingBase = vReceiving;
function vInvPOs() {
  const list = inScope(S.purchaseOrders).sort((a, b) => ((a.createdAt || "") < (b.createdAt || "") ? 1 : -1));
  const canCreate = can(A, "procurement.create");
  return ph("Purchase Orders", "Approved requests become numbered orders sent to the supplier. Orders drafted from a stock reorder alert start here too.") + flashHtml()
    + cardFlush("", table(["PO", "What", "Supplier", "Company", ">Amount", "Received", "Status", ""], list.map((p) => { const ls = invPoLines(p.id), ordered = ls.reduce((s, l) => s + l.quantity, 0), rec = ls.reduce((s, l) => s + (l.receivedQuantity || 0), 0), pct = ordered ? Math.round((rec / ordered) * 100) : p.status === "RECEIVED" ? 100 : 0; return `<tr><td class="mono"><strong>${esc(p.poNumber)}</strong>${p.orderDate ? `<span class="inv-mini">${dLong(p.orderDate)}</span>` : ""}</td><td>${esc(p.description || "—")}${ls.length ? `<div class="hint">${ls.length} line${ls.length === 1 ? "" : "s"}: ${esc(ls.map((l) => `${invQty(l.quantity)} × ${l.description} @ ${money(l.unitCents)}`).join("; "))}</div>` : ""}${p.notes ? `<div class="hint">${esc(p.notes)}</div>` : ""}</td><td>${esc(p.vendorName || vendorName(p.vendorId))}</td><td>${coTag(p.companyId)}</td>${td(money(p.amountCents ?? p.totalCents), 1)}<td>${ls.length ? `<div class="inv-prog"><div class="tr"><i style="width:${pct}%"></i></div><small>${pct}%</small></div>` : `<span class="hint">${p.status === "RECEIVED" ? "in full" : "—"}</span>`}</td><td>${invBadge(p.status)}</td><td class="r">${p.status === "DRAFT" && canCreate ? `<button class="btn sm pri" data-a="invPoSend" data-id="${p.id}">Send to supplier</button>` : ["SENT", "PARTIALLY_RECEIVED"].includes(p.status) && can(A, "procurement.receive") ? goLink("/procurement/receiving", "Receive") : ""}</td></tr>`; }), "No purchase orders yet. Approve a purchase request and create the PO from it, or create one from a reorder alert on Stock on Hand."));
}
function vInvReceiving() {
  const list = inScope(S.purchaseOrders).filter((p) => ["SENT", "PARTIALLY_RECEIVED"].includes(p.status));
  return ph("Receiving", "Confirm what arrived against each open purchase order. Lines tagged with a SKU go straight into stock.") + flashHtml()
    + cardFlush("", table(["PO", "What", "Supplier", ">Amount", "Status", ""], list.map((p) => { const ls = invPoLines(p.id); return `<tr><td class="mono"><strong>${esc(p.poNumber)}</strong></td><td>${esc(p.description || "—")}${ls.length ? `<div class="hint">${ls.map((l) => `${esc(l.description)}: ${invQty(l.receivedQuantity || 0)} of ${invQty(l.quantity)} received${invSkuOf(l.description) ? " · to stock" : ""}`).join("<br>")}</div>` : ""}</td><td>${esc(p.vendorName || vendorName(p.vendorId))}</td>${td(money(p.amountCents ?? p.totalCents), 1)}<td>${invBadge(p.status)}</td><td class="r">${can(A, "procurement.receive") ? `<button class="btn sm pri" data-a="receivePO" data-id="${p.id}">${p.status === "PARTIALLY_RECEIVED" ? "Receive the rest" : "Received in full"}</button>` : ""}</td></tr>`; }), "Nothing waiting to be received."));
}

/* ---------------- routes (registered before app.js, so these win) ---------------- */
route("/inventory/items", invCanView, vInvItems); route("/inventory/items/:id", invCanView, vInvItem); route("/inventory/stock", invCanView, vInvStock);
route("/sales/orders", "ar.view", vSalesOrders); route("/sales/orders/new", "ar.create", vSalesOrderNew); route("/sales/orders/:id", "ar.view", vSalesOrder); route("/sales/shipments", "ar.view", vShipments);
route("/procurement/match", () => can(A, "procurement.view") || can(A, "ap.view"), vMatch);
route("/procurement/pos", "procurement.view", vInvPOs); route("/procurement/receiving", "procurement.view", vInvReceiving);

/* ---------------- forms & click actions ---------------- */
function invGoFlash(path, text) { go(path); UI.flash = { kind: "ok", text }; safeRender(); }
window.FORMS_EXT.push({
  invItem(f) { const d = fd(f); const before = S.items.length; if (act("inv.item.add", { companyId: d.companyId, sku: d.sku, name: d.name, type: d.type, unit: d.unit, costCents: toCents(d.cost), priceCents: toCents(d.price), reorderPoint: d.reorderPoint, reorderQuantity: d.reorderQuantity, preferredVendorId: d.preferredVendorId, revenueAccountNumber: d.revenueAccountNumber, expenseAccountNumber: d.expenseAccountNumber })) { UI.filters.invAdd = false; invGoFlash(`/inventory/items/${S.items[before].id}`, `Item ${d.sku.trim().toUpperCase()} — ${d.name.trim()} added.`); } },
  invItemEdit(f) { const d = fd(f); act("inv.item.edit", { itemId: f.dataset.id, sku: d.sku, name: d.name, type: d.type, unit: d.unit, costCents: toCents(d.cost), priceCents: toCents(d.price), reorderPoint: d.reorderPoint, reorderQuantity: d.reorderQuantity, preferredVendorId: d.preferredVendorId, revenueAccountNumber: d.revenueAccountNumber, expenseAccountNumber: d.expenseAccountNumber, isActive: !!d.isActive }, "Item saved."); },
  invPrice(f) { const d = fd(f); const item = byId(S.items, d.itemId || f.dataset.item); act("inv.price.set", { priceListId: d.priceListId, itemId: d.itemId || f.dataset.item, minQuantity: d.minQuantity, priceCents: toCents(d.price) }, `${item?.name || "Item"}: ${money(toCents(d.price))} on "${byId(S.priceLists, d.priceListId)?.name}"${Number(d.minQuantity) > 0 ? ` for ${d.minQuantity}+ ${item?.unit || ""}` : ""}.`); },
  invAdjust(f) { const d = fd(f); const item = byId(S.items, d.itemId), wh = byId(S.warehouses, d.warehouseId), q = Number(d.qty); act("inv.adjust", { warehouseId: d.warehouseId, itemId: d.itemId, qty: q, reason: d.reason }, `${item?.name} at ${wh?.name}: ${q > 0 ? "added" : "removed"} ${invQty(Math.abs(q))} ${item?.unit || ""}.`); },
  invTransfer(f) { const d = fd(f); const item = byId(S.items, d.itemId); act("inv.transfer", { fromWarehouseId: d.fromWarehouseId, toWarehouseId: d.toWarehouseId, itemId: d.itemId, qty: Number(d.qty), reference: d.reference }, `Moved ${invQty(Number(d.qty))} ${item?.unit || ""} of ${item?.name} from ${byId(S.warehouses, d.fromWarehouseId)?.name} to ${byId(S.warehouses, d.toWarehouseId)?.name}.`); },
  soNew(f) { const d = fd(f); const lines = [0, 1, 2, 3, 4, 5].map((i) => ({ itemId: d[`item-${i}`], qty: d[`qty-${i}`] })); const before = S.salesOrders.length; if (act("so.create", { customerId: d.customerId, warehouseId: d.warehouseId, requiredDate: d.requiredDate, customerPo: d.customerPo, gst: !!d.gst, lines })) { const o = S.salesOrders[before]; invGoFlash(`/sales/orders/${o.id}`, `${o.orderNumber} saved as a draft. Confirm it to reserve stock.`); } },
  soShip(f) { const d = fd(f); const o = byId(S.salesOrders, f.dataset.id); const picks = soLines(o).map((l) => ({ lineId: l.id, qty: Number(d[`qty-${l.id}`]) || 0 })).filter((x) => x.qty > 0); const before = S.shipments.length; if (act("so.ship", { orderId: o.id, shipDate: d.shipDate, carrier: d.carrier, trackingNumber: d.trackingNumber, picks })) { const sh = S.shipments[before], all = byId(S.salesOrders, o.id).status === "SHIPPED"; UI.flash = { kind: "ok", text: `${sh.shipmentNumber} recorded — ${invQty(picks.reduce((s, p) => s + p.qty, 0))} unit(s) shipped. ${all ? "Everything on the order has now shipped; you can invoice it." : "Some lines are still waiting to ship."}` }; safeRender(); } },
  matchAccept(f) { const d = fd(f); const b = byId(S.apInvoices, f.dataset.id); act("match.accept", { billId: f.dataset.id, reason: d.reason }, `${b?.invoiceNumber} marked as matched — variance accepted.`); },
});
window.ACTIONS_EXT.push({
  invAddToggle() { UI.filters.invAdd = !UI.filters.invAdd; safeRender(); if (UI.filters.invAdd) setTimeout(() => document.getElementById("iiSku")?.focus(), 30); },
  invPriceRemove(el) { const r = S.priceListItems.find((x) => x.id === el.dataset.id); act("inv.price.remove", { priceListItemId: el.dataset.id }, r ? `Removed ${byId(S.items, r.itemId)?.name} from "${byId(S.priceLists, r.priceListId)?.name}".` : "Removed."); },
  invReorderPo(el) { const item = byId(S.items, el.dataset.id); const before = S.purchaseOrders.length; if (act("inv.reorder.po", { itemId: el.dataset.id })) { const po = S.purchaseOrders[before]; invGoFlash("/procurement/pos", `Draft ${po.poNumber} created for ${invQty(invPoLines(po.id)[0]?.quantity)} ${item?.unit || ""} of ${item?.name} from ${po.vendorName}. Send it to the supplier when ready.`); } },
  invPoSend(el) { act("inv.po.send", { poId: el.dataset.id }, "Sent to the supplier — it now shows under Receiving."); },
  soChip(el) { UI.filters.so = el.dataset.v; safeRender(); },
  soCust() { soRecalc(); },
  soConfirm(el) { const o = byId(S.salesOrders, el.dataset.id); act("so.confirm", { orderId: el.dataset.id }, `${o?.orderNumber} confirmed — stock is now reserved for it.`); },
  soInvoice(el) { const o = byId(S.salesOrders, el.dataset.id); const before = S.arInvoices.length; if (act("so.invoice", { orderId: el.dataset.id })) { const inv = S.arInvoices[before], fully = byId(S.salesOrders, o.id).status === "INVOICED"; UI.flash = { kind: "ok", text: `${inv.invoiceNumber} for ${money(inv.totalCents)} created and posted to the books (${byId(S.journalEntries, inv.journalEntryId)?.entryNumber}).${fully ? " The order is fully invoiced." : " Ship the rest to invoice the remainder."}` }; safeRender(); } },
  soCancel(el) { const o = byId(S.salesOrders, el.dataset.id); act("so.cancel", { orderId: el.dataset.id }, `${o?.orderNumber} cancelled.`); },
  matchRun(el) { const id = el.dataset.id || null; if (act("match.run", { billId: id })) { let text; if (id) { const b = byId(S.apInvoices, id); text = `${b.invoiceNumber}: ${b.matchStatus === "MATCHED" ? "matched" : "variance found"}. ${b.matchNote}`; } else text = (S.audit[S.audit.length - 1]?.summary || "Match run.").replace(/^.*?ran the 3-way match on /, "Checked "); UI.flash = { kind: "ok", text }; safeRender(); } },
});

/* ---------------- downloads ---------------- */
EXPORTS["stock-on-hand"] = () => ({ base: `demo-stock-on-hand-${todayStr()}`, title: "Stock on hand", rows: [["Company", "Warehouse", "SKU", "Item", "Unit", "On hand", "Promised", "Available", "Reorder at", "Unit cost", "Value at cost"], ...inScope(S.warehouses).flatMap((w) => S.stockLevels.filter((l) => l.warehouseId === w.id).map((l) => ({ l, item: byId(S.items, l.itemId) })).filter((x) => x.item).map(({ l, item }) => [co(w.companyId).displayName, w.code, item.sku, item.name, item.unit, l.onHand, l.reserved, l.onHand - l.reserved, item.reorderPoint, (item.costCents / 100).toFixed(2), (Math.round(l.onHand * item.costCents) / 100).toFixed(2)]))] });
EXPORTS["stock-movements"] = () => ({ base: `demo-stock-movements-${todayStr()}`, title: "Stock movements", rows: [["Date", "Type", "Company", "SKU", "Item", "Warehouse", "To warehouse", "Quantity", "Unit cost", "Value", "Reference", "By"], ...invSortMoves(inScope(S.stockMovements)).map((m) => { const it = byId(S.items, m.itemId); return [m.date, invLabel(m.type), co(m.companyId)?.displayName || "", it?.sku || "", it?.name || "", byId(S.warehouses, m.warehouseId)?.code || "", m.toWarehouseId ? byId(S.warehouses, m.toWarehouseId)?.code || "" : "", m.type === "SHIPMENT" ? -m.quantity : m.quantity, ((m.unitCostCents || 0) / 100).toFixed(2), (Math.round(Math.abs(m.quantity) * (m.unitCostCents || 0)) / 100).toFixed(2), m.reference || "", m.byName || ""]; })] });
EXPORTS["sales-orders"] = () => { const cur = UI.filters.so || "all", chip = SO_CHIPS.find((c) => c[0] === cur) || SO_CHIPS[0]; const list = inScope(S.salesOrders).filter((o) => !chip[2].length || chip[2].includes(o.status)); return { base: `demo-sales-orders-${todayStr()}`, title: "Sales orders", rows: [["Order", "Company", "Customer", "Customer PO", "Order date", "Required", "Ship from", "Lines", "Ordered units", "Shipped units", "Invoiced units", "Before tax", "GST", "Total", "Status", "Invoice", "Created by"], ...list.map((o) => { const ls = soLines(o); return [o.orderNumber, co(o.companyId).displayName, customerName(o.customerId), o.customerPo || "", o.orderDate, o.requiredDate || "", byId(S.warehouses, o.warehouseId)?.code || "", ls.length, ls.reduce((s, l) => s + l.quantity, 0), ls.reduce((s, l) => s + l.shippedQuantity, 0), ls.reduce((s, l) => s + (l.invoicedQuantity || 0), 0), (o.subtotalCents / 100).toFixed(2), (o.taxCents / 100).toFixed(2), (o.totalCents / 100).toFixed(2), invLabel(o.status), o.arInvoiceId ? byId(S.arInvoices, o.arInvoiceId)?.invoiceNumber || "" : "", o.createdByName || ""]; })] }; };
EXPORTS.shipments = () => { const ids = new Set(inScope(S.salesOrders).map((o) => o.id)); return { base: `demo-shipments-${todayStr()}`, title: "Shipments", rows: [["Shipment", "Order", "Company", "Customer", "Ship date", "From", "Carrier", "Tracking", "Item", "Quantity", "Shipped by"], ...S.shipments.filter((s) => ids.has(s.salesOrderId)).flatMap((s) => { const o = byId(S.salesOrders, s.salesOrderId); return S.shipmentLines.filter((x) => x.shipmentId === s.id).map((x) => [s.shipmentNumber, o.orderNumber, co(o.companyId).displayName, customerName(o.customerId), s.shipDate, byId(S.warehouses, s.warehouseId)?.code || "", s.carrier || "", s.trackingNumber || "", byId(S.salesOrderLines, x.soLineId)?.description || "", x.quantity, s.shippedByName || ""]); })] }; };
