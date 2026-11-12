// Builds the Digital Operations Proposal for each organization:
//   NODE_PATH=<dir with pptxgenjs, sharp, react, react-dom, react-icons> node build-proposal.js <pptx skill dir>
// CHN keeps the current-tools cost comparison; the other organizations get the software estimate only.
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa");
const { applyTheme } = require(path.join(process.argv[2], "scripts/apply_theme.js"));

const SHOT = (n) => path.join(__dirname, "../exec-deck/shots", n + ".png");
const ORGS = [
  { file: "CHN", name: "CHN", short: "CHN", poss: "CHN’s", monthly: 3000, setup: 10000, current: true },
  { file: "Old_Massett_Village_Council", name: "Old Massett Village Council", short: "OMVC", poss: "OMVC’s", monthly: 2000 },
  { file: "Nisla_Naay", name: "Nisla Naay", short: "Nisla Naay", poss: "Nisla Naay’s", monthly: 1000 },
  { file: "Haida_Child_and_Family", name: "Haida Child and Family", short: "Haida Child and Family", poss: "Haida Child and Family’s", monthly: 1500 },
];
const fmt = (n) => Math.round(n).toLocaleString("en-CA");
const money = (n) => "$" + fmt(n);

const THEME = {
  name: "Digital Operations", headFontFace: "Calibri", bodyFontFace: "Calibri",
  colors: { dk1: "1E2A2C", lt1: "FFFFFF", dk2: "14342F", lt2: "F2F5F3", accent1: "2F6B4F", accent2: "B3402A", accent3: "C98A1B", accent4: "5E6B6E", accent5: "DCE8E0", accent6: "F6E3DD", hlink: "2F6B4F", folHlink: "5E6B6E" },
};
const HEX = THEME.colors;
const RULE = "DCE2DE";

