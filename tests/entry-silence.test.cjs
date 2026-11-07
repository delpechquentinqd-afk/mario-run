const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { gunzipSync } = require('node:zlib');

const root = path.resolve(__dirname, '..');
const baseline = 'c2255f4a6875670792b18581e4552c28b09a7fa7';
const html = Buffer.concat([1, 2, 3].map(i => gunzipSync(readFileSync(path.join(root, `app-part-${i}.gz`))))).toString('utf8');
const original = Buffer.concat([1, 2, 3].map(i => gunzipSync(execFileSync('git', ['show', `${baseline}:app-part-${i}.gz`], {
  cwd: root, maxBuffer: 40 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
})))).toString('utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function block(document, start, end) {
  const a = document.indexOf(start), b = document.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Delivered source markers: ${start} / ${end}`);
  return document.slice(a, b);
}
function line(document, prefix) {
  const found = document.split('\n').find(line => line.startsWith(prefix));
  assert.ok(found, `Delivered source line: ${prefix}`); return found;
}

// Run the shipped action bodies, regularity rules, edit guards, player lookup
// and row persistence. Browser rendering and feedback are instrumented only.
function application({ values = [10, 10, 10], walks = [false, false, false], refreshed = true } = {}) {
  const audio = [], counts = { sync: 0, save: 0, render: 0, undo: [] }, rows = [];
  const c = { id: 'class-test', players: [{ id: 'p1', speed: 12 }, { id: 'p2', speed: 10 }], absent: [], sessions: [],
    draft: { id: 'draft-test', mode: 'detail', firstGroup: 'mario', groupRotation: 'alternate', courses: [{ releves: 3 }],
      timer: { validatedReleves: {}, validatedSegments: {} },
      e: Object.fromEntries(['p1', 'p2'].map(id => [id, { cp: [plain(values)], w: [plain(walks)], rg: [false] }])) } };
  const spy = name => (...args) => { audio.push({ name, args }); };
  const ctx = vm.createContext({
    S: { cur: c.id, classes: [c], settings: { sound: true }, seanceCfg: {}, preparation: {} },
    ui: { terrainReleve: 0, open: {} }, cls: () => c, pl: id => c.players.find(p => p.id === id),
    ncp: co => co.releves, target: p => p?.id === 'p1' ? 10 : p?.id === 'p2' ? 8 : null,
    bySpeedDesc: (a, b) => b.speed - a.speed,
    save: () => { counts.save++; }, rerender: () => { counts.render++; },
    pushUndo: label => { counts.undo.push(label); },
    refreshTerrainRow: pid => { rows.push(pid); return refreshed; },
    beep: spy('beep'), coinSound: spy('coinSound'), unlockAudio: spy('unlockAudio'),
    playMarioSound: spy('playMarioSound'), playSound: spy('playSound'),
    sessionCue: spy('sessionCue'), feedbackCue: spy('feedbackCue'), fanfare: spy('fanfare'),
    mediaAudio: () => ({ play: spy('play') }),
    Audio: class { play() { audio.push({ name: 'play' }); } },
  });
  vm.runInContext([
    block(html, 'function entry(d, pid) {', 'function srow(d, p) {'),
    block(html, 'function seanceGroups(', 'function roleMini('),
    block(html, 'function v157ReadingValidated(', 'function v157ReadingAttributes('),
    block(html, 'function terrainPlayerId(', 'const A ='),
    line(html, 'function refreshRow('),
    'const realSyncRegularity=syncRegularity; syncRegularity=(...args)=>{ onSync(); return realSyncRegularity(...args); };',
    'globalThis.actions = ({',
    block(html, '  courseAllTargets:', '  qStep:'),
    '});',
  ].join('\n'), Object.assign(ctx, { onSync: () => { counts.sync++; } }), { filename: 'delivered-silent-entry-actions.js' });
  return { c, d: c.draft, actions: ctx.actions, counts, rows, audio };
}
function assertSilent(app) { assert.deepEqual(app.audio, [], 'Manual entry must not beep, play a coin/media sound, unlock audio or trigger a course cue.'); }

test('the objective target writes the chosen reading, clears its walk, synchronizes and saves silently', () => {
  const app = application({ values: [null, 7, 7], walks: [true, false, false] });
  app.actions.cpTarget({ id: 'p1', i: '0', k: '0' });
  assert.deepEqual(plain(app.d.e.p1.cp), [[10, 7, 7]]); assert.deepEqual(plain(app.d.e.p1.w), [[false, false, false]]);
  assert.equal(app.counts.sync, 1); assert.equal(app.counts.save, 1); assert.equal(app.counts.undo.length, 1);
  assert.deepEqual(app.rows, ['p1']); assertSilent(app);
});

for (const [label, value, delta, expected] of [
  ['plus from empty', null, 1, 10], ['minus from empty', null, -1, 9],
  ['plus from existing', 10, 1, 11], ['minus from existing', 10, -1, 9], ['minus at zero', 0, -1, 0],
]) {
  test(`the ${label} step keeps its value calculation and refresh while remaining silent`, () => {
    const app = application({ values: [10, value, 10], walks: [false, true, false] });
    app.actions.cpStep({ id: 'p1', i: '0', k: '1', d: String(delta) });
    assert.equal(app.d.e.p1.cp[0][1], expected); assert.equal(app.d.e.p1.w[0][1], false);
    assert.equal(app.d.e.p1.rg[0], expected === 10);
    assert.equal(app.counts.sync, 1); assert.equal(app.counts.save, 1); assert.equal(app.counts.undo.length, 1);
    assert.deepEqual(app.rows, ['p1']); assertSilent(app);
  });
}

test('filling all targets for one student keeps the other student intact and recalculates regularity silently', () => {
  const app = application({ values: [null, 4, 7], walks: [true, true, true] });
  const other = plain(app.d.e.p2);
  app.actions.cpAll({ id: 'p1', i: '0' });
  assert.deepEqual(plain(app.d.e.p1.cp), [[10, 10, 10]]); assert.deepEqual(plain(app.d.e.p1.w), [[false, false, false]]);
  assert.equal(app.d.e.p1.rg[0], true); assert.deepEqual(plain(app.d.e.p2), other);
  assert.equal(app.counts.sync, 1); assert.equal(app.counts.save, 1); assert.equal(app.counts.undo.length, 1);
  assert.deepEqual(app.rows, ['p1']); assertSilent(app);
});

test('filling a course uses each student target and retains saving and rerendering without sound', () => {
  const app = application({ values: [null, 4, 7], walks: [true, true, true] });
  app.actions.courseAllTargets({ i: '0' });
  for (const [id, target] of [['p1', 10], ['p2', 8]]) {
    assert.deepEqual(plain(app.d.e[id].cp), [[target, target, target]]);
    assert.deepEqual(plain(app.d.e[id].w), [[false, false, false]]); assert.equal(app.d.e[id].rg[0], true);
  }
  assert.equal(app.counts.sync, 2); assert.equal(app.counts.save, 1); assert.equal(app.counts.render, 1);
  assert.deepEqual(app.rows, []); assertSilent(app);
});

test('walk toggles preserve readings, update automatic regularity and save silently', () => {
  const app = application(), before = plain(app.d.e.p1.cp);
  app.actions.cpWalk({ id: 'p1', i: '0', k: '1' });
  assert.equal(app.d.e.p1.w[0][1], true); assert.equal(app.d.e.p1.rg[0], false);
  app.actions.cpWalk({ id: 'p1', i: '0', k: '1' });
  assert.equal(app.d.e.p1.w[0][1], false); assert.equal(app.d.e.p1.rg[0], true);
  assert.deepEqual(plain(app.d.e.p1.cp), before); assert.equal(app.counts.sync, 2); assert.equal(app.counts.save, 2);
  assert.deepEqual(app.rows, ['p1', 'p1']); assertSilent(app);
});

test('a manual regularity action still applies the automatic rule and cannot grant an ineligible bonus', () => {
  const app = application({ values: [10, 11, 12] }); app.d.e.p1.rg[0] = true;
  app.actions.cpReg({ id: 'p1', i: '0' });
  assert.equal(app.d.e.p1.rg[0], false); assert.equal(app.counts.sync, 1); assert.equal(app.counts.save, 1);
  assert.deepEqual(app.rows, ['p1']); assertSilent(app);
});

test('row-local player identity and full-render fallback remain operational without sound', () => {
  const app = application({ values: [null, 10, 10], refreshed: false });
  const row = { dataset: { player: 'p1' } }, el = { closest: () => row };
  app.actions.cpTarget({ id: 'p2', i: '0', k: '0' }, el);
  assert.equal(app.d.e.p1.cp[0][0], 10); assert.equal(app.d.e.p2.cp[0][0], null);
  assert.equal(app.counts.save, 1); assert.equal(app.counts.render, 1); assert.deepEqual(app.rows, ['p1']); assertSilent(app);
});

test('silencing entry retains the guards against editing or bulk-filling validated readings', () => {
  const app = application(), before = plain(app.d.e);
  app.d.timer.validatedReleves = { 0: { 0: true } };
  app.actions.cpTarget({ id: 'p1', i: '0', k: '0' });
  app.actions.cpStep({ id: 'p1', i: '0', k: '0', d: '1' });
  app.actions.cpWalk({ id: 'p1', i: '0', k: '0' });
  app.actions.cpAll({ id: 'p1', i: '0' }); app.actions.courseAllTargets({ i: '0' });
  assert.deepEqual(plain(app.d.e), before); assert.equal(app.counts.sync, 0); assert.equal(app.counts.save, 0);
  assert.deepEqual(app.rows, []); assertSilent(app);
});

function gestureApplication() {
  const listeners = [], calls = [];
  const S = { settings: { sound: true } }, ui = { sheet: null };
  const ctx = vm.createContext({
    S, ui, unlockAudio: () => { calls.push('unlockAudio'); },
    document: { addEventListener: (type, callback, options) => { listeners.push({ type, callback, options: plain(options) }); } },
  });
  vm.runInContext([
    block(html, 'const v157PendingValidations=', 'function rollbackSessionSpeedIfSafe('),
    block(html, 'function v157PrimeGestureAudio(', 'function gpPriceInputFromTarget('),
    line(html, "document.addEventListener('pointerdown',v157PrimeGestureAudio,"),
    line(html, "document.addEventListener('touchend',v157PrimeGestureAudio,"),
    'globalThis.begin=v157BeginValidation; globalThis.cancel=v157CancelValidationPending;',
  ].join('\n'), ctx, { filename: 'delivered-entry-audio-listeners.js' });
  assert.deepEqual(listeners.map(({ type, options }) => ({ type, options })), [
    { type: 'pointerdown', options: { capture: true, passive: true } },
    { type: 'touchend', options: { capture: true, passive: true } },
  ]);
  return {
    S, ui, calls, begin: ctx.begin, cancel: ctx.cancel,
    gesture({ action, field, entryPanel = false } = {}) {
      const target = { closest: selector => {
        if (selector === '[data-a], [data-f]') return action || field ? { dataset: { a: action, f: field } } : null;
        if (selector === '.active-entry-panel, .terrain-releve-nav') return entryPanel ? {} : null;
        return null;
      } };
      listeners.forEach(listener => listener.callback({ target }));
    },
  };
}

test('the delivered pointer and touch listeners do not prime audio on manual reading controls', () => {
  const app = gestureApplication();
  for (const action of ['cpTarget', 'cpStep', 'cpAll', 'cpWalk', 'cpReg', 'courseAllTargets',
    'qStep', 'qObj', 'eWarm', 'eRecov', 'allWarm', 'allRecov', 'seanceValidateGroup', 'v157CorrectReading',
    'terrainReleveSet', 'terrainRelevePrev', 'terrainReleveNext']) app.gesture({ action });
  assert.deepEqual(app.calls, [], 'Neither touch phase may play the nearly silent Safari priming sound during entry.');
});

test('quick-entry fields and touches inside the entry panel or reading navigation stay silent', () => {
  const app = gestureApplication();
  app.gesture({ field: 'qSet' }); app.gesture({ entryPanel: true }); app.gesture({ action: 'unknownChild', entryPanel: true });
  assert.deepEqual(app.calls, []);
});

test('the missing-reading confirmation remains silent and does not mute later unrelated confirmations', () => {
  const app = gestureApplication(); app.ui.sheet = { type: 'confirm' }; app.begin('read:class:draft:0:0');
  app.gesture({ action: 'confirmOk' }); app.gesture({ action: 'closeSheet' }); assert.deepEqual(app.calls, []);
  app.cancel(); app.begin('finish:class:session'); app.gesture({ action: 'confirmOk' });
  assert.equal(app.calls.length, 2, 'A finished-session confirmation retains the normal Safari gesture priming.');
});

test('starting or resuming the timer and Grand Prix still primes Safari audio when sound is enabled', () => {
  const app = gestureApplication();
  for (const action of ['seanceTimerToggle', 'gpMLStart', 'soundToggle']) app.gesture({ action });
  assert.equal(app.calls.length, 6);
  app.S.settings.sound = false; app.gesture({ action: 'seanceTimerToggle' }); app.gesture({ action: 'gpMLStart' });
  assert.equal(app.calls.length, 6, 'The existing global sound preference remains authoritative.');
});

for (const [name, start, end] of [
  ['audio playback functions', 'function mediaAudio(', 'const TABS ='],
  ['course timer transitions and automatic signals', 'function seanceTimerAdvance(', 'function focusActiveSeanceEntry('],
]) {
  test(`manual entry silence preserves the published ${name} byte for byte`, () => {
    const hash = text => createHash('sha256').update(text).digest('hex');
    assert.equal(hash(block(html, start, end)), hash(block(original, start, end)));
  });
}
