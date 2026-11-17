/* Round-trip test: change several filters, copy the permalink, open it in a fresh page, compare the state; then download a CSV.
 *   node qa/links.js [dashboard.html] */
const { chromium } = require('playwright'), path = require('path'), fs = require('fs');
const file = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'dashboard.html'));
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true }), pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(file); await pg.waitForTimeout(400);
  const has = async s => !!(await pg.$(s));
  await pg.click('.chip[data-f=age][data-i="1"]'); await pg.click('.chip[data-f=sev][data-i="2"]'); await pg.selectOption('#yr-lo', '5'); await pg.selectOption('#yr-hi', '30');
  if (await has('[data-tv=change]')) await pg.click('[data-tv=change]');
  if (await has('[data-dp=PHQ9]')) await pg.click('[data-dp=PHQ9]');
  await pg.waitForTimeout(400);
  const snap = async p => p.evaluate(() => JSON.stringify({ kpi: [...document.querySelectorAll('.kpi')].map(k => k.innerText), lo: document.querySelector('#yr-lo').value, hi: document.querySelector('#yr-hi').value, chips: [...document.querySelectorAll('.chip[aria-pressed=true]')].map(c => c.dataset.f + c.dataset.i).join(','), tv: [...document.querySelectorAll('[data-tv][aria-pressed=true]')].map(x => x.dataset.tv).join(','), dp: [...document.querySelectorAll('[data-dp][aria-pressed=true]')].map(x => x.dataset.dp).join(','), traj: (document.querySelector('#traj-take') || {}).innerText }));
  const a = await snap(pg), url = await pg.url(); console.log('hash length', url.split('#')[1].length);
  const pg2 = await ctx.newPage(); pg2.on('pageerror', e => errs.push(e.message)); await pg2.goto(url); await pg2.waitForTimeout(600);
  const c = await snap(pg2); console.log('round trip identical:', a === c); if (a !== c) { console.log(a); console.log(c); }
  const bad = await ctx.newPage(); bad.on('pageerror', e => errs.push(e.message)); await bad.goto(file + '#s=' + 'AAAA%%notbase64'); await bad.waitForTimeout(400);
  console.log('corrupt link still loads, people shown:', (await bad.$$eval('.kpi', k => k[0].innerText.replace(/\n/g, ' '))));
  const btn = await pg.$('[data-csv]'); if (btn) { const [dl] = await Promise.all([pg.waitForEvent('download'), btn.click()]); const f = '/tmp/dl_' + dl.suggestedFilename(); await dl.saveAs(f); const t = fs.readFileSync(f, 'utf8'); console.log('csv', dl.suggestedFilename(), t.split('\n').length, 'lines; first:', t.split('\n')[0].slice(0, 120), '\n  second:', t.split('\n')[1].slice(0, 120)); }
  console.log('errors', errs); await b.close();
})();
