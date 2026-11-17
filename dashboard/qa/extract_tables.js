/* Dumps every "Table view" twin of the dashboard to JSON so qa/verify.py can recompute the numbers independently.
 *   node qa/extract_tables.js [dashboard.html] [out.json]
 * Only tables present in the build are dumped (so it works for any increment). */
const { chromium } = require('playwright'), path = require('path'), fs = require('fs');
const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dashboard.html')), outF = process.argv[3] || path.join(__dirname, 'tables.json');
(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto('file://' + file); await pg.waitForTimeout(500);
  const has = async sel => !!(await pg.$(sel));
  const read = async id => pg.$$eval(`#tbl-${id} tr`, trs => trs.map(tr => Array.from(tr.children).map(c => c.textContent.trim())));
  const open = async id => { const s = `button[data-tbl=${id}]`; if (await has(s)) { if ((await pg.getAttribute(s, 'aria-expanded')) !== 'true') await pg.click(s); return true; } return false; };
  const dump = async (tag, ids) => { for (const id of ids) if (await open(id)) out[`${tag}:${id}`] = await read(id); };
  const out = {};
  const ALL = ['traj', 'scatter', 'dist', 'heatA', 'heatB', 'flow', 'overlap', 'attr', 'mood', 'ms'];
  const setTv = async v => { if (await has(`[data-tv=${v}]`)) await pg.click(`[data-tv=${v}]`); };
  // state 1: defaults (all people, years 1-45)
  await dump('default', ALL);
  if (await has('[data-tv=change]')) { await setTv('change'); await dump('default_change', ['traj']); await setTv('main'); }
  if (await has('[data-tv=depr]')) { await setTv('depr'); await dump('default_depr', ['traj']); await setTv('main'); }
  if (await has('[data-av=SWL]')) { await pg.click('[data-av=SWL]'); await dump('default_attrSWL', ['attr']); await pg.click('[data-av=PI]'); }
  // state 2: same people, years 20-40
  await pg.selectOption('#yr-lo', '20'); await pg.selectOption('#yr-hi', '40');
  if (await has('[data-bs=balanced]')) { await pg.click('[data-bs=balanced]'); await dump('bal2040', ['traj']); await pg.click('[data-bs=pooled]'); }
  // state 3: adolescents, ASIA C/D, tetraplegia, years 5-30, PHQ-9
  await pg.click('button[data-reset]');
  await pg.click('.chip[data-f=age][data-i="1"]'); await pg.click('.chip[data-f=sev][data-i="2"]'); await pg.click('.chip[data-f=sev][data-i="3"]');
  await pg.click('.chip[data-f=lvl][data-i="1"]'); await pg.selectOption('#yr-lo', '5'); await pg.selectOption('#yr-hi', '30');
  if (await has('[data-dp=PHQ9]')) await pg.click('[data-dp=PHQ9]');
  await dump('filt', ALL);
  if (await has('[data-tv=change]')) { await setTv('change'); await dump('filt_change', ['traj']); await setTv('main'); }
  if (await has('[data-tv=depr]')) { await setTv('depr'); await dump('filt_depr', ['traj']); await setTv('main'); }
  out.filt_kpi = await pg.$$eval('.kpi', k => k.map(e => e.innerText.replace(/\n/g, ' | ')));
  out._errors = errs;
  fs.writeFileSync(outF, JSON.stringify(out, null, 1)); console.log('wrote', outF, Object.keys(out).length, 'entries; errors', errs);
  await b.close();
})();
