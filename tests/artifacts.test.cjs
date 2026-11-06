const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { gunzipSync } = require('node:zlib');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const baselineCommit = '1ec9464c1ee82c0d8c2dfcadfb5b35212a969b95';
const baseline = name => execFileSync('git', ['show', `${baselineCommit}:${name}`], {
  cwd: root, maxBuffer: 40 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
});
const archives = [1, 2, 3].map(i => readFileSync(path.join(root, `app-part-${i}.gz`)));
const html = Buffer.concat(archives.map(part => gunzipSync(part))).toString('utf8');
const baselineHtml = Buffer.concat([1, 2, 3].map(i => gunzipSync(baseline(`app-part-${i}.gz`)))).toString('utf8');

function block(document, start, end) {
  const from = document.indexOf(start);
  const to = document.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Source markers: ${start} / ${end}`);
  return document.slice(from, to);
}

const deliveredScoring = block(html, 'function entry(d, pid) {', 'function srow(d, p) {');

test('the gzip delivered to the PWA contains the reviewed scoring source', () => {
  const source = readFileSync(path.join(root, 'src/session-scoring.js'), 'utf8');
  assert.equal(deliveredScoring.trim(), source.slice(source.indexOf('function entry(d, pid) {')).trim());
});

test('all inline scripts in the delivered application parse successfully', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 3);
  for (const [i, script] of scripts.entries()) {
    assert.doesNotThrow(() => new vm.Script(script[1], { filename: `delivered-script-${i + 1}.js` }));
  }
});

test('the delivered regularity control is an automatic status with no manual action', () => {
  const row = block(html, 'function srow(d, p) {', 'function seanceTotals(d) {');
  assert.doesNotMatch(row, /data-a=["']cpReg["']/);
  assert.match(row, /<button class="toggle" disabled aria-pressed="\$\{e\.rg\[i\]\}">📏 Régularité automatique · 80 %/);
});

test('the delivered legacy cpReg action cannot grant an invalid bonus or disable a valid one', () => {
  const actionLine = html.match(/^  cpReg: [^\n]+$/m)?.[0];
  assert.ok(actionLine, 'The backwards-compatible action remains defined.');
  const e = { ab: false, cp: [[10, 10, 10, 11, 12]], w: [[false, false, false, false, false]], rg: [true], warm: 'done' };
  const draft = { mode: 'detail', courses: [{ releves: 5 }], e: { pilot: e } };
  const currentClass = { sessions: [], draft };
  let refreshed = 0;
  const context = vm.createContext({
    S: { settings: { regBonus: 5, noWalkBonus: 5, warmPts: 5, recovPts: 5 }, preparation: {} },
    cls: () => currentClass,
    ncp: course => course.releves,
    target: () => 10,
    terrainPlayerId: data => data.id,
    refreshRow: id => { assert.equal(id, 'pilot'); refreshed++; },
    RELEVE_TARGET_COINS: 5,
    EXTRA_UNIT_COINS: 1,
  });
  vm.runInContext(`${deliveredScoring}\nglobalThis.action = ({${actionLine.trim()}}).cpReg;`, context);
  const data = { id: 'pilot', i: '0' };

  context.action(data);
  assert.equal(e.rg[0], false);
  assert.equal(context.calc(draft, { id: 'pilot' }).per[0].regular, false);

  e.cp[0][3] = 10;
  context.action(data);
  assert.equal(e.rg[0], true);
  context.action(data);
  assert.equal(e.rg[0], true, 'Repeated activation does not toggle the automatic result off.');
  assert.equal(context.calc(draft, { id: 'pilot' }).per[0].b, 10);
  assert.equal(refreshed, 3);
});

test('the first two compressed parts remain byte-for-byte identical to V131.55', () => {
  for (const i of [1, 2]) {
    assert.ok(archives[i - 1].equals(baseline(`app-part-${i}.gz`)));
  }
});

test('the delivered persistence, migration and backup implementations remain unchanged', () => {
  for (const [start, end] of [
    ['/* ---------- État & persistance ---------- */', 'const ui ='],
    ['function cloneJson(', 'function backupDateTime('],
  ]) {
    assert.equal(block(html, start, end), block(baselineHtml, start, end));
  }
});