async function build(org) {
  const OUT = path.resolve(__dirname, `../../${org.file}_Executive_Digital_Operations_Proposal.pptx`);
  const O = org.short, OP = org.poss;
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.author = "Andalib Olee"; pres.company = "HG Web"; pres.title = `${org.name}: Digital Operations Proposal`; pres.subject = "DEMO ERP: enterprise resource planning software";
  const C = pres.SchemeColor;
  const FOOT = `${org.name}  ·  Digital Operations Proposal  ·  working prototype, fictional demo data, figures are estimates`;

  pres.defineSlideMaster({ title: "Title dark", background: { color: C.text2 }, objects: [
    { rect: { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.accent3 } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.75, y: 1.85, w: 6.4, h: 2.6, fontSize: 38, bold: true, color: C.background1, align: "left", valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.75, y: 4.65, w: 6.4, h: 1.1, fontSize: 17, color: C.accent5, align: "left", valign: "top", margin: 0 }, text: "" } },
  ] });
  pres.defineSlideMaster({ title: "Content", background: { color: C.background1 }, margin: [0.5, 0.6, 0.7, 0.6], objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.55, w: 12.1, h: 0.75, fontSize: 28, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { rect: { x: 0.6, y: 1.36, w: 0.9, h: 0.045, fill: { color: C.accent3 } } },
    { line: { x: 0.6, y: 6.98, w: 12.15, h: 0, line: { color: RULE, width: 0.75 } } },
    { text: { text: FOOT, options: { x: 0.6, y: 7.04, w: 10.8, h: 0.28, fontSize: 9, color: C.accent4, margin: 0 } } },
  ], slideNumber: { x: 12.2, y: 7.04, w: 0.55, h: 0.28, fontSize: 9, color: C.accent4, align: "right" } });
  pres.defineSlideMaster({ title: "Closing dark", background: { color: C.text2 }, objects: [
    { rect: { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.accent3 } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.75, y: 0.6, w: 11.9, h: 0.9, fontSize: 32, bold: true, color: C.background1, align: "left", valign: "middle", margin: 0 }, text: "" } },
  ], slideNumber: { x: 12.2, y: 7.04, w: 0.55, h: 0.28, fontSize: 9, color: C.accent5, align: "right" } });

  /* ---------------- helpers ---------------- */
  const iconPng = async (Icon, hex) => { const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { color: "#" + hex, size: 256 })); return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64"); };
  const dims = async (n) => { const m = await sharp(SHOT(n)).metadata(); return [m.width, m.height]; };
  const shot = async (s, name, x, y, maxW, maxH, alt) => {
    const [pw, ph] = await dims(name); const k = Math.min(maxW / pw, maxH / ph), w = pw * k, h = ph * k;
    s.addShape(pres.shapes.RECTANGLE, { x: x - 0.04, y: y - 0.04, w: w + 0.08, h: h + 0.08, fill: { color: C.background1 }, line: { color: RULE, width: 0.75 }, shadow: { type: "outer", color: HEX.dk1, opacity: 0.14, blur: 10, offset: 2, angle: 90 }, objectName: `Frame ${name}` });
    s.addImage({ path: SHOT(name), x, y, w, h, altText: alt, objectName: `Screenshot ${name}` });
    return { x, y, w, h };
  };
  const caption = (s, text, x, y, w) => s.addText(text, { x, y, w, h: 0.28, fontSize: 10.5, italic: true, color: C.accent4, margin: 0, isTextBox: true, objectName: "Caption" });
  const points = (s, list, x, y, w, gap = 1.05) => list.forEach(([head, body], i) => {
    const yy = y + i * gap;
    s.addShape(pres.shapes.OVAL, { x, y: yy + 0.02, w: 0.38, h: 0.38, fill: { color: C.accent2 }, line: { color: C.accent2, width: 0 }, objectName: `Marker ${i + 1}` });
    s.addText(String(i + 1), { x, y: yy + 0.02, w: 0.38, h: 0.38, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `Marker number ${i + 1}` });
    s.addText([{ text: head, options: { bold: true, fontSize: 16, color: C.text1, breakLine: true } }, { text: body, options: { fontSize: 13, color: C.accent4 } }], { x: x + 0.55, y: yy - 0.03, w: w - 0.55, h: gap - 0.08, valign: "top", margin: 0, isTextBox: true, objectName: `Point ${i + 1}` });
  });
  /** Today vs New system, as an editable table */
  const compare = (s, rows, x, y, w) => {
    const hdr = (t, fill) => ({ text: t, options: { bold: true, fontSize: 10.5, color: C.background1, fill: { color: fill }, align: "center", valign: "middle", charSpacing: 1 } });
    const val = (t, color, fill) => ({ text: t, options: { fontSize: t.length > 10 ? 12.5 : 15, bold: true, color, align: "center", valign: "middle", fill: { color: fill } } });
    const body = rows.map(([label, a, b]) => [{ text: label, options: { fontSize: 12.5, color: C.text1, valign: "middle", fill: { color: C.background2 } } }, val(a, C.accent2, C.accent6), val(b, C.accent1, C.accent5)]);
    s.addTable([[{ text: "", options: { fill: { color: C.background1 } } }, hdr("TODAY", HEX.accent2), hdr("NEW SYSTEM", HEX.accent1)], ...body], { x, y, w, colW: [w * 0.42, w * 0.28, w * 0.30], rowH: [0.34, ...rows.map(() => 0.46)], border: { type: "solid", color: HEX.lt1, pt: 2 }, margin: [0.02, 0.08, 0.02, 0.1], objectName: "Today vs new system" });
    return y + 0.34 + rows.length * 0.46;
  };
  const note = (s, text, x, y, w, h = 0.3) => s.addText(text, { x, y, w, h, fontSize: 10.5, color: C.accent4, margin: 0, valign: "top", isTextBox: true, objectName: "Footnote" });
  const today = (s, text, x, y, w, h = 0.55, extra) => s.addText([{ text: "Today: ", options: { bold: true, color: C.accent2 } }, { text, options: { color: C.text1 } }, ...(extra || [])], { x, y, w, h, fontSize: 13, margin: 0, valign: "top", isTextBox: true, objectName: "Today" });
  const panel = (s, head, body, x, y, w, h, tone = "green") => {
    const fill = tone === "red" ? C.accent6 : C.accent5, color = tone === "red" ? C.accent2 : C.accent1;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: "Panel" });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.06, h, fill: { color }, line: { color, width: 0 }, objectName: "Panel edge" });
    s.addText([...(head ? [{ text: head + " ", options: { bold: true, color } }] : []), { text: body, options: { color: C.text1 } }], { x: x + 0.25, y: y + 0.05, w: w - 0.4, h: h - 0.1, fontSize: 13.5, margin: 0, valign: "middle", isTextBox: true, objectName: "Panel text" });
  };
  let SEC = "";
  const content = (title, section) => {
    if (section) SEC = section;
    const s = pres.addSlide({ masterName: "Content", sectionTitle: SEC });
    s.addText(SEC.toUpperCase(), { x: 0.6, y: 0.28, w: 8, h: 0.26, fontSize: 10.5, bold: true, color: C.accent1, charSpacing: 2, margin: 0, isTextBox: true, objectName: "Section label" });
    s.addText(title, { placeholder: "title" });
    return s;
  };
  const Y = 1.65; // where content starts
  // slide numbers referred to in the text
  const N = { estimate: 3, pricing: 21 };
  const EST = `Estimates for an illustrative organization of 100 staff; how they were estimated is on slide ${N.estimate}.`;

  /* ================= 1. Title ================= */
  pres.addSection({ title: "Overview" });
  {
    const s = pres.addSlide({ masterName: "Title dark", sectionTitle: "Overview" });
    s.addText("DIGITAL OPERATIONS PROPOSAL", { x: 0.75, y: 1.3, w: 6.4, h: 0.35, fontSize: 12, bold: true, color: C.accent3, charSpacing: 3, margin: 0, isTextBox: true, objectName: "Eyebrow" });
    s.addText("One place for requests, purchase orders, timesheets and tasks", { placeholder: "title" });
    s.addText([{ text: "A working prototype and a phased digital operations proposal", options: { breakLine: true } }, { text: `Briefing for ${org.name === "CHN" ? "the CHN Executive Committee" : org.name} · November 2026`, options: { fontSize: 14 } }], { placeholder: "body" });
    s.addShape(pres.shapes.LINE, { x: 0.75, y: 6.2, w: 2.2, h: 0, line: { color: C.accent3, width: 1 }, objectName: "Title rule" });
    s.addText("Prepared by Andalib Olee", { x: 0.75, y: 6.32, w: 6, h: 0.3, fontSize: 12, color: C.accent5, margin: 0, isTextBox: true, objectName: "Prepared by" });
    await shot(s, "home-top", 7.75, 1.7, 4.95, 4.0, "The prototype's Home page: an employee's summary, things that need attention and what is coming up");
    s.addNotes(`Opening. This is a briefing for ${org.name} on a working prototype: one central system for requests, purchase orders, timesheets and tasks, with time off, onboarding and offboarding, self-service and certificates. The picture is the real Home page of the prototype; all names and figures in the screenshots are fictional.`);
  }

  /* ================= 2. Agenda ================= */
  {
    const s = content("This briefing", "Overview");
    const items = [["The proposal in one minute", "What changes and the estimated effect", "3"], ["Timesheets, time off and people", "Timesheets, time off, onboarding and offboarding", "4–7"], ["Requests and purchase orders", "Five request types, approval routes and POs", "8–12"],
      ["Tasks, self-service and training", "My Tasks, staff self-service, certificates, How-to guides", "13–16"], ["Control and governance", "Admin time, audit trail, independence, security", "17–20"], ["Pricing, timeline and next steps", org.current ? "Costs, the path to a pilot and the decision" : "Software estimate, the path to a pilot and next steps", "21–22"]];
    items.forEach(([h, b, pg], i) => {
      const col = i % 2, row = Math.floor(i / 2), x = 0.6 + col * 6.15, y = Y + 0.05 + row * 1.68;
      s.addShape(pres.shapes.LINE, { x, y, w: 5.9, h: 0, line: { color: RULE, width: 0.75 }, objectName: `Agenda rule ${i + 1}` });
      s.addText(String(i + 1).padStart(2, "0"), { x, y: y + 0.18, w: 0.9, h: 0.7, fontSize: 30, bold: true, color: C.accent3, margin: 0, valign: "top", isTextBox: true, objectName: `Agenda number ${i + 1}` });
      s.addText([{ text: h, options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: b, options: { fontSize: 13, color: C.accent4 } }], { x: x + 1.0, y: y + 0.2, w: 4.0, h: 1.2, margin: 0, valign: "top", isTextBox: true, objectName: `Agenda item ${i + 1}` });
      s.addText(`Slides ${pg}`, { x: x + 4.9, y: y + 0.24, w: 1.0, h: 0.3, fontSize: 10.5, color: C.accent4, align: "right", margin: 0, isTextBox: true, objectName: `Agenda pages ${i + 1}` });
    });
    s.addNotes("The briefing has six parts: the proposal in one minute; timesheets, time off and people; requests and purchase orders; tasks, self-service and training; control and governance; and pricing, timeline and next steps.");
  }

  /* ================= 3. Proposal in one minute ================= */
  {
    const s = content("The proposal in one minute", "Overview");
    s.addText("Today, requests, purchase orders and timesheets rely on paper and PDF forms, signatures, scans and email. Tasks have no shared workspace. The proposal brings all four into one system, with approvals and status recorded centrally.", { x: 0.6, y: Y, w: 12.1, h: 0.75, fontSize: 16, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: "Summary statement" });
    const cards = [["≈ 1/3", "of the admin task time: a request, purchase order or timesheet takes about one third of the time it takes today"], ["≈ 1,400 h", "estimated admin capacity recovered per year, per 100 staff"], (org.current ? ["≈ 8 weeks", "planning target from discovery through a controlled pilot; rollout is separate"] : ["4–6 weeks", "planning target from discovery to go-live, including a short pilot"]), ["One shared platform", "for requests, purchase orders, timesheets and tasks"]];
    cards.forEach(([big, label], i) => {
      const x = 0.6 + i * 3.06, y = Y + 0.95;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.86, h: 2.15, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: `Stat card ${i + 1}` });
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.86, h: 0.06, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: `Stat card top ${i + 1}` });
      s.addText(big, { x: x + 0.22, y: y + 0.22, w: 2.45, h: 0.8, fontSize: i === 3 ? 24 : 36, bold: true, color: C.accent1, margin: 0, valign: "middle", isTextBox: true, objectName: `Stat ${i + 1}` });
      s.addText(label, { x: x + 0.22, y: y + 1.08, w: 2.45, h: 1.0, fontSize: 12.5, color: C.text1, margin: 0, valign: "top", isTextBox: true, objectName: `Stat label ${i + 1}` });
    });
    s.addText("How these were estimated", { x: 0.6, y: 5.0, w: 12.1, h: 0.3, fontSize: 13.5, bold: true, color: C.text1, margin: 0, isTextBox: true, objectName: "Assumptions heading" });
    s.addText([
      { text: "Illustrative organization of 100 staff: 2,600 timesheets a year (one per employee every two weeks), about 600 requests and 240 purchase orders.", options: { bullet: true, breakLine: true } },
      { text: "Assumed admin time today: a 90-minute midpoint for each request or purchase order and about 20 minutes for each timesheet. The proposed workflow is estimated at about one third of that time.", options: { bullet: true, breakLine: true } },
      { text: `These volumes and processing times are planning assumptions. Validate ${OP} actual counts and baseline during discovery. Pricing is summarized on slide ${N.pricing}.`, options: { bullet: true } },
    ], { x: 0.6, y: 5.35, w: 12.1, h: 1.5, fontSize: 11.5, color: C.text1, margin: 0, valign: "top", paraSpaceAfter: 3, isTextBox: true, objectName: "Assumptions" });
    s.addNotes(`The whole proposal on one page. Requests, purchase orders and timesheets rely today on paper and PDF forms, signatures, scans and email, and tasks have no shared workspace. The proposal brings all four into one system with approvals and status recorded centrally. A request, purchase order or timesheet is estimated to take about one third of today's admin time, which is roughly 1,400 hours a year for every 100 staff. ${org.current ? "The planning target from discovery through a controlled pilot is about eight weeks; rollout is a separate step." : "The planning target from discovery to go-live, including a short pilot, is four to six weeks."} These are planning assumptions to validate with ${OP} own counts during discovery.`);
  }

  /* ================= Timesheets ================= */
  pres.addSection({ title: "Timesheets, time off and people" });
  {
    const s = content("Timesheets: type the hours, the system does the math", "Timesheets, time off and people");
    const f = await shot(s, "time", 0.65, Y, 7.4, 4.25, "My Timesheet: hours typed for each day, overtime worked out and banked automatically");
    caption(s, "Screen: My Timesheet, as an employee sees it.", 0.65, f.y + f.h + 0.1, 7.4);
    today(s, "a paper or spreadsheet timesheet, signed, scanned and emailed. Overtime and banked time are counted by hand.", 0.65, f.y + f.h + 0.45, 7.4);
    points(s, [["Type the hours for each day", "Here a 10-hour Wednesday among 7-hour days."], ["Overtime is worked out for you", `Overtime uses ${O}-approved rules. The banked-time balance updates automatically.`], ["One button sends it for approval", "The supervisor approves it on screen. No paper, no scan."]], 8.5, Y, 4.25, 1.2);
    panel(s, "", `Overtime thresholds, multipliers and leave calculations must be configured to approved ${O} policy and tested before launch.`, 8.5, 5.4, 4.25, 1.15);
    s.addNotes(`The timesheet. One: the employee types the hours each day. Two: overtime is worked out using ${O}-approved rules and the banked balance updates automatically. Three: one button sends it to the supervisor. Overtime and leave rules must be configured to approved ${O} policy and tested before launch.`);
  }
  {
    const s = content("One page shows who has not sent a timesheet");
    const f = await shot(s, "ts-status", 0.65, Y, 6.2, 5.0, "Timesheet Status for one pay period with each person's status");
    caption(s, "Screen: Time & Attendance › By pay period.", 0.65, f.y + f.h + 0.1, 6.2);
    const x = f.x + f.w + 0.5, w = 12.75 - x;
    points(s, [["Progress for the pay period", "How many timesheets are approved."], ["One button reminds the rest", "No chasing by email or phone."], ["Each person’s status", "Not started, submitted or approved."]], x, Y, w, 0.85);
    note(s, EST, x, compare(s, [["Steps people do", "5", "2"], ["Time per timesheet", "≈ 20 min", "≈ 7 min"], ["Overtime, banked time", "by hand", "automatic"], ["Chasing late ones", "one by one", "one button"]], x, Y + 2.65, w) + 0.12, w, 0.45);
    s.addNotes("This page is for whoever collects timesheets each pay period: progress, one button to remind everyone who has not sent theirs, and each person's status.");
  }
  {
    const s = content("Time off: one short form instead of a PDF and an email");
    const f = await shot(s, "timeoff", 0.65, Y, 2.75, 4.95, "The time-off request form with the balance left afterwards");
    caption(s, "Screen: My Time Off.", 0.65, f.y + f.h + 0.1, 2.75);
    const mx = f.x + f.w + 0.4, mw = 4.3;
    const g = await shot(s, "timeoff-list", mx, Y, mw, 1.45, "The employee's time-off requests, each with its status");
    panel(s, "Today:", "a PDF form is filled in, signed and emailed, and the balance is checked by asking.", mx - 0.04, g.y + g.h + 0.3, mw + 0.08, 0.95, "red");
    compare(s, [["How it is asked", "PDF + email", "one form"], ["Balance left", "ask HR", "shown first"], ["On the timesheet", "typed again", "fills itself"]], mx - 0.04, g.y + g.h + 1.5, mw + 0.08);
    const x = mx + mw + 0.45;
    points(s, [["Pick the type and the days", "The hours are worked out for you."], ["See what is left first", "The balance after this request, before it is sent."], ["One button sends it", "It goes straight to the supervisor."], ["Follow the status", "Who has it, and when it is approved."]], x, Y, 12.75 - x, 1.2);
    s.addNotes("Time off. Pick the type and days, see the balance left before sending, send it to the supervisor with one button, and follow the status. Approved hours fill the timesheet automatically.");
  }
  {
    const s = content("Onboarding and offboarding: every step, nothing missed");
    const f = await shot(s, "onboard", 0.65, Y, 4.1, 5.05, "Onboarding and offboarding checklists");
    caption(s, "Screen: People › Onboarding & offboarding.", 0.65, f.y + f.h + 0.1, 4.1);
    const x = f.x + f.w + 0.5, w = 12.75 - x;
    points(s, [["New starter checklist", "Agreement, tax forms, direct deposit and orientation, each with who does it and when."], ["Start an offboarding", "Pick the person, the last day and the reason. The checklist is assigned at once."], ["Leaving checklist", "Notice, exit interview, work handed over, keys and equipment back, access closed, final pay, benefits ended."], ["Close the checklist", "When every step is complete, HR reviews and closes the checklist. Payroll prepares and validates the Record of Employment through the approved process."]], x, Y, w, 0.98);
    today(s, "paper checklists and emails between HR, the manager, IT and Payroll, and steps such as returning keys or closing access are easy to miss.", x, 5.75, w, 0.7);
    s.addNotes("Onboarding and offboarding. New starters get a checklist with owners and dates. When someone leaves, HR starts an offboarding and the leaving checklist is assigned at once. When every step is complete, HR reviews and closes the checklist, and Payroll prepares and validates the Record of Employment through the approved process.");
  }

  /* ================= Requests and POs ================= */
  pres.addSection({ title: "Requests and purchase orders" });
  {
    const s = content("Requests: every type in one place, with its status", "Requests and purchase orders");
    const f = await shot(s, "req-list", 0.65, Y, 7.2, 4.4, "My requests: a searchable list of an employee's requests, each with a status");
    caption(s, "Screen: My requests, as an employee sees it.", 0.65, f.y + f.h + 0.1, 7.2);
    today(s, "a paper or PDF form for each type, saved and passed on as an email attachment. To know where one is, you ask around.", 0.65, f.y + f.h + 0.45, 7.2, 0.6);
    points(s, [["Find any request in seconds", "Search by number, person, department or what it was for."], ["See where it stands right now", "Awaiting approval, awaiting director level, returned to you, or ready."], ["A searchable record", "Each request stays on a numbered list with its status and history, reducing the risk of forms being lost in inboxes or filing trays."]], 8.35, Y, 4.4, 1.2);
    panel(s, "Five request types, one short form each:", "travel, credit card purchase, travel claim, expense claim and purchase order.", 8.35, 5.55, 4.4, 0.95);
    s.addNotes("Requests. One searchable list with a plain-words status for every request, kept on a numbered record so forms are not lost in inboxes or filing trays.");
  }
  {
    const s = content("Five kinds of request, each with its files and its history");
    const types = [["Travel request", "Approval before a trip: where, when and the estimated cost."], ["Credit card purchase", "Approval before buying something on the organization’s card."], ["Travel claim", "Mileage, meals and other costs after a trip."], ["Expense claim", "Money spent out of pocket, with the receipt."], ["Purchase order", "Approval to order from a supplier."]];
    types.forEach(([head, body], i) => {
      const y = Y + i * 0.98;
      s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y, w: 4.2, h: 0.86, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: `Request type card ${i + 1}` });
      s.addText([{ text: head, options: { bold: true, fontSize: 15, color: C.text1, breakLine: true } }, { text: body, options: { fontSize: 12, color: C.accent4 } }], { x: 0.78, y, w: 3.9, h: 0.86, margin: 0, valign: "middle", isTextBox: true, objectName: `Request type ${i + 1}` });
    });
    const f = await shot(s, "req-attach", 5.15, Y, 4.5, 3.4, "An expense claim opened: its details, the attached receipt and its history");
    caption(s, "Screen: one expense claim opened.", 5.15, f.y + f.h + 0.1, 4.5);
    points(s, [["Files attached", "Receipts, quotes and other files are added while filling in the request. They stay with it."], ["Its own history", "Who sent it, who approved or returned it, when, and any comment."]], f.x + f.w + 0.35, Y, 12.75 - (f.x + f.w + 0.35), 1.7);
    panel(s, "A traceable record for every request.", "The request, attachments and approval events stay together under one number. Permitted corrections are captured as additional history, rather than silently overwriting the record.", 5.1, 5.55, 7.65, 1.0);
    s.addNotes("Five request types, each one short form. Files are attached while filling in the request and stay with it; each request has its own history. Permitted corrections are captured as additional history rather than overwriting the record.");
  }
  {
    const s = content("A request moves in minutes, and everyone can see it");
    const f = await shot(s, "req-track", 0.65, Y, 6.2, 5.0, "One request opened: the approval route, its details and its history");
    caption(s, "Screen: one request opened. The bar shows the route.", 0.65, f.y + f.h + 0.1, 6.2);
    const x = f.x + f.w + 0.5, w = 12.75 - x;
    points(s, [["The route", "Who has approved and who is next."], ["The history", "Each step with name, date and comment."], ["The details", "Department and expense code are required."]], x, Y, w, 0.85);
    note(s, EST, x, compare(s, [["Steps people do", "6", "2"], ["Emails written", "≈ 3", "0"], ["Time per request", "1–2 hours", "≈ 30 min"], ["Signatures", "hand or e-sign", "one click"]], x, Y + 2.65, w) + 0.12, w, 0.45);
    s.addNotes("One request opened: the route across the top, the history with names, dates and comments, and the required details. About six steps on paper become two.");
  }
  {
    const s = content("Today a purchase order travels by paper, scanner and email");
    const row = (label, steps, y, fill, color, w, gap, h, fs) => {
      s.addText(label, { x: 0.6, y, w: 8, h: 0.3, fontSize: 11, bold: true, color, charSpacing: 1, margin: 0, isTextBox: true, objectName: `${label} label` });
      steps.forEach((t, i) => {
        const x = 0.6 + i * (w + gap);
        s.addShape(pres.shapes.RECTANGLE, { x, y: y + 0.38, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: `${label} step ${i + 1}` });
        s.addText([{ text: `${i + 1}  `, options: { bold: true, color } }, { text: t }], { x: x + 0.12, y: y + 0.38, w: w - 0.24, h, fontSize: fs, color: C.text1, margin: 0, valign: "middle", isTextBox: true, objectName: `${label} step text ${i + 1}` });
        if (i < steps.length - 1) s.addText("›", { x: x + w, y: y + 0.38, w: gap, h, fontSize: 18, bold: true, color, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `${label} arrow ${i + 1}` });
      });
    };
    row("TODAY: PAPER, SIGNATURES, SCANNER AND EMAIL", ["A paper PO form is filled in by hand", "It is taken round for signatures", "Someone scans it", "The scan is sent to Finance; the department keeps one copy", "Finance stores it on a computer", "Later it has to be hunted for. Sometimes it is missing"], Y, C.accent6, C.accent2, 1.82, 0.2, 1.2, 12.5);
    row("WITH THE SYSTEM: ONE PLACE", ["It is filled in online", "The supervisor approves with one click", "Director level approves if it is over $5,000", "The PO is numbered and stays on record"], Y + 1.85, C.accent5, C.accent1, 2.82, 0.28, 0.85, 13);
    [["Pages printed", "about 3", "0"], ["Missing purchase orders", "sometimes", "risk reduced"]].forEach(([label, a, b], i) => {
      const x = 0.6 + i * 2.85;
      s.addText(label, { x, y: 5.0, w: 2.7, h: 0.3, fontSize: 12, color: C.accent4, margin: 0, isTextBox: true, objectName: `Flow stat label ${i + 1}` });
      s.addText([{ text: a, options: { color: C.accent2, bold: true, breakLine: true } }, { text: "→ " + b, options: { color: C.accent1, bold: true } }], { x, y: 5.32, w: 2.75, h: 0.9, fontSize: 18, margin: 0, valign: "top", isTextBox: true, objectName: `Flow stat ${i + 1}` });
    });
    s.addText([{ text: "Nobody writes an email. ", options: { bold: true, color: C.text1 } }, { text: "The system sends the notices itself:", options: { color: C.accent4 } }], { x: 6.4, y: 5.0, w: 6.4, h: 0.3, fontSize: 12, margin: 0, isTextBox: true, objectName: "Notices heading" });
    const m1 = await shot(s, "mail-approver", 6.45, 5.4, 3.0, 1.1, "The automatic notice a supervisor receives");
    const m2 = await shot(s, "mail-staff", 9.7, 5.4, 3.0, 1.1, "The automatic notice the employee receives");
    caption(s, "The supervisor receives this", m1.x, m1.y + m1.h + 0.06, 3.0); caption(s, "The employee receives this", m2.x, m2.y + m2.h + 0.06, 3.0);
    s.addNotes("How a purchase order moves today: paper form, signatures, scan, email to Finance, stored on a computer, and later hunted for. In the system it is filled in online, approved with one click, director level above $5,000, and numbered on record. The system sends the notices itself.");
  }
  {
    const s = content("Purchase order approvals: controlled and traceable");
    const f = await shot(s, "po-print", 0.65, Y, 6.9, 2.95, "The one-page purchase order the system produces after the last approval");
    caption(s, "Screen: the one-page purchase order, ready to print or download as a PDF.", 0.65, f.y + f.h + 0.1, 6.9);
    ["Employee asks", "Supervisor approves", "Director level if over $5,000", "PO is ready, with its number"].forEach((t, i) => {
      const w = 1.65, x = 0.65 + i * (w + 0.1), y = 5.25;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 1.15, fill: { color: i === 3 ? C.accent1 : C.accent5 }, line: { color: C.accent5, width: 0 }, objectName: `PO step ${i + 1}` });
      s.addText(t, { x: x + 0.06, y, w: w - 0.12, h: 1.15, fontSize: 13, bold: i === 3, color: i === 3 ? C.background1 : C.text1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `PO step text ${i + 1}` });
    });
    const x = 8.0, w = 4.75;
    s.addText("What changes for one purchase order", { x, y: Y, w, h: 0.35, fontSize: 15, bold: true, color: C.text1, margin: 0, isTextBox: true, objectName: "Compare heading" });
    const end = compare(s, [["Steps people do", "8", "3"], ["Time per order", "1–2 hours", "≈ 30 min"], ["Pages printed", "≈ 3", "0 to 1"], ["PO location", "scattered", "centralized"]], x, Y + 0.45, w);
    panel(s, "The workflow can enforce the configured approval sequence.", "Self-approval should be blocked, and approved delegation and exception rules must be defined, tested and recorded. The PO should show its approval history.", x, end + 0.25, w, 1.45);
    note(s, EST, x, 6.5, w, 0.4);
    s.addNotes("The approval path: employee, supervisor, director level above $5,000, then the PO with its number. The workflow can enforce the configured sequence; self-approval should be blocked and delegation and exception rules defined, tested and recorded.");
  }

  /* ================= Tasks, self-service, training ================= */
  pres.addSection({ title: "Tasks, self-service and training" });
  {
    const s = content("My Tasks: assigned, tracked and reported in one place", "Tasks, self-service and training");
    const f = await shot(s, "tasks", 0.65, Y, 7.2, 4.35, "A task card with progress buttons and history");
    caption(s, "Screen: My Tasks. One task a manager assigned to an employee.", 0.65, f.y + f.h + 0.1, 7.2);
    const x = 8.35, w = 4.4;
    points(s, [["Progress with one click", "25, 50, 75 or 100 percent."], ["The history", "Who did what, and when."], ["A note for the manager", "It replaces the status email."]], x, Y, w, 0.85);
    panel(s, "Today: nothing like this.", "Tasks are given by email or in a meeting, and progress is found out by asking.", x, 4.35, w, 1.0, "red");
    panel(s, "A streamlined workflow and more productive teams.", "Everyone sees what is assigned, what is late and what is done.", x, 5.5, w, 1.0);
    s.addNotes("My Tasks: progress with one click, the history of who did what, and a note for the manager that replaces the status email.");
  }
  {
    const s = content("Staff check their own pay, job details and benefits");
    const f1 = await shot(s, "employment", 0.65, Y, 5.05, 2.5, "My Profile, Employment: job and pay details");
    const f2 = await shot(s, "benefits", 0.65, f1.y + f1.h + 0.22, 5.05, 2.5, "My Profile, Pension and Benefits");
    caption(s, "Screens: My Profile › Employment and Pension & Benefits, as an employee sees them.", 0.65, f2.y + f2.h + 0.08, 6.0);
    const x = 6.2, w = 6.55;
    points(s, [["Employment details", "Start date, position, location and who they report to."], ["Pay details", "Pay rate, pay schedule and every pay statement, the moment it is ready."], ["Pension and benefits", "The plans they are in, what comes off each pay and what the employer adds."]], x, Y, w, 0.92);
    panel(s, "Today:", "an email to Finance or HR, then a wait for someone to look it up and reply.", x, 4.5, w, 0.8, "red");
    panel(s, "With the system:", "employees can view the records permitted by their role once access rules and payroll/benefits data connections have been configured and tested.", x, 5.45, w, 1.05);
    s.addNotes("Self-service: employment details, pay details and pension and benefits. Employees can view the records permitted by their role once access rules and payroll and benefits data connections have been configured and tested.");
  }
  {
    const s = content("Certificates: expiry dates tracked for managers and HR");
    const f = await shot(s, "certs", 0.65, Y, 7.2, 4.3, "Training and certificates with expiry dates and status");
    caption(s, "Screen: People › Certificates, as a manager sees it.", 0.65, f.y + f.h + 0.1, 7.2);
    today(s, "expiry dates sit in files and spreadsheets, and a lapsed certificate is often noticed only after it has expired.", 0.65, f.y + f.h + 0.45, 7.2);
    const x = 8.35, w = 4.4;
    points(s, [["What needs attention", "Expired, and expiring within 60 days."], ["The expiry date", "With the days left for each one."], ["A clear status", "Expired, expiring soon or current."]], x, Y, w, 0.85);
    note(s, "Managers see their own team. HR sees everyone, adds certificates and sends reminders.", x, compare(s, [["Finding a date", "look it up", "one list"], ["Early warning", "none", "60 days"], ["Reminders", "by hand", "one click"]], x, Y + 2.65, w) + 0.12, w, 0.5);
    s.addNotes("Certificates: what needs attention, each expiry date and a clear status. Managers see their own team; HR sees everyone and sends reminders.");
  }
  {
    const s = content("Built-in How-to guides: target faster staff onboarding");
    const f = await shot(s, "howto", 0.65, Y, 7.2, 3.9, "A How-to guide with steps and a picture of the screen");
    caption(s, "Screen: How-to guides. One guide, as a new employee sees it.", 0.65, f.y + f.h + 0.1, 7.2);
    today(s, "a new employee often learns forms and processes by asking colleagues; the current 2–3 month estimate should be validated with managers.", 0.65, f.y + f.h + 0.45, 7.2, 0.6);
    const x = 8.35, w = 4.4;
    points(s, [["The proper procedure, step by step", "Written in plain words, the same for everyone."], ["A picture of the real screen", "So people know what to look for."], ["One button opens the page", "Read the steps, then do the job."]], x, Y, w, 0.85);
    note(s, "Training times are planning estimates; the two-week figure is a target to test during the pilot.", x, compare(s, [["Training a new hire", "2–3 months", "2-week target"], ["How people learn", "ask around", "follow guide"], ["Guides by role", "none", "built in"]], x, Y + 2.65, w) + 0.12, w, 0.5);
    s.addNotes("How-to guides: the procedure step by step, a picture of the real screen, and a button that opens the page. The two-week training figure is a target to test during the pilot.");
  }

  /* ================= Control and governance ================= */
  pres.addSection({ title: "Control and governance" });
  {
    const s = content("Illustrative administrative-time estimate: about one third", "Control and governance");
    const cats = ["Request", "Purchase order", "Timesheet"];
    s.addChart(pres.charts.BAR, [{ name: "Today", labels: cats, values: [90, 90, 20] }, { name: "With the system", labels: cats, values: [30, 30, 7] }], {
      x: 0.6, y: Y - 0.05, w: 7.6, h: 5.15, barDir: "col", barGrouping: "clustered", barGapWidthPct: 60, chartColors: [HEX.accent2, HEX.accent1],
      showTitle: true, title: "Minutes of admin task time for one item", titleFontSize: 13, titleColor: HEX.dk1, titleFontFace: "+mn-lt",
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 13, dataLabelColor: HEX.dk1, dataLabelFontFace: "+mn-lt", dataLabelFontBold: true,
      showLegend: true, legendPos: "b", legendFontSize: 12, legendColor: HEX.dk1, legendFontFace: "+mn-lt",
      valGridLine: { color: "E3E8E4", size: 0.75 }, catGridLine: { style: "none" }, valAxisMinVal: 0, catAxisLabelColor: HEX.dk1, valAxisLabelColor: HEX.accent4, catAxisLabelFontSize: 13, valAxisLabelFontSize: 11, catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", objectName: "Minutes per item chart",
    });
    const x = 8.7, w = 4.05;
    s.addText("Where the time goes today", { x, y: Y, w, h: 0.35, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true, objectName: "Commentary heading" });
    s.addText([
      { text: "Filling in paper forms or editing PDFs, and collecting signatures.", options: { bullet: true, breakLine: true } },
      { text: "Scanning and emailing the signed copy.", options: { bullet: true, breakLine: true } },
      { text: "Hunting for a form or PO that cannot be found.", options: { bullet: true, breakLine: true } },
      { text: "Counting overtime, banked time and leave by hand.", options: { bullet: true } },
    ], { x, y: Y + 0.45, w, h: 2.6, fontSize: 13.5, color: C.text1, margin: 0, valign: "top", paraSpaceAfter: 8, isTextBox: true, objectName: "Commentary" });
    panel(s, "", "The system removes these four. It does not remove the decision: a person still approves every item.", x, 4.4, w, 1.05);
    note(s, `Planning estimate for an illustrative 100-staff organization; validate against ${O} baseline data during discovery.`, x, 5.75, w, 0.6);
    s.addNotes(`An illustrative estimate of admin minutes for one item, today and with the system. Validate against ${O} baseline data during discovery.`);
  }
  {
    const s = content("A proper audit trail, kept automatically");
    const f = await shot(s, "audit", 0.65, Y, 7.2, 3.95, "The audit log: when, who and what happened for every action");
    caption(s, "Screen: Administration › Audit log. One purchase order, step by step.", 0.65, f.y + f.h + 0.1, 7.2);
    today(s, "the trail is paper forms, scans and emails spread across folders and inboxes. If a PO is missing, so is the proof of its approval.  ", 0.65, f.y + f.h + 0.45, 7.2, 0.8, [{ text: "With the system: ", options: { bold: true, color: C.accent1 } }, { text: "one searchable record, ready for auditors and funders.", options: { color: C.text1 } }]);
    points(s, [["When", "The date and time of every action, written the moment it happens."], ["Who", "The person who did it, by name."], ["What happened", "In plain words, with the request number, the step and any comment."]], 8.35, Y, 4.4, 1.05);
    panel(s, "Audit history should retain submitted events.", `Permitted corrections must use controlled actions that create a traceable entry; retention, access and export rules are set with ${O}.`, 8.35, 5.0, 4.4, 1.5);
    s.addNotes(`The audit trail records when, who and what happened for every action. Submitted events are retained; permitted corrections use controlled actions that create a traceable entry; retention, access and export rules are set with ${O}.`);
  }
  {
    const s = content("Beyond time saved: independence and less stress");
    const cards = [
      [fa.FaLayerGroup, "Less dependence on outside apps", "Requests, purchase orders, timesheets and tasks live in one system instead of separate tools, spreadsheets and paper forms. Fewer subscriptions, fewer logins."],
      [fa.FaCogs, "No dependence on AI", "The system runs on fixed, ordinary rules that people set. It needs no AI service to work, and no information is sent to one."],
      [fa.FaDatabase, `${O}-controlled data governance`, `Hosting location, data ownership, export rights, backups, vendor access and retention terms will be agreed with ${O} IT and leadership before implementation.`],
      [fa.FaRegSmile, "Less paperwork, less stress", "A shared view of status reduces avoidable follow-up, duplicate handling and time spent searching for paperwork."],
    ];
    for (let i = 0; i < cards.length; i++) {
      const [Icon, head, body] = cards[i]; const x = 0.6 + (i % 2) * 6.15, y = Y + Math.floor(i / 2) * 2.55;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 5.95, h: 2.3, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: `Benefit card ${i + 1}` });
      s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.32, w: 0.78, h: 0.78, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: `Benefit icon circle ${i + 1}` });
      s.addImage({ data: await iconPng(Icon, "FFFFFF"), x: x + 0.5, y: y + 0.52, w: 0.38, h: 0.38, altText: head, objectName: `Benefit icon ${i + 1}` });
      s.addText(head, { x: x + 1.35, y: y + 0.28, w: 4.4, h: 0.45, fontSize: 18, bold: true, color: C.text1, margin: 0, valign: "middle", isTextBox: true, objectName: `Benefit heading ${i + 1}` });
      s.addText(body, { x: x + 1.35, y: y + 0.8, w: 4.4, h: 1.4, fontSize: 13.5, color: C.accent4, margin: 0, valign: "top", isTextBox: true, objectName: `Benefit text ${i + 1}` });
    }
    s.addNotes(`Four benefits beyond time: fewer outside apps, no dependence on AI, ${O}-controlled data governance agreed with ${O} IT and leadership before implementation, and less paperwork and stress.`);
  }
  {
    const s = content("Data security, privacy and IT governance");
    s.addText(`These are production-readiness requirements to confirm with ${O}, not claims that every control is already complete in the prototype.`, { x: 0.6, y: Y - 0.05, w: 12.1, h: 0.4, fontSize: 13, color: C.accent4, margin: 0, valign: "top", isTextBox: true, objectName: "Security intro" });
    const blocks = [["Identity and access", [`${O}-managed sign-in and multi-factor authentication`, "Role-based access for employees, managers, HR and Finance", "Timely access changes when staff join, move or leave"]], ["Data protection and hosting", ["Encryption in transit and at rest", "Confirm Canadian hosting and data-residency requirements", "Encrypted backups with documented restore testing"]],
      ["Records and accountability", ["Defined retention, access and export rules", "Traceable submissions, approvals and corrections", "Controlled vendor access and clear responsibilities"]], ["Operational readiness", ["Patch, vulnerability and security monitoring", "Incident response and support responsibilities", "Recovery targets and tested continuity procedures"]]];
    blocks.forEach(([h, items], i) => {
      const x = 0.6 + (i % 2) * 6.15, y = Y + 0.55 + Math.floor(i / 2) * 1.75;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 5.95, h: 1.55, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: `Security block ${i + 1}` });
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.06, h: 1.55, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: `Security edge ${i + 1}` });
      s.addText([{ text: h, options: { fontSize: 15.5, bold: true, color: C.accent1, breakLine: true } }, ...items.map((t, j) => ({ text: t, options: { fontSize: 12.5, color: C.text1, bullet: true, breakLine: j < items.length - 1 } }))], { x: x + 0.28, y: y + 0.1, w: 5.5, h: 1.38, margin: 0, valign: "top", paraSpaceAfter: 2, isTextBox: true, objectName: `Security text ${i + 1}` });
    });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 5.85, w: 12.1, h: 0.95, fill: { color: C.text2 }, line: { color: C.text2, width: 0 }, objectName: "Gate" });
    s.addText([{ text: "PILOT-READINESS GATE   ", options: { bold: true, color: C.accent3, charSpacing: 1 } }, { text: `Before a pilot, ${O} IT, privacy and records-management leads should review the requirements, assign owners and agree the evidence needed to accept each control.`, options: { color: C.background1 } }], { x: 0.85, y: 5.85, w: 11.7, h: 0.95, fontSize: 13, margin: 0, valign: "middle", isTextBox: true, objectName: "Gate text" });
    s.addNotes(`These are production-readiness requirements to confirm with ${O}, not claims that every control is already complete in the prototype: identity and access, data protection and hosting, records and accountability, and operational readiness. Before a pilot, ${O} IT, privacy and records-management leads review the requirements and agree the evidence needed for each control.`);
  }

  /* ================= Pricing ================= */
  pres.addSection({ title: "Pricing, timeline and next steps" });
  const timeline = (s, y) => {
    s.addText(org.current ? "PROPOSED PATH TO A PILOT" : "PROPOSED PATH TO GO-LIVE: 4–6 WEEKS", { x: 0.6, y, w: 6, h: 0.28, fontSize: 11, bold: true, color: C.text1, charSpacing: 1, margin: 0, isTextBox: true, objectName: "Path heading" });
    (org.current ? [["WEEKS 1–2", "Requirements, baseline and IT/privacy review"], ["WEEKS 3–6", "Configuration and implementation"], ["WEEKS 7–8", "Controlled pilot in one or two departments"], ["GO / NO-GO", "Evaluate results before production rollout"]]
      : [["WEEK 1", "Requirements, baseline and IT/privacy review"], ["WEEKS 2–4", "Configuration and implementation"], ["WEEKS 4–6", "Short pilot with one or two departments"], ["LIVE", "Whole organization; monthly payments start"]]).forEach(([w1, t], i) => {
      const w = 3.0, x = 0.6 + i * (w + 0.033);
      s.addShape(i === 0 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON, { x, y: y + 0.33, w, h: 0.8, fill: { color: i === 3 ? C.accent1 : C.text2 }, line: { color: C.background1, width: 1 }, objectName: `Timeline step ${i + 1}` });
      s.addText([{ text: w1, options: { fontSize: 11.5, bold: true, color: C.accent3, breakLine: true } }, { text: t, options: { fontSize: 10.5, color: C.background1 } }], { x: x + (i ? 0.5 : 0.18), y: y + 0.33, w: w - (i ? 0.95 : 0.6), h: 0.8, margin: 0, valign: "middle", isTextBox: true, objectName: `Timeline text ${i + 1}` });
    });
  };
  const bigCard = (s, label, big, lines, x, y, w, h, tone) => {
    const fill = tone === "red" ? C.accent6 : C.accent5, color = tone === "red" ? C.accent2 : C.accent1;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: `${label} card` });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 0.06, fill: { color }, line: { color, width: 0 }, objectName: `${label} top` });
    s.addText([{ text: label, options: { fontSize: 11, bold: true, color, charSpacing: 1, breakLine: true } }, { text: big, options: { fontSize: 24, bold: true, color, breakLine: true } }, ...lines.map((t, i) => ({ text: t, options: { fontSize: 12, color: C.text1, breakLine: i < lines.length - 1 } }))], { x: x + 0.25, y: y + 0.15, w: w - 0.45, h: h - 0.25, margin: 0, valign: "top", paraSpaceAfter: 2, isTextBox: true, objectName: `${label} text` });
  };
  const smallCard = (s, label, big, body, x, y, w, h) => {
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: `${label} card` });
    s.addText([{ text: label, options: { fontSize: 10.5, bold: true, color: C.accent4, charSpacing: 1, breakLine: true } }, { text: big, options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } }, { text: body, options: { fontSize: 11, color: C.accent4 } }], { x: x + 0.22, y: y + 0.12, w: w - 0.4, h: h - 0.2, margin: 0, valign: "top", isTextBox: true, objectName: `${label} text` });
  };
  const hrCard = (x, y, w, h) => {
    s0.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.accent5 }, line: { color: C.accent5, width: 0 }, objectName: "External HR card" });
    s0.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.06, h, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: "External HR edge" });
    s0.addText([{ text: "EXTERNAL HR", options: { fontSize: 11, bold: true, color: C.accent1, charSpacing: 1, breakLine: true } }, { text: "Expense can be reduced", options: { fontSize: 19, bold: true, color: C.text1, breakLine: true } }, { text: "More HR work is done in-house in the system, so less outside HR support is needed.", options: { fontSize: 12, color: C.accent4 } }], { x: x + 0.28, y: y + 0.14, w: w - 0.45, h: h - 0.2, margin: 0, valign: "top", isTextBox: true, objectName: "External HR text" });
  };
  let s0;
  if (org.current) {
    const s = s0 = content("Pricing, financial exposure and timeline", "Pricing, timeline and next steps");
    s.addText("Illustrative planning assumptions; confirm current contracts, vendor quotes and final implementation scope before any commitment.", { x: 0.6, y: Y - 0.1, w: 12.1, h: 0.3, fontSize: 12, color: C.accent4, margin: 0, isTextBox: true, objectName: "Pricing intro" });
    const card = (label, big, lines, x, tone) => {
      const fill = tone === "red" ? C.accent6 : C.accent5, color = tone === "red" ? C.accent2 : C.accent1;
      s.addShape(pres.shapes.RECTANGLE, { x, y: Y + 0.35, w: 5.95, h: 3.4, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: `${label} card` });
      s.addShape(pres.shapes.RECTANGLE, { x, y: Y + 0.35, w: 5.95, h: 0.07, fill: { color }, line: { color, width: 0 }, objectName: `${label} top` });
      s.addText([{ text: label, options: { fontSize: 12, bold: true, color, charSpacing: 1, breakLine: true } }, { text: big, options: { fontSize: 31, bold: true, color, breakLine: true } }, { text: " ", options: { fontSize: 8, breakLine: true } }, ...lines.map((t, k) => ({ text: t, options: { fontSize: 16, color: C.text1, breakLine: k < lines.length - 1 } }))], { x: x + 0.35, y: Y + 0.6, w: 5.3, h: 2.95, margin: 0, valign: "top", paraSpaceAfter: 3, isTextBox: true, objectName: `${label} text` });
    };
    card("CURRENT TOOLS · ESTIMATE", "CAD $45,600–$48,000 / year", ["HR software: approximately $24,000/year", "Adobe for all users: approximately $21,600–$24,000/year", "External HR support is excluded."], 0.6, "red");
    card("PROPOSED SYSTEM · ESTIMATE", "CAD $40,800–$42,000 / year", ["$30,000 system (10 × $3,000) plus $10,800–$12,000 Adobe", "One-time setup: $10,000", "48-hour support target subject to contract."], 6.75, "green");
    timeline(s, 5.75);
    s.addNotes("Pricing and timeline. Current tools are estimated at $45,600 to $48,000 a year: HR software about $24,000 and Adobe for all users $21,600 to $24,000, with external HR support excluded. The proposed system is estimated at $40,800 to $42,000 a year: $30,000 for the system, ten months at $3,000 because payments start after deployment, plus Adobe for about half the users, $10,800 to $12,000; a one-time setup of $10,000; and a 48-hour support target subject to contract. The path to a pilot: weeks 1–2 requirements, baseline and IT and privacy review; weeks 3–6 configuration and implementation; weeks 7–8 a controlled pilot in one or two departments; then a go or no-go decision before production rollout.");
  } else {
    const m = org.monthly, y1 = m * 11, y2 = m * 12;
    const s = s0 = content("Software estimate and timeline", "Pricing, timeline and next steps");
    s.addText("Planning estimate; confirm final implementation scope and terms before any commitment.", { x: 0.6, y: Y - 0.1, w: 12.1, h: 0.3, fontSize: 12, color: C.accent4, margin: 0, isTextBox: true, objectName: "Pricing intro" });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: Y + 0.35, w: 12.1, h: 3.05, fill: { color: C.text2 }, line: { color: C.text2, width: 0 }, objectName: "Monthly card" });
    s.addText([{ text: "PROPOSED SYSTEM · MONTHLY", options: { fontSize: 12, bold: true, color: C.accent3, charSpacing: 1, breakLine: true } }, { text: `CAD ${money(m)}`, options: { fontSize: 60, bold: true, color: C.background1, breakLine: true } }, { text: "a month, starting after go-live", options: { fontSize: 16, color: C.accent5, breakLine: true } }, { text: " ", options: { fontSize: 8, breakLine: true } }, { text: "48-hour support target subject to contract; configured to the leadership team and employees.", options: { fontSize: 13, color: C.accent5 } }], { x: 0.95, y: Y + 0.6, w: 6.2, h: 2.9, margin: 0, valign: "top", isTextBox: true, objectName: "Monthly" });
    s.addShape(pres.shapes.LINE, { x: 7.5, y: Y + 0.75, w: 0, h: 2.5, line: { color: "3A5A52", width: 1 }, objectName: "Price divider" });
    s.addText([{ text: "A YEAR, ONCE LIVE", options: { fontSize: 12, bold: true, color: C.accent3, charSpacing: 1, breakLine: true } }, { text: `CAD ${money(y2)}`, options: { fontSize: 40, bold: true, color: C.background1, breakLine: true } }, { text: `12 × ${money(m)}`, options: { fontSize: 15, color: C.accent5 } }], { x: 7.9, y: Y + 0.6, w: 4.6, h: 2.9, margin: 0, valign: "top", isTextBox: true, objectName: "Yearly" });
    const big = (label, value, body, x, y) => {
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: 3.35, h: 1.55, fill: { color: C.background2 }, line: { color: C.background2, width: 0 }, objectName: `${label} card` });
      s.addText([{ text: label, options: { fontSize: 11, bold: true, color: C.accent4, charSpacing: 1, breakLine: true } }, { text: value, options: { fontSize: 30, bold: true, color: C.text1, breakLine: true } }, { text: body, options: { fontSize: 12, color: C.accent4 } }], { x: x + 0.25, y: y + 0.14, w: 2.95, h: 1.45, margin: 0, valign: "top", isTextBox: true, objectName: `${label} text` });
    };
    s.addText([{ text: "Also worth noting: ", options: { bold: true, color: C.accent1 } }, { text: "with forms completed in the system instead of as PDFs, Adobe licence costs could be reduced by about half.", options: { color: C.accent4 } }], { x: 0.6, y: Y + 3.55, w: 12.1, h: 0.3, fontSize: 12, margin: 0, isTextBox: true, objectName: "Adobe note" });
    timeline(s, 5.75);
    s.addNotes(`Software estimate and timeline. The proposed system is ${money(m)} a month, starting only after go-live, which is planned within four to six weeks. That is ${money(y2)} a year once live. It includes a 48-hour support target, subject to contract, and configuration to the leadership team and employees. As forms are completed in the system instead of as PDFs, Adobe licence costs could be reduced by about half. The path: week 1 requirements and IT and privacy review; weeks 2–4 configuration; weeks 4–6 a short pilot; then go-live.`);
  }

  /* ================= Next steps ================= */
  {
    const s = pres.addSlide({ masterName: "Closing dark", sectionTitle: "Pricing, timeline and next steps" });
    s.addText("Where we are, and what happens next", { placeholder: "title" });
    s.addText([{ text: "Today: a working prototype", options: { bold: true, fontSize: 18, color: C.background1, breakLine: true } }, { text: "Every screen in this briefing can be tried in a browser with fictional people and figures. It is not connected to real staff accounts or production email. Features and integrations will be confirmed during requirements and security review.", options: { fontSize: 13.5, color: C.accent5 } }], { x: 0.75, y: 1.75, w: 4.7, h: 2.2, margin: 0, valign: "top", isTextBox: true, objectName: "Where we are" });
    s.addText([{ text: org.current ? "Proposed path to pilot" : "Live in 4–6 weeks", options: { bold: true, fontSize: 18, color: C.background1, breakLine: true } }, { text: org.current ? "Planning target: 2 weeks discovery and governance review, 4 weeks configuration and build, then a 2-week pilot. Full production deployment follows a separate go/no-go decision." : "Planning target: about 1 week of requirements and review, 2–3 weeks of configuration, then a short pilot with one or two departments before go-live.", options: { fontSize: 13.5, color: C.accent5 } }], { x: 0.75, y: 4.1, w: 4.7, h: 1.8, margin: 0, valign: "top", isTextBox: true, objectName: "Timeline" });
    const steps = [["Validate requirements and baseline", `Confirm ${O} volumes, current processing times, forms, approval thresholds, overtime and leave rules, and user roles.`], ["Complete IT and privacy review", "Agree hosting, sign-in and MFA, permissions, backups, recovery, retention, vendor access and data ownership."], ["Run a controlled pilot", "Start with one or two departments and purchase orders and timesheets; train users and provide support."], ["Evaluate before production rollout", "Measure processing time, approval completeness, record retrieval, user adoption and reliability. Bring results back for a rollout decision."]];
    steps.forEach(([head, body], i) => {
      const y = 1.75 + i * 1.12;
      s.addShape(pres.shapes.OVAL, { x: 6.1, y: y + 0.03, w: 0.5, h: 0.5, fill: { color: C.accent3 }, line: { color: C.accent3, width: 0 }, objectName: `Next step circle ${i + 1}` });
      s.addText(String(i + 1), { x: 6.1, y: y + 0.03, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: C.text2, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `Next step number ${i + 1}` });
      s.addText([{ text: head, options: { bold: true, fontSize: 17, color: C.background1, breakLine: true } }, { text: body, options: { fontSize: 12.5, color: C.accent5 } }], { x: 6.85, y: y - 0.04, w: 5.85, h: 1.02, margin: 0, valign: "top", isTextBox: true, objectName: `Next step ${i + 1}` });
    });
    s.addShape(pres.shapes.LINE, { x: 0.75, y: 6.35, w: 11.9, h: 0, line: { color: "3A5A52", width: 0.75 }, objectName: "Decision rule" });
    s.addText("Decision requested: authorize requirements validation and pilot planning. Production rollout requires a separate approval.", { x: 0.75, y: 6.45, w: 11.3, h: 0.45, fontSize: 14, bold: true, color: C.accent3, margin: 0, valign: "middle", isTextBox: true, objectName: "Decision" });
    s.addNotes(`To close. Today there is a working prototype with fictional people and figures, not connected to real staff accounts or production email. ${org.current ? "The planning target is two weeks of discovery and governance review, four weeks of configuration and build, and a two-week pilot; full deployment follows a separate go or no-go decision." : "The planning target is to be live in four to six weeks: about a week of requirements and review, two to three weeks of configuration, and a short pilot before go-live."} Next: validate ${O} requirements and baseline, complete the IT and privacy review, run a controlled pilot, and evaluate before production rollout. The decision requested is to authorize requirements validation and pilot planning.`);
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
}

(async () => { for (const o of ORGS) await build(o); })();
