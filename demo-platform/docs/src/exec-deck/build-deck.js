// Builds docs/DEMO_Executive_Presentation.pptx
//   NODE_PATH=<dir with pptxgenjs, sharp, react, react-dom, react-icons> node build-deck.js <pptx skill dir>
// Every figure in the comparison comes from MODEL below: change a number there and rebuild.
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa");
const { applyTheme } = require(path.join(process.argv[2], "scripts/apply_theme.js"));

const OUT = path.resolve(__dirname, "../../DEMO_Executive_Presentation.pptx");
const SHOT = (n) => path.join(__dirname, "shots", n + ".png");
const META = require("./shots/meta.json");

/* ---------------- the estimate: per item, today vs with the system ---------------- */
const MODEL = {
  staff: 100, hourly: 40,
  items: [
    { key: "Request", plural: "Requests", perYear: 600, today: 30, system: 5, stepsT: 6, stepsS: 2, emailsT: 3, pages: 3 },
    { key: "Purchase order", plural: "Purchase orders", perYear: 240, today: 40, system: 6, stepsT: 8, stepsS: 3, emailsT: 3, pages: 3 },
    { key: "Timesheet", plural: "Timesheets", perYear: 2600, today: 20, system: 5, stepsT: 5, stepsS: 2, emailsT: 2, pages: 1 },
    { key: "Task", plural: "Tasks", perYear: 2400, today: 20, system: 5, stepsT: 5, stepsS: 2, emailsT: 3, pages: 0 },
  ],
};
for (const i of MODEL.items) i.hours = Math.round(i.perYear * (i.today - i.system) / 60);
const HOURS = MODEL.items.reduce((s, i) => s + i.hours, 0);
const HOURS_TODAY = MODEL.items.reduce((s, i) => s + i.perYear * i.today / 60, 0);
const PCT = Math.round(HOURS / HOURS_TODAY * 100);
const DOLLARS = HOURS * MODEL.hourly;
const PAGES = MODEL.items.reduce((s, i) => s + i.perYear * i.pages, 0);
const fmt = (n) => n.toLocaleString("en-CA");
const round100 = (n) => Math.round(n / 100) * 100;
const item = (k) => MODEL.items.find((i) => i.key === k);

