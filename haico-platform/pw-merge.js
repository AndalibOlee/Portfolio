const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'); fs.mkdirSync('/home/claude/demo/shots-merge', { recursive: true });
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto('file:///home/claude/demo/haico-platform.html'); await page.waitForTimeout(1200);
  const pick = async () => { const g = await page.$('text=The whole group'); if (g) { await g.click(); await page.waitForTimeout(300); } };
  const login = async (l) => { const sw = await page.$('.banner button'); if (sw) { await sw.click(); await page.waitForTimeout(150); } await page.click(`.roles >> text="${l}"`); await page.waitForTimeout(300); await pick(); };
  const go = async (p) => { await page.evaluate((p) => go(p), p); await page.waitForTimeout(120); const h = await page.locator('.content h1').first().textContent().catch(() => ''); const bad = await page.locator('text=Not available for your role').count(); const nf = await page.locator('text=Page not found').count(); return (h || '').trim().slice(0, 28) + (bad ? ' [DENIED]' : '') + (nf ? ' [404]' : ''); };
  const shot = async (n) => page.screenshot({ path: `/home/claude/demo/shots-merge/${n}.png`, fullPage: false });
  const nav = async () => page.$$eval('.side .grp', gs => gs.map(g => { const l = g.querySelector('.grp-l'); return (l ? l.textContent + ': ' : '') + [...g.querySelectorAll('.item')].map(i => i.querySelector('span').textContent + (i.querySelector('.bdg') ? '(' + i.querySelector('.bdg').textContent + ')' : '')).join(', '); }).join(' | '));
  // all static routes from ROUTES
  const routes = await page.evaluate(() => ROUTES.map(r => r.re.source).filter(s => !s.includes('([^/]+)')).map(s => s.replace(/^\^|\$$/g, '').replace(/\\\//g, '/')));
  console.log('static routes', routes.length);
  const ROLES = ['Employee', 'Manager', 'HR Manager', 'Finance Manager', 'Executive Director', 'Administrator'];
  for (const r of ROLES) {
    await login(r); const k = r.replace(/ /g, '-').toLowerCase();
    console.log(`\n== ${r} ==\nNAV: ${await nav()}`);
    // click every sidebar item
    const items = await page.$$eval('.side .item', is => is.map(i => i.getAttribute('data-href') || i.getAttribute('href') || i.dataset.v || ''));
    const denied = [];
    for (const p of routes) { const t = await go(p); if (t.includes('[404]')) denied.push(p + ' 404'); if (t.includes('[DENIED]') && items.includes(p)) denied.push(p + ' denied-in-nav'); }
    console.log('sidebar items', items.length, 'problems', denied);
    await go('/dashboard'); await shot(`${k}-home`);
  }
  // flows
  const flash = async () => (await page.locator('.toast, .msg').last().textContent().catch(() => '')).slice(0, 80);
  await login('Finance Manager');
  await go('/finance/banking'); await page.click('[data-a=f3Sample]').catch(e => console.log('no sample btn')); await page.waitForTimeout(300);
  console.log('\nbank stmt lines', await page.locator('.stline, [data-stline]').count(), 'ledger', await page.locator('.ledline, [data-ledline]').count()); await shot('fin-bank');
  await go('/reports/po-history'); console.log('po-history', await go('/reports/po-history')); await shot('fin-po-history');
  await go('/finance/ap/attachments'); await shot('fin-ap-files');
  await go('/procurement/match'); await shot('fin-match');
  await go('/inventory/count'); console.log('count', await go('/inventory/count'));
  await go('/payroll/roe'); console.log('roe', await go('/payroll/roe'));
  await login('HR Manager'); await go('/hr/employees'); await shot('hr-employees'); await go('/hr/benefits'); await shot('hr-benefits'); await go('/hr/certifications'); await shot('hr-certs'); await go('/hr/hiring/new'); console.log('hiring new', await go('/hr/hiring/new')); await shot('hr-hiring-new');
  await login('Employee'); await go('/me/certifications'); await shot('emp-certs'); await go('/me/reviews'); await shot('emp-reviews'); await go('/approvals'); await go('/me/time-off'); await shot('emp-timeoff');
  await login('Manager'); await go('/approvals'); console.log('approvals cards', await page.locator('.apr').count()); await shot('mgr-approvals');
  console.log('\nERRORS', errs.length, errs.slice(0, 10));
  await b.close();
})();
