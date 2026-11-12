/* ==========================================================================
   views-fit.js — nothing scrolls sideways on a computer screen. Tab bars wrap
   onto a second line, table text wraps, and anything still wider than the
   page (the org chart, a very wide table, the calendar week) is shrunk just
   enough to fit. Phones keep sideways scrolling inside tables, where shrinking
   would make the text too small to read.
   ========================================================================== */
injectCss(`
@media (min-width:700px){
  .stabs{flex-wrap:wrap;overflow-x:visible;row-gap:0}
  .tw td,.tw th{white-space:normal!important;overflow-wrap:break-word}
  .tw td .btn,.tw td .badge,.tw td .pill,.tw td button{white-space:nowrap!important}
  .tw > table{min-width:0!important}
}
`);
const FIT_MIN = 0.5;
function fitWide() {
  if (innerWidth < 700) return;
  const boxes = document.querySelectorAll("#app .content .tw, #app .content .ocw, #app .content .cl-main, #app .content [data-fit]");
  for (const box of boxes) {
    const kid = box.firstElementChild; if (!kid) continue;
    kid.style.zoom = "";
    if (box.clientWidth <= 0) continue;
    let z = 1;
    for (let i = 0; i < 4 && box.scrollWidth - box.clientWidth > 1 && z > FIT_MIN; i++) {
      z = Math.max(FIT_MIN, Math.floor(z * (box.clientWidth - 4) / box.scrollWidth * 1000) / 1000);
      kid.style.zoom = String(z);
    }
  }
}
{
  const _afterRenderFit = afterRender;
  afterRender = function () { const r = _afterRenderFit.apply(this, arguments); try { fitWide(); } catch { /* layout only */ } return r; };
  let t = null; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { try { fitWide(); } catch { /* layout only */ } }, 120); });
}
