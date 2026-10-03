/* ---------------- Download ▾ (Excel / PDF / CSV) — self-contained writers ----------------
   The live site builds these on the server; the browser edition builds them here so the
   same one-button menu works everywhere. No libraries: a store-only ZIP for .xlsx and a
   hand-written single-font PDF. */

const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const ENC = new TextEncoder();
/** files: [[name, string]] → Uint8Array of a ZIP (no compression — Excel reads it fine). */
function zipStore(files) {
  const parts = [], central = []; let offset = 0;
  const u16 = (n) => [n & 255, (n >> 8) & 255], u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const [name, text] of files) {
    const nameB = ENC.encode(name), data = ENC.encode(text), crc = crc32(data);
    const head = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0x21), ...u16(0x5a21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameB.length), ...u16(0)]);
    parts.push(head, nameB, data);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0x21), ...u16(0x5a21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nameB);
    offset += head.length + nameB.length + data.length;
  }
  const cdStart = offset, cdLen = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdLen), ...u32(cdStart), ...u16(0)]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((s, p) => s + p.length, 0)); let o = 0;
  for (const p of all) { out.set(p, o); o += p.length; }
  return out;
}
const xml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = (i) => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const isDec = (s) => /^-?\d+\.\d+$/.test(s);

/** rows[0] is the header. Numbers (typed, or decimal strings like "12.50") become real numbers. */
function buildXlsx(rows, title) {
  const [head = [], ...body] = rows;
  const widths = head.map((h, i) => Math.min(48, Math.max(10, ...[h, ...body.slice(0, 300).map((r) => r[i])].map((v) => String(v ?? "").length + 2))));
  const cell = (v, r, c, header) => {
    const ref = colName(c) + (r + 1);
    if (v == null || v === "") return "";
    if (typeof v === "number") return `<c r="${ref}" s="2"><v>${v}</v></c>`;
    const s = String(v);
    if (!header && isDec(s)) return `<c r="${ref}" s="2"><v>${Number(s)}</v></c>`;
    return `<c r="${ref}" t="inlineStr" s="${header ? 1 : 0}"><is><t xml:space="preserve">${xml(s)}</t></is></c>`;
  };
  const sheetRows = [head, ...body].map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => cell(v, ri, ci, ri === 0)).join("")}</row>`).join("");
  const last = colName(Math.max(0, head.length - 1)) + (body.length + 1);
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${last}"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17566B"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const safe = (title || "Report").replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31);
  const name = xml(/^history$/i.test(safe) || !safe ? "Report" : safe); // "History" is a reserved sheet name in Excel
  return zipStore([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", styles],
    ["xl/worksheets/sheet1.xml", sheet],
  ]);
}

/** A4 landscape table PDF: title, printed date, teal header row, zebra rows, page numbers. Helvetica (built-in). */
function buildPdf(rows, title, subtitle) {
  const [head = [], ...body] = rows;
  const cols = Math.max(1, head.length), W = 842, H = 595, M = 36, usable = W - M * 2;
  const fs = cols > 12 ? 6.5 : cols > 8 ? 7.5 : 9, rowH = fs + 6;
  const tw = (s, size) => s.length * size * 0.5; // Helvetica average width
  const sample = [head, ...body.slice(0, 200)];
  const raw = Array.from({ length: cols }, (_, i) => Math.min(40, Math.max(6, ...sample.map((r) => String(r[i] ?? "").length))));
  const sum = raw.reduce((a, b) => a + b, 0), widths = raw.map((w) => (w / sum) * usable);
  const numeric = Array.from({ length: cols }, (_, i) => body.length > 0 && body.every((r) => r[i] == null || r[i] === "" || typeof r[i] === "number" || isDec(String(r[i]))));
  const clean = (s) => String(s ?? "").replace(/[—–]/g, "-").replace(/[·•]/g, "-").replace(/[^\x20-\x7e]/g, "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const clip = (s, w, size) => { let t = clean(s); let cut = false; while (t.length && tw(t, size) > w - 4) { t = t.slice(0, -1); cut = true; } return cut ? t.slice(0, -2) + ".." : t; };
  const pages = []; let ops = [], y = H - M, pageNo = 1;
  const text = (x, yy, size, s, bold, color) => { ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${color || "0.1 0.1 0.1"} rg ${x.toFixed(1)} ${yy.toFixed(1)} Td (${s}) Tj ET`); };
  const rect = (x, yy, w, h, color) => { ops.push(`${color} rg ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`); };
  const header = () => {
    text(M, y, 14, clean(title), true, "0.09 0.34 0.42");
    const stamp = clean(`${subtitle ? subtitle + "  -  " : ""}Printed ${new Date().toISOString().slice(0, 10)}`);
    text(W - M - tw(stamp, 8), y + 2, 8, stamp, false, "0.4 0.4 0.4");
    y -= 20; rect(M, y - 4, usable, rowH, "0.09 0.34 0.42");
    let x = M; head.forEach((h, i) => { text(x + 2, y + 1, fs, clip(h, widths[i], fs), true, "1 1 1"); x += widths[i]; }); y -= rowH;
  };
  const footer = () => { const t = `Page ${pageNo}`; text(W - M - tw(t, 8), M / 2, 8, t, false, "0.5 0.5 0.5"); pages.push(ops.join("\n")); };
  header();
  body.forEach((r, ri) => {
    if (y < M + rowH) { footer(); ops = []; pageNo++; y = H - M; header(); }
    if (ri % 2 === 1) rect(M, y - 4, usable, rowH, "0.97 0.96 0.93");
    let x = M;
    for (let i = 0; i < cols; i++) { const t = clip(r[i], widths[i], fs); text(numeric[i] ? x + widths[i] - tw(t, fs) - 2 : x + 2, y + 1, fs, t); x += widths[i]; }
    y -= rowH;
  });
  if (!body.length) text(M, y, 9, "Nothing to show for this selection.", false, "0.4 0.4 0.4");
  footer();
  // assemble objects
  const objs = []; const add = (s) => { objs.push(s); return objs.length; };
  const fontA = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontB = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pagesId = objs.length + 1 + pages.length * 2; // placeholder index computed below
  const pageIds = [];
  const contentIds = pages.map((c) => add(`<< /Length ${ENC.encode(c).length} >>\nstream\n${c}\nendstream`));
  const parentId = objs.length + pages.length + 1;
  for (const cid of contentIds) pageIds.push(add(`<< /Type /Page /Parent ${parentId} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${cid} 0 R /Resources << /Font << /F1 ${fontA} 0 R /F2 ${fontB} 0 R >> >> >>`));
  const pid = add(`<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  if (pid !== parentId) throw new Error("pdf layout"); void pagesId;
  const cat = add(`<< /Type /Catalog /Pages ${pid} 0 R >>`);
  const info = add(`<< /Title (${clean(title)}) /Creator (HAICO Group platform) >>`);
  let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
  return bytes;
}

function buildCsv(rows) {
  const q = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n");
}

/** One entry point: rows (header first), a base filename without extension, a title, and the format. */
async function saveTable(base, rows, title, fmt) {
  const dl = await DOWNLOADS();
  if (!dl) { toast("Can't download here", "Saving files isn't available in this view — the live site downloads the same file.", "err"); return; }
  const subtitle = A?.activeCompanyId ? co(A.activeCompanyId).displayName : "All companies";
  const file = fmt === "xlsx" ? { filename: `${base}.xlsx`, data: buildXlsx(rows, title) } : fmt === "pdf" ? { filename: `${base}.pdf`, data: buildPdf(rows, title, subtitle) } : { filename: `${base}.csv`, data: buildCsv(rows) };
  try { await dl.save(file); toast("Downloaded", file.filename, "ok"); } catch (e) { if (e?.code !== "declined") toast("Not saved", e?.message || "The file couldn't be saved.", "err"); }
}

/* The menu: <button class="dlbtn" data-dl="<key>" data-arg="…">. EXPORTS[key](arg) → { base, title, rows }. */
const EXPORTS = {};
function dlButton(key, label = "Download", opts = {}) {
  const pri = opts.variant !== "outline";
  return `<span class="dlwrap"><button type="button" class="btn ${pri ? "pri" : ""} dlbtn" style="border-radius:999px${pri ? ";background:#3e6b34;border-color:#3e6b34" : ""}" data-a="dlMenu" data-dl="${esc(key)}" data-arg="${esc(opts.arg || "")}" ${opts.disabled ? `disabled title="${esc(opts.disabled)}"` : ""}>⬇ ${esc(label)} <span aria-hidden>▾</span></button></span>`;
}
function openDlMenu(btn) {
  document.querySelectorAll(".dlmenu").forEach((m) => m.remove());
  const m = document.createElement("div"); m.className = "dlmenu";
  m.innerHTML = `<div class="dlm-h">Save as</div>${[["xlsx", "📊", "Excel (.xlsx)"], ["pdf", "📄", "PDF (print-ready)"], ["csv", "🗒️", "CSV (plain data)"]].map(([f, i, l]) => `<button type="button" data-fmt="${f}"><span>${i}</span>${l}</button>`).join("")}`;
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect();
  m.style.top = `${r.bottom + 6}px`; m.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
  const close = () => { m.remove(); document.removeEventListener("click", onDoc, true); window.removeEventListener("scroll", close, true); };
  const onDoc = (e) => { if (!m.contains(e.target)) close(); };
  setTimeout(() => { document.addEventListener("click", onDoc, true); window.addEventListener("scroll", close, true); }, 0);
  m.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-fmt]"); if (!b) return;
    close();
    const fn = EXPORTS[btn.dataset.dl]; if (!fn) { toast("Nothing to download", "", "err"); return; }
    const d = fn(btn.dataset.arg); if (!d) return;
    await saveTable(d.base, d.rows, d.title, b.dataset.fmt);
  });
}
