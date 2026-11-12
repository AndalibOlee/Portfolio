// Builds the client briefing decks: docs/DEMO_Briefing_<client>.pptx
//   NODE_PATH=<dir with pptxgenjs, sharp, react, react-dom, react-icons> node build-brief.js <pptx skill dir>
// No comparison with how work is done today: the numbers are the admin time each task needs WITH the system.
// Every figure comes from CLIENTS and TASKS below: change a number there and rebuild.
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa");
const { applyTheme } = require(path.join(process.argv[2], "scripts/apply_theme.js"));

const SHOT = (n) => path.join(__dirname, "../exec-deck/shots", n + ".png");
const CLIENTS = [
  { file: "Old_Massett_Village_Council", name: "Old Massett Village Council", staff: 100, staffNote: "about 100 staff (to be confirmed)", monthly: 2000 },
  { file: "Nisla_Naay", name: "Nisla Naay", staff: 50, staffNote: "50 staff", monthly: 1000 },
  { file: "Haida_Child_and_Family", name: "Haida Child and Family", staff: 75, staffNote: "about 75 staff (to be confirmed)", monthly: 1500 },
];
/** admin time each task needs in the system, and how often it happens per person per year */
const TASKS = [
  { key: "Timesheets", perPerson: 26, minutes: 7, how: "Type the hours, send; the supervisor approves on screen" },
  { key: "Time-off requests", perPerson: 4, minutes: 5, how: "Pick the type and days, send; one click to approve" },
  { key: "Requests and claims", perPerson: 6, minutes: 30, how: "Fill in, attach the receipt, approve, process" },
  { key: "Purchase orders", perPerson: 2.4, minutes: 30, how: "Fill in, approve; the PO is produced with its number" },
  { key: "Task updates", perPerson: 24, minutes: 5, how: "One click for progress, a short note for the manager" },
];
const fmt = (n) => Math.round(n).toLocaleString("en-CA");
const money = (n) => "$" + fmt(n);

const THEME = {
  name: "Central Platform", headFontFace: "Calibri", bodyFontFace: "Calibri",
  colors: { dk1: "1E2A2C", lt1: "FFFFFF", dk2: "14342F", lt2: "F1F5F2", accent1: "2F6B4F", accent2: "B3402A", accent3: "C98A1B", accent4: "5E6B6E", accent5: "DCE8E0", accent6: "F6E3DD", hlink: "2F6B4F", folHlink: "5E6B6E" },
};
const HEX = THEME.colors;

