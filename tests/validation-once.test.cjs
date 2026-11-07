const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gunzipSync } = require('node:zlib');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = Buffer.concat([1, 2, 3].map(i => gunzipSync(readFileSync(path.join(root, `app-part-${i}.gz`))))).toString('utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const source = name => readFileSync(path.join(root, 'src', name), 'utf8');
function block(start, end) {
  const from = html.indexOf(start), to = html.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Delivered source markers: ${start} / ${end}`);
  return html.slice(from, to);
}
function declaration(name) {
  const match = html.match(new RegExp(`^const ${name}[^\\n]*`, 'm'));
  assert.ok(match, `Delivered declaration: ${name}`);
  return match[0];
}

// Execute the real calculations, validation paths, timer identity and backups.
// Only navigation, feedback, Grand Prix setup and speed adjustment are stubbed.
function application() {
  let now = 1794000000000, confirmation;
  const scheduled = [], buttons = [], asks = [], rawCallbacks = [];
  const counts = { save: 0, render: 0, undo: 0, reset: 0, snapshot: 0, logs: 0 };
  const noOp = () => {};
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  let context;
  const cancel = () => {
    confirmation = undefined;
    context.ui.sheet = null;
    context.v157CancelConfirmation();
  };
  context = vm.createContext({
    console, Date: ClockDate, Blob, Response, TextDecoder, TextEncoder, CompressionStream,
    DecompressionStream, atob, btoa,
    window: { CompressionStream, DecompressionStream, scrollTo: noOp },
    document: { querySelectorAll: () => buttons },
    setTimeout: (callback, delay) => { scheduled.push({ at: now + delay, callback }); return scheduled.length; },
    clearTimeout: noOp,
    ui: { open: {}, coinOpen: {}, terrainReleve: 0 },
    esc: value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    fmtNum: String, clamp: (n, min, max) => Math.max(min, Math.min(max, n)),
    ask: (title, body, label, callback) => {
      asks.push({ title, body, label }); rawCallbacks.push(callback);
      confirmation = context.v157ConfirmationCallback(callback);
      context.ui.sheet = { type: 'confirm' };
    },
    target: () => 10,
    bySpeedDesc: (a, b) => Number(b.speed) - Number(a.speed),
    ensureGPProfiles: noOp, sessionSpeedAdjustment: () => null,
    level: () => 1, stage: () => 0,
    addLog: (player, ...args) => { player.log.push(args); counts.logs++; },
    selectedSessionPreset: () => null,
    sessionAssessmentType: () => 'session', sessionAssessmentCoefficient: () => 0.5,
    sessionParticipationSnapshot: () => ({}), gpThemeParams: () => ({ pct: 100 }),
    deviceParams: () => ({ spacing: 25, lapM: 100, releveSec: 90 }),
    resetGPProfileRace: noOp, autoSyncPreparation: noOp,
    save: () => { counts.save++; }, saveUi: noOp,
    render: () => { counts.render++; }, rerender: () => { counts.render++; },
    closeSheet: cancel, fanfare: noOp, confetti: noOp, toast: noOp,
    pushUndo: () => { counts.undo++; }, focusActiveSeanceEntry: noOp,
    sessionCue: noOp, visualSignal: noOp,
    writeLocalSnapshot: () => { counts.snapshot++; },
    resetAndApplyQueuedNext: () => {
      counts.reset++;
      const state = context.api.getState();
      state.preparation = { gpMinutes: 0, sessionPresetId: state.preparation.queuedPresetId || 'default', queuedPresetId: null };
      const c = state.classes.find(c => c.id === state.cur);
      if (c) { c.draft = null; c.gpSession = null; c.gpSequence = null; }
    },
  });
  vm.runInContext([
    declaration('APP_VERSION'), declaration('DATA_SCHEMA_VERSION'), declaration('KEY'),
    block('function currentSchoolYear()', 'const LOCAL_SNAPSHOT_KEY'),
    block('const DEFAULT_CARDS =', 'const DURS ='), declaration('RELEVE_TARGET_COINS'),
    block('function defaultCardTier(', 'function cardTier('),
    block('const EVALUATION_PROTOCOLS=', 'const charOf ='),
    block('function defaults()', 'function readLocalSnapshots()'),
    block('const PARTICIPATION_META=', 'const CYCLE_PENALTY_POINTS='),
    block('function resetRunnerRolesBySpeed(', 'const runnerLabel ='),
    block('function inferClassLevel(', 'function sessionLevels('), declaration('cls'),
    block('function courseIsIntermittent(', 'function courseWorkSec('), declaration('ncp'),
    source('session-scoring.js'), source('coin-details-ui.js'),
    block('function seanceTotals(', 'function roleMini('),
    block('function seanceTimerEnsure(', 'function seanceElapsed('),
    block('function seanceTimerAdvance(', 'let seanceTimerInterval='),
    block('function terrainReleveIndex(', '/* Saisie terrain'),
    block('function releveSummary(', 'function sessionSpeedAdjustment('),
    source('validation-state.js'), source('session-commit.js'), source('reading-validation.js'),
    block('function cloneJson(', 'function backupDateTime('),
    'let S; globalThis.api = { defaults, migrate, normalizeRestoredState, makeBackupEnvelope,',
    'validateBackupEnvelope, encodeBackupEnvelope, decodeBackupCode, calc, sessionCoinSnapshot,',
    'commitCoursesAndContinueGP, commitCurrentSession, v157FinishSession, v157SessionFinished,',
    'v157BeginValidation, v157EndValidation, v157ValidationPending, v157CancelValidationPending,',
    'v157ConfirmationCallback, v157CancelConfirmation, v157CanCommit, v157CommitKey, v157FinishKey,',
    'v157SyncValidationButtons, v157ReadingCooldownKey, v157ReadingCooling, v157BlockReadingTaps,',
    'v157ValidateReading, v157CorrectReading, v157ReadingValidated, v157ReadingKey,',
    'v157ReadingIdentityMatches, v157CanEditReading, v157CanEditCourse, v157CanEditCourseForAll,',
    'v157ReadingSegmentForPlayer, setState(value) { S = value; }, getState() { return S; }, schema: DATA_SCHEMA_VERSION };',
  ].join('\n'), context, { filename: 'actual-validation-and-backups.js' });
  return {
    ...context.api, ui: context.ui, asks, rawCallbacks, counts, buttons,
    cancel,
    async confirm() {
      assert.equal(typeof confirmation, 'function', 'The action requests its usual confirmation.');
      const callback = confirmation; confirmation = undefined; context.ui.sheet = null;
      await callback();
    },
    pendingCallback: () => confirmation,
    advance(ms) {
      now += ms;
      for (;;) {
        const i = scheduled.findIndex(item => item.at <= now);
        if (i < 0) break;
        scheduled.splice(i, 1)[0].callback();
      }
    },
    button(key, cooldown) {
      const attributes = {};
      const button = { dataset: { validationKey: key, validationCooldown: cooldown }, disabled: false,
        setAttribute: (key, value) => { attributes[key] = value; }, removeAttribute: key => { delete attributes[key]; }, attributes };
      buttons.push(button); return button;
    },
  };
}

function fixture(app, { values = [10, 10, 10], courses = 1 } = {}) {
  const state = app.defaults();
  state.cur = 'class-test'; state.schoolYear = '2026-2027'; state.settings.malusStartSession = 2;
  state.preparation.gpMinutes = 0;
  const course = { dur: values.length * 90, pct: 100, releves: values.length, releveSec: 90, device: 'plots' };
  const rows = Array.from({ length: courses }, () => plain(values));
  state.seanceCfg.courses = Array.from({ length: courses }, () => plain(course));
  state.classes = [{
    id: 'class-test', name: '4e Test', schoolYear: state.schoolYear,
    players: ['p1', 'p2'].map((id, i) => ({ id, name: `Élève ${i + 1}`, speed: 12 - i * 2,
      runnerRole: i ? 'luigi' : 'mario', char: i ? 'luigi' : 'mario', xp: 100, spent: 20, carr: 5, coach: null, note: '', log: [] })),
    teams: [], absent: [], participation: {}, hands: {}, races: [],
    gp: { mode: 'teams', profile: 'teams', order: [], t0: null, acc: 0, hands: {} },
    sessions: [{ id: 'old-session', title: 'Séance historique', t: 1793400000000, total: 17, n: 1,
      deltas: { p1: { xp: 17, carr: 0, objs: 1, totalObjs: 1, regular: 1, warm: 0 } } }],
    draft: { id: 'draft-test', title: 'Séance 999', mode: 'detail',
      courses: Array.from({ length: courses }, () => plain(course)), interval: 90, spacing: 25, device: 'plots', warmBonus: 5, warmMalus: 3,
      firstGroup: 'mario', groupRotation: 'alternate',
      e: Object.fromEntries(['p1', 'p2'].map(id => [id, { ab: false, cp: plain(rows), w: rows.map(row => row.map(() => false)), rg: rows.map(() => false),
        q: 0, qo: false, wu: true, rc: false, warm: 'done' }])),
      timer: { segment: 0, phase: 'run', t0: null, acc: 12000, completed: false, validatedSegments: {}, validatedReleves: {} },
    },
  }];
  const normalized = app.migrate(state); app.setState(normalized);
  return { state: normalized, c: normalized.classes[0], d: normalized.classes[0].draft };
}
function reading(d, { segment = d.timer.segment, k = 0, group = 1 } = {}) {
  return { draft: d.id, segment: String(segment), k: String(k), group: String(group) };
}

for (const commit of ['commitCoursesAndContinueGP', 'commitCurrentSession']) {
  test(`${commit}: a double entry and duplicated credit callback award coins, body points and history only once`, async () => {
    const app = application(), { c, d } = fixture(app);
    const oldHistory = plain(c.sessions), expected = c.players.map(p => plain(app.calc(d, p)));
    app[commit](); app[commit]();
    assert.equal(app.asks.length, 1);
    const raw = app.rawCallbacks[0];
    await app.confirm(); await raw(); await raw();
    assert.equal(c.sessions.length, 2);
    assert.equal(app.counts.logs, 2);
    c.players.forEach((p, i) => {
      assert.equal(p.xp, 100 + expected[i].coins); assert.equal(p.carr, 5 + expected[i].carr); assert.equal(p.log.length, 1);
      assert.deepEqual(JSON.parse(c.sessions[1].deltas[p.id].coinDetails), plain(app.sessionCoinSnapshot(expected[i], d)));
    });
    assert.deepEqual(plain(c.sessions.slice(0, 1)), oldHistory);
    assert.equal(c.draft, null);
  });
}

test('confirmation tickets run once, cancel pending buttons, and reject superseded callbacks', () => {
  const app = application(); fixture(app);
  let called = 0;
  const button = app.button('save', '');
  assert.equal(app.v157BeginValidation('save'), true); assert.equal(app.v157BeginValidation('save'), false);
  assert.equal(button.disabled, true); assert.equal(button.attributes['aria-busy'], 'true');
  const callback = app.v157ConfirmationCallback(() => { called++; }); callback(); callback();
  assert.equal(called, 1); assert.equal(button.disabled, false); assert.equal(button.attributes['aria-busy'], undefined);
  app.v157BeginValidation('save'); const cancelled = app.v157ConfirmationCallback(() => { called++; });
  app.v157CancelConfirmation(); cancelled(); assert.equal(called, 1); assert.equal(button.disabled, false);
  const superseded = app.v157ConfirmationCallback(() => { called++; });
  const latest = app.v157ConfirmationCallback(() => { called += 10; }); superseded(); latest();
  assert.equal(called, 11);
});

test('closing a save confirmation releases the lock and permits a deliberate retry', async () => {
  const app = application(), { c, d } = fixture(app), key = app.v157CommitKey(c, d);
  app.commitCurrentSession(); const obsolete = app.pendingCallback();
  assert.equal(app.v157ValidationPending(key), true); app.cancel(); obsolete();
  assert.equal(app.v157ValidationPending(key), false); assert.equal(c.sessions.length, 1);
  app.commitCurrentSession(); assert.equal(app.asks.length, 2); await app.confirm(); assert.equal(c.sessions.length, 2);
});

for (const changed of ['class', 'draft', 'record']) {
  test(`an open credit callback cannot save after its ${changed} identity changes`, async () => {
    const app = application(), { state, c, d } = fixture(app);
    app.commitCurrentSession();
    if (changed === 'class') { const other = plain(c); other.id = 'other'; state.classes.push(other); state.cur = 'other'; }
    if (changed === 'draft') c.draft = { ...plain(d), id: 'replacement' };
    if (changed === 'record') c.sessions.push({ id: d.id, title: 'Already saved', deltas: {} });
    await app.confirm();
    assert.equal(c.players[0].xp, 100); assert.equal(c.players[0].carr, 5); assert.equal(app.counts.logs, 0);
    assert.equal(c.sessions.length, changed === 'record' ? 2 : 1);
  });
}

test('a no-result save releases its pending lock without opening confirmation', () => {
  const app = application(), { c, d } = fixture(app, { values: [null, null] });
  c.players.forEach(p => { d.e[p.id].wu = false; });
  app.commitCurrentSession();
  assert.equal(app.asks.length, 0); assert.equal(app.v157ValidationPending(app.v157CommitKey(c, d)), false);
});

test('reading validation requires the exact draft, segment, index and group on the rendered action', () => {
  const app = application(), { d } = fixture(app);
  for (const field of ['draft', 'segment', 'k', 'group']) {
    const data = reading(d); delete data[field]; app.v157ValidateReading(data);
  }
  for (const patch of [{ draft: 'old' }, { segment: '1' }, { k: '1' }, { group: '2' }, { k: '-1' }, { k: 'NaN' }, { segment: '' }]) {
    app.v157ValidateReading({ ...reading(d), ...patch });
  }
  assert.equal(app.counts.undo, 0); assert.equal(app.asks.length, 0);
  assert.deepEqual(plain(d.timer.validatedReleves), {});
  app.v157ValidateReading(reading(d));
  assert.equal(app.v157ReadingValidated(d, 0, 0), true); assert.equal(app.counts.undo, 1);
});

test('a double tap and an old rendered action cannot validate the following reading', () => {
  const app = application(), { c, d } = fixture(app);
  const oldData = reading(d), cooldown = app.v157ReadingCooldownKey(c, d);
  const nextButton = app.button(app.v157ReadingKey(c, d, 0, 1), cooldown);
  app.v157ValidateReading(oldData);
  assert.equal(app.ui.terrainReleve, 1); assert.equal(nextButton.disabled, true);
  app.v157ValidateReading(reading(d, { k: 1 })); app.v157ValidateReading(oldData);
  assert.equal(app.v157ReadingValidated(d, 0, 1), false);
  app.advance(399); assert.equal(nextButton.disabled, true);
  app.advance(1); assert.equal(nextButton.disabled, false); assert.equal(app.v157ReadingCooling(c, d), false);
  app.v157ValidateReading(oldData); assert.equal(app.v157ReadingValidated(d, 0, 1), false);
  app.v157ValidateReading(reading(d, { k: 1 })); assert.equal(app.v157ReadingValidated(d, 0, 1), true);
  assert.equal(app.counts.undo, 2);
});

test('an already validated reading rejects repeat validation even after its cooldown', () => {
  const app = application(), { d } = fixture(app);
  app.v157ValidateReading(reading(d)); app.advance(400); app.ui.terrainReleve = 0;
  app.v157ValidateReading(reading(d));
  assert.equal(app.counts.undo, 1); assert.equal(app.ui.terrainReleve, 0);
});

test('two taps on an incomplete reading open one confirmation; cancellation leaves its values untouched', async () => {
  const app = application(), { c, d } = fixture(app, { values: [null, 10, 10] });
  const before = plain(d.e), key = app.v157ReadingKey(c, d, 0, 0);
  app.v157ValidateReading(reading(d)); app.v157ValidateReading(reading(d));
  assert.equal(app.asks.length, 1); assert.equal(app.v157ValidationPending(key), true);
  const obsolete = app.pendingCallback(); app.cancel(); obsolete();
  assert.equal(app.v157ValidationPending(key), false); assert.equal(app.v157ReadingValidated(d, 0, 0), false);
  assert.deepEqual(plain(d.e), before); app.advance(400);
  app.v157ValidateReading(reading(d)); await app.confirm();
  assert.equal(app.v157ReadingValidated(d, 0, 0), true); assert.deepEqual(plain(d.e), before);
});

test('confirming an incomplete reading after a long pause still blocks a tap on the following reading', async () => {
  const app = application(), { c, d } = fixture(app, { values: [null, 10, 10] });
  app.v157ValidateReading(reading(d)); app.advance(1500); await app.confirm();
  assert.equal(app.v157ReadingCooling(c, d), true); assert.equal(app.ui.terrainReleve, 1);
  app.v157ValidateReading(reading(d, { k: 1 })); assert.equal(app.v157ReadingValidated(d, 0, 1), false);
  app.advance(400); app.v157ValidateReading(reading(d, { k: 1 }));
  assert.equal(app.v157ReadingValidated(d, 0, 1), true);
});

for (const changed of ['timer', 'class', 'draft', 'reading', 'segment']) {
  test(`an incomplete-reading confirmation cannot validate after the ${changed} changes`, async () => {
    const app = application(), { state, c, d } = fixture(app, { values: [null, 10, 10] });
    const oldTimer = d.timer; app.v157ValidateReading(reading(d));
    if (changed === 'timer') d.timer = { ...plain(d.timer), validatedReleves: {} };
    if (changed === 'class') { const other = plain(c); other.id = 'other'; state.classes.push(other); state.cur = 'other'; }
    if (changed === 'draft') c.draft = { ...plain(d), id: 'next-draft' };
    if (changed === 'reading') app.ui.terrainReleve = 1;
    if (changed === 'segment') d.timer.segment = 1;
    await app.confirm();
    assert.deepEqual(plain(oldTimer.validatedReleves), {}); assert.equal(app.counts.undo, 0);
  });
}

test('Corriger reopens only its reading and segment flag, preserves timer/data, and permits revalidation', () => {
  const app = application(), { d } = fixture(app);
  d.timer.validatedReleves = { 0: { 0: true, 1: true, 2: true }, 1: { 0: true } };
  d.timer.validatedSegments = { 0: true, 1: true }; d.timer.completed = true;
  const beforeData = plain(d.e), beforeTimer = { phase: d.timer.phase, t0: d.timer.t0, acc: d.timer.acc };
  assert.equal(app.v157CanEditReading(d, 'p1', 0, 0), false);
  app.v157CorrectReading(reading(d));
  assert.equal(app.v157ReadingValidated(d, 0, 0), false); assert.equal(app.v157CanEditReading(d, 'p1', 0, 0), true);
  assert.deepEqual(plain(d.timer.validatedReleves), { 0: { 1: true, 2: true }, 1: { 0: true } });
  assert.deepEqual(plain(d.timer.validatedSegments), { 1: true }); assert.equal(d.timer.completed, false);
  assert.deepEqual({ phase: d.timer.phase, t0: d.timer.t0, acc: d.timer.acc }, beforeTimer);
  assert.deepEqual(plain(d.e), beforeData);
  app.v157ValidateReading(reading(d)); assert.equal(app.v157ReadingValidated(d, 0, 0), false, 'Correction also blocks a trailing double tap.');
  app.advance(400); app.v157ValidateReading(reading(d));
  assert.equal(app.v157ReadingValidated(d, 0, 0), true); assert.equal(d.timer.validatedSegments[0], true);
  assert.equal(app.v157CanEditCourse(d, 'p1', 0), false); assert.equal(app.counts.undo, 2);
});

for (const rotation of ['alternate', 'block']) {
  test(`editing guards map Luigi first and ${rotation} rotation to the actual validated course/group`, () => {
    const app = application(), { c, d } = fixture(app, { courses: 2 });
    d.firstGroup = 'luigi'; d.groupRotation = rotation;
    const marioSecondCourse = 3;
    const luigiFirstCourse = 0;
    assert.equal(app.v157ReadingSegmentForPlayer(d, 'p1', 1), marioSecondCourse);
    assert.equal(app.v157ReadingSegmentForPlayer(d, 'p2', 0), luigiFirstCourse);
    assert.equal(app.v157ReadingSegmentForPlayer(d, 'p1', 0), rotation === 'block' ? 2 : 1);
    assert.equal(app.v157ReadingSegmentForPlayer(d, 'p2', 1), rotation === 'block' ? 1 : 2);
    d.timer.validatedReleves = { [marioSecondCourse]: { 1: true } };
    assert.equal(app.v157CanEditReading(d, 'p1', 1, 1), false);
    assert.equal(app.v157CanEditReading(d, 'p1', 1, 0), true);
    assert.equal(app.v157CanEditReading(d, 'p1', 0, 1), true);
    assert.equal(app.v157CanEditReading(d, 'p2', 1, 1), true);
    assert.equal(app.v157CanEditCourse(d, 'p1', 1), false); assert.equal(app.v157CanEditCourseForAll(d, 1), false);
    assert.equal(app.v157CanEditCourseForAll(d, 0), true);
    c.absent.push('p1'); assert.equal(app.v157CanEditReading(d, 'p1', 1, 1), true);
    assert.equal(app.v157CanEditReading(d, 'unknown', 1, 1), false);
    assert.equal(app.v157CanEditReading(d, 'p2', 1, 99), false);
  });
}

test('finishing a recorded session once preserves the queued preparation across retries and reload', async () => {
  const app = application(), { state, c } = fixture(app); c.draft = null;
  state.preparation.queuedPresetId = 'next-prepared';
  app.v157FinishSession(); app.v157FinishSession(); assert.equal(app.asks.length, 1);
  const raw = app.rawCallbacks[0]; await app.confirm(); await raw(); app.v157FinishSession();
  assert.equal(app.counts.reset, 1); assert.equal(app.counts.snapshot, 1);
  assert.equal(app.v157SessionFinished(c), true); assert.equal(c.sessions[0].finishedAt, 1794000000000);
  assert.equal(state.preparation.sessionPresetId, 'next-prepared');
  const reloaded = application(); reloaded.setState(plain(state)); reloaded.v157FinishSession();
  assert.equal(reloaded.asks.length, 0); assert.equal(reloaded.counts.reset, 0);
  assert.equal(reloaded.getState().preparation.sessionPresetId, 'next-prepared');
  const restoredClass = reloaded.getState().classes[0];
  restoredClass.sessions.push({ id: 'new-session', title: 'Nouvelle séance', t: 1794000000100, deltas: {} });
  reloaded.v157FinishSession(); await reloaded.confirm();
  assert.equal(reloaded.counts.reset, 1); assert.equal(reloaded.v157SessionFinished(restoredClass), true);
});

test('saving and finishing a draft credits once and does not reset the next preparation twice', async () => {
  const app = application(), { state, c, d } = fixture(app), expected = app.calc(d, c.players[0]).coins;
  state.preparation.queuedPresetId = 'next-prepared';
  app.commitCurrentSession(true); const raw = app.rawCallbacks[0]; await app.confirm(); await raw();
  app.commitCurrentSession(true); app.v157FinishSession();
  assert.equal(c.sessions.length, 2); assert.equal(c.players[0].xp, 100 + expected);
  assert.equal(app.counts.reset, 1); assert.ok(c.sessions[1].finishedAt > 0);
  assert.equal(state.preparation.sessionPresetId, 'next-prepared');
});

for (const changed of ['class', 'session', 'draft']) {
  test(`a finish confirmation cannot reset preparation after its ${changed} changes`, async () => {
    const app = application(), { state, c, d } = fixture(app); c.draft = null;
    app.v157FinishSession();
    if (changed === 'class') { const other = plain(c); other.id = 'other'; state.classes.push(other); state.cur = 'other'; }
    if (changed === 'session') c.sessions.push({ id: 'new-session', title: 'Nouvelle séance', deltas: {} });
    if (changed === 'draft') c.draft = d;
    await app.confirm(); assert.equal(app.counts.reset, 0); assert.equal(c.sessions[0].finishedAt, undefined);
  });
}

test('finishing with no recorded session or class leaves preparation and data intact', () => {
  const app = application(), { state, c } = fixture(app); c.draft = null; c.sessions = [];
  const before = plain(state.preparation); app.v157FinishSession();
  assert.equal(app.counts.reset, 0); assert.equal(app.asks.length, 0); assert.deepEqual(plain(state.preparation), before);
  state.classes = []; app.v157FinishSession(); assert.equal(app.counts.reset, 0); assert.equal(app.asks.length, 0);
});

test('optional finishedAt survives full/class gzip backups and schema-4 restore without rewriting old history', async () => {
  const app = application(), { state, c } = fixture(app); c.draft = null;
  c.sessions.push({ id: 'recent', title: 'Séance terminée', t: 1794000000000, finishedAt: 1794000000001, evaluationProtocolId: 'mario-run-session-v1', total: 12, n: 1, deltas: { p1: { xp: 12, carr: 0 } } });
  const before = plain(c.sessions); assert.equal(app.schema, 4);
  for (const scope of ['full', 'class']) {
    const envelope = app.makeBackupEnvelope(scope); assert.equal(envelope.schema, 2);
    app.validateBackupEnvelope(envelope);
    const code = await app.encodeBackupEnvelope(envelope); assert.ok(code.startsWith('MR2G.'));
    const decoded = await app.decodeBackupCode(code);
    const copy = scope === 'full' ? decoded.envelope.payload.classes[0] : decoded.envelope.payload.class;
    assert.deepEqual(plain(copy.sessions), before);
    const input = scope === 'full' ? decoded.envelope.payload : { ...app.defaults(), cur: copy.id, classes: [copy] };
    const restored = app.normalizeRestoredState(plain(input));
    assert.equal(restored.v, 4); assert.deepEqual(plain(restored.classes[0].sessions), before);
    assert.equal(Object.hasOwn(restored.classes[0].sessions[0], 'finishedAt'), false);
    app.setState(restored); app.v157FinishSession(); assert.equal(app.counts.reset, 0); assert.equal(app.asks.length, 0);
  }
  app.setState(state);
});
