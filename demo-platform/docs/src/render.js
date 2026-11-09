// node render.js <input.html> <output.pdf> [portrait|landscape] ["footer label"]
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const path = require("path");
(async () => {
  const [, , inp, out, orient = "portrait", label = "DEMO Enterprise Platform"] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto("file://" + path.resolve(inp)); await p.waitForTimeout(300);
  await p.pdf({ path: out, format: "Letter", landscape: orient === "landscape", printBackground: true,
    margin: { top: "0.55in", bottom: "0.6in", left: "0.55in", right: "0.55in" }, displayHeaderFooter: true, headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;font:7pt 'Liberation Sans',Arial;color:#6b737c;padding:0 0.55in;display:flex;justify-content:space-between"><span>${label} · All names, figures and identifiers are fictional.</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>` });
  await b.close(); console.log("wrote", out);
})();
