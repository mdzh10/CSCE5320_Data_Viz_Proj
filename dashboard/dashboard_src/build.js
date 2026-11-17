/* Builds ../dashboard.html (one self-contained file: CSS, D3, data and app code inlined).
 *
 *   node build.js                 -> research questions listed in rq.config.json
 *   node build.js --rq 1,2,3      -> only those questions (cards, code and nothing else are included)
 *   node build.js --data path.json  (default ../data/dashboard_data.json)
 *
 * Each research question owns one card in src/template.html (between <!--RQn--> markers) and one code module.
 */
const fs = require('fs'), path = require('path');
const arg = n => { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : null; };
const rd = f => fs.readFileSync(f, 'utf8');
const MODULES = { 1: 'traj', 2: 'scatter', 3: 'dist', 4: 'heat', 5: 'mood', 6: 'milestones' };

const cfg = JSON.parse(rd(path.join(__dirname, 'rq.config.json')));
const rqs = (arg('rq') ? arg('rq').split(',').map(Number) : cfg.rqs).filter(n => MODULES[n]).sort((a, b) => a - b);
if (!rqs.length) throw new Error('no valid research questions selected');
const missing = rqs.filter(n => !fs.existsSync(path.join(__dirname, `src/${MODULES[n]}.js`)));
if (missing.length) throw new Error('missing source for RQ' + missing.join(', RQ') + ' (not part of this increment yet?)');

const dataPath = arg('data') || path.join(__dirname, '..', 'data', 'dashboard_data.json');
const css = rd(path.join(__dirname, 'src/styles.css'));
const d3 = rd(path.join(__dirname, 'node_modules/d3/dist/d3.min.js'));
const data = JSON.stringify(JSON.parse(rd(dataPath)));
const app = ['core'].concat(rqs.map(n => MODULES[n]), ['main']).map(n => rd(path.join(__dirname, `src/${n}.js`))).join('\n');

let html = rd(path.join(__dirname, 'src/template.html'));
for (const n of Object.keys(MODULES).map(Number)) {            // keep selected cards, drop the others
  const re = new RegExp(`<!--RQ${n}-->[\\s\\S]*?<!--/RQ${n}-->\\n*`, 'g');
  html = rqs.includes(n) ? html.replace(new RegExp(`<!--/?RQ${n}-->\\n?`, 'g'), '') : html.replace(re, '');
}
if (rqs.includes(6)) {                                         // RQ6 has its own data file, embedded only when RQ6 is built
  const ms = JSON.stringify(JSON.parse(rd(path.join(path.dirname(dataPath), 'milestones_data.json'))));
  html = html.replace('/*MSDATA*/', () => ms.replace(/</g, '\\u003c'));
}
html = html.replace('/*CSS*/', () => css).replace('/*DATA*/', () => data.replace(/</g, '\\u003c'))
  .replace('/*D3*/', () => d3.replace(/<\/script/gi, '<\\/script')).replace('/*APP*/', () => '(function(){\n' + app + '\n})();');
const outFile = arg('out') || path.join(__dirname, '..', 'dashboard.html');
fs.writeFileSync(outFile, html);
console.log('built', outFile, (html.length / 1e6).toFixed(2), 'MB · research questions:', rqs.join(', '));
