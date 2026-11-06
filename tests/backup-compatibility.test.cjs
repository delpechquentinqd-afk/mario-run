const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gunzipSync } = require('node:zlib');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
// Exercise the code actually delivered to the PWA, rather than a copy of its
// migration or backup implementation. The embedded images need no browser.
const html = Buffer.concat([1, 2, 3].map(i =>
  gunzipSync(readFileSync(path.join(root, `app-part-${i}.gz`)))
)).toString('utf8');

function block(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Application source markers: ${start} / ${end}`);
  return html.slice(from, to);
}

function declaration(name) {
  const match = html.match(new RegExp(`^const ${name}[^\\n]*`, 'm'));
  assert.ok(match, `Application declaration: ${name}`);
  return match[0];
}

const plain = value => JSON.parse(JSON.stringify(value));

function application() {
  const context = vm.createContext({
    console, Blob, Response, TextDecoder, TextEncoder,
    CompressionStream, DecompressionStream, atob, btoa,
    window: { CompressionStream, DecompressionStream },
    // Profile initialization does not participate in scoring or data encoding.
    ensureGPProfiles: c => c,
    target: () => 8,
  });
  const source = [
    declaration('APP_VERSION'), declaration('DATA_SCHEMA_VERSION'),
    declaration('KEY'), declaration('IDB_PRIMARY_NAME'), declaration('IDB_PRIMARY_STORE'),
    block('function currentSchoolYear()', 'const LOCAL_SNAPSHOT_KEY'),
    block('const DEFAULT_CARDS =', 'const DURS ='),
    declaration('RELEVE_TARGET_COINS'),
    block('function defaultCardTier(', 'function cardTier('),
    block('const EVALUATION_PROTOCOLS=', 'const charOf ='),
    block('function defaults()', 'function readLocalSnapshots()'),
    block('const PARTICIPATION_META=', 'const CYCLE_PENALTY_POINTS='),
    block('function resetRunnerRolesBySpeed(', 'const runnerLabel ='),
    block('function inferClassLevel(', 'function sessionLevels('),
    declaration('cls'),
    block('function courseIsIntermittent(', 'function courseWorkSec('),
    declaration('ncp'),
    block('function entry(', 'function srow('),
    block('function cloneJson(', 'function backupDateTime('),
    'let S; globalThis.api = { migrate, normalizeRestoredState, makeBackupEnvelope,',
    'validateBackupEnvelope, encodeBackupEnvelope, decodeBackupCode, calc,',
    'setState(value) { S = value; }, getState() { return S; },',
    'storage: { DATA_SCHEMA_VERSION, KEY, IDB_PRIMARY_NAME, IDB_PRIMARY_STORE } };',
  ].join('\n');
  vm.runInContext(source, context, { filename: 'built-application-backup.js' });
  return context.api;
}

// Synthetic saved state in the V131.55 format: no new ordinal field, existing
// manual rg flag, committed deltas, a custom malus threshold and active draft.
function v13155State() {
  const courses = [{ dur: 450, pct: 90, releves: 5, releveSec: 90, device: 'plots' }];
  return {
    v: 4, protocols: [], schoolYear: '2026-2027', cur: 'class-4e', locked: true,
    localDataUpdatedAt: 1793952000000,
    settings: {
      cardPrice: 35, levelXp: 200, carrWeight: 3, carrStep: 15,
      objBonus: 5, regBonus: 7, noWalkBonus: 3, walkMalus: 4,
      objMalus: 2, regMalus: 6, malusStartSession: 7,
      warmPts: 5, recovPts: 5, rewards: [], sound: true, haptic: true, pin: '1234',
    },
    preparation: {
      title: '6e 2026 : 3 × 5 minutes', warmup: 'Footing', warmDuration: 600,
      warmBonus: 5, warmMalus: 3, gpMinutes: 15, gpFormat: 'whole', gpCardsAuto: true,
    },
    seanceCfg: {
      courses, interval: 90, spacing: 25, device: 'plots', groupMode: 'speed', groupMap: {},
      deviceCfg: { plots: { spacing: 25, lapM: 100, releveSec: 90 } },
    },
    cards: [{ id: 'banane', name: 'Banane', tier: 'small', image: 'banane.png', enabled: true }],
    classes: [{
      id: 'class-4e', name: '4e A', schoolYear: '2026-2027', archived: false,
      evaluationPresetId: 'c4s8', evaluationProtocolId: 'cycle4-eval-3-6-90-v1',
      evaluationProtocolByPreset: { c4s8: 'cycle4-eval-3-6-90-v1' },
      players: [{
        id: 'p1', name: 'Élève exemple', speed: 10, runnerRole: 'mario',
        char: 'mario', xp: 260, spent: 75, carr: 10, coach: null, note: '', log: [],
      }],
      teams: [], absent: [], participation: {}, hands: {}, races: [],
      gp: { profile: 'whole', mode: 'individual', order: [], t0: null, acc: 0 },
      sessions: Array.from({ length: 6 }, (_, i) => ({
        id: `session-${i + 1}`, t: 1793400000000 + i * 86400000,
        title: `Cycle 2026 · séance ${i + 1}`, n: 1, total: 40, carrT: 5,
        evaluationProtocolId: 'mario-run-session-v1', protocolScores: {},
        deltas: { p1: {
          xp: 40, carr: 5, objs: 1, totalObjs: 1, attained: 1, exceeded: 0,
          unmet: 0, regular: 1, walks: 0, totalReleves: 5, regularReleves: 5,
          attainedReleves: 5, exceededReleves: 0, unmetReleves: 0, walkReleves: 0,
          warm: 0, warmQuality: 'done', speedAdjustment: null,
        } },
      })),
      cycleSessionCount: 8, effectiveSessionMinutes: 105,
      draft: {
        id: 'draft-v13155', t: 1793952000000, title: '6e 2026 : 3 × 5 minutes',
        mode: 'detail', courses: plain(courses), interval: 90, spacing: 25,
        device: 'plots', groupMode: 'speed', groupMap: {}, firstGroup: 'mario',
        warmBonus: 5, warmMalus: 3,
        e: { p1: {
          ab: false, cp: [[8, 8, 8, 9, 10]], w: [[false, false, false, false, false]],
          rg: [true], q: 0, qo: false, wu: false, rc: false, warm: 'done',
        } },
        timer: { segment: 0, phase: 'ready', t0: null, acc: 0, lastMark: 0, completed: false },
      },
    }],
  };
}

test('the built application retains V131.55 storage identifiers and schema', () => {
  assert.deepEqual(plain(application().storage), {
    DATA_SCHEMA_VERSION: 4,
    KEY: 'mario-cartes-eps',
    IDB_PRIMARY_NAME: 'mario-run-eps-primary-v1',
    IDB_PRIMARY_STORE: 'records',
  });
});

test('V131.55 migration and restore preserve settings, active draft, balances and committed results', () => {
  const app = application();
  const before = v13155State();
  const migrated = app.migrate(plain(before));
  const restored = app.normalizeRestoredState(plain(migrated));
  assert.equal(restored.v, 4);
  assert.equal(restored.cur, before.cur);
  assert.equal(restored.settings.malusStartSession, 7);
  assert.deepEqual(plain(restored.settings), before.settings);
  assert.deepEqual(plain(restored.classes[0].draft), before.classes[0].draft);
  assert.deepEqual(plain(restored.classes[0].players), before.classes[0].players);
  assert.deepEqual(plain(restored.classes[0].sessions), before.classes[0].sessions);
});

test('V2 full and class exports round-trip V131.55 data with the actual encoder and validator', async () => {
  const app = application();
  const before = v13155State();
  app.setState(app.normalizeRestoredState(plain(before)));
  for (const scope of ['full', 'class']) {
    const envelope = app.makeBackupEnvelope(scope);
    assert.equal(envelope.magic, 'MARIO_RUN_BACKUP');
    assert.equal(envelope.schema, 2);
    assert.equal(app.validateBackupEnvelope(envelope), envelope);
    const code = await app.encodeBackupEnvelope(envelope);
    assert.ok(code.startsWith('MR2G.'));
    const decoded = await app.decodeBackupCode(code);
    assert.equal(decoded.version, 2);
    assert.deepEqual(plain(decoded.envelope), plain(envelope));
    const savedClass = scope === 'full' ? envelope.payload.classes[0] : envelope.payload.class;
    assert.deepEqual(plain(savedClass.sessions), before.classes[0].sessions);
    assert.deepEqual(plain(savedClass.players), before.classes[0].players);
    assert.deepEqual(plain(savedClass.draft), before.classes[0].draft);
    if (scope === 'full') {
      const restored = app.normalizeRestoredState(plain(decoded.envelope.payload));
      assert.equal(restored.settings.malusStartSession, 7);
      assert.equal(restored.settings.pin, ''); // Existing export privacy behavior.
      assert.deepEqual(plain(restored.classes[0].draft), before.classes[0].draft);
    }
  }
  // Export must not mutate the working state's balances or teacher PIN.
  assert.equal(app.getState().settings.pin, '1234');
  assert.deepEqual(plain(app.getState().classes[0].players), before.classes[0].players);
});

test('an imported manual regularity flag cannot bypass automatic scoring', () => {
  const app = application();
  const before = v13155State();
  const restored = app.normalizeRestoredState(plain(before));
  app.setState(restored);
  const c = restored.classes[0];
  const result = app.calc(c.draft, c.players[0]);
  assert.equal(result.per[0].regular, false, '3/5 identical must not honor the old rg=true');
  assert.equal(result.per[0].b, before.settings.noWalkBonus);
  assert.equal(result.malusActive, true, 'six stored sessions make this chronological session seven');
  c.draft.e.p1.cp[0] = [8, 8, 8, 8, 9];
  c.draft.e.p1.rg[0] = false;
  const regular = app.calc(c.draft, c.players[0]);
  assert.equal(regular.per[0].regular, true, '4/5 identical must qualify even with old rg=false');
  assert.equal(regular.per[0].b, before.settings.noWalkBonus + before.settings.regBonus);
  assert.deepEqual(plain(c.sessions), before.classes[0].sessions, 'history stays frozen');
  assert.deepEqual(plain(c.players), before.classes[0].players, 'preview does not credit balances');
});

test('the backup integrity check still rejects modified historical data', () => {
  const app = application();
  app.setState(app.normalizeRestoredState(v13155State()));
  const envelope = app.makeBackupEnvelope('full');
  envelope.payload.classes[0].sessions[0].deltas.p1.xp++;
  assert.throws(() => app.validateBackupEnvelope(envelope), /checksum/);
});
