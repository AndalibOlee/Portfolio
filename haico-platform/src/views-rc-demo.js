/* ==========================================================================
   views-rc-demo.js — fictional demo requests for every employee, made by
   running the real request engine (submit → supervisor → director level →
   Finance) with fixed ids and dates, so every request has a true route,
   history, approvals and ledger postings, and replays identically.
   Demo-only: the seed runs inside freshState; the emails it would have sent
   are left out so inboxes start clean.
   ========================================================================== */
const RC_DEMO = {
  places: ["Prince Rupert, BC", "Vancouver, BC", "Victoria, BC", "Sandspit, BC", "Masset, BC", "Skidegate, BC", "Terrace, BC", "Nanaimo, BC"],
  why: ["Fisheries technical committee", "Forestry stewardship workshop", "First aid instructor course", "Tourism partners meeting", "Board orientation", "Seafood buyers meeting", "Records management training", "Annual audit planning"],
  suppliers: [["Example Office Supply Co.", "Printer toner and paper"], ["North Coast Safety Ltd.", "High-visibility rain gear"], ["Island Hardware Co-op", "Chainsaw chains and files"], ["Harbour Marine Supply", "Life vests"], ["Coastal Tech Store", "USB headsets for meetings"], ["Haida Gwaii Books & Print", "Printed visitor maps"]],
  bought: [["Coffee and snacks for the open house", 4250], ["Taxi from the airport", 3800], ["Parking at the hospital", 1600], ["Batteries for the field radios", 2799], ["Printer ink for the home office", 6499], ["Postage for the board package", 2210]],
  vendors: [["Island Safety Equipment", "Six inflatable life jackets"], ["North Coast Fuel", "Diesel delivery to the yard"], ["Coastal Lumber Ltd.", "Treated lumber for the dock repair"], ["Haida Gwaii Signs", "Trail signs for the visitor centre"]],
};
{
  const _freshStateDemo = freshState;
  freshState = function () {
    const S0 = _freshStateDemo();
    const nN = S0.notifications.length, nE = S0.emails.length, applied = S0.applied;
    S0.rcSeedErrors = [];
    let seq = 0;
    const ts = (day, h) => { const d = new Date(Date.UTC(2026, 8, 1 + day, 16 + h, (seq * 7) % 60)); return d.toISOString(); };
    const run = (actor, type, p, at) => applyEvent(S0, { id: `seed${String(++seq).padStart(4, "0")}`, ts: at, actor, actorName: "", type, p });
    const last = () => S0.rcRequests[S0.rcRequests.length - 1];
    const inst = (it) => byId(S0.approvals, it.currentApprovalId);
    const first = (it) => (inst(it)?.approverUserIds || [])[0];
    const director = (it) => { const i = inst(it), done = S0.approvalActions.filter((x) => x.instanceId === i.id).map((x) => x.approverId); return rcExecFallback(S0).map((u) => u.id).find((id) => !(i.excludeUserIds || []).includes(id) && !done.includes(id)); };
    const decide = (who, it, decision, comment, at) => run(who, "approval.decide", { instanceId: it.currentApprovalId, decision, comment }, at);
    const approveAll = (it, at) => { decide(first(it), it, "APPROVED", "", at); if (it.status === "awaiting_director") decide(director(it), it, "APPROVED", "Within the training budget.", at); };
    const finance = (it) => (it.requestedByUserId === "u11" ? "u4" : "u11");
    const people = S0.users.filter((u) => u.isActive !== false && u.employeeId && byId(S0.employees, u.employeeId)?.status !== "TERMINATED").sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    people.forEach((u, i) => {
      const e = byId(S0.employees, u.employeeId), dep = e.departmentId, day = (i * 3) % 26, P = (n) => RC_DEMO[n][i % RC_DEMO[n].length];
      try {
        // 1. a trip: approved and booked by Finance; every fourth one needs director level
        const big = i % 4 === 0;
        run(u.id, "rc.submit", { kind: "travel", forWho: "", from: "Masset, BC", to: P("places"), reason: P("why"), out: `2026-10-${String(13 + (i % 14)).padStart(2, "0")}`, back: `2026-10-${String(14 + (i % 14)).padStart(2, "0")}`, transport: i % 2 ? "Flight" : "Ferry and vehicle", accommodation: "Hotel, booked by Finance", training: i % 3 === 0 ? "Yes" : "No", estimate: big ? "6200" : String(900 + i * 85), departmentId: dep, accountNumber: "5300", files: [] }, ts(day, 0));
        const tr = last(); if (big && i % 8 === 4) decide(first(tr), tr, "APPROVED", "", ts(day + 1, 0)); else approveAll(tr, ts(day + 1, 0)); // one trip left waiting on director level
        if (i % 3 !== 2 && tr.status === "approved") run(finance(tr), "rc.process", { id: tr.id, subtotals: [String(big ? 5480 : 780 + i * 70)], gst: big ? "274.00" : ((780 + i * 70) * 0.05).toFixed(2), pst: big ? "383.60" : ((780 + i * 70) * 0.07).toFixed(2), link: "https://outlook.office.com/mail/demo-confirmation", note: "Booked on the company card" }, ts(day + 2, 0));
        // 2. a card purchase: waiting, with Finance, or returned for a fix
        const [sup, item] = P("suppliers");
        run(u.id, "rc.submit", { kind: "card", forWho: "", supplier: sup, reason: `${item} for the ${byId(S0.departments, dep)?.name || "team"}`, lines: [{ description: item, qty: 1 + (i % 4), departmentId: dep, accountNumber: "5205" }], estimate: String(120 + i * 23), files: [] }, ts(day + 2, 1));
        const cc = last();
        if (i % 3 === 1) decide(first(cc), cc, "APPROVED", "", ts(day + 3, 1));
        if (i % 3 === 2) run(first(cc), "rc.return", { id: cc.id, note: "Please add the product link and the quantity you need." }, ts(day + 3, 1));
        // 3. an expense claim (paid out of pocket): paid, waiting, or declined
        const [what, amt] = P("bought");
        run(u.id, "rc.submit", { kind: "reimb", forWho: "", purpose: what, lines: [{ date: `2026-09-${String(2 + (i % 25)).padStart(2, "0")}`, what, accountNumber: "5205", amount: (amt / 100).toFixed(2) }], km: i % 2 ? "" : String(20 + i), mileageAccount: "5300", departmentId: dep, files: [] }, ts(day + 3, 2));
        const ec = last();
        if (i % 5 === 3) decide(first(ec), ec, "REJECTED", "This was covered by the event budget — please claim it from the organizer.", ts(day + 4, 2));
        else if (i % 5 !== 4) { decide(first(ec), ec, "APPROVED", "", ts(day + 4, 2)); if (ec.status === "approved" && i % 2 === 0) run(finance(ec), "rc.pay", { id: ec.id, via: i % 4 ? "Payroll — next run" : "Direct deposit", ref: `PR-2026-${String(18 + (i % 3)).padStart(4, "0")}` }, ts(day + 5, 2)); }
        // 4. a travel claim for a meeting — every other person; some for an Elder who attended
        if (i % 2 === 0) {
          const ext = i % 4 === 0;
          run(u.id, "rc.submit", { kind: "expense", forWho: ext ? "external" : "", external: ext ? { name: ["Elder Mary Example", "Elder John Sample", "Guest speaker Dana Placeholder"][i % 3], role: "Elder", address: "Box 100, Masset BC", payBy: "Cheque" } : undefined, event: P("why"), location: P("places"), from: `2026-09-${String(8 + (i % 20)).padStart(2, "0")}`, to: `2026-09-${String(8 + (i % 20)).padStart(2, "0")}`, honorarium: ext ? "250" : "", km: String(30 + i * 4), breakfasts: "0", lunches: "1", dinners: i % 3 ? "0" : "1", honorariumAccount: "5320", travelAccount: "5300", departmentId: dep, files: [] }, ts(day + 4, 3));
          const tc = last();
          if (i % 6 === 0) approveAll(tc, ts(day + 5, 3));
        }
        // 5. a purchase order — every third person: ready to print, one closed, one waiting on director level
        if (i % 3 === 0) {
          const [ven, desc] = P("vendors"), est = i % 9 === 0 ? "7800" : String(1400 + i * 60);
          run(u.id, "rc.submit", { kind: "po", forWho: "", vendorName: ven, description: desc, notes: "Deliver to the main office.", estimate: est, departmentId: dep, accountNumber: "5215", files: [] }, ts(day + 5, 4));
          const po = last(); decide(first(po), po, "APPROVED", "", ts(day + 6, 4));
          if (po.status === "awaiting_director" && i % 2 === 0) decide(director(po), po, "APPROVED", "", ts(day + 6, 5));
          if (po.status === "ready" && i % 6 === 3) { run(finance(po), "rc.po.amount", { id: po.id, amount: (Number(est) * 1.04).toFixed(2), reason: "Freight added on the invoice" }, ts(day + 7, 4)); run(finance(po), "rc.po.close", { id: po.id }, ts(day + 7, 5)); }
        }
      } catch (err) { S0.rcSeedErrors.push(`${u.displayName}: ${err.message}`); }
    });
    // the seed's emails and bell notices are not real mail: start everyone's inbox clean
    S0.notifications.length = nN; S0.emails.length = nE; S0.applied = applied;
    return S0;
  };
}
