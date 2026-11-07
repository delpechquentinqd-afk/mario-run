const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { gunzipSync } = require('node:zlib');
const { createHash } = require('node:crypto');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const base = 'c2255f4a6875670792b18581e4552c28b09a7fa7';
const baseline = name => execFileSync('git', ['show', `${base}:${name}`], {
  cwd: root, maxBuffer: 40 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
});
const html = Buffer.concat([1, 2, 3].map(i => gunzipSync(readFileSync(path.join(root, `app-part-${i}.gz`))))).toString('utf8');
const original = Buffer.concat([1, 2, 3].map(i => gunzipSync(baseline(`app-part-${i}.gz`)))).toString('utf8');
const source = name => readFileSync(path.join(root, 'src', name), 'utf8');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plain = value => JSON.parse(JSON.stringify(value));
function block(document, start, end) {
  const a = document.indexOf(start), b = document.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Source markers: ${start} / ${end}`);
  return document.slice(a, b);
}
function dataHashes(document) {
  return [...document.matchAll(/data:[A-Za-z0-9.+/-]+;base64,[A-Za-z0-9+/=]+/g)]
    .map(match => createHash('sha256').update(match[0]).digest('hex')).sort();
}
function actions(markup) { return [...markup.matchAll(/data-a="([^"]+)"/g)].map(m => m[1]); }
function fields(markup) { return [...markup.matchAll(/data-f="([^"]+)"/g)].map(m => m[1]); }

for (const [label, start, end] of [
  ['financial calculation and automatic regularity', 'function entry(d, pid) {', 'function srow(d, p) {'],
  ['recorded coin details and snapshots', 'function coinAmount(', 'function terrainReleveIndex('],
  ['storage and migrations', '/* ---------- État & persistance ---------- */', 'const ui ='],
  ['backup formats and restore validation', 'function cloneJson(', 'function backupDateTime('],
  ['timer advancement and signals', 'function seanceTimerAdvance(', 'function focusActiveSeanceEntry('],
  ['Grand Prix cards and gameplay', 'const GP_STEPS =', '/* ---------- Vue Cartes ---------- */'],
  ['native multipage PDF exporter', '  copySheetPages: async () => {', '  objectivePrint: () =>'],
]) {
  test(`V131.57 preserves ${label}`, () => {
    assert.equal(block(html, start, end), block(original, start, end));
  });
}

for (const [name, end] of [
  ['commitCoursesAndContinueGP', 'function commitCurrentSession('],
  ['commitCurrentSession', 'function rollbackSessionSpeedIfSafe('],
]) {
  test(`V131.57 preserves the financial loop and saved record of ${name}`, () => {
    const next = block(html, `function ${name}(`, end);
    const previous = block(original, `function ${name}(`, end);
    const financial = code => code.match(/    const deltas=[\s\S]*?\n    c\.sessions\.push\([^\n]+/)[0];
    assert.equal(financial(next), financial(previous), 'Coins, body points, objective counts and frozen details must remain identical.');
  });
}

test('V131.57 preserves every embedded asset and the card definitions', () => {
  const before = dataHashes(original), after = dataHashes(html);
  assert.ok(before.length > 30, 'The comparison covers actual embedded media.');
  assert.deepEqual(after, before);
  assert.equal(block(html, 'const DEFAULT_CARDS =', 'const DURS ='), block(original, 'const DEFAULT_CARDS =', 'const DURS ='));
});

test('the loader and offline service worker change only their release identifiers', () => {
  const loader = readFileSync(path.join(root, 'index.html'), 'utf8');
  const sw = readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(loader, /v=13157/);
  assert.match(sw, /mario-run-v131-57/);
  assert.equal(loader.replaceAll('13157', '13156'), baseline('index.html').toString('utf8'));
  assert.equal(sw.replaceAll('13157', '13156').replaceAll('v131-57', 'v131-56'), baseline('sw.js').toString('utf8'));
  assert.equal(readFileSync(path.join(root, 'manifest.json'), 'utf8'), baseline('manifest.json').toString('utf8'));
});

test('the delivered V131.57 interface matches the reviewed UI source files', () => {
  for (const name of ['home-classes.js', 'home-overview.js', 'preparation-view.js', 'preparation-section.js', 'session-view.js', 'session-entry-ui.js', 'session-timer-ui.js', 'validation-state.js', 'session-commit.js', 'reading-validation.js', 'validation-ui.js']) {
    const code=source(name).replace(/^\/\*[\s\S]*?\*\/\s*/, '').trim();
    assert.ok(html.includes(code), `Missing delivered source: ${name}`);
  }
  for (const name of ['home-v13157.css', 'preparation-v13157.css', 'session-v13157.css']) {
    assert.ok(html.includes(source(name).trim()), `Missing delivered styles: ${name}`);
  }
  assert.match(html, /PWA V131\.57/);
});

function fixture() {
  const c = { id: 'class-a', name: '4e Test', schoolYear: '2026-2027', archived: false,
    players: [{ id: 'p1', name: 'Léa & Test', speed: 12, char: 'mario' }, { id: 'p2', name: 'Noé', speed: 10, char: 'luigi' }],
    absent: [], sessions: [], draft: null };
  return { c, S: { schoolYear: '2026-2027', classes: [c], cur: c.id, lastFullBackup: null,
    settings: { regBonus: 5, noWalkBonus: 5, walkMalus: 3, objMalus: 3, regMalus: 3, malusStartSession: 5, warmPts: 5, recovPts: 5 },
    preparation: { title: 'Séance personnalisée', presentation: 'Objectif & allure', warmupId: 'warm', warmup: 'Footing', warmDuration: 600, warmBonus: 5, warmMalus: 3, gpMinutes: 15, gpSheetText: 'Texte personnalisé' },
    seanceCfg: { courses: [{ dur: 450, releves: 5, releveSec: 90, pct: 90 }], interval: 90 },
    uiPrefs: { displayLevel: 'essential', prepOpen: { session: false, paddock: true, courses: false, verify: false } } },
    ui: { showArchives: false, coinOpen: {}, terrainReleve: 0 } };
}
function commonContext(f = fixture()) {
  const preset = { id: 's1', title: 'Diagnostic', goal: 'Trouver son allure', courses: f.S.seanceCfg.courses };
  const ctx = vm.createContext({
    S: f.S, ui: f.ui, VIEWS: {}, cls: () => f.c, esc,
    normalizedSchoolYear: value => value || '2026-2027',
    schoolYearOptions: selected => `<option selected value="${esc(selected)}">${esc(selected)}</option>`,
    HOME_TITLE_LOGO: 'data:image/png;base64,cHJlc2VydmVk', fmtDate: () => '06/11/2026',
    v157DisclosureOpen: () => false,
    inferClassLevel: () => '4e', classCycleSessionCount: () => 8,
    classCycleGrade: () => ({ avg: null }), cycleGradeForPlayer: () => ({ count: 0, avg: null }),
    participationRecord: (c, id) => ({ status: c.absent.includes(id) ? 'absent-justified' : 'present' }),
    bankRecommendation: () => ({ id: 's1', reason: 'Poursuivre le cycle' }),
    allSessionBank: () => [preset], cycleProgressionForLevel: () => [preset],
    sessionRates: () => ({ ok: 80, reg: 80, walk: 0 }), fmtGrade: String,
    sessionSummaryStrip: () => '<div data-helper="sessionSummaryStrip">Résumé de séance</div>',
    selectedSessionPreset: () => preset, seanceGroups: c => ({ one: c.players.filter((_, i) => i % 2 === 0), two: c.players.filter((_, i) => i % 2 === 1) }),
    WARMUP_BANK: [{ id: 'warm', title: 'Footing', duration: 600 }],
    preparationCoherence: () => [], preparationReadiness: () => [{ ok: true, label: 'Présences' }, { ok: true, label: 'Échauffement' }],
    effectiveLessonMinutes: () => 105, sessionPresetBudget: () => ({ total: 90, margin: 15 }),
    courseIsIntermittent: co => co.mode === 'intermittent', intermittentTotals: () => ({ effort: 180 }),
    fmtDur: n => `${n} s`, sessionCourseText: co => `${co.releves} relevés`,
    aerobicFamilyFromCourses: () => 'Capacité', gpThemeSummary: () => 'Grand Prix 90 %',
    gpThemeParams: () => ({ theme: 'Capacité', pct: 90 }),
    plotTrackGeometry: () => ({ lap: 100, wanted: 25, spacing: 25, plots: 4 }),
    gpSheetTextLooksAuto: () => false, gpSheetDefaultText: () => 'Texte GP automatique',
    prepDisplayLevel: () => f.S.uiPrefs.displayLevel,
    sessionCoinPotential: () => 60, presetCoinPotential: () => 60,
    WARMUP_DURATION_OPTIONS: [300, 600], MONEY_OPTIONS: [0, 3, 5, 10],
    classProtocolIdForPreset: () => 'protocol', evaluationProtocolById: () => ({ short: 'Évaluation' }),
    nextSessionPriorityReminder: () => '',
    sessionBankPanel: () => '<button data-a="sessionBankSentinel">Choisir</button>',
    warmupBankPanel: () => '<button data-a="warmupSentinel">Échauffement</button>',
    seanceConfigPanel: (c, cfg) => `<input data-f="courseSentinel" value="${cfg.courses[0].releves}">`,
    gpPreparationCardsPanel: () => '<button data-a="cardsSentinel">Cartes inchangées</button>',
    gpTeams: () => '<select data-f="teamSentinel"></select>',
    preparationDashboard: () => '<div data-helper="dashboard">Contrôles complets</div>',
    paddockPanel: () => '<button data-a="participationSentinel">Présences</button>',
    effectiveTimePanel: () => '<select data-f="effectiveSessionMinutes"><option selected>105</option></select>',
  });
  return { f, ctx, preset };
}

function home(f = fixture()) {
  const h = commonContext(f);
  vm.runInContext(source('home-classes.js') + '\n' + source('home-overview.js'), h.ctx);
  return h;
}

test('Mes classes exposes creation before the class list and keeps management, backups and archives available', () => {
  const h = home();
  const before = plain(h.f.S);
  const rendered = h.ctx.vClassHome();
  assert.ok(rendered.indexOf('data-a="classCreateOpen"') < rendered.indexOf('data-a="classOpen"'));
  assert.match(rendered, /<details\b[^>]*class="v157-class-manage"/);
  assert.equal(actions(rendered).filter(a => a === 'backupCenter').length, 1);
  for (const name of ['classOpen', 'classCreateOpen', 'classArchiveToggle', 'classHomeDel', 'backupCenter', 'exportFullBackup', 'demo', 'homeArchivesToggle']) assert.ok(actions(rendered).includes(name), name);
  assert.match(rendered, /Sauvegarde externe conseillée/);
  assert.deepEqual(plain(h.f.S), before, 'Rendering must not alter classes or backup metadata.');
});

test('Mes classes distinguishes an empty active year from archives without losing archived classes', () => {
  const f = fixture();
  f.c.archived = true;
  const h = home(f);
  const active = h.ctx.vClassHome();
  assert.match(active, /Aucune classe pour/);
  assert.doesNotMatch(active, /data-a="classOpen"/);
  f.ui.showArchives = true;
  const archived = h.ctx.vClassHome();
  assert.match(archived, /Classes archivées/);
  assert.match(archived, /data-a="classOpen"/);
  assert.match(archived, /↩ Réactiver/);
  assert.equal(f.c.archived, true);
});

test('an opened class offers preparation or resume according to the existing draft and retains history access', () => {
  const h = home();
  const initial = h.ctx.classOverview();
  assert.match(initial, /data-a="goPrepare">🧭 Préparer la séance/);
  assert.doesNotMatch(initial, /data-a="v157ResumeSession"/);
  const draft = { id: 'draft', title: 'Séance en cours', timer: { phase: 'run', t0: 1793952000000, acc: 1234 } };
  h.f.c.draft = draft;
  h.f.c.sessions = [{ id: 'saved', title: 'Ancienne séance' }];
  const before = plain(h.f.c);
  const resumed = h.ctx.classOverview();
  assert.match(resumed, /data-a="v157ResumeSession">▶ Reprendre la séance/);
  for (const label of ['Mes classes', 'Suivi du cycle', 'Séances récentes', 'Bilans']) assert.ok(resumed.includes(label));
  assert.equal(h.f.c.draft, draft);
  assert.deepEqual(plain(h.f.c), before, 'Presenting resume must not create or restart a draft.');
});

function preparation(mode = 'essential', useOriginal = false, f = fixture()) {
  f.S.uiPrefs.displayLevel = mode;
  const h = commonContext(f);
  const section = useOriginal ? block(original, 'function prepSection(', 'function sessionSummaryStrip(') : source('preparation-section.js');
  const view = useOriginal ? block(original, 'function essentialPreparationView()', 'function inlineSheetView(') : source('preparation-view.js');
  vm.runInContext(section + '\n' + view, h.ctx);
  return h;
}

for (const mode of ['essential', 'advanced', 'expert']) {
  test(`preparation ${mode} keeps the same four-step structure and does not change any setting`, () => {
    const h = preparation(mode), before = plain(h.f.S);
    const rendered = h.ctx.VIEWS.prepa();
    const positions = ['Séance choisie', 'Participants', 'Déroulement', 'Vérifier et démarrer'].map(t => rendered.indexOf(`<span class="ttl">${t}</span>`));
    assert.ok(positions.every(p => p >= 0));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    assert.equal(actions(rendered).filter(a => a === 'validatePreparation').length, 1);
    assert.equal(actions(rendered).filter(a => a === 'openFiches').length, 1);
    assert.deepEqual(plain(h.f.S), before);
    const closed = h.ctx.prepSection('courses', 3, 'Déroulement', 'Résumé', 'Corps');
    assert.match(closed, /aria-expanded="false"/);
    assert.match(closed, /aria-controls="v157-prep-courses"/);
    assert.match(h.ctx.prepSection('paddock', 2, 'Participants', '', ''), /aria-expanded="true"/);
  });
}

for (const mode of ['advanced', 'expert']) {
  test(`preparation ${mode} retains every original parameter and action`, () => {
    const previous = preparation(mode, true).ctx.VIEWS.prepa();
    const next = preparation(mode).ctx.VIEWS.prepa();
    for (const name of new Set(fields(previous))) assert.ok(fields(next).includes(name), `Lost field: ${name}`);
    for (const name of new Set(actions(previous))) assert.ok(actions(next).includes(name), `Lost action: ${name}`);
    assert.match(next, /data-a="cardsSentinel"/);
    assert.match(next, /data-f="teamSentinel"/);
  });
}

test('readiness problems remain outside collapsed preparation sections even without a coherence warning', () => {
  const h = preparation();
  h.ctx.preparationReadiness = () => [{ ok: false, label: 'Présences · aucun élève présent' }, { ok: false, label: 'Échauffement · à renseigner' }];
  h.f.S.uiPrefs.prepOpen.verify = false;
  const rendered = h.ctx.VIEWS.prepa();
  const alert = rendered.slice(rendered.indexOf('<div class="v157-prep-alert"'), rendered.indexOf('<details class="v157-prep-modes"'));
  assert.match(alert, /Présences · aucun élève présent/);
  assert.match(alert, /Échauffement · à renseigner/);
  assert.match(alert, /role="status"/);
  assert.doesNotMatch(rendered, /✓ La préparation est cohérente/);
});

test('resume navigation preserves the current draft and running timer', () => {
  const h = commonContext();
  const draft = { id: 'draft-active', timer: { phase: 'run', t0: 1793952000000, acc: 1234 } };
  h.f.c.draft = draft;
  h.ctx.window = { scrollTo() {} }; h.ctx.render = () => {};
  const action = html.match(/^  v157ResumeSession: [^\n]+$/m)?.[0];
  assert.ok(action, 'Delivered state-aware resume action');
  vm.runInContext(`globalThis.resume=({${action.trim()}}).v157ResumeSession;`, h.ctx);
  const before = plain(draft);
  h.ctx.resume();
  assert.equal(h.f.ui.tab, 'lesson');
  assert.equal(h.f.ui.lessonStage, 'seance');
  assert.equal(h.f.ui.sessionStage, 'courses');
  assert.equal(h.f.c.draft, draft);
  assert.deepEqual(plain(draft), before);
  h.f.c.draft = null;
  h.ctx.resume();
  assert.equal(h.f.ui.sessionStage, 'hub');
  assert.equal(h.f.c.draft, null, 'Navigation must not seed a new draft.');
});

test('native disclosure preferences survive row rendering without entering saved class data', () => {
  const h = home();
  vm.runInContext(source('v13157-disclosures.js'), h.ctx);
  const before = plain(h.f.S);
  h.ctx.v157TrackDisclosure({ target: { matches: selector => selector === 'details[data-v157-disclosure]', dataset: { v157Disclosure: 'home:tools' }, open: true } });
  assert.equal(h.ctx.v157DisclosureOpen('home:tools'), true);
  assert.match(h.ctx.vClassHome(), /data-v157-disclosure="home:tools" open/);
  h.ctx.v157TrackDisclosure({ target: { matches: () => false, dataset: {}, open: true } });
  assert.deepEqual(plain(h.f.S), before);
});

function session({ values = [null, null, null], walks, k = 0, phase = 'ready', running = false, done = false } = {}) {
  const h = commonContext();
  const c = h.f.c;
  c.draft = {
    id: 'draft-live', title: 'Séance active', mode: 'detail', interval: 90,
    courses: [{ dur: 270, releves: 3, releveSec: 90, pct: 90 }],
    timer: { segment: 0, phase, t0: running ? 1793952000000 : null, acc: 0, completed: done, validatedReleves: {}, validatedSegments: {} }, e: {},
  };
  const d = c.draft;
  d.e.p1 = { ab: false, cp: [values], w: [walks || values.map(() => false)], rg: [false], warm: 'done' };
  d.e.p2 = { ab: false, cp: [[null, null, null]], w: [[false, false, false]], rg: [false], warm: 'done' };
  h.f.ui.terrainReleve = k;
  Object.assign(h.ctx, {
    ncp: co => co.releves, target: () => 10, RELEVE_TARGET_COINS: 5, EXTRA_UNIT_COINS: 1,
    coinDetailOpen: key => !!h.f.ui.coinOpen[key],
    av: p => `<span class="av" data-char="${p.char}"><img alt="${p.char}" src="preserved.png"></span>`,
    courseTargetLabel: () => 'plots',
    seanceTotals: () => ({ coinsT: 0, carrT: 0, n: 0 }),
    seanceTimerEnsure: () => d.timer,
    seanceSegmentInfo: () => ({ courseIndex: 0, co: d.courses[0], group: 1, done, phase, runSec: 270 }),
    normalizedRotation: v => v, seanceElapsed: () => running ? 12000 : 0,
    seanceReleveMarks: () => [90, 180, 270], seanceIntermittentState: () => null,
    roleMini: role => `<span data-role="${role}">${role}</span>`,
    fmtTimerSec: n => `${n}s`, undoSlot: { label: 'relevé' },
    byName: (a, b) => a.name.localeCompare(b.name),
    missingRelevesForSegment: () => [{ p: c.players[0], indices: values.flatMap((v, i) => v == null && !d.e.p1.w[0][i] ? [i] : []) }],
    missingReleveText: () => 'Saisies à compléter',
    courseLabel: () => '3 relevés · plots',
    clamp: (n, low, high) => Math.min(high, Math.max(low, n)),
  });
  vm.runInContext(source('session-scoring.js') + '\n' + source('coin-details-ui.js') + '\n' +
    block(original, 'function terrainReleveIndex(', 'function terrainRowHtml(') + '\n' +
    source('validation-state.js') + '\n' + source('reading-validation.js') + '\n' + source('validation-ui.js') + '\n' +
    source('session-entry-ui.js') + '\n' + source('session-timer-ui.js') + '\n' + source('session-view.js'), h.ctx);
  return { ...h, c, d };
}

for (const [name, options, missing, expectedLabel] of [
  ['empty first reading', {}, true, 'Valider le relevé 1 · suivant'],
  ['filled last reading', { values: [10, 10, 10], k: 2 }, false, 'Valider le dernier relevé'],
  ['walk with an empty value', { values: [null, null, null], walks: [true, false, false] }, false, 'Valider le relevé 1 · suivant'],
]) {
  test(`session ${name} keeps one explicit validation, reading controls and automatic detail`, () => {
    const h = session(options), rendered = h.ctx.seanceEntry(h.c);
    assert.equal(actions(rendered).filter(a => a === 'seanceValidateGroup').length, 1);
    assert.ok(rendered.includes(expectedLabel));
    for (const name of ['terrainRelevePrev', 'terrainReleveNext', 'terrainReleveSet', 'cpTarget', 'cpStep', 'cpWalk', 'undoLast']) assert.ok(actions(rendered).includes(name), name);
    assert.match(rendered, /class="v157-session-dock"/);
    assert.match(rendered, /id="seance-timer-value"/);
    assert.match(rendered, /class="av" data-char="mario"/);
    assert.match(rendered, /data-coin-key="live:draft-live:p1:0"/);
    if (missing) assert.match(rendered, /sans saisie pour ce relevé/);
    else assert.match(rendered, /Relevé [13] complet pour ce groupe/);
    assert.equal((rendered.match(/data-player="p1"/g) || []).length, 1);
    assert.equal((rendered.match(/data-player="p2"/g) || []).length, 0, 'Only the current group is displayed.');
  });
}

test('running and paused timer views do not alter phase, time or accumulated duration', () => {
  for (const running of [false, true]) {
    const h = session({ phase: 'run', running }), before = plain(h.d.timer);
    const rendered = h.ctx.seanceEntry(h.c);
    assert.match(rendered, running ? /⏸ Pause/ : /▶️ Reprendre/);
    assert.match(rendered, /data-a="seanceTimerToggle"/);
    assert.deepEqual(plain(h.d.timer), before);
    assert.equal(actions(rendered).filter(a => a === 'seanceTimerReset').length, 1);
    assert.equal(actions(rendered).filter(a => a === 'seanceCancel').length, 1);
  }
});

test('completed courses retain the existing Grand Prix or evaluation continuation', () => {
  const h = session({ done: true });
  assert.match(h.ctx.seanceEntry(h.c), /data-a="seanceToGP"[^>]*>Grand Prix →/);
  h.f.S.preparation.gpMinutes = 0;
  assert.match(h.ctx.seanceEntry(h.c), /data-a="seanceToGP"[^>]*>Valider l’évaluation →/);
});

test('a validated reading displays its status and explicit correction instead of a second validate action', () => {
  const h = session({ values: [10, 10, 10] });
  h.d.timer.validatedReleves = { 0: { 0: true } };
  h.c.players.forEach(p => h.ctx.calc(h.d, p)); // Existing calculation synchronizes the derived compatibility flag rg.
  const before = plain(h.f.S), rendered = h.ctx.seanceEntry(h.c);
  assert.match(rendered, /role="status">✓ Relevé 1 validé/);
  assert.equal(actions(rendered).filter(a => a === 'seanceValidateGroup').length, 0);
  assert.equal(actions(rendered).filter(a => a === 'v157CorrectReading').length, 1);
  assert.match(rendered, /data-a="v157CorrectReading" data-draft="draft-live" data-segment="0" data-k="0" data-group="1"/);
  assert.match(rendered, /aria-label="Relevé 1 · validé"/);
  const row = rendered.slice(rendered.indexOf('data-player="p1"'), rendered.indexOf('data-coin-key="live:draft-live:p1:0"'));
  assert.equal((row.match(/ disabled/g) || []).length, 4, 'Target, both steppers and walk remain locked until correction.');
  assert.match(rendered, /id="seance-timer-value"/);
  assert.deepEqual(plain(h.f.S), before);
});

test('an unvalidated or pending reading exposes identity and pending state without hiding timer or entered values', () => {
  const h = session({ values: [10, null, 10] });
  const key = h.ctx.v157ReadingKey(h.c, h.d, 0, 0);
  h.ctx.v157BeginValidation(key);
  const rendered = h.ctx.seanceEntry(h.c);
  assert.match(rendered, /data-a="seanceValidateGroup" data-draft="draft-live" data-segment="0" data-k="0" data-group="1"/);
  assert.match(rendered, /data-validation-key="read:class-a:draft-live:0:0"[^>]*disabled[^>]*aria-busy="true"/);
  assert.match(rendered, /Validation en cours…/); assert.match(rendered, /id="seance-timer-value"/);
  assert.equal(actions(rendered).filter(a => a === 'v157CorrectReading').length, 0);
});

test('a finished session replaces its final validation with a saved status and next-session actions', () => {
  const h = session(); h.c.draft = null;
  h.c.sessions = [{ id: 'saved', title: 'Séance enregistrée', finishedAt: 1794000000000 }];
  const before = plain(h.f.S), rendered = h.ctx.v157FinishControls(h.c);
  assert.match(rendered, /role="status">✓ Séance terminée/);
  assert.equal(actions(rendered).filter(a => a === 'finishSessionBackup').length, 0);
  for (const action of ['goPrepare', 'openGradeSheet', 'backupCenter']) assert.ok(actions(rendered).includes(action));
  assert.deepEqual(plain(h.f.S), before);
  delete h.c.sessions[0].finishedAt;
  assert.equal(actions(h.ctx.v157FinishControls(h.c)).filter(a => a === 'finishSessionBackup').length, 1, 'Historical records without the optional marker remain eligible for deliberate closure.');
});

test('the session dock follows the measured header and releases that offset in terrain mode', () => {
  const css = source('session-v13157.css');
  assert.match(css, /--v157-dock-top:calc\(var\(--mr-header-height,80px\)\s*\+\s*4px\)/);
  assert.match(css, /\.v157-session \.v157-session-dock\{[^}]*position:sticky;top:var\(--v157-dock-top\)/);
  assert.match(css, /body\.teacher-focus \.v157-session\{--v157-dock-top:var\(--st\)\}/);
  assert.doesNotMatch(css, /--v157-dock-top:[^;}]*\+\s*(?:48|52)px/);
  assert.match(css, /\.v157-session \.terrain-releve-tabs button\{[^}]*min-height:44px/);
  assert.match(css, /\.v157-session \.session-timer \.timer-actions \.btn\{[^}]*min-height:44px!important/);
});

test('audio, signals, character artwork and card-rendering functions are unchanged', () => {
  assert.equal(block(html, 'function mediaAudio(', 'const TABS ='), block(original, 'function mediaAudio(', 'const TABS ='));
});