/* ---------------- theme ---------------- */
const THEME = {
  name: "Central Platform", headFontFace: "Calibri", bodyFontFace: "Calibri",
  colors: { dk1: "1E2A2C", lt1: "FFFFFF", dk2: "14342F", lt2: "F1F5F2", accent1: "2F6B4F", accent2: "B3402A", accent3: "C98A1B", accent4: "5E6B6E", accent5: "DCE8E0", accent6: "F6E3DD", hlink: "2F6B4F", folHlink: "5E6B6E" },
};
const HEX = THEME.colors;

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.author = "Andalib Olee"; pres.title = "One place for requests, purchase orders, timesheets and tasks"; pres.company = "HG Web";
  const C = pres.SchemeColor;
  const FOOT = "Working prototype · fictional demo data · figures are estimates";

  pres.defineSlideMaster({ title: "Title dark", background: { color: C.text2 }, objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 1.55, w: 6.3, h: 2.9, fontSize: 40, bold: true, color: C.background1, align: "left", valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 4.6, w: 6.3, h: 1.2, fontSize: 18, color: C.accent5, align: "left", valign: "top", margin: 0 }, text: "" } },
  ] });
  pres.defineSlideMaster({ title: "Content", background: { color: C.background1 }, margin: [0.5, 0.6, 0.7, 0.6], objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.85, fontSize: 32, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: FOOT, options: { x: 0.6, y: 7.02, w: 9, h: 0.3, fontSize: 10, color: C.accent4, margin: 0 } } },
  ], slideNumber: { x: 12.2, y: 7.02, w: 0.55, h: 0.3, fontSize: 10, color: C.accent4, align: "right" } });
  pres.defineSlideMaster({ title: "Closing dark", background: { color: C.text2 }, objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 0.6, w: 11.9, h: 0.9, fontSize: 34, bold: true, color: C.background1, align: "left", valign: "middle", margin: 0 }, text: "" } },
  ], slideNumber: { x: 12.2, y: 7.02, w: 0.55, h: 0.3, fontSize: 10, color: C.accent5, align: "right" } });

  /* ---------------- helpers ---------------- */
  const iconPng = async (Icon, hex) => { const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { color: "#" + hex, size: 256 })); return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64"); };
  const dims = async (n) => { const m = await sharp(SHOT(n)).metadata(); return [m.width, m.height]; };
  const shadow = () => ({ type: "outer", color: HEX.dk1, opacity: 0.18, blur: 8, offset: 2, angle: 90 });
  /** a framed screenshot that fits a box; returns its real position */
  const shot = async (s, name, x, y, maxW, maxH, alt) => {
    const [pw, ph] = await dims(name); const k = Math.min(maxW / pw, maxH / ph), w = pw * k, h = ph * k;
    s.addShape(pres.shapes.RECTANGLE, { x: x - 0.05, y: y - 0.05, w: w + 0.1, h: h + 0.1, fill: { color: C.background1 }, line: { color: C.accent5, width: 1 }, shadow: shadow(), objectName: `Frame ${name}` });
    s.addImage({ path: SHOT(name), x, y, w, h, altText: alt, objectName: `Screenshot ${name}` });
    return { x, y, w, h };
  };
  const caption = (s, text, x, y, w) => s.addText(text, { x, y, w, h: 0.3, fontSize: 11, italic: true, color: C.accent4, margin: 0, isTextBox: true, objectName: "Caption" });
  /** numbered points beside a screenshot; numbers match the red markers on the picture */
  const points = (s, list, x, y, w, gap = 1.12) => list.forEach(([head, body], i) => {
    const yy = y + i * gap;
    s.addShape(pres.shapes.OVAL, { x, y: yy + 0.02, w: 0.42, h: 0.42, fill: { color: C.accent2 }, line: { color: C.accent2, width: 0 }, objectName: `Marker ${i + 1}` });
    s.addText(String(i + 1), { x, y: yy + 0.02, w: 0.42, h: 0.42, fontSize: 15, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `Marker number ${i + 1}` });
    s.addText([{ text: head, options: { bold: true, fontSize: 17, color: C.text1, breakLine: true } }, { text: body, options: { fontSize: 14, color: C.accent4 } }], { x: x + 0.58, y: yy - 0.04, w: w - 0.58, h: gap - 0.1, valign: "top", margin: 0, isTextBox: true, objectName: `Point ${i + 1}` });
  });
  /** Today vs With the system, as an editable table */
  const compare = (s, rows, x, y, w) => {
    const hdr = (t, fill, color) => ({ text: t, options: { bold: true, fontSize: 12, color, fill: { color: fill }, align: "center", valign: "middle", margin: [0.02, 0.04, 0.02, 0.04] } });
    const body = rows.map(([label, a, b]) => [
      { text: label, options: { fontSize: 14, color: C.text1, valign: "middle", fill: { color: C.background2 } } },
      { text: a, options: { fontSize: 17, bold: true, color: C.accent2, align: "center", valign: "middle", fill: { color: C.accent6 }, margin: [0.02, 0.04, 0.02, 0.04] } },
      { text: b, options: { fontSize: 17, bold: true, color: C.accent1, align: "center", valign: "middle", fill: { color: C.accent5 }, margin: [0.02, 0.04, 0.02, 0.04] } },
    ]);
    s.addTable([[{ text: "", options: { fill: { color: C.background1 } } }, hdr("TODAY", HEX.accent2, C.background1), hdr("NEW SYSTEM", HEX.accent1, C.background1)], ...body], { x, y, w, colW: [w * 0.42, w * 0.28, w * 0.30], rowH: [0.36, ...rows.map(() => 0.5)], border: { type: "solid", color: HEX.lt1, pt: 2 }, margin: [0.02, 0.06, 0.02, 0.1], objectName: "Today vs system" });
    return y + 0.36 + rows.length * 0.5;
  };
  const note = (s, text, x, y, w, h = 0.3) => s.addText(text, { x, y, w, h, fontSize: 11, color: C.accent4, margin: 0, valign: "top", isTextBox: true, objectName: "Footnote" });
  const content = (title, section) => { const s = pres.addSlide({ masterName: "Content", sectionTitle: section }); s.addText(title, { placeholder: "title" }); return s; };
  const EST = "Estimates for an organization of 100 staff; the assumptions are on slide 12.";

  /* ================= 1. Title ================= */
  pres.addSection({ title: "Overview" });
  {
    const s = pres.addSlide({ masterName: "Title dark", sectionTitle: "Overview" });
    s.addText("One place for requests, purchase orders, timesheets and tasks", { placeholder: "title" });
    s.addText([{ text: "A working prototype, and what it would save", options: { breakLine: true } }, { text: "Briefing for the Executive Committee · November 2026", options: { fontSize: 14 } }], { placeholder: "body" });
    s.addText("Prepared by Andalib Olee", { x: 0.7, y: 6.55, w: 6, h: 0.3, fontSize: 12, color: C.accent5, margin: 0, isTextBox: true, objectName: "Prepared by" });
    await shot(s, "home-top", 7.55, 1.55, 5.2, 4.2, "The prototype's Home page: an employee's summary, things that need attention and what is coming up");
    s.addNotes("Opening. This is a short briefing on a working prototype: one central system for the four things that take the most back-and-forth today: requests, purchase orders, timesheets and tasks. The picture on the right is the real Home page of the prototype. All names and figures in the screenshots are fictional. I will show what each part looks like, how it compares with how we work today, and what it could save in time and cost.");
  }

  /* ================= 2. Summary ================= */
  {
    const s = content("The proposal in one minute", "Overview");
    s.addText("Today these four jobs run on paper forms, signatures, scans and email. One central system would handle all four, with every approval recorded automatically.", { x: 0.6, y: 1.35, w: 11.6, h: 0.9, fontSize: 19, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: "Summary statement" });
    const cards = [[`≈ ${PCT}%`, "less staff time spent on each request, purchase order, timesheet and task"], [`≈ ${fmt(round100(HOURS))} h`, "a year given back to real work, for every 100 staff"], [`≈ $${fmt(Math.round(DOLLARS / 1000) * 1000)}`, `a year in staff time, at $${MODEL.hourly} an hour`], ["No hunting", "for a missing form or PO: every one has a number, a status and its approvals on record"]];
    cards.forEach(([big, label], i) => {
      const x = 0.6 + i * 3.08;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.65, w: 2.86, h: 2.75, rectRadius: 0.08, fill: { color: i === 3 ? C.accent6 : C.accent5 }, line: { color: i === 3 ? C.accent6 : C.accent5, width: 0 }, objectName: `Stat card ${i + 1}` });
      s.addText(big, { x: x + 0.2, y: 2.9, w: 2.46, h: 0.95, fontSize: i === 3 ? 32 : 40, bold: true, color: i === 3 ? C.accent2 : C.accent1, margin: 0, valign: "middle", isTextBox: true, objectName: `Stat ${i + 1}` });
      s.addText(label, { x: x + 0.2, y: 3.95, w: 2.46, h: 1.3, fontSize: 15, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: `Stat label ${i + 1}` });
    });
    s.addText([{ text: "What is being asked today: ", options: { bold: true } }, { text: "agreement to confirm these numbers with our own counts and to pilot the system in one department." }], { x: 0.6, y: 5.75, w: 12.1, h: 0.5, fontSize: 16, color: C.text1, margin: 0, isTextBox: true, objectName: "Ask" });
    note(s, EST, 0.6, 6.45, 12.1);
    s.addNotes(`The whole proposal on one page. Today these four jobs run on paper forms, signatures, scans and email. In one system, the time staff spend on each item drops by about ${PCT} percent, because nobody prints, walks a form round for signatures, scans it or goes looking for it. For every 100 staff that is roughly ${fmt(round100(HOURS))} hours a year, worth about $${fmt(Math.round(DOLLARS / 1000) * 1000)} at $${MODEL.hourly} an hour. These are estimates built step by step from the paper process; slide 12 shows the assumptions so we can replace them with our own counts. The fourth box is not about time: nothing goes missing, because every form and purchase order has a number, a status and its approvals on record. The ask is at the bottom: confirm the numbers and run a pilot in one department.`);
  }

  /* ================= 3. Today vs system flow ================= */
  {
    const r = item("Purchase order");
    const s = content("Today a purchase order travels by paper, scanner and email", "Overview");
    const row = (label, steps, y, fill, color, w, gap, h) => {
      s.addText(label, { x: 0.6, y, w: 8, h: 0.35, fontSize: 14, bold: true, color, margin: 0, isTextBox: true, objectName: `${label} label` });
      steps.forEach((t, i) => {
        const x = 0.6 + i * (w + gap);
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: y + 0.45, w, h, rectRadius: 0.06, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: `${label} step ${i + 1}` });
        s.addText([{ text: `${i + 1}  `, options: { bold: true, color } }, { text: t }], { x: x + 0.12, y: y + 0.45, w: w - 0.24, h, fontSize: 14, color: C.text1, margin: 0, valign: "middle", isTextBox: true, objectName: `${label} step text ${i + 1}` });
        if (i < steps.length - 1) s.addText("›", { x: x + w, y: y + 0.45, w: gap, h, fontSize: 18, bold: true, color, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `${label} arrow ${i + 1}` });
      });
    };
    row("TODAY: paper, signatures, scanner and email", ["A paper PO form is filled in by hand", "It is taken round for signatures", "Someone scans it", "The scan is emailed", "It is saved in a folder or inbox", "Later it has to be hunted for. Sometimes it is missing"], 1.4, C.accent6, C.accent2, 1.82, 0.2, 1.25);
    row("WITH THE SYSTEM: one place", ["It is filled in online", "The supervisor approves with one click", "Director level approves if it is over $5,000", "The PO is numbered and stays on record"], 3.45, C.accent5, C.accent1, 2.82, 0.28, 1.0);
    [["Pages printed", `about ${r.pages}`, "0"], ["Emails people write", `about ${r.emailsT}`, "0"], ["Missing purchase orders", "sometimes", "none"]].forEach(([label, a, b], i) => {
      const x = 0.6 + i * 4.1;
      s.addText(label, { x, y: 5.4, w: 3.8, h: 0.35, fontSize: 14, color: C.accent4, margin: 0, isTextBox: true, objectName: `Flow stat label ${i + 1}` });
      s.addText([{ text: a, options: { color: C.accent2, bold: true } }, { text: "  →  ", options: { color: C.accent4 } }, { text: b, options: { color: C.accent1, bold: true } }], { x, y: 5.75, w: 3.9, h: 0.7, fontSize: 28, margin: 0, valign: "middle", isTextBox: true, objectName: `Flow stat ${i + 1}` });
    });
    note(s, "System notices (“a purchase order is waiting for you”) are sent automatically; nobody writes them.", 0.6, 6.55, 12.1);
    s.addNotes("This is how a purchase order moves today. It is completely on paper. Someone fills in the form by hand and takes it round for signatures. Then someone scans it, the scan is emailed, and it is saved in a folder or an inbox. Later, when the order is needed, somebody has to hunt for it, and sometimes it cannot be found. A missing PO also means the proof of approval is missing. In the system it is filled in online, the supervisor approves with one click, director level approves if it is over $5,000, and the purchase order gets its number and stays on record. No printing, no scanning, no emails to write, and no hunting. The same pattern applies to the other requests and to timesheets, which the next slides show.");
  }

  /* ================= 4-5. Requests ================= */
  pres.addSection({ title: "Requests" });
  {
    const s = content("Requests: every type in one place, with its status", "Requests");
    const f = await shot(s, "req-list", 0.65, 1.5, 7.3, 5.15, "My requests: a searchable list of an employee's requests, each with a coloured status");
    caption(s, "Screen: My requests, as an employee sees it.", 0.65, f.y + f.h + 0.1, 7.3);
    points(s, [["Find any request in seconds", "Search by number, person, department or what it was for."], ["See where it stands right now", "Awaiting approval, awaiting director level, returned to you, or ready."], ["Nothing goes missing", "A finished request stays on the list with its number. It cannot be lost in an inbox or a filing tray."]], 8.4, 1.55, 4.35, 1.3);
    s.addText([{ text: "Five request types, one short form each: ", options: { bold: true, color: C.text1 } }, { text: "travel, credit card purchase, travel claim, expense claim and purchase order.", options: { color: C.accent4 } }], { x: 8.4, y: 5.55, w: 4.35, h: 0.95, fontSize: 14, margin: 0, valign: "top", isTextBox: true, objectName: "Request types" });
    s.addText([{ text: "Today: ", options: { bold: true, color: C.accent2 } }, { text: "a paper form for each type. To know where one is, you ask around.", options: { color: C.text1 } }], { x: 0.65, y: f.y + f.h + 0.55, w: 7.3, h: 0.5, fontSize: 14, margin: 0, valign: "top", isTextBox: true, objectName: "Requests today" });
    s.addNotes("This is what an employee sees under Requests. The red numbers on the picture match the three points on the right. One: a search box finds any request by number, person or department. Two: the Status column says in plain words where each request stands: awaiting approval, awaiting director level, returned to you with a comment, or ready. Three: finished requests stay on the list with their number, so nothing is lost. There are five kinds of request, each with one short form: travel, credit card purchase, travel claim, expense claim and purchase order. Today each of these is a paper form, and the only way to know where one is, is to ask around.");
  }
  {
    const r = item("Request");
    const s = content("A request moves in minutes, and everyone can see it", "Requests");
    const f = await shot(s, "req-track", 0.65, 1.5, 6.3, 5.15, "One request opened: the approval route across the top, its details and its history");
    caption(s, "Screen: one request opened. The bar shows the route.", 0.65, f.y + f.h + 0.1, 6.3);
    const x = f.x + f.w + 0.45, w = 12.75 - x;
    points(s, [["The route", "Who has approved and who is next."], ["The history", "Each step with name, date and comment."], ["The details", "Department and expense code are required."]], x, 1.5, w, 0.82);
    note(s, EST, x, compare(s, [["Steps people do", String(r.stepsT), String(r.stepsS)], ["Emails written", `≈ ${r.emailsT}`, "0"], ["Time per request", `≈ ${r.today} min`, `≈ ${r.system} min`], ["Signatures to collect", "by hand", "one click"]], x, 4.0, w) + 0.12, w, 0.45);
    s.addNotes(`Here one request is opened. One: the bar across the top is the route. It shows the request was submitted, the supervisor approved it, and it is now waiting at director level because it is over $5,000. Two: the history lists every step with the person's name, the date and any comment. Nothing there can be edited. Three: the details, including the department and expense code, which are required on every request. The table compares today with the system. On paper it takes about ${r.stepsT} steps: fill in the form, print, get it signed, scan, email, then follow up. In the system it is ${r.stepsS}: submit and approve. Staff time per request falls from about ${r.today} minutes to about ${r.system}. If a supervisor is away on approved leave, the request also goes to the next person up, so it does not wait on someone's desk.`);
  }

  /* ================= 6-7. Purchase orders ================= */
  pres.addSection({ title: "Purchase orders" });
  {
    const s = content("Purchase orders: one list shows where every order stands", "Purchase orders");
    const f = await shot(s, "po-all", 0.65, 1.5, 7.3, 5.15, "All purchase orders in one list: reference number, what was ordered, who asked, the amount and the status");
    caption(s, "Screen: Requests › All requests, showing purchase orders only.", 0.65, f.y + f.h + 0.1, 7.3);
    points(s, [["Every purchase order in one list", "Each has its own number. Pick “Purchase order” and they are all there."], ["Who asked for it", "The person and what was ordered, with the amount."], ["Where it stands", "Awaiting director level, PO ready, or closed."]], 8.4, 1.55, 4.35, 1.25);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.4, y: 5.35, w: 4.35, h: 1.3, rectRadius: 0.08, fill: { color: C.accent6 }, line: { color: C.accent6, width: 0 }, objectName: "PO today card" });
    s.addText([{ text: "Today: ", options: { bold: true, color: C.accent2 } }, { text: "to find a PO, someone searches paper files, scans and inboxes, and sometimes it is not there.", options: { color: C.text1 } }], { x: 8.6, y: 5.42, w: 3.95, h: 1.16, fontSize: 14, margin: 0, valign: "middle", isTextBox: true, objectName: "PO today" });
    s.addNotes("Purchase order tracking. Today the purchase order is a paper form. After it is signed and scanned, finding it again means searching paper files, scans and inboxes, and sometimes it is simply not there. Here every purchase order is in one list. One: choose Purchase order at the top and the list shows all of them, each with its own number. Two: the list shows who asked for it, what was ordered and the amount. Three: the Status column shows where each one stands: awaiting director level, PO ready, or closed. Nobody has to hunt, and nobody has to ask.");
  }
  {
    const r = item("Purchase order");
    const s = content("Proper approval every time, and no missing POs", "Purchase orders");
    const f = await shot(s, "po-print", 0.65, 1.5, 6.9, 3.0, "The one-page purchase order the system produces after the last approval");
    caption(s, "Screen: the one-page purchase order, ready to print or download as a PDF.", 0.65, f.y + f.h + 0.1, 6.9);
    const steps = ["Employee asks", "Supervisor approves", "Director level if over $5,000", "PO is ready, with its number", "Goods received"];
    steps.forEach((t, i) => {
      const w = 1.3, x = 0.65 + i * (w + 0.1), y = 5.15;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 1.25, rectRadius: 0.06, fill: { color: i === 3 ? C.accent1 : C.accent5 }, line: { color: C.accent5, width: 0 }, objectName: `PO step ${i + 1}` });
      s.addText(t, { x: x + 0.06, y, w: w - 0.12, h: 1.25, fontSize: 14, bold: i === 3, color: i === 3 ? C.background1 : C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `PO step text ${i + 1}` });
    });
    const x = 8.0, w = 4.75;
    s.addText("What changes for one purchase order", { x, y: 1.5, w, h: 0.4, fontSize: 17, bold: true, color: C.text1, margin: 0, isTextBox: true, objectName: "Compare heading" });
    compare(s, [["Steps people do", String(r.stepsT), String(r.stepsS)], ["Time per order", `≈ ${r.today} min`, `≈ ${r.system} min`], ["Pages printed", `≈ ${r.pages}`, "0 to 1"], ["Missing POs", "sometimes", "none"]], x, 2.0, w);
    s.addText([{ text: "The approval is always complete. ", options: { bold: true, color: C.text1 } }, { text: "Nobody approves their own order and no level can be skipped. The PO shows who approved it, so the printed order always matches what was approved.", options: { color: C.accent4 } }], { x, y: 4.65, w, h: 1.4, fontSize: 14, margin: 0, valign: "top", isTextBox: true, objectName: "PO note" });
    note(s, EST, x, 6.5, w, 0.45);
    s.addNotes(`How a purchase order is approved in the system. The row of boxes at the bottom is the path: the employee asks, the supervisor approves, and anything over $5,000 also needs director level. After the last approval the system produces the purchase order itself, with its number. The picture is that one-page order: the supplier, department, expense code, amount, and at the bottom the names of the people who approved it. Compare that with paper: about ${r.stepsT} steps become ${r.stepsS}, and staff time drops from about ${r.today} minutes to about ${r.system}. Two points matter most. First, a PO cannot go missing, because it only exists in the system. Second, the approval is always complete: nobody can approve their own order and no level can be skipped. The $5,000 limit is a setting an administrator can change.`);
  }

  /* ================= 8-9. Timesheets ================= */
  pres.addSection({ title: "Timesheets" });
  {
    const s = content("Timesheets: type the hours, the system does the math", "Timesheets");
    const f = await shot(s, "time", 0.65, 1.5, 7.5, 4.5, "My Timesheet: hours typed for each day, overtime worked out and banked automatically");
    caption(s, "Screen: My Timesheet, as an employee sees it.", 0.65, f.y + f.h + 0.1, 7.5);
    points(s, [["Type the hours for each day", "Here a 10-hour Wednesday among 7-hour days."], ["Overtime is worked out for you", "Banked at 1.5 hours for every hour, or paid: the employee chooses. The balance updates at once."], ["One button sends it for approval", "The supervisor approves it on screen. No paper, no scan."]], 8.6, 1.55, 4.15, 1.4);
    s.addText("Stat holidays and approved time off fill in by themselves.", { x: 8.6, y: 5.85, w: 4.15, h: 0.6, fontSize: 14, italic: true, color: C.accent1, margin: 0, valign: "top", isTextBox: true, objectName: "Timesheet extra" });
    s.addText([{ text: "Today: ", options: { bold: true, color: C.accent2 } }, { text: "a paper or spreadsheet timesheet, signed, scanned and emailed. Overtime and banked time are counted by hand.", options: { color: C.text1 } }], { x: 0.65, y: f.y + f.h + 0.5, w: 7.5, h: 0.55, fontSize: 14, margin: 0, valign: "top", isTextBox: true, objectName: "Timesheet today" });
    s.addNotes("The timesheet. One: the employee types the hours worked each day. In this example Wednesday is a 10-hour day. Two: the system works out the overtime by itself and shows it at the top: two hours of overtime, banked at one and a half times, so the banked balance goes from 12 to 15 hours. The employee can choose to bank it or have it paid. Three: one button sends the timesheet to the supervisor, who approves it on screen. Stat holidays and approved time off are already filled in, so nobody has to remember them. Today this is a paper or spreadsheet timesheet that is signed, scanned and emailed, and overtime and banked time are counted by hand.");
  }
  {
    const r = item("Timesheet");
    const s = content("One page shows who has not sent a timesheet", "Timesheets");
    const f = await shot(s, "ts-status", 0.65, 1.5, 6.3, 5.15, `Timesheet Status for one pay period: ${META.approved} of ${META.total} approved, with each person's status`);
    caption(s, "Screen: Time & Attendance › By pay period.", 0.65, f.y + f.h + 0.1, 6.3);
    const x = f.x + f.w + 0.45, w = 12.75 - x;
    points(s, [["Progress for the pay period", "How many timesheets are approved."], ["One button reminds the rest", "No chasing by email or phone."], ["Each person’s status", "Not started, submitted or approved."]], x, 1.5, w, 0.82);
    note(s, EST, x, compare(s, [["Steps people do", String(r.stepsT), String(r.stepsS)], ["Time per timesheet", `≈ ${r.today} min`, `≈ ${r.system} min`], ["Overtime, banked time", "by hand", "automatic"], ["Chasing late ones", "one by one", "one button"]], x, 4.0, w) + 0.12, w, 0.45);
    s.addNotes(`This page is for the person who collects the timesheets each pay period. One: the bar shows how many are approved, here ${META.approved} of ${META.total}. Two: one button sends a reminder to everyone who has not sent theirs, instead of chasing people one by one. Three: the list shows each person's status: not started, submitted or approved. Per timesheet, staff time goes from about ${r.today} minutes to about ${r.system}, because nothing is printed, signed, scanned or emailed, and overtime and banked time are worked out automatically. With ${fmt(r.perYear)} timesheets a year for 100 staff, this is the largest saving of the four.`);
  }

  /* ================= 10. My Tasks ================= */
  pres.addSection({ title: "My Tasks" });
  {
    const r = item("Task");
    const s = content("My Tasks: assigned, tracked and reported in one place", "My Tasks");
    const f = await shot(s, "tasks", 0.65, 1.5, 7.3, 4.4, "A task card: progress buttons on the left and the history of who did what on the right");
    caption(s, "Screen: My Tasks. One task a manager assigned to an employee.", 0.65, f.y + f.h + 0.1, 7.3);
    s.addText([{ text: "Today: ", options: { bold: true, color: C.accent2 } }, { text: "tasks are given by email or in a meeting, and progress is found out by asking.", options: { color: C.text1 } }], { x: 0.65, y: f.y + f.h + 0.5, w: 7.3, h: 0.5, fontSize: 14, margin: 0, valign: "top", isTextBox: true, objectName: "Tasks today" });
    const x = 8.4, w = 4.35;
    points(s, [["Progress with one click", "25, 50, 75 or 100 percent."], ["The history", "Who did what, and when."], ["A note for the manager", "It replaces the status email."]], x, 1.5, w, 0.82);
    note(s, EST, x, compare(s, [["Status emails", `≈ ${r.emailsT}`, "0"], ["Time per task", `≈ ${r.today} min`, `≈ ${r.system} min`], ["Team overview", "ask around", "one page"]], x, 4.0, w) + 0.12, w, 0.45);
    s.addNotes(`My Tasks. Today tasks are given by email or in a meeting, and the manager finds out about progress by asking. Here a manager assigns a task with a due date and steps. One: the employee updates progress with one click. Two: the history on the right shows who created the task, who it was assigned to, each step ticked and each note, with dates. Three: a note box sends a message straight to the manager, which replaces the status email. Managers see their whole team's tasks on one page, with what is late or stuck. Staff time per task falls from about ${r.today} minutes to about ${r.system}.`);
  }

  /* ================= 11. Chart ================= */
  pres.addSection({ title: "The numbers" });
  {
    const s = content(`Staff time per item drops by about ${PCT}%`, "The numbers");
    const cats = MODEL.items.map((i) => i.key);
    const axis = { catAxisLabelColor: HEX.dk1, valAxisLabelColor: HEX.accent4, catAxisLabelFontSize: 14, valAxisLabelFontSize: 12, catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt" };
    s.addChart(pres.charts.BAR, [{ name: "Today", labels: cats, values: MODEL.items.map((i) => i.today) }, { name: "With the system", labels: cats, values: MODEL.items.map((i) => i.system) }], {
      x: 0.6, y: 1.4, w: 7.7, h: 5.2, barDir: "col", barGrouping: "clustered", barGapWidthPct: 60, chartColors: [HEX.accent2, HEX.accent1],
      showTitle: true, title: "Minutes of staff time for one item", titleFontSize: 14, titleColor: HEX.dk1, titleFontFace: "+mn-lt",
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 14, dataLabelColor: HEX.dk1, dataLabelFontFace: "+mn-lt", dataLabelFontBold: true,
      showLegend: true, legendPos: "b", legendFontSize: 13, legendColor: HEX.dk1, legendFontFace: "+mn-lt",
      valGridLine: { color: "E3E8E4", size: 0.75 }, catGridLine: { style: "none" }, valAxisMinVal: 0, ...axis, objectName: "Minutes per item chart",
    });
    const x = 8.75, w = 4.0;
    s.addText("Where the time goes today", { x, y: 1.5, w, h: 0.4, fontSize: 18, bold: true, color: C.text1, margin: 0, isTextBox: true, objectName: "Commentary heading" });
    s.addText([
      { text: "Filling in paper forms and taking them round for signatures.", options: { bullet: true, breakLine: true } },
      { text: "Scanning and emailing the signed copy.", options: { bullet: true, breakLine: true } },
      { text: "Hunting for a form or PO that cannot be found.", options: { bullet: true, breakLine: true } },
      { text: "Counting overtime, banked time and leave by hand.", options: { bullet: true } },
    ], { x, y: 2.0, w, h: 3.0, fontSize: 15, color: C.text1, margin: 0, valign: "top", paraSpaceAfter: 10, isTextBox: true, objectName: "Commentary" });
    s.addText("The system removes these four. It does not remove the decision: a person still approves every item.", { x, y: 5.15, w, h: 1.0, fontSize: 15, bold: true, color: C.accent1, margin: 0, valign: "top", isTextBox: true, objectName: "Commentary close" });
    note(s, EST, 8.75, 6.5, 4.0, 0.45);
    s.addNotes(`This chart puts the four side by side. The red bars are minutes of staff time today for one item; the green bars are the same item in the system. ${MODEL.items.map((i) => `A ${i.key.toLowerCase()} goes from about ${i.today} minutes to ${i.system}`).join(". ")}. Overall that is about ${PCT} percent less. The time does not come from people working faster. It comes from removing four things: filling in paper forms and taking them round for signatures, scanning and emailing, hunting for something that cannot be found, and counting overtime and leave by hand. People still make every approval decision.`);
  }

  /* ================= 12. Yearly saving ================= */
  {
    const s = content("In a year: time and cost for every 100 staff", "The numbers");
    const head = (t, al) => ({ text: t, options: { bold: true, fontSize: 13, color: C.background1, fill: { color: HEX.dk2 }, align: al || "left", valign: "middle" } });
    const cell = (t, al, bold, color) => ({ text: t, options: { fontSize: 15, bold: !!bold, color: color || C.text1, align: al || "left", valign: "middle" } });
    const rows = MODEL.items.map((i) => [cell(i.plural), cell(fmt(i.perYear), "right"), cell(`${i.today - i.system} min`, "right"), cell(`${fmt(i.hours)} h`, "right", true, C.accent1)]);
    s.addTable([[head("In a year"), head("How many", "right"), head("Saved on each", "right"), head("Hours saved", "right")], ...rows, [cell("Total", "left", true), cell("", "right"), cell("", "right"), cell(`${fmt(HOURS)} h`, "right", true, C.accent1)].map((c) => ({ text: c.text, options: { ...c.options, fill: { color: HEX.accent5 } } }))], { x: 0.6, y: 1.45, w: 7.2, colW: [2.5, 1.4, 1.6, 1.7], rowH: [0.42, 0.5, 0.5, 0.5, 0.5, 0.55], border: { type: "solid", color: "E3E8E4", pt: 1 }, margin: [0.02, 0.1, 0.02, 0.1], objectName: "Yearly saving table" });
    [[`≈ $${fmt(Math.round(DOLLARS / 1000) * 1000)}`, `of staff time a year, at $${MODEL.hourly} an hour including benefits`, C.accent1, C.accent5], [`≈ ${fmt(round100(PAGES))} pages`, "of printed forms a year no longer needed", C.accent2, C.accent6]].forEach(([big, label, color, fill], i) => {
      const y = 1.45 + i * 1.62;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.25, y, w: 4.5, h: 1.42, rectRadius: 0.08, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: `Year stat card ${i + 1}` });
      s.addText(big, { x: 8.45, y: y + 0.12, w: 4.1, h: 0.65, fontSize: 32, bold: true, color, margin: 0, valign: "middle", isTextBox: true, objectName: `Year stat ${i + 1}` });
      s.addText(label, { x: 8.45, y: y + 0.8, w: 4.1, h: 0.5, fontSize: 14, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: `Year stat label ${i + 1}` });
    });
    s.addText("How these were estimated", { x: 0.6, y: 4.75, w: 7.2, h: 0.35, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true, objectName: "Assumptions heading" });
    s.addText([
      { text: `An organization of ${MODEL.staff} staff, each sending a timesheet every two weeks.`, options: { bullet: true, breakLine: true } },
      { text: "Each process walked through step by step, on paper and then in the prototype, and the hands-on minutes of staff and supervisors added up.", options: { bullet: true, breakLine: true } },
      { text: "Yearly counts of requests, orders and tasks are assumptions. Replacing them with CHN’s own counts gives CHN’s figure.", options: { bullet: true } },
    ], { x: 0.6, y: 5.15, w: 7.2, h: 1.7, fontSize: 14, color: C.text1, margin: 0, valign: "top", paraSpaceAfter: 5, isTextBox: true, objectName: "Assumptions" });
    s.addText([{ text: "Not counted: ", options: { bold: true, color: C.text1 } }, { text: "subscriptions for separate apps that could be retired, and the cost to build and host the live system, which still has to be quoted.", options: { color: C.accent4 } }], { x: 8.25, y: 4.85, w: 4.5, h: 1.5, fontSize: 14, margin: 0, valign: "top", isTextBox: true, objectName: "Not counted" });
    s.addNotes(`This is the yearly picture for every 100 staff. The table multiplies the minutes saved on each item by how many there are in a year. Timesheets are the biggest line because there are ${fmt(item("Timesheet").perYear)} of them. The total is about ${fmt(HOURS)} hours a year, close to one person's full working year, returned to real work. At $${MODEL.hourly} an hour that is about $${fmt(Math.round(DOLLARS / 1000) * 1000)}. It also removes roughly ${fmt(round100(PAGES))} printed pages. I want to be clear about what these numbers are: they are estimates. The minutes come from walking through each process step by step and counting the hands-on time of staff and supervisors; the yearly counts are assumptions for 100 staff. The next step is to replace them with our own counts. Two things are not included: savings from subscriptions we could stop paying, and the cost to build and host the live system, which has not been quoted yet.`);
  }

  /* ================= 13. Audit trail ================= */
  pres.addSection({ title: "Control and independence" });
  {
    const s = content("A proper audit trail, kept automatically", "Control and independence");
    const f = await shot(s, "audit", 0.65, 1.5, 7.3, 4.05, "The audit log: when, who and what happened for every action, newest first");
    caption(s, "Screen: Administration › Audit log. One purchase order, step by step.", 0.65, f.y + f.h + 0.1, 7.3);
    points(s, [["When", "The date and time of every action, written the moment it happens."], ["Who", "The person who did it, by name."], ["What happened", "In plain words, with the request number, the step and any comment."]], 8.4, 1.5, 4.35, 1.15);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.4, y: 5.05, w: 4.35, h: 1.6, rectRadius: 0.08, fill: { color: C.accent5 }, line: { color: C.accent5, width: 0 }, objectName: "Audit rule card" });
    s.addText([{ text: "Nothing can be edited or deleted. ", options: { bold: true, color: C.accent1 } }, { text: "A request can only be returned, declined or closed, and that is recorded too.", options: { color: C.text1 } }], { x: 8.6, y: 5.15, w: 3.95, h: 1.4, fontSize: 15, margin: 0, valign: "middle", isTextBox: true, objectName: "Audit rule" });
    s.addText([{ text: "Today: ", options: { bold: true, color: C.accent2 } }, { text: "the trail is paper forms, scans and emails spread across folders and inboxes. If a PO is missing, so is the proof of its approval.   ", options: { color: C.text1 } }, { text: "With the system: ", options: { bold: true, color: C.accent1 } }, { text: "one searchable record, ready for auditors and funders.", options: { color: C.text1 } }], { x: 0.65, y: f.y + f.h + 0.5, w: 7.3, h: 0.8, fontSize: 14, margin: 0, valign: "top", isTextBox: true, objectName: "Audit today vs system" });
    s.addNotes("The audit trail. This matters as much as the time saved. Every action in the system is written to this log at the moment it happens. One: when. Two: who, by name. Three: what happened, in plain words. In the picture you can follow one purchase order: Maya submitted it, it was sent for approval in two steps, and Liam approved it with his comment. The log cannot be edited and nothing can be deleted. A request can only be returned, declined or closed, and that is logged as well. Today the trail is paper forms, scans and emails spread across folders and inboxes, and it depends on people keeping copies. If a purchase order is missing, the proof of its approval is missing too. Here it is one searchable record, which is what auditors and funders ask for. Each request also shows its own history on its own page.");
  }

  /* ================= 14. Beyond time ================= */
  {
    const s = content("Beyond time saved: independence and less stress", "Control and independence");
    const cards = [
      [fa.FaLayerGroup, "Less dependence on outside apps", "Requests, purchase orders, timesheets and tasks live in one system instead of separate tools, spreadsheets and paper forms. Fewer subscriptions, fewer logins."],
      [fa.FaCogs, "No dependence on AI", "The system runs on fixed, ordinary rules that people set. It needs no AI service to work, and no information is sent to one."],
      [fa.FaDatabase, "CHN’s own data storage", "Records are kept in one central database that CHN owns and controls. CHN chooses where it is hosted: its own servers or a host in Canada."],
      [fa.FaRegSmile, "Less paperwork, less stress", "No forms to print, sign and scan. No hunting for a missing PO. Everyone can see where things stand, so nothing is lost or forgotten."],
    ];
    for (let i = 0; i < cards.length; i++) {
      const [Icon, head, body] = cards[i]; const x = 0.6 + (i % 2) * 6.15, y = 1.5 + Math.floor(i / 2) * 2.65;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 5.95, h: 2.4, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: `Benefit card ${i + 1}` });
      s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.35, w: 0.85, h: 0.85, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: `Benefit icon circle ${i + 1}` });
      s.addImage({ data: await iconPng(Icon, "FFFFFF"), x: x + 0.52, y: y + 0.57, w: 0.41, h: 0.41, altText: head, objectName: `Benefit icon ${i + 1}` });
      s.addText(head, { x: x + 1.4, y: y + 0.3, w: 4.35, h: 0.5, fontSize: 21, bold: true, color: C.text1, margin: 0, valign: "middle", isTextBox: true, objectName: `Benefit heading ${i + 1}` });
      s.addText(body, { x: x + 1.4, y: y + 0.88, w: 4.35, h: 1.42, fontSize: 16, color: C.accent4, margin: 0, valign: "top", isTextBox: true, objectName: `Benefit text ${i + 1}` });
    }
    s.addNotes("Four benefits that are not about minutes. First, less dependence on outside apps: the four jobs sit in one system instead of several tools, spreadsheets and paper forms, so there are fewer subscriptions and logins. Second, no dependence on AI: the system follows fixed rules that people set, such as who approves what and the $5,000 limit. It does not need any AI service to run and does not send information to one. Third, our own data storage: all records sit in one central database that CHN owns and controls, and CHN decides where it is hosted, on its own servers or with a host in Canada. Fourth, less paperwork and less stress: no printing, signing and scanning, no hunting for a missing purchase order, and everyone can see where things stand.");
  }

  /* ================= 15. Next steps ================= */
  pres.addSection({ title: "Next steps" });
  {
    const s = pres.addSlide({ masterName: "Closing dark", sectionTitle: "Next steps" });
    s.addText("Where we are, and what happens next", { placeholder: "title" });
    s.addText([{ text: "Today: a working prototype", options: { bold: true, fontSize: 20, color: C.background1, breakLine: true } }, { text: "Every screen in this briefing is real and can be tried in a browser, with fictional people and figures. It is not yet connected to real staff accounts or email.", options: { fontSize: 15, color: C.accent5 } }], { x: 0.7, y: 1.75, w: 4.6, h: 2.3, margin: 0, valign: "top", isTextBox: true, objectName: "Where we are" });
    s.addText([{ text: "Time to build the live system", options: { bold: true, fontSize: 20, color: C.background1, breakLine: true } }, { text: "About 4 to 6 months, in stages, with a small team. This is an early estimate, to be confirmed with IT.", options: { fontSize: 15, color: C.accent5 } }], { x: 0.7, y: 4.25, w: 4.6, h: 1.9, margin: 0, valign: "top", isTextBox: true, objectName: "Timeline" });
    const steps = [["Confirm the numbers", "Replace the estimates with CHN’s own counts of requests, purchase orders and timesheets."], ["Choose a pilot department", "Start with purchase orders and timesheets, where paper causes the most trouble."], ["Decide hosting and sign-in with IT", "CHN’s own servers or a host in Canada; staff use their existing work accounts."], ["Build in stages and test with real users", "Go live only after the pilot department has used it for full pay periods."]];
    steps.forEach(([head, body], i) => {
      const y = 1.75 + i * 1.18;
      s.addShape(pres.shapes.OVAL, { x: 6.1, y: y + 0.03, w: 0.55, h: 0.55, fill: { color: C.accent3 }, line: { color: C.accent3, width: 0 }, objectName: `Next step circle ${i + 1}` });
      s.addText(String(i + 1), { x: 6.1, y: y + 0.03, w: 0.55, h: 0.55, fontSize: 18, bold: true, color: C.text2, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `Next step number ${i + 1}` });
      s.addText([{ text: head, options: { bold: true, fontSize: 19, color: C.background1, breakLine: true } }, { text: body, options: { fontSize: 14, color: C.accent5 } }], { x: 6.9, y: y - 0.05, w: 5.8, h: 1.05, margin: 0, valign: "top", isTextBox: true, objectName: `Next step ${i + 1}` });
    });
    s.addText("Decision requested: approve steps 1 and 2.", { x: 0.7, y: 6.55, w: 8, h: 0.4, fontSize: 16, bold: true, color: C.accent3, margin: 0, isTextBox: true, objectName: "Decision" });
    s.addNotes("To close. What exists today is a working prototype: every screen you saw is real and can be tried in a browser, but it uses fictional people and figures and is not yet connected to real staff accounts or email. Building the live system is estimated at four to six months in stages; that is an early estimate and needs to be confirmed with IT. The four next steps are on the right. First, replace the estimates with our own counts. Second, choose one department to pilot, starting with purchase orders and timesheets because that is where paper causes the most trouble. Third, decide with IT where it is hosted and how people sign in. Fourth, build in stages and only go live after the pilot department has used it for full pay periods. The decision requested today is approval for the first two steps. A demonstration of the prototype can be arranged for anyone who would like to try it.");
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT, "| hours", HOURS, "pct", PCT, "dollars", DOLLARS, "pages", PAGES);
})();