async function build(cl) {
  const OUT = path.resolve(__dirname, `../../DEMO_Briefing_${cl.file}.pptx`);
  const rows = TASKS.map((t) => { const count = t.perPerson * cl.staff; return { ...t, count, hours: (count * t.minutes) / 60 }; });
  const HOURS = rows.reduce((s, r) => s + r.hours, 0);
  const PER_PERSON_MONTH = (HOURS * 60) / cl.staff / 12; // minutes a month for each person
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.author = "Andalib Olee"; pres.title = `Briefing for ${cl.name}`; pres.company = "HG Web"; pres.subject = "DEMO ERP: enterprise resource planning software";
  const C = pres.SchemeColor;
  const FOOT = `Briefing for ${cl.name} · working prototype with fictional demo data · figures are estimates`;

  pres.defineSlideMaster({ title: "Title dark", background: { color: C.text2 }, objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 1.55, w: 6.3, h: 2.9, fontSize: 38, bold: true, color: C.background1, align: "left", valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 4.6, w: 6.3, h: 1.2, fontSize: 18, color: C.accent5, align: "left", valign: "top", margin: 0 }, text: "" } },
  ] });
  pres.defineSlideMaster({ title: "Content", background: { color: C.background1 }, margin: [0.5, 0.6, 0.7, 0.6], objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.85, fontSize: 32, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: FOOT, options: { x: 0.6, y: 7.02, w: 10.5, h: 0.3, fontSize: 10, color: C.accent4, margin: 0 } } },
  ], slideNumber: { x: 12.2, y: 7.02, w: 0.55, h: 0.3, fontSize: 10, color: C.accent4, align: "right" } });
  pres.defineSlideMaster({ title: "Closing dark", background: { color: C.text2 }, objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 0.6, w: 11.9, h: 0.9, fontSize: 34, bold: true, color: C.background1, align: "left", valign: "middle", margin: 0 }, text: "" } },
  ], slideNumber: { x: 12.2, y: 7.02, w: 0.55, h: 0.3, fontSize: 10, color: C.accent5, align: "right" } });

  /* ---------------- helpers ---------------- */
  const iconPng = async (Icon, hex) => { const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { color: "#" + hex, size: 256 })); return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64"); };
  const dims = async (n) => { const m = await sharp(SHOT(n)).metadata(); return [m.width, m.height]; };
  const shadow = () => ({ type: "outer", color: HEX.dk1, opacity: 0.18, blur: 8, offset: 2, angle: 90 });
  const shot = async (s, name, x, y, maxW, maxH, alt) => {
    const [pw, ph] = await dims(name); const k = Math.min(maxW / pw, maxH / ph), w = pw * k, h = ph * k;
    s.addShape(pres.shapes.RECTANGLE, { x: x - 0.05, y: y - 0.05, w: w + 0.1, h: h + 0.1, fill: { color: C.background1 }, line: { color: C.accent5, width: 1 }, shadow: shadow(), objectName: `Frame ${name}` });
    s.addImage({ path: SHOT(name), x, y, w, h, altText: alt, objectName: `Screenshot ${name}` });
    return { x, y, w, h };
  };
  const caption = (s, text, x, y, w) => s.addText(text, { x, y, w, h: 0.3, fontSize: 11, italic: true, color: C.accent4, margin: 0, isTextBox: true, objectName: "Caption" });
  const points = (s, list, x, y, w, gap = 1.12) => list.forEach(([head, body], i) => {
    const yy = y + i * gap;
    s.addShape(pres.shapes.OVAL, { x, y: yy + 0.02, w: 0.42, h: 0.42, fill: { color: C.accent2 }, line: { color: C.accent2, width: 0 }, objectName: `Marker ${i + 1}` });
    s.addText(String(i + 1), { x, y: yy + 0.02, w: 0.42, h: 0.42, fontSize: 15, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `Marker number ${i + 1}` });
    s.addText([{ text: head, options: { bold: true, fontSize: 17, color: C.text1, breakLine: true } }, { text: body, options: { fontSize: 14, color: C.accent4 } }], { x: x + 0.58, y: yy - 0.04, w: w - 0.58, h: gap - 0.1, valign: "top", margin: 0, isTextBox: true, objectName: `Point ${i + 1}` });
  });
  /** a green card stating what the feature gives the organization */
  const gain = (s, head, body, x, y, w, h) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: C.accent5 }, line: { color: C.accent5, width: 0 }, objectName: "Benefit card" });
    s.addText([{ text: head + " ", options: { bold: true, color: C.accent1 } }, { text: body, options: { color: C.text1 } }], { x: x + 0.2, y: y + 0.05, w: w - 0.4, h: h - 0.1, fontSize: 15, margin: 0, valign: "middle", isTextBox: true, objectName: "Benefit text" });
  };
  const timeChip = (s, label, mins, x, y, w) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.85, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: "Admin time card" });
    s.addText([{ text: mins, options: { fontSize: 24, bold: true, color: C.accent1 } }, { text: "   " + label, options: { fontSize: 13, color: C.accent4 } }], { x: x + 0.2, y, w: w - 0.4, h: 0.85, margin: 0, valign: "middle", isTextBox: true, objectName: "Admin time" });
  };
  const content = (title, section) => { const s = pres.addSlide({ masterName: "Content", sectionTitle: section }); s.addText(title, { placeholder: "title" }); return s; };

  /* ================= 1. Title ================= */
  pres.addSection({ title: "Overview" });
  {
    const s = pres.addSlide({ masterName: "Title dark", sectionTitle: "Overview" });
    s.addText("One place for HR, requests and approvals", { placeholder: "title" });
    s.addText([{ text: "DEMO ERP: enterprise resource planning software, shaped to your organization", options: { breakLine: true } }, { text: `Briefing for ${cl.name} · November 2026`, options: { fontSize: 14 } }], { placeholder: "body" });
    s.addText("Prepared by Andalib Olee", { x: 0.7, y: 6.55, w: 6, h: 0.3, fontSize: 12, color: C.accent5, margin: 0, isTextBox: true, objectName: "Prepared by" });
    await shot(s, "home-top", 7.55, 1.55, 5.2, 4.2, "The prototype's Home page: an employee's summary, things that need attention and what is coming up");
    s.addNotes(`Opening. This is a short briefing for ${cl.name} on a working prototype of our ERP, enterprise resource planning software: one central system for HR, requests, approvals and team work. The picture on the right is the real Home page of the prototype. All names and figures in the screenshots are fictional. I will show what each part does, how much admin time it needs, and the price and timeline.`);
  }

  /* ================= 2. In one minute ================= */
  {
    const s = content("The system in one minute", "Overview");
    s.addText(`One system where staff fill in timesheets, ask for time off, send requests and track tasks, and where every approval is recorded automatically. ${cl.name} chooses the modules it needs.`, { x: 0.6, y: 1.3, w: 12.1, h: 0.9, fontSize: 18, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: "Summary statement" });
    const mods = [["HR", "Timesheets, time off, payroll, reviews, certificates, benefits and pension"], ["Requests", "Travel, card purchases, claims and purchase orders, with attachments"], ["Team", "My Team and tasks: assign, track and report progress"], ["Operations", "Purchasing, stock, projects and contracts"], ["Finance", "Can be completely customized to your finance team's needs"]];
    mods.forEach(([h, b], i) => {
      const w = 2.3, x = 0.6 + i * (w + 0.15);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.35, w, h: 1.85, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: `Module card ${i + 1}` });
      s.addText([{ text: h, options: { fontSize: 19, bold: true, color: C.accent1, breakLine: true } }, { text: b, options: { fontSize: 13, color: C.text1 } }], { x: x + 0.18, y: 2.45, w: w - 0.36, h: 1.65, margin: 0, valign: "top", isTextBox: true, objectName: `Module ${i + 1}` });
    });
    const stats = [[`≈ ${fmt(HOURS)} h`, `of admin time a year for ${cl.staffNote}, for everything on slide 15`], [`≈ ${Math.round(PER_PERSON_MONTH)} min`, "a month for each person, approvals included"], [money(cl.monthly), "a month, with support within 48 hours"], ["Own data", `kept in one database that ${cl.name} owns`]];
    stats.forEach(([big, label], i) => {
      const x = 0.6 + i * 3.08;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 4.45, w: 2.86, h: 1.9, rectRadius: 0.08, fill: { color: C.accent5 }, line: { color: C.accent5, width: 0 }, objectName: `Stat card ${i + 1}` });
      s.addText(big, { x: x + 0.2, y: 4.55, w: 2.46, h: 0.8, fontSize: i === 3 ? 30 : 34, bold: true, color: C.accent1, margin: 0, valign: "middle", isTextBox: true, objectName: `Stat ${i + 1}` });
      s.addText(label, { x: x + 0.2, y: 5.4, w: 2.46, h: 0.85, fontSize: 13, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: `Stat label ${i + 1}` });
    });
    s.addText(`Admin time is an estimate for ${cl.staffNote}; how it was worked out is on slide 15.`, { x: 0.6, y: 6.5, w: 12.1, h: 0.3, fontSize: 11, color: C.accent4, margin: 0, isTextBox: true, objectName: "Footnote" });
    s.addNotes(`The whole system on one page. Staff fill in timesheets, ask for time off, send requests and claims, and track tasks in one place, and every approval is recorded automatically. There are five modules, and ${cl.name} chooses which ones it needs; Finance can be completely customized to the finance team. For ${cl.staffNote}, all of this needs about ${fmt(HOURS)} hours of admin time a year in the system, which is about ${Math.round(PER_PERSON_MONTH)} minutes a month for each person, approvals included. The price is ${money(cl.monthly)} a month with support within 48 hours, and the data is kept in one database that ${cl.name} owns.`);
  }

  /* ================= Timesheets ================= */
  pres.addSection({ title: "Timesheets" });
  {
    const s = content("Timesheets: type the hours, the system does the math", "Timesheets");
    const f = await shot(s, "time", 0.65, 1.5, 7.5, 4.5, "My Timesheet: hours typed for each day, overtime worked out and banked automatically");
    caption(s, "Screen: My Timesheet, as an employee sees it.", 0.65, f.y + f.h + 0.1, 7.5);
    points(s, [["Type the hours for each day", "Here a 10-hour Wednesday among 7-hour days."], ["Overtime is worked out for you", "Banked at 1.5 hours for every hour, or paid: the employee chooses."], ["One button sends it for approval", "The supervisor approves it on screen."]], 8.6, 1.55, 4.15, 1.3);
    timeChip(s, "admin time per timesheet", "≈ 7 min", 8.6, 5.55, 4.15);
    s.addNotes("The timesheet. One: the employee types the hours worked each day. Two: the system works out overtime by itself and shows the banked balance; the employee chooses to bank it or have it paid. Three: one button sends it to the supervisor, who approves it on screen. Stat holidays and approved time off are already filled in. In the system a timesheet takes about seven minutes of admin time, the employee's and the supervisor's together.");
  }
  {
    const s = content("One page shows whose timesheet is missing", "Timesheets");
    const f = await shot(s, "ts-status", 0.65, 1.5, 6.3, 5.15, "Timesheet Status for one pay period with each person's status");
    caption(s, "Screen: Time & Attendance › By pay period.", 0.65, f.y + f.h + 0.1, 6.3);
    const x = f.x + f.w + 0.45, w = 12.75 - x;
    points(s, [["Progress for the pay period", "How many timesheets are approved."], ["One button reminds the rest", "Everyone who has not sent theirs gets a reminder."], ["Each person’s status", "Not started, submitted or approved."]], x, 1.5, w, 1.0);
    gain(s, "Ready for payroll on time.", "Approved hours, overtime and banked time go straight to the pay run.", x, 4.85, w, 1.25);
    s.addNotes("This page is for the person who collects the timesheets each pay period. One: the bar shows how many are approved. Two: one button reminds everyone who has not sent theirs. Three: each person's status: not started, submitted or approved. Approved hours, overtime and banked time go straight to the pay run.");
  }

  /* ================= Time off ================= */
  pres.addSection({ title: "Time off" });
  {
    const s = content("Time off: one short form, approved in one click", "Time off");
    const f = await shot(s, "timeoff", 0.65, 1.5, 2.8, 5.05, "The time-off request form with the balance left afterwards");
    caption(s, "Screen: My Time Off.", 0.65, f.y + f.h + 0.1, 2.8);
    const mx = f.x + f.w + 0.4, mw = 4.3;
    const g = await shot(s, "timeoff-list", mx, 1.5, mw, 1.5, "The employee's time-off requests, each with its status");
    gain(s, "Balances are always right.", "Approved days fill the timesheet and the team calendar by themselves.", mx - 0.05, g.y + g.h + 0.35, mw + 0.1, 1.2);
    timeChip(s, "admin time per request", "≈ 5 min", mx - 0.05, g.y + g.h + 1.75, mw + 0.1);
    const x = mx + mw + 0.45;
    points(s, [["Pick the type and the days", "The hours are worked out for you."], ["See what is left first", "The balance after this request, before it is sent."], ["One button sends it", "It goes straight to the supervisor."], ["Follow the status", "Who has it, and when it is approved."]], x, 1.5, 12.75 - x, 1.2);
    s.addNotes("Time off. One: pick the type of leave and the days, and the hours are worked out, leaving out weekends and stat holidays. Two: before anything is sent, the green box shows what will be left. Three: one button sends it to the supervisor; a doctor's note can be attached. Four: the list shows each request and its status. Approved days fill the timesheet and the team calendar by themselves. About five minutes of admin time per request.");
  }

  /* ================= Onboarding and offboarding ================= */
  pres.addSection({ title: "Onboarding and offboarding" });
  {
    const s = content("Onboarding and offboarding: every step, nothing missed", "Onboarding and offboarding");
    const f = await shot(s, "onboard", 0.65, 1.5, 4.2, 5.15, "Onboarding and offboarding: a new starter's checklist, the form to start an offboarding, and a leaving employee's checklist");
    caption(s, "Screen: People › Onboarding & offboarding.", 0.65, f.y + f.h + 0.1, 4.2);
    const x = f.x + f.w + 0.5, w = 12.75 - x;
    points(s, [["New starter checklist", "Agreement, tax forms, direct deposit and orientation, each with who does it and when."], ["Start an offboarding", "Pick the person, the last day and the reason. The checklist is assigned at once."], ["Leaving checklist", "Notice, exit interview, work handed over, keys and equipment back, access closed, final pay, benefits ended."], ["End employment in one step", "When every step is ticked, HR ends the employment and the Record of Employment is drafted for Payroll."]], x, 1.5, w, 1.02);
    gain(s, "Nothing is missed when people join or leave.", "HR, managers, IT and Payroll each see their own steps.", x, 5.75, w, 0.95);
    s.addNotes("Onboarding and offboarding. One: every new starter gets a checklist: signed agreement, TD1 tax forms, direct deposit and site orientation, each with who does it and by when. Ticking the last step makes them active. Two: when someone gives notice, HR picks the person, the last day and the reason, and the leaving checklist is assigned at once. Three: the checklist covers the notice on file, the exit interview, handing over work, returning keys, laptop and tools, closing email and system access, final pay including banked time and vacation, and ending benefits and pension. Four: when every step is ticked, HR ends the employment in one step and the Record of Employment is drafted for Payroll. Every tick is written to the audit log.");
  }

  /* ================= Requests ================= */
  pres.addSection({ title: "Requests" });
  {
    const s = content("Five kinds of request, each with its files and its history", "Requests");
    const types = [["Travel request", "Approval before a trip: where, when and the estimated cost."], ["Credit card purchase", "Approval before buying on the organization’s card."], ["Travel claim", "Mileage, meals and other costs after a trip."], ["Expense claim", "Money spent out of pocket, with the receipt."], ["Purchase order", "Approval to order from a supplier."]];
    types.forEach(([head, body], i) => {
      const y = 1.5 + i * 1.02;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 4.2, h: 0.9, rectRadius: 0.06, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: `Request type card ${i + 1}` });
      s.addText([{ text: head, options: { bold: true, fontSize: 16, color: C.text1, breakLine: true } }, { text: body, options: { fontSize: 13, color: C.accent4 } }], { x: 0.78, y, w: 3.9, h: 0.9, margin: 0, valign: "middle", isTextBox: true, objectName: `Request type ${i + 1}` });
    });
    const f = await shot(s, "req-attach", 5.15, 1.5, 4.55, 3.5, "An expense claim opened: its details, the attached receipt and its history");
    caption(s, "Screen: one expense claim opened.", 5.15, f.y + f.h + 0.1, 4.55);
    points(s, [["Files attached", "Receipts and quotes are added while filling in the request, and stay with it."], ["Its own history", "Who sent it, who approved or returned it, when, and any comment."]], f.x + f.w + 0.35, 1.5, 12.75 - (f.x + f.w + 0.35), 1.75);
    gain(s, "A proper audit trail for every type.", "The request, its files and each approval are kept together under one number. Nothing can be edited or removed.", 5.1, 5.45, 7.65, 1.15);
    s.addNotes("The five kinds of request: a travel request before a trip, a credit card purchase, a travel claim after a trip, an expense claim and a purchase order. Each is one short form. One: files such as a receipt or a quote are attached while filling in the request, and stay with it. Two: each request has its own history. Here the supervisor returned the claim asking for the full receipt. The request, its files and every approval are kept together under one number, and nothing can be edited or removed.");
  }
  {
    const s = content("Every request shows its route and its history", "Requests");
    const f = await shot(s, "req-track", 0.65, 1.5, 6.3, 5.15, "One request opened: the approval route across the top, its details and its history");
    caption(s, "Screen: one request opened. The bar shows the route.", 0.65, f.y + f.h + 0.1, 6.3);
    const x = f.x + f.w + 0.45, w = 12.75 - x;
    points(s, [["The route", "Who has approved and who is next."], ["The history", "Each step with name, date and comment."], ["The details", "Department and expense code are required."]], x, 1.5, w, 0.95);
    gain(s, "Nobody has to ask where a request is.", "The requester, the approvers and the people who process it all see the same page.", x, 4.5, w, 1.2);
    timeChip(s, "admin time per request, all steps", "≈ 30 min", x, 5.85, w);
    s.addNotes("One request opened. One: the bar across the top is the route: submitted, approved by the supervisor, and waiting at director level because it is over $5,000. Two: the history lists every step with the person's name, the date and any comment. Three: the details, including department and expense code. About thirty minutes of admin time per request, counting everyone who touches it. If a supervisor is away on approved leave, the request also goes to the next person up.");
  }

  /* ================= Purchase orders ================= */
  pres.addSection({ title: "Purchase orders" });
  {
    const s = content("Purchase orders: proper approval every time", "Purchase orders");
    const f = await shot(s, "po-print", 0.65, 1.5, 6.9, 3.0, "The one-page purchase order the system produces after the last approval");
    caption(s, "Screen: the one-page purchase order, ready to print or download as a PDF.", 0.65, f.y + f.h + 0.1, 6.9);
    ["Employee asks", "Supervisor approves", "Director level if over $5,000", "PO is ready, with its number"].forEach((t, i) => {
      const w = 1.65, x = 0.65 + i * (w + 0.1), y = 5.15;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 1.25, rectRadius: 0.06, fill: { color: i === 3 ? C.accent1 : C.accent5 }, line: { color: C.accent5, width: 0 }, objectName: `PO step ${i + 1}` });
      s.addText(t, { x: x + 0.06, y, w: w - 0.12, h: 1.25, fontSize: 14, bold: i === 3, color: i === 3 ? C.background1 : C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `PO step text ${i + 1}` });
    });
    const x = 8.0, w = 4.75;
    points(s, [["Every PO has a number", "One list shows where each one stands."], ["No step can be skipped", "Nobody approves their own order."], ["The PO shows who approved it", "The printed order always matches the approval."]], x, 1.5, w, 1.1);
    timeChip(s, "admin time per purchase order", "≈ 30 min", x, 5.15, w);
    s.addNotes("Purchase orders. The row of boxes is the path: the employee asks, the supervisor approves, anything over $5,000 also needs director level, and then the system produces the purchase order with its number. The picture is that one-page order, with the names of the people who approved it at the bottom. Nobody can approve their own order and no level can be skipped. The $5,000 limit is a setting an administrator can change. About thirty minutes of admin time per purchase order.");
  }

  /* ================= Team ================= */
  pres.addSection({ title: "Team" });
  {
    const s = content("My Tasks: assigned, tracked and reported in one place", "Team");
    const f = await shot(s, "tasks", 0.65, 1.5, 7.3, 4.4, "A task card: progress buttons on the left and the history of who did what on the right");
    caption(s, "Screen: My Tasks. One task a manager assigned to an employee.", 0.65, f.y + f.h + 0.1, 7.3);
    const x = 8.4, w = 4.35;
    points(s, [["Progress with one click", "25, 50, 75 or 100 percent."], ["The history", "Who did what, and when."], ["A note for the manager", "Sent straight from the task."]], x, 1.5, w, 0.95);
    gain(s, "A streamlined workflow and more productive teams.", "Everyone sees what is assigned, what is late and what is done.", x, 4.5, w, 1.2);
    timeChip(s, "admin time per update", "≈ 5 min", x, 5.85, w);
    s.addNotes("My Tasks. A manager assigns a task with a due date and steps. One: the employee updates progress with one click. Two: the history shows who created the task, who it was assigned to, each step and each note, with dates. Three: a note goes straight to the manager. Managers see the whole team's tasks on one page, with what is late or stuck. About five minutes per update.");
  }

  /* ================= Self-service and certificates ================= */
  pres.addSection({ title: "Self-service and certificates" });
  {
    const s = content("Staff check their own pay, job details and benefits", "Self-service and certificates");
    const f1 = await shot(s, "employment", 0.65, 1.5, 5.1, 2.6, "My Profile, Employment: job details and pay details");
    const f2 = await shot(s, "benefits", 0.65, f1.y + f1.h + 0.25, 5.1, 2.6, "My Profile, Pension and Benefits: plans, what the employee pays and what the employer adds");
    caption(s, "Screens: My Profile › Employment and Pension & Benefits.", 0.65, f2.y + f2.h + 0.1, 5.4);
    const x = 6.2, w = 6.55;
    points(s, [["Employment details", "Start date, position, location and who they report to."], ["Pay details", "Pay rate, pay schedule and every pay statement, the moment it is ready."], ["Pension and benefits", "The plans they are in, what comes off each pay and what the employer adds."]], x, 1.5, w, 0.95);
    gain(s, "The answer is instant, at any time.", "Each person sees only their own record, and HR answers fewer routine questions.", x, 4.6, w, 1.1);
    s.addNotes("Self-service. Every employee has My Profile and My Pay. One: employment details. Two: pay details and every pay statement as soon as it is ready. Three: pension and benefits: the plans, what comes off each pay and what the employer adds. The answer is instant, each person sees only their own record, and HR spends less time on routine questions.");
  }
  {
    const s = content("Certificates: expiry dates tracked for managers and HR", "Self-service and certificates");
    const f = await shot(s, "certs", 0.65, 1.5, 7.3, 4.4, "Training and certificates: expired and expiring counts, and each certificate with its expiry date and status");
    caption(s, "Screen: People › Certificates, as a manager sees it.", 0.65, f.y + f.h + 0.1, 7.3);
    const x = 8.4, w = 4.35;
    points(s, [["What needs attention", "Expired, and expiring within 60 days."], ["The expiry date", "With the days left for each one."], ["A clear status", "Expired, expiring soon or current."]], x, 1.5, w, 0.95);
    gain(s, "Nothing expires unnoticed.", "Managers see their own team. HR sees everyone, adds certificates and sends reminders.", x, 4.5, w, 1.4);
    s.addNotes("Certificates. The page lists the tickets, licences and training on file for each person. One: the boxes at the top show what has expired and what expires within 60 days. Two: each expiry date with the days left. Three: a clear status. Managers see their own team; HR sees everyone, adds certificates with the document itself and sends reminders with one click. Nothing expires unnoticed, which matters for safety and insurance.");
  }

  /* ================= Training and audit ================= */
  pres.addSection({ title: "Training and control" });
  {
    const s = content("Built-in How-to guides: new staff ready in about 2 weeks", "Training and control");
    const f = await shot(s, "howto", 0.65, 1.5, 7.3, 4.0, "A How-to guide: numbered steps on the left and a picture of the real screen on the right");
    caption(s, "Screen: How-to guides. One guide, as a new employee sees it.", 0.65, f.y + f.h + 0.1, 7.3);
    const x = 8.4, w = 4.35;
    points(s, [["The proper procedure, step by step", "Written in plain words, the same for everyone."], ["A picture of the real screen", "So people know what to look for."], ["One button opens the page", "Read the steps, then do the job."]], x, 1.5, w, 1.0);
    gain(s, "New staff are ready in about 2 weeks.", "Guides are grouped by role: employee, manager, HR and more.", x, 4.7, w, 1.2);
    s.addNotes("Training. A How-to section is built in. Each guide covers one job with numbered steps in plain words, a picture of the real screen, and a button that opens the page. Guides are grouped by role. With one system and the guides inside it, we estimate a new employee is comfortable in about two weeks.");
  }
  {
    const s = content("A proper audit trail, kept automatically", "Training and control");
    const f = await shot(s, "audit", 0.65, 1.5, 7.3, 4.05, "The audit log: when, who and what happened for every action, newest first");
    caption(s, "Screen: Administration › Audit log. One purchase order, step by step.", 0.65, f.y + f.h + 0.1, 7.3);
    points(s, [["When", "The date and time of every action, written the moment it happens."], ["Who", "The person who did it, by name."], ["What happened", "In plain words, with the request number, the step and any comment."]], 8.4, 1.5, 4.35, 1.15);
    gain(s, "Nothing can be edited or deleted.", "One searchable record, ready for auditors and funders.", 8.4, 5.05, 4.35, 1.4);
    s.addNotes("The audit trail. Every action is written to this log the moment it happens. One: when. Two: who, by name. Three: what happened, in plain words. In the picture you can follow one purchase order from submission to approval. Nothing can be edited or deleted; a request can only be returned, declined or closed, and that is logged too. It is one searchable record, which is what auditors and funders ask for.");
  }

  /* ================= Admin time ================= */
  pres.addSection({ title: "Admin time" });
  {
    const s = content(`Admin time with the system: about ${fmt(HOURS)} hours a year`, "Admin time");
    const head = (t, al) => ({ text: t, options: { bold: true, fontSize: 13, color: C.background1, fill: { color: HEX.dk2 }, align: al || "left", valign: "middle" } });
    const cell = (t, al, bold, color) => ({ text: t, options: { fontSize: 14, bold: !!bold, color: color || C.text1, align: al || "left", valign: "middle" } });
    const body = rows.map((r) => [cell(r.key, "left", true), cell(r.how), cell(fmt(r.count), "right"), cell(`${r.minutes} min`, "right"), cell(`${fmt(r.hours)} h`, "right", true, C.accent1)]);
    const total = [cell("Total", "left", true), cell(""), cell(""), cell(""), cell(`${fmt(HOURS)} h`, "right", true, C.accent1)].map((c) => ({ text: c.text, options: { ...c.options, fill: { color: HEX.accent5 } } }));
    s.addTable([[head("Task"), head("What it takes in the system"), head("How many a year", "right"), head("Each", "right"), head("Hours a year", "right")], ...body, total], { x: 0.6, y: 1.45, w: 12.15, colW: [2.4, 5.05, 1.75, 1.15, 1.8], rowH: [0.42, ...rows.map(() => 0.55), 0.55], border: { type: "solid", color: "E3E8E4", pt: 1 }, margin: [0.02, 0.1, 0.02, 0.1], objectName: "Admin time table" });
    [[`≈ ${Math.round(PER_PERSON_MONTH)} min`, "a month for each person, approvals included"], [`≈ ${fmt(HOURS / 52)} h`, "a week across the whole organization"]].forEach(([big, label], i) => {
      const x = 0.6 + i * 3.35;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.35, w: 3.15, h: 1.3, rectRadius: 0.08, fill: { color: C.accent5 }, line: { color: C.accent5, width: 0 }, objectName: `Admin stat card ${i + 1}` });
      s.addText([{ text: big, options: { fontSize: 28, bold: true, color: C.accent1, breakLine: true } }, { text: label, options: { fontSize: 13, color: C.text1 } }], { x: x + 0.2, y: 5.4, w: 2.75, h: 1.2, margin: 0, valign: "middle", isTextBox: true, objectName: `Admin stat ${i + 1}` });
    });
    s.addText([{ text: "How this was estimated", options: { bold: true, fontSize: 14, color: C.text1, breakLine: true } },
      { text: `${cl.staffNote}; a timesheet every two weeks; about 4 time-off requests, 6 requests or claims and 2–3 purchase orders a year per person; tasks updated about twice a month. Minutes include everyone who touches the item. All numbers can be changed in PowerPoint.`, options: { fontSize: 12, color: C.accent4 } }], { x: 7.4, y: 5.3, w: 5.35, h: 1.45, margin: 0, valign: "top", isTextBox: true, objectName: "Assumptions" });
    s.addNotes(`This slide estimates how much admin time these tasks need with the system for ${cl.staffNote}. Each row is one kind of task: what it takes in the system, how many there are in a year, the minutes for each one, counting everyone who touches it, and the hours a year. In total that is about ${fmt(HOURS)} hours a year, or about ${Math.round(PER_PERSON_MONTH)} minutes a month for each person, approvals included. The counts are assumptions: a timesheet every two weeks, about four time-off requests, six requests or claims and two to three purchase orders a year per person, and task updates about twice a month. Replacing them with ${cl.name}'s own counts gives the real figure.`);
  }

  /* ================= Independence ================= */
  pres.addSection({ title: "Independence" });
  {
    const s = content("Your system, your data, your people", "Independence");
    const cards = [
      [fa.FaDatabase, `${cl.name}’s own data storage`, `Records are kept in one central database that ${cl.name} owns and controls, hosted on its own servers or with a host in Canada.`],
      [fa.FaCogs, "No dependence on AI", "The system runs on fixed, ordinary rules that people set. It needs no AI service to work, and no information is sent to one."],
      [fa.FaSlidersH, "Fully customizable", "Shaped to how the leadership team and employees work: the modules, the approval rules, the forms and the wording."],
      [fa.FaUsers, "Local jobs, less outside dependence", "More HR work can be done in-house, and new positions can be created for local people with proper training."],
    ];
    for (let i = 0; i < cards.length; i++) {
      const [Icon, head, body] = cards[i]; const x = 0.6 + (i % 2) * 6.15, y = 1.5 + Math.floor(i / 2) * 2.65;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 5.95, h: 2.4, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: `Benefit card ${i + 1}` });
      s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.35, w: 0.85, h: 0.85, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: `Benefit icon circle ${i + 1}` });
      s.addImage({ data: await iconPng(Icon, "FFFFFF"), x: x + 0.52, y: y + 0.57, w: 0.41, h: 0.41, altText: head, objectName: `Benefit icon ${i + 1}` });
      s.addText(head, { x: x + 1.4, y: y + 0.3, w: 4.35, h: 0.5, fontSize: 20, bold: true, color: C.text1, margin: 0, valign: "middle", isTextBox: true, objectName: `Benefit heading ${i + 1}` });
      s.addText(body, { x: x + 1.4, y: y + 0.88, w: 4.35, h: 1.42, fontSize: 15, color: C.accent4, margin: 0, valign: "top", isTextBox: true, objectName: `Benefit text ${i + 1}` });
    }
    s.addNotes(`Four points that are not about minutes. First, ${cl.name}'s own data storage: one central database it owns and controls, on its own servers or with a host in Canada. Second, no dependence on AI: the system follows fixed rules that people set and sends no information to an AI service. Third, it is fully customizable: the modules, approval rules, forms and wording follow how the leadership team and employees work. Fourth, more HR work can be done in-house, and new positions can be created for local people with proper training.`);
  }

  /* ================= Pricing and timeline ================= */
  pres.addSection({ title: "Pricing and timeline" });
  {
    const s = content("Pricing and timeline", "Pricing and timeline");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.35, w: 5.2, h: 3.9, rectRadius: 0.06, fill: { color: C.accent5 }, line: { color: C.accent5, width: 0 }, objectName: "Price card" });
    s.addText([{ text: "MONTHLY PRICE", options: { fontSize: 13, bold: true, color: C.accent1, breakLine: true } }, { text: money(cl.monthly), options: { fontSize: 54, bold: true, color: C.accent1, breakLine: true } }, { text: "a month", options: { fontSize: 16, color: C.text1, breakLine: true } }, { text: " ", options: { fontSize: 8, breakLine: true } }, { text: `${money(cl.monthly * 12)} a year once running`, options: { fontSize: 15, bold: true, color: C.text1 } }], { x: 0.9, y: 1.5, w: 4.6, h: 2.6, margin: 0, valign: "top", isTextBox: true, objectName: "Price" });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 4.3, w: 5.2, h: 0.95, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: "Payment start bar" });
    s.addText("Monthly payments start only after the system is deployed to the whole organization.", { x: 0.85, y: 4.3, w: 4.7, h: 0.95, fontSize: 14, bold: true, color: C.background1, margin: 0, valign: "middle", isTextBox: true, objectName: "Payment start" });
    s.addText("What the price includes", { x: 6.2, y: 1.35, w: 6.5, h: 0.4, fontSize: 18, bold: true, color: C.text1, margin: 0, isTextBox: true, objectName: "Includes heading" });
    const inc = [["The modules you choose", "HR, Requests, Team and Operations; Finance customized to your finance team."], ["Support within 48 hours", "Questions and fixes answered within two working days."], ["Fully customizable", "Changed as the leadership team and employees need."], ["Your own data", `Kept in one database ${cl.name} owns, hosted in Canada.`]];
    inc.forEach(([h, b], i) => {
      const y = 1.85 + i * 0.85;
      s.addShape(pres.shapes.OVAL, { x: 6.2, y: y + 0.05, w: 0.32, h: 0.32, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: `Includes tick ${i + 1}` });
      s.addText("✓", { x: 6.2, y: y + 0.05, w: 0.32, h: 0.32, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `Includes tick mark ${i + 1}` });
      s.addText([{ text: h, options: { fontSize: 15, bold: true, color: C.text1, breakLine: true } }, { text: b, options: { fontSize: 12.5, color: C.accent4 } }], { x: 6.7, y: y - 0.02, w: 6.05, h: 0.8, margin: 0, valign: "top", isTextBox: true, objectName: `Includes ${i + 1}` });
    });
    const steps = [["Weeks 1–2", "Meetings with senior leaders, department managers and employees to gather requirements"], ["Weeks 3–6", "Implementation"], ["Weeks 7–8", "Trial in one or two departments"], ["Then", "Deployment to the whole organization. Monthly payments start here"]];
    steps.forEach(([when, what], i) => {
      const w = 3.05, x = 0.6 + i * (w - 0.02);
      s.addShape(i === 0 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON, { x, y: 5.6, w, h: 1.1, fill: { color: i === 3 ? C.accent1 : C.text2 }, line: { color: C.background1, width: 1 }, objectName: `Timeline step ${i + 1}` });
      s.addText([{ text: when, options: { fontSize: 14, bold: true, color: C.accent3, breakLine: true } }, { text: what, options: { fontSize: 11.5, color: C.background1 } }], { x: x + (i ? 0.6 : 0.2), y: 5.6, w: w - (i ? 1.1 : 0.72), h: 1.1, margin: 0, valign: "middle", isTextBox: true, objectName: `Timeline text ${i + 1}` });
    });
    s.addNotes(`Pricing and timeline. The price is ${money(cl.monthly)} a month, which is ${money(cl.monthly * 12)} a year once the system is running. It includes the modules ${cl.name} chooses, support within 48 hours, and changes to fit how the leadership team and employees work, and the data stays in a database ${cl.name} owns. The timeline is at the bottom. Weeks one and two: meetings with senior leaders, department managers and employees to gather requirements. Weeks three to six: implementation. Weeks seven and eight: a trial in one or two departments. Then the system is deployed to the whole organization, and the monthly payments start only at that point. Every number on this slide can be edited in PowerPoint.`);
  }

  /* ================= Next steps ================= */
  pres.addSection({ title: "Next steps" });
  {
    const s = pres.addSlide({ masterName: "Closing dark", sectionTitle: "Next steps" });
    s.addText("Where we are, and what happens next", { placeholder: "title" });
    s.addText([{ text: "Today: a working prototype", options: { bold: true, fontSize: 20, color: C.background1, breakLine: true } }, { text: "Every screen in this briefing is real and can be tried in a browser, with fictional people and figures. A user manual comes with the demo link.", options: { fontSize: 15, color: C.accent5 } }], { x: 0.7, y: 1.75, w: 4.6, h: 2.3, margin: 0, valign: "top", isTextBox: true, objectName: "Where we are" });
    s.addText([{ text: "Time to go live", options: { bold: true, fontSize: 20, color: C.background1, breakLine: true } }, { text: "About 8 weeks: 2 weeks gathering requirements, 4 weeks of implementation, then a 2-week trial in one or two departments.", options: { fontSize: 15, color: C.accent5 } }], { x: 0.7, y: 4.25, w: 4.6, h: 1.9, margin: 0, valign: "top", isTextBox: true, objectName: "Timeline" });
    const steps = [["Try the demo", "Pick the modules you need on the first page and follow the user manual."], ["Choose the modules", `Decide which modules ${cl.name} needs first.`], ["Meet to gather requirements", "Senior leaders, department managers and employees, in weeks 1 and 2."], ["Trial, then go live", "A trial in one or two departments, then the whole organization."]];
    steps.forEach(([head, body], i) => {
      const y = 1.75 + i * 1.18;
      s.addShape(pres.shapes.OVAL, { x: 6.1, y: y + 0.03, w: 0.55, h: 0.55, fill: { color: C.accent3 }, line: { color: C.accent3, width: 0 }, objectName: `Next step circle ${i + 1}` });
      s.addText(String(i + 1), { x: 6.1, y: y + 0.03, w: 0.55, h: 0.55, fontSize: 18, bold: true, color: C.text2, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `Next step number ${i + 1}` });
      s.addText([{ text: head, options: { bold: true, fontSize: 19, color: C.background1, breakLine: true } }, { text: body, options: { fontSize: 14, color: C.accent5 } }], { x: 6.9, y: y - 0.05, w: 5.8, h: 1.05, margin: 0, valign: "top", isTextBox: true, objectName: `Next step ${i + 1}` });
    });
    s.addNotes(`To close. What exists today is a working prototype: every screen in this briefing is real and can be tried in a browser, with fictional people and figures, and a user manual comes with the demo link. Going live takes about eight weeks: two weeks gathering requirements, four weeks of implementation and a two-week trial in one or two departments. The next steps are on the right: try the demo, choose the modules ${cl.name} needs, meet to gather requirements, and then the trial and go-live.`);
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT, "| hours", Math.round(HOURS), "min/person/month", Math.round(PER_PERSON_MONTH));
}

(async () => { for (const cl of CLIENTS) await build(cl); })();
