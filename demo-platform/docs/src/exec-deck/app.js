// shared helper: open the demo with a Segoe-like font (Segoe UI itself is only on Windows) and sign in
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const FILE = process.env.DEMO_FILE || "/home/user/Portfolio/demo-platform/demo-platform.html";
const FD = __dirname + "/node_modules/@fontsource/open-sans/files/";
const FONT_CSS = [400, 600, 700].map((w) => `@font-face{font-family:"Segoe UI";font-weight:${w};src:url("file://${FD}open-sans-latin-${w}-normal.woff2") format("woff2")}`).join("") + `@font-face{font-family:"Segoe UI";font-weight:500;src:url("file://${FD}open-sans-latin-600-normal.woff2") format("woff2")}@font-face{font-family:"Segoe UI";font-weight:800;src:url("file://${FD}open-sans-latin-700-normal.woff2") format("woff2")}`;
async function open(opts = {}) {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: opts.viewport || { width: 1360, height: 900 }, deviceScaleFactor: opts.dsf || 1 });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.addInitScript((m) => { try { if (!sessionStorage.getItem("t")) { localStorage.clear(); sessionStorage.setItem("t", "1"); } localStorage.setItem("demo-erp-setup", m[0]); localStorage.setItem("demo-erp-modules", JSON.stringify(m[1])); } catch (e) {} }, [opts.setup || "single", opts.mods || ["hr", "requests", "team", "ops", "finance"]]);
  await page.goto("file://" + FILE); await page.addStyleTag({ content: FONT_CSS }); await page.waitForTimeout(1500);
  const W = (m = 250) => page.waitForTimeout(m);
  const login = async (u) => { const sw = await page.$(".banner button[data-a=switchRole]"); if (sw) { await sw.click(); await W(150); } await page.selectOption("#lgUser", u); await page.click('form[data-f="login"] button.btn'); await W(400); const g = await page.$("text=The whole group"); if (g) { await g.click(); await W(300); } };
  return { b, page, errs, W, login, ev: (f, a) => page.evaluate(f, a) };
}
module.exports = { open };
