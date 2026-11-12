// final screenshots for the deck: one-company setup, numbered markers, cropped to the part being explained
const { open } = require("./app.js");
const OUT = __dirname + "/shots/";
(async () => {
  const { b, page, errs, W, login, ev } = await open({ setup: "single", viewport: { width: 1010, height: 1700 }, dsf: 2 });
  const st = await ev(() => {
    let n = 0; const out = [];
    const run = (a, t, x, minsAgo) => { const ts = new Date(Date.now() - (minsAgo ?? (400 - n * 3)) * 60e3).toISOString(); n++; try { applyEvent(S, { id: "dk" + n, ts, actor: a, actorName: byId(S.users, a)?.displayName || "", type: t, p: x }); } catch (e) { out.push(t + " ERR " + e.message); } };
    const t0 = todayStr(), e8 = byId(S.employees, "e8"), dep = e8.departmentId;
    const last = () => S.rcRequests[S.rcRequests.length - 1], first = (it) => byId(S.approvals, it.currentApprovalId)?.approverUserIds?.[0];
    const userOf = (empId) => S.users.find((u) => u.employeeId === empId)?.id;
    // last pay period: most people sent their timesheet, most are approved
    const ps = addDays(periodStartFor(t0), -14); const emps = S.employees.filter((e) => ["ACTIVE", "ONBOARDING"].includes(e.status) && userOf(e.id));
    emps.sort((a, b) => a.lastName.localeCompare(b.lastName)).forEach((e, i) => { if (i % 6 === 2) return; const u = userOf(e.id), days = []; for (let d = 0; d < 14; d++) { const dt = addDays(ps, d), wd = new Date(dt + "T12:00:00Z").getUTCDay(); if (wd > 0 && wd < 6) days.push({ date: dt, worked: i % 4 === 1 && d === 2 ? 9 : 7, departmentId: e.departmentId }); }
      run(u, "timesheet.save", { periodStart: ps, entries: days, submit: true });
      const sh = S.timesheets.find((t) => t.employeeId === e.id && t.periodStart === ps), mgr = e.managerId ? userOf(e.managerId) : null;
      if (sh && mgr && i % 5 !== 3) run(mgr, "timesheet.decide", { timesheetId: sh.id, decision: "APPROVED" }); });
    // Maya's requests
    run("u1", "rc.submit", { kind: "reimb", forWho: "", purpose: "Safety boots for the field crew", lines: [{ date: addDays(t0, -3), what: "Safety boots", accountNumber: "5205", amount: "185.00" }], km: "", mileageAccount: "5300", departmentId: dep, files: [{ name: "receipt-boots.pdf", size: 48213, type: "application/pdf", data: "" }] }, 230); const ec = last();
    run(first(ec), "rc.return", { id: ec.id, note: "Please attach the full receipt, both pages." }, 200);
    run("u1", "rc.submit", { kind: "expense", forWho: "", event: "Supplier meeting", location: "Vancouver, BC", from: addDays(t0, -6), to: addDays(t0, -6), honorarium: "", km: "120", breakfasts: "0", lunches: "1", dinners: "0", honorariumAccount: "5320", travelAccount: "5300", departmentId: dep, files: [] }, 190); const tr = last();
    run("u1", "rc.submit", { kind: "po", forWho: "", vendorName: "Example Equipment Ltd.", description: "Grapple attachment for the loader", notes: "Deliver to the main yard.", estimate: "6800", departmentId: dep, accountNumber: "5215", files: [] }, 185); const po = last();
    run(first(po), "approval.decide", { instanceId: po.currentApprovalId, decision: "APPROVED", comment: "Needed before the winter block." }, 118);
    const tsRows = S.timesheets.filter((t) => t.periodStart === ps).map((t) => t.status);
    return { out, ec: ec.id, po: po.id, ready: S.rcRequests.find((r) => r.kind === "po" && r.status === "ready")?.id, ps, ts: tsRows.reduce((m, s) => (m[s] = (m[s] || 0) + 1, m), {}) };
  });
  console.log(JSON.stringify(st)); require("fs").writeFileSync(OUT + "meta.json", JSON.stringify({ approved: st.ts.APPROVED || 0, total: 19 }));
  const mark = (list) => ev((list) => { document.querySelectorAll(".dk-mark").forEach((x) => x.remove());
    for (const [n, sel, idx, dx, dy] of list) { const els = [...document.querySelectorAll(sel)]; const el = els[idx || 0]; if (!el) { console.log("no", sel); continue; } const r = el.getBoundingClientRect();
      const m = document.createElement("div"); m.className = "dk-mark"; m.textContent = n; m.style.cssText = `position:absolute;left:${r.left + scrollX + (dx === "R" ? r.width + 8 : dx ?? -30)}px;top:${r.top + scrollY + (dy ?? r.height / 2 - 14)}px;width:28px;height:28px;border-radius:50%;background:#B3402A;color:#fff;font:700 15px Arial,sans-serif;display:grid;place-items:center;z-index:99999;box-shadow:0 0 0 2.5px #fff,0 2px 6px rgba(0,0,0,.35)`; document.body.appendChild(m); } }, list);
  const clip = (spec) => ev((spec) => { const q = (s, i) => [...document.querySelectorAll(s)][i || 0]?.getBoundingClientRect(); const a = q(spec.top[0], spec.top[1]), z = q(spec.bottom[0], spec.bottom[1]), w = document.querySelector(".content .wrap").getBoundingClientRect();
    const x = (spec.x0 ?? w.left) - 8, y = a.top - (spec.padTop ?? 8); return { x, y, width: (spec.x1 ?? w.right) - x + 8, height: z.bottom - y + (spec.padBottom ?? 8) }; }, spec);
  const snap = async (name, spec, marks = []) => { await page.mouse.move(600, 4); await W(250); await mark(marks); const c = await clip(spec); await page.screenshot({ path: OUT + name + ".png", clip: c }); await mark([]); console.log(name, Math.round(c.width), "x", Math.round(c.height)); };
  const fit = async (sel) => { for (let w = 1040; w <= 1420; w += 20) { await page.setViewportSize({ width: w, height: 1700 }); await W(160); const over = await ev((sel) => { const t = document.querySelector(sel); const box = t?.closest(".tw") || t?.parentElement; return !t || box.scrollWidth > box.clientWidth + 1; }, sel); if (!over) { console.log("fit", sel, w); return w; } } };
  const cls = (sel, re, c) => ev(([sel, re, c]) => { const el = [...document.querySelectorAll(sel)].find((x) => new RegExp(re).test(x.textContent.trim())); if (el) el.classList.add(c); return !!el; }, [sel, re, c]);
  const tag = (re, cls) => ev(([re, cls]) => { const c = [...document.querySelectorAll(".content .card, .content section")].find((x) => new RegExp(re).test(x.querySelector(".card-h")?.textContent || "")); if (c) c.classList.add(cls); return !!c; }, [re, cls]);

  await login("u1");
  await ev(() => go("/dashboard")); await W(400); await snap("home", { top: [".content .wrap > *"], bottom: [".hgrid, .content .wrap > *:nth-child(4)"], padBottom: 8 });
  await ev(() => go("/requests")); await W(400); await tag("Your requests", "dk-req");
  await cls(".dk-req tbody .badge, .dk-req tbody td:last-child span", "^PO ready$", "dk-ready");
  await snap("req-list", { top: [".dk-req"], bottom: [".dk-req tbody tr", 3], padBottom: 2 }, [[1, ".dk-req input[type=search], .dk-req input.in", 0, -14, -12], [2, ".dk-req thead th:last-child", 0, 86, 4], [3, ".dk-ready", 0, "R"]]);
  await ev((id) => go("/requests/" + id), st.po); await W(400); await tag("^Detail", "dk-det"); await tag("^History", "dk-his");
  await snap("req-track", { top: [".content h1"], bottom: [".dk-det"], padTop: 4 }, [[1, ".content h1", 0, 400, 36], [2, ".dk-his .card-h, .dk-his", 0, 200, 8], [3, ".dk-det .card-h, .dk-det", 0, 200, 8]]);
  // timesheet: type a normal week with one long day
  await ev(() => go("/me/time")); await W(500); await fit("table.tsg");
  for (const [d, h] of [[0, "7"], [1, "7"], [2, "10"], [3, "7"], [4, "7"]]) { const i = await page.$(`input[data-ts="worked"][data-d="${d}"]`); await i.fill(h); await i.dispatchEvent("change"); await W(120); }
  await ev(() => document.activeElement?.blur()); await W(300);
  await snap("time", { top: [".content h1"], bottom: ["table.tsg tr.wt, #tsg tr.wt"], padTop: 4 }, [[1, 'input[data-ts="worked"][data-d="2"]', 0, -34], [2, "#fbOtBox", 0, -6, -12], [3, ".ph .btn.pri, .content .btn.pri", 0, -16, 24]]);
  await page.setViewportSize({ width: 1010, height: 1700 }); await W(300);
  await ev(() => go("/me/tasks")); await W(400);
  await cls(".mtask button", "^25%$", "dk-p25");
  await snap("tasks", { top: [".mtask"], bottom: [".mtask"] }, [[1, ".dk-p25", 0, -34], [2, ".mtask", 0, 470, 14], [3, ".mtask input", 0, -6, -30]]);
  await snap("tasks-top", { top: [".content h1"], bottom: [".fb-grid3"], padTop: 4 });
  await login("u2"); await ev(() => go("/approvals")); await W(400); await snap("approvals", { top: [".content h1"], bottom: [".content .wrap .card, .content .wrap section", 3], padTop: 4 });
  // wider screen for the wide tables
  await login("u5"); await ev(() => go("/requests/all")); await W(400); await page.selectOption("#rcK-all", "po"); await W(400); await page.setViewportSize({ width: 1160, height: 1700 }); await W(300); await tag("^$", "dk-none");
  await snap("po-all", { top: [".content h1"], bottom: [".content table tbody tr:not([hidden])", 7], padTop: 4, padBottom: 10 }, [[1, "#rcK-all", 0, -14, -12], [2, ".content table thead th", 3, 62, 4], [3, ".content table thead th", 5, 86, 4]]);
  await login("u11"); await ev(() => go("/finance/pos")); await W(400); await fit("#fbPoT");
  await snap("po-list", { top: [".content h1"], bottom: ["#fbPoT tbody tr", 2], padTop: 4, padBottom: 2 }, [[1, ".content .stat", 1, 190, 8], [2, "#fbPoT tbody tr td:last-child", 0, -34], [3, ".content input[type=search], .content .wrap input.in", 0, -14, -12]]);
  await ev((id) => go("/requests/" + id + "/print"), st.ready); await W(400); await snap("po-print", { top: [".rc-paper"], bottom: [".rc-paper"], x0: await ev(() => document.querySelector(".rc-paper").getBoundingClientRect().left), x1: await ev(() => document.querySelector(".rc-paper").getBoundingClientRect().right) });
  await login("u20"); await ev((ps) => { UI.filters.tsPeriod = ps; go("/payroll/timesheet-status"); }, st.ps); await W(400); await fit(".content table");
  await snap("ts-status", { top: [".content h1"], bottom: [".content table tbody tr", 2], padTop: 4, padBottom: 2 }, [[1, ".content .wrap .card, .content .wrap section", 0, 250, 40], [2, ".content .wrap .card .btn, .content .wrap section .btn", 0, -6, -30], [3, ".content table tbody tr td:nth-child(4)", 0, -34]]);
  await login("u6"); await ev(() => go("/admin/audit")); await W(400); await page.setViewportSize({ width: 1180, height: 1700 }); await W(300);
  await snap("audit", { top: [".content h1"], bottom: [".content table tbody tr", 3], padTop: 4, padBottom: 2 }, [[1, ".content table thead th", 0, 62, 3], [2, ".content table thead th", 1, 50, 3], [3, ".content table thead th", 4, 122, 3]]);
  // a request with its attachment and history (the route bar is left out)
  await login("u1"); await ev((id) => go("/requests/" + id), st.ec); await W(400); await tag("^Detail", "dk-det"); await tag("^Attachments", "dk-att"); await tag("^History", "dk-his");
  await snap("req-attach", { top: [".dk-his"], bottom: [".dk-att"] }, [[1, ".dk-att .card-h, .dk-att", 0, 130, 10], [2, ".dk-his .card-h, .dk-his", 0, 100, 10]]);
  // the automatic notices, as they arrive in a person's inbox
  const mail = async (name, u, re) => { await login(u); await ev(() => go("/mail/inbox")); await W(400); await cls(".ml-li", re, "dk-m"); await ev(() => { const v = document.querySelector(".dk-m .pv"); v.textContent = v.textContent.replace(/\s+\S*$/, "") + " …"; }); await page.addStyleTag({ content: ".dk-m .sj,.dk-m .pv{white-space:normal!important;overflow:visible!important;display:block!important;-webkit-line-clamp:unset!important;max-height:none!important}.dk-m{height:auto!important}" }); await W(150); const r = await ev(() => { const x = document.querySelector(".dk-m").getBoundingClientRect(); return [x.left, x.right]; }); await snap(name, { top: [".dk-m"], bottom: [".dk-m"], x0: r[0] + 8, x1: r[1] - 8, padTop: 0, padBottom: 0 }); };
  await mail("mail-approver", "u2", "Approval needed: PO-"); await mail("mail-staff", "u1", "Approved: PO-");
  // the built-in How-to guides
  await login("u1"); await page.setViewportSize({ width: 1100, height: 1700 }); await page.click("text=How-to"); await W(600); await ev(() => document.querySelectorAll(".guide")[2].classList.add("dk-g")); await ev(() => document.querySelector(".dk-g").scrollIntoView()); await W(300);
  await snap("howto", { top: [".dk-g"], bottom: [".dk-g"], padTop: 4, padBottom: 4 }, [[1, ".dk-g .gsteps", 0, 250, -34], [2, ".dk-g .gimg", 0, 12, 10], [3, ".dk-g .gbtn", 0, "R"]]);
  // self-service: employment, pay, pension and benefits
  const tagBy = (c, ...t) => ev(([c, t]) => { const el = [...document.querySelectorAll(".content .wrap *")].filter((x) => t.every((k) => x.textContent.includes(k))).pop(); if (el) el.classList.add(c); return !!el; }, [c, t]);
  await login("u1"); await page.setViewportSize({ width: 1100, height: 1700 }); await ev(() => go("/me/profile")); await W(400);
  await page.click('text="Employment"'); await W(500); await tagBy("dk-job", "Employment type", "Start date"); await tagBy("dk-pay", "Pay type", "Pay schedule");
  await snap("employment", { top: [".content h1"], bottom: [".dk-pay"], padTop: 4, padBottom: 6 }, [[1, ".dk-job", 0, 92, 20], [2, ".dk-pay", 0, 92, 20]]);
  await page.click('text="Pension & Benefits"'); await W(500); await tagBy("dk-ben", "Life & AD&D", "Covered since"); await tagBy("dk-adds", "Your employer adds", "$");
  await snap("benefits", { top: [".content h1"], bottom: [".dk-ben"], padTop: 4, padBottom: 6 }, [[3, ".content h1", 0, 310, 2]]);
  // certificates, as a manager sees them
  await login("u2"); await page.setViewportSize({ width: 1250, height: 1700 }); await ev(() => go("/hr/certifications")); await W(500); await tagBy("dk-exp", "Expiring within 60", "book the renewal");
  await snap("certs", { top: [".content h1"], bottom: [".content table tbody tr", 3], padTop: 4, padBottom: 2 }, [[1, ".dk-exp", 0, 150, 4], [2, ".content table thead th", 3, 78, 3], [3, ".content table thead th", 4, 70, 3]]);
  // time off: the request form filled in, and the list of requests
  await login("u1"); await page.setViewportSize({ width: 1100, height: 1900 }); await ev(() => go("/me/time-off")); await W(500);
  for (const [id, v] of [["#lvStart", "2026-11-23"], ["#lvEnd", "2026-11-25"]]) { const i = await page.$(id); await i.fill(v); await i.dispatchEvent("change"); await W(250); }
  await ev(() => document.activeElement?.blur()); await W(300); await tagBy("dk-left", "hours of Annual Vacation");
  const fr = await ev(() => { const x = document.querySelector(".to-form").getBoundingClientRect(); return [x.left, x.right]; });
  await snap("timeoff", { top: [".to-form"], bottom: ["#lvSend"], x0: fr[0] - 6, x1: fr[1] + 6, padTop: 6, padBottom: 10 }, [[1, "#lvStart", 0, 200, -34], [2, ".dk-left", 0, 250, -16], [3, "#lvSend", 0, "R"]]);
  await ev(() => document.querySelector(".content table").classList.add("dk-tol")); 
  await snap("timeoff-list", { top: [".dk-tol"], bottom: [".dk-tol tbody tr", 1], padBottom: 2 }, [[4, ".dk-tol thead th", 4, 90, 3]]);
  // onboarding and offboarding
  await login("u3"); await page.setViewportSize({ width: 1100, height: 1700 }); await ev(() => go("/hr/onboarding")); await W(500);
  await ev(() => { const cards = [...document.querySelectorAll(".content .card")]; cards.forEach((c) => { if (/Onboarding/.test(c.textContent) && /starts/.test(c.textContent)) c.classList.add("dk-on"); if (/Leaving/.test(c.textContent)) c.classList.add("dk-off"); }); document.querySelector('form[data-f="offStart"]').classList.add("dk-form"); });
  await snap("onboard", { top: [".content h1"], bottom: [".dk-off"], padTop: 4, padBottom: 6 }, [[1, ".dk-on .card-h", 0, 190, 4], [2, ".dk-form .btn", 0, -16, -30], [3, ".dk-off input[type=checkbox]", 0, -34], [4, ".dk-off [data-a=offFinish]", 0, -34]]);
  console.log("errors", errs); await b.close();
})();
