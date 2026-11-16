// the footer Email button and the demo email panel, for the "follow your request by email" slide
const { open } = require("./app.js");
const OUT = __dirname + "/" + (process.env.SHOT_DIR || "shots-soft") + "/";
const MARK = process.env.MARK || "#2F7A72";
(async () => {
  const { b, page, errs, W, login, ev } = await open({ setup: "single", viewport: { width: 1280, height: 860 }, dsf: 2 });
  await login("u1");
  // send a request so the chain has fresh emails today
  await ev(() => { const dep = byId(S.employees, "e8").departmentId; act("rc.submit", { kind: "po", forWho: "", vendorName: "Valley Office Supply", description: "Two standing desks for the front office", notes: "", estimate: "1450", departmentId: dep, accountNumber: "5205", files: [] }); });
  await W(400); await login("u2");
  await ev(() => { const it = S.rcRequests[S.rcRequests.length - 1]; act("approval.decide", { instanceId: it.currentApprovalId, decision: "APPROVED", comment: "Approved, thanks." }); });
  await W(300); await login("u1"); await ev(() => go("/dashboard")); await W(500);
  await page.mouse.move(600, 4);
  console.log(await ev(() => document.querySelector(".fbb-mail")?.outerHTML.slice(0, 200)));
  await ev(() => document.querySelector(".fbb-mail").click()); await W(600);
  await page.screenshot({ path: OUT + "mail-panel-full.png" });
  console.log(await ev(() => { const m = document.querySelector(".modal, .mdl, [role=dialog]"); return m ? m.className + " " + m.innerText.slice(0, 600) : "no modal"; }));
  console.log("errors", errs); await b.close();
})();
