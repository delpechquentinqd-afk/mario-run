#!/usr/bin/env node
'use strict';

// V131.55 remains the immutable asset/source archive. Only the scoring block and
// focused scoring / coin-detail UI are replaced when preparing V131.56.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { gunzipSync, gzipSync } = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const BASE_COMMIT = '1ec9464c1ee82c0d8c2dfcadfb5b35212a969b95';
const PART_NAMES = [1, 2, 3].map(i => `app-part-${i}.gz`);

function baselineFile(name) {
  try {
    return execFileSync('git', ['show', `${BASE_COMMIT}:${name}`], {
      cwd: ROOT,
      maxBuffer: 40 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    throw new Error(`Impossible de lire ${name} dans la V131.55 (${BASE_COMMIT}). Conserver l’historique Git, ou récupérer ce commit avant la reconstruction.`, { cause: error });
  }
}

function replaceExactly(text, before, after, count = 1) {
  const found = text.split(before).length - 1;
  if (found !== count) throw new Error(`Remplacement ambigu : ${JSON.stringify(before.slice(0, 90))} ; attendu ${count}, trouvé ${found}.`);
  return text.split(before).join(after);
}

function reconstruct() {
  const archived = PART_NAMES.map(baselineFile);
  const parts = archived.map(part => gunzipSync(part));
  const original = Buffer.concat(parts).toString('utf8');
  let html = original;
  const start = html.indexOf('function entry(d, pid) {');
  const end = html.indexOf('function srow(d, p) {', start);
  if (start < 0 || end <= start) throw new Error('Bloc de calcul V131.55 introuvable.');
  const source = fs.readFileSync(path.join(ROOT, 'src/session-scoring.js'), 'utf8');
  html = replaceExactly(html, html.slice(start, end), source.trimEnd() + '\n');
  html = replaceExactly(html, 'PWA V131.55', 'PWA V131.56', 4);
  html = replaceExactly(html,
    '<button class="toggle" data-a="cpReg" data-id="${p.id}" data-i="${i}" aria-pressed="${e.rg[i]}">📏 Régularité +${st.regBonus}</button>',
    '${courseCoinDetailsHtml(x.coinDetails,`legacy:${d.id}:${p.id}:${i}`)}');
  html = replaceExactly(html,
    "  cpReg: (d,el) => { pushUndo('régularité'); const pid=terrainPlayerId(d,el),e=entry(cls().draft,pid); e.rg[+d.i] = !e.rg[+d.i]; refreshRow(pid); },",
    '  cpReg: (d,el) => { const pid=terrainPlayerId(d,el),dr=cls().draft,e=entry(dr,pid); syncRegularity(e,+d.i,dr); refreshRow(pid); },');
  const detailSource = fs.readFileSync(path.join(ROOT, 'src/coin-details-ui.js'), 'utf8');
  html = replaceExactly(html, 'function terrainReleveIndex(d,co){', detailSource.trimEnd() + '\n\nfunction terrainReleveIndex(d,co){');
  const rowStart = html.indexOf('function terrainRowHtml(');
  const rowEnd = html.indexOf('function updateTerrainCurrentMissing', rowStart);
  if (rowStart < 0 || rowEnd <= rowStart) throw new Error('Saisie terrain V131.55 introuvable.');
  const entrySource = fs.readFileSync(path.join(ROOT, 'src/session-entry-ui.js'), 'utf8');
  html = replaceExactly(html, html.slice(rowStart, rowEnd), entrySource.trimEnd() + '\n');
  // Both validation paths retain the result already used to credit this pupil.
  // The optional snapshot is a JSON string so old backup readers keep their
  // existing tree-complexity budget even for several classes and full cycles.
  html = replaceExactly(html, "speedAdjustment:adj||null};", "speedAdjustment:adj||null,coinDetails:JSON.stringify(sessionCoinSnapshot(r,d))};", 2);
  html = replaceExactly(html, '${gradeBlock(c,lastS,p)}', '${gradeBlock(c,lastS,p)}\n      ${savedCoinDetailsHtml(lastS?.deltas?.[p.id],`bilan:${lastS?.id}:${p.id}`)}');
  html = replaceExactly(html,
    '<div class="fd">🎯 ${tot?Math.round(ok/tot*100):0}% · 📏 ${tot?Math.round(reg/tot*100):0}% · 🚶 ${walk}</div></div></div>',
    '<div class="fd">🎯 ${tot?Math.round(ok/tot*100):0}% · 📏 ${tot?Math.round(reg/tot*100):0}% · 🚶 ${walk}</div>${savedCoinDetailsHtml(d,`cycle:${ss.id}:${pid}`)}</div></div>');
  const css = fs.readFileSync(path.join(ROOT, 'src/coin-details.css'), 'utf8');
  // Appending the style after the asset-heavy main script keeps parts 1 and 2
  // untouched, including the character artwork and PDF-specific styles.
  const pwaScript = '</script>\n\n<script>\n/* V131.39';
  html = replaceExactly(html, pwaScript, '</script>\n<style id="v131-56-coins">\n' + css + '\n</style>\n<script>\n/* V131.39');
  html = replaceExactly(html,
    '/* ---------- Démarrage : aucune interface modifiable avant la lecture IndexedDB. ---------- */',
    `// Native inline disclosures retain their state when a pupil row is refreshed.
document.addEventListener('toggle', event => {
  const detail=event.target;
  if(detail.matches?.('details[data-coin-key]')){
    ui.coinOpen=ui.coinOpen||{};
    ui.coinOpen[detail.dataset.coinKey]=detail.open;
  }
},true);

/* ---------- Démarrage : aucune interface modifiable avant la lecture IndexedDB. ---------- */`);
  return { archived, parts, original, html };
}

function buildArtifacts() {
  const reconstructed = reconstruct();
  const { archived, parts, html } = reconstructed;
  const merged = Buffer.from(html, 'utf8');
  const cut1 = parts[0].length;
  const cut2 = cut1 + parts[1].length;
  const generatedParts = [merged.subarray(0, cut1), merged.subarray(cut1, cut2), merged.subarray(cut2)];
  const artifacts = new Map(PART_NAMES.map((name, i) => [name,
    generatedParts[i].equals(parts[i]) ? archived[i] : gzipSync(generatedParts[i], { level: 9, mtime: 0 })
  ]));
  artifacts.set('index.html', Buffer.from(replaceExactly(baselineFile('index.html').toString('utf8'), '13155', '13156', 3)));
  let sw = replaceExactly(baselineFile('sw.js').toString('utf8'), 'mario-run-v131-55', 'mario-run-v131-56');
  sw = replaceExactly(sw, '13155', '13156', 3);
  artifacts.set('sw.js', Buffer.from(sw));
  return { ...reconstructed, artifacts };
}

function main(args = process.argv.slice(2)) {
  if (args.some(arg => !['--check', '--extract'].includes(arg))) throw new Error('Usage : node scripts/build.cjs [--check] [--extract]');
  const check = args.includes('--check');
  const { artifacts, original, html } = buildArtifacts();
  if (args.includes('--extract')) {
    const dir = path.join(ROOT, 'work');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'app-v13155.html'), original);
    fs.writeFileSync(path.join(dir, 'app-v13156.html'), html);
  }
  for (const [name, content] of artifacts) {
    const destination = path.join(ROOT, name);
    const current = fs.existsSync(destination) ? fs.readFileSync(destination) : null;
    if (current?.equals(content)) continue;
    // zlib versions can encode the same HTML differently. Preserve a valid
    // third archive when its payload is current; the two archived parts stay exact.
    if (name === 'app-part-3.gz' && current) {
      try { if (gunzipSync(current).equals(gunzipSync(content))) continue; } catch (_) {}
    }
    if (check) throw new Error(`${name} n’est pas à jour : exécuter npm run build.`);
    fs.writeFileSync(destination, content);
  }
  process.stdout.write(check ? 'Artefacts V131.56 vérifiés.\n' : 'Artefacts V131.56 reconstruits.\n');
}

module.exports = { BASE_COMMIT, PART_NAMES, baselineFile, replaceExactly, reconstruct, buildArtifacts, main };
if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
