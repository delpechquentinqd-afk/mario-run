const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gunzipSync } = require('node:zlib');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = Buffer.concat([1, 2, 3].map(i =>
  gunzipSync(readFileSync(path.join(root, `app-part-${i}.gz`)))
)).toString('utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const recordedDetail = delta => {
  assert.equal(typeof delta.coinDetails, 'string', 'The optional snapshot is serialized so old backup complexity budgets remain compatible.');
  return JSON.parse(delta.coinDetails);
};

function block(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Delivered source markers: ${start} / ${end}`);
  return html.slice(from, to);
}
function declaration(name) {
  const match = html.match(new RegExp(`^const ${name}[^\\n]*`, 'm'));
  assert.ok(match, `Delivered declaration: ${name}`);
  return match[0];
}

// Run the actual shipped validation paths and backup functions. Only unrelated
// navigation, feedback, Grand Prix setup and speed adjustment are stubbed.
function application() {
  let confirmation;
  const noOp = () => {};
  const context = vm.createContext({
    console, Blob, Response, TextDecoder, TextEncoder, CompressionStream,
    DecompressionStream, atob, btoa,
    window: { CompressionStream, DecompressionStream, scrollTo: noOp },
    ui: { open: {}, coinOpen: {} },
    esc: value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    fmtNum: String,
    ask: (_title, _body, _label, callback) => { confirmation = callback; },
    target: () => 10,
    ensureGPProfiles: noOp, sessionSpeedAdjustment: () => null,
    level: () => 1, stage: () => 0, addLog: noOp,
    selectedSessionPreset: () => null,
    sessionAssessmentType: () => 'session', sessionAssessmentCoefficient: () => 0.5,
    sessionParticipationSnapshot: () => ({}), gpThemeParams: () => ({ pct: 100 }),
    deviceParams: () => ({ spacing: 25, lapM: 100, releveSec: 90 }),
    resetGPProfileRace: noOp, autoSyncPreparation: noOp,
    save: noOp, render: noOp, closeSheet: noOp, fanfare: noOp,
    confetti: noOp, toast: noOp,
  });
  const source = [
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
    block('function entry(', 'function srow('),
    block('function coinAmount(', 'function terrainReleveIndex('),
    block('function seanceTotals(', 'function seanceGroups('),
    block('function releveSummary(', 'function sessionSpeedAdjustment('),
    block('function commitCoursesAndContinueGP(', 'function rollbackSessionSpeedIfSafe('),
    block('function cloneJson(', 'function backupDateTime('),
    'let S; globalThis.api = { defaults, migrate, normalizeRestoredState,',
    'makeBackupEnvelope, validateBackupEnvelope, encodeBackupEnvelope, decodeBackupCode,',
    'calc, sessionCoinSnapshot, savedCoinDetailsHtml,',
    'commitCoursesAndContinueGP, commitCurrentSession,',
    'setState(value) { S = value; }, getState() { return S; }, schema: DATA_SCHEMA_VERSION };',
  ].join('\n');
  vm.runInContext(source, context, { filename: 'delivered-coin-detail-persistence.js' });
  return { ...context.api, confirm: async () => {
    assert.equal(typeof confirmation, 'function', 'The delivered commit must request its usual validation.');
    const callback = confirmation; confirmation = undefined;
    await callback();
  }};
}

function fixture(app, { values = [10, 10, 10, 10, 11], mode = 'detail', warm = 'done', warmMalus = 3, carr = false } = {}) {
  const state = app.defaults();
  state.schoolYear = '2026-2027';
  state.cur = 'class-test';
  state.settings.malusStartSession = 2;
  state.preparation.gpMinutes = 0;
  const courses = [{ dur: 450, pct: 100, releves: 5, releveSec: 90, device: 'plots' }];
  state.seanceCfg.courses = plain(courses);
  state.classes = [{
    id: 'class-test', name: '4e Test', schoolYear: state.schoolYear,
    players: [{ id: 'p1', name: 'Élève test', speed: 10, runnerRole: 'mario', char: 'mario', xp: 100, spent: 20, carr: 5, coach: null, note: '', log: [] }],
    teams: [], absent: [], participation: {}, hands: {}, races: [],
    gp: { mode: 'teams', profile: 'teams', order: [], t0: null, acc: 0 },
    sessions: [{ id: 'old-session', title: 'Séance historique', t: 1793400000000,
      evaluationProtocolId: 'mario-run-session-v1', protocolScores: {}, total: 17, n: 1,
      deltas: { p1: { xp: 17, carr: 0, objs: 1, totalObjs: 1, regular: 1, warm: 0 } } }],
    draft: { id: 'draft-test', title: '2026 · séance fictive 999', mode,
      courses: plain(courses), interval: 90, spacing: 25, device: 'plots', warmBonus: 5, warmMalus,
      e: { p1: { ab: false, cp: [values], w: [values.map(() => false)], rg: [true],
        q: 12, qo: true, wu: carr, rc: false, warm } },
      timer: { segment: 0, phase: 'ready', t0: null, acc: 0, completed: false },
    },
  }];
  const normalized = app.migrate(state);
  app.setState(normalized);
  return normalized;
}

for (const pathName of ['commitCoursesAndContinueGP', 'commitCurrentSession']) {
  test(`${pathName} stores the exact computed detail and credits coins once without rewriting history`, async () => {
    const app = application();
    const state = fixture(app);
    const c = state.classes[0], p = c.players[0], draft = c.draft;
    const oldHistory = plain(c.sessions);
    const result = app.calc(draft, p);
    const expected = plain(app.sessionCoinSnapshot(result, draft));
    const beforeXp = p.xp, beforeCarr = p.carr;
    app[pathName]();
    await app.confirm();
    assert.equal(c.sessions.length, 2);
    const saved = c.sessions[1].deltas.p1;
    assert.deepEqual(recordedDetail(saved), expected);
    assert.equal(saved.xp, result.coins);
    assert.equal(p.xp, beforeXp + result.coins);
    assert.equal(p.carr, beforeCarr + result.carr);
    assert.deepEqual(plain(c.sessions.slice(0, 1)), oldHistory);
    assert.equal(c.draft, null);
    assert.equal(Object.hasOwn(c.sessions[0].deltas.p1, 'coinDetails'), false);
    draft.e.p1.cp[0].fill(99);
    result.per[0].coinDetails.net = 999;
    assert.deepEqual(recordedDetail(saved), expected, 'The saved detail must be a detached snapshot.');
  });
}

test('validation records an incomplete course and both zero floors without inventing extra credit', async () => {
  const app = application();
  const state = fixture(app, { values: [10, null, null, null, null], warm: 'low', carr: true });
  const c = state.classes[0], p = c.players[0];
  const result = app.calc(c.draft, p);
  assert.equal(result.coins, 0);
  app.commitCurrentSession(); await app.confirm();
  const detail = recordedDetail(c.sessions[1].deltas.p1);
  assert.equal(detail.coins, 0);
  assert.equal(detail.courses[0].readingsComplete, false);
  assert.equal(detail.courses[0].floorAdjustment, 1);
  assert.equal(detail.sessionFloorAdjustment, 3);
  assert.equal(p.xp, 100);
  assert.match(app.savedCoinDetailsHtml(c.sessions[1].deltas.p1, 'saved'), /Saisie incomplète lors de la validation/);
});

test('quick entry retains its recorded total without manufacturing per-course automatic details', async () => {
  const app = application();
  const state = fixture(app, { mode: 'quick', warm: 'good' });
  const c = state.classes[0], expected = app.calc(c.draft, c.players[0]).coins;
  app.commitCoursesAndContinueGP(); await app.confirm();
  const saved = c.sessions[1].deltas.p1;
  assert.equal(saved.xp, expected);
  assert.equal(recordedDetail(saved).mode, 'quick');
  assert.deepEqual(recordedDetail(saved).courses, []);
  assert.match(app.savedCoinDetailsHtml(saved, 'quick'), /Saisie rapide : total enregistré sans détail automatique par course/);
});

test('historical display uses frozen recorded amounts after settings or student speed change', async () => {
  const app = application();
  const state = fixture(app);
  const c = state.classes[0];
  app.commitCurrentSession(); await app.confirm();
  const saved = c.sessions[1].deltas.p1;
  const before = app.savedCoinDetailsHtml(saved, 'saved');
  const oldBefore = plain(c.sessions[0]);
  Object.assign(state.settings, { regBonus: 999, noWalkBonus: 999, walkMalus: 999, objMalus: 999, regMalus: 999 });
  c.players[0].speed = 30;
  assert.equal(app.savedCoinDetailsHtml(saved, 'saved'), before);
  const unavailable = app.savedCoinDetailsHtml(c.sessions[0].deltas.p1, 'old');
  assert.match(unavailable, /17 🪙 enregistrées/);
  assert.match(unavailable, /Détail des pièces non enregistré/);
  assert.doesNotMatch(unavailable, /Bonus de régularité|Malus pour marche|relevés identiques/);
  assert.deepEqual(plain(c.sessions[0]), oldBefore);
});

test('full and class schema-2 backups preserve optional snapshots and legacy records through actual gzip encoding', async () => {
  const app = application();
  const state = fixture(app);
  app.commitCurrentSession(); await app.confirm();
  const before = plain(state.classes[0].sessions);
  assert.equal(app.schema, 4);
  for (const scope of ['full', 'class']) {
    const env = app.makeBackupEnvelope(scope);
    assert.equal(env.schema, 2);
    assert.equal(app.validateBackupEnvelope(env), env);
    const code = await app.encodeBackupEnvelope(env);
    assert.ok(code.startsWith('MR2G.'));
    const decoded = await app.decodeBackupCode(code);
    assert.equal(decoded.version, 2);
    const savedClass = scope === 'full' ? decoded.envelope.payload.classes[0] : decoded.envelope.payload.class;
    assert.deepEqual(plain(savedClass.sessions), before);
    const restoredInput = scope === 'full' ? decoded.envelope.payload : { ...app.defaults(), cur: savedClass.id, classes: [savedClass] };
    const restored = app.normalizeRestoredState(plain(restoredInput));
    assert.equal(restored.v, 4);
    assert.deepEqual(plain(restored.classes[0].sessions), before);
    assert.equal(Object.hasOwn(restored.classes[0].sessions[0].deltas.p1, 'coinDetails'), false);
    assert.equal(recordedDetail(restored.classes[0].sessions[1].deltas.p1).version, 1);
  }
});

test('a normal multi-class cycle remains restorable when optional coin details are recorded', async () => {
  const app = application();
  const state = fixture(app), c = state.classes[0], d = c.draft;
  d.courses = [d.courses[0], plain(d.courses[0]), plain(d.courses[0])];
  const e = d.e.p1;
  e.cp = [e.cp[0], plain(e.cp[0]), plain(e.cp[0])];
  e.w = [e.w[0], plain(e.w[0]), plain(e.w[0])];
  e.rg = [false, false, false];
  app.commitCurrentSession(); await app.confirm();
  const sample = plain(c.sessions[1]);
  state.classes = Array.from({ length: 6 }, (_, ci) => {
    const classroom = plain(c);
    classroom.id = `class-${ci}`; classroom.name = `4e Test ${ci}`;
    classroom.players = Array.from({ length: 35 }, (_, pi) => ({
      ...plain(c.players[0]), id: `p${pi}`, name: `Élève ${pi}`, xp: 100 + 10 * sample.deltas.p1.xp,
    }));
    classroom.sessions = Array.from({ length: 10 }, (_, si) => ({
      ...plain(sample), id: `session-${si}`, n: 35, total: 35 * sample.total,
      deltas: Object.fromEntries(classroom.players.map(p => [p.id, plain(sample.deltas.p1)])),
    }));
    return classroom;
  });
  state.cur = state.classes[0].id; app.setState(state);
  const envelope = app.makeBackupEnvelope('full');
  const withoutDetails = plain(state);
  for (const classroom of withoutDetails.classes) {
    for (const session of classroom.sessions) {
      for (const delta of Object.values(session.deltas)) delete delta.coinDetails;
    }
  }
  app.setState(withoutDetails);
  assert.doesNotThrow(() => app.validateBackupEnvelope(app.makeBackupEnvelope('full')),
    'The same supported class/cycle volume was accepted before the optional detail.');
  app.setState(state);
  assert.doesNotThrow(() => app.validateBackupEnvelope(envelope),
    'Recording optional details must not make an otherwise valid multi-class backup impossible to restore.');
  const decoded = await app.decodeBackupCode(await app.encodeBackupEnvelope(envelope));
  assert.deepEqual(plain(decoded.envelope.payload.classes[5].sessions[9].deltas.p34.coinDetails),
    plain(sample.deltas.p1.coinDetails));
});
