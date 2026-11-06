const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const scoring = fs.readFileSync(path.join(root, 'src/session-scoring.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'src/coin-details-ui.js'), 'utf8');
const originalScoring = execFileSync('git', ['show', '68bc63f6d31b05557df4ad461933822f91ff6da2:src/session-scoring.js'], {
  cwd: root, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
});
const plain = value => JSON.parse(JSON.stringify(value));
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
function status(html, component) {
  const found = html.match(new RegExp(`data-coin-component="${component}" data-status="([^"]+)"`));
  assert.ok(found, `Statut du composant ${component} absent`);
  return found[1];
}

function harness(options = {}, source = scoring, includeUi = true) {
  const rows = structuredClone(options.rows || [options.values || [10, 10, 10, 10, 11]]);
  const expected = options.expectedRows || rows.map(row => options.expected ?? row.length);
  const walks = structuredClone(options.walkRows || rows.map((row, i) => i === 0 && options.walks ? options.walks : row.map(() => false)));
  const p = { id: 'pilot' };
  const e = { ab: !!options.absent, cp: rows, w: walks, rg: rows.map(() => options.manualFlag ?? false),
    warm: options.warm || 'done', q: options.q || 0, qo: !!options.qo, wu: !!options.wu, rc: !!options.rc };
  const d = { id: 'draft', title: options.title || '2026 · séance 999', mode: options.mode || 'detail',
    warmBonus: options.warmBonus ?? 5, warmMalus: options.warmMalus ?? 3,
    courses: rows.map((_, i) => ({ releves: expected[i] })), e: { pilot: e } };
  const c = { sessions: Array.from({ length: options.sessionCount || 0 }, (_, i) => ({ id: `old-${i}` })), draft: d };
  const context = vm.createContext({
    S: { settings: { regBonus: 5, noWalkBonus: 5, walkMalus: 3, objMalus: 3, regMalus: 3,
      malusStartSession: 5, warmPts: 5, recovPts: 5, ...(options.settings || {}) }, preparation: {} },
    cls: () => c, ncp: co => co.releves, target: () => options.target === undefined ? 10 : options.target,
    RELEVE_TARGET_COINS: 5, EXTRA_UNIT_COINS: 1,
    ui: { coinOpen: {} }, esc,
  });
  vm.runInContext(source + (includeUi ? '\n' + uiSource : ''), context, { filename: 'coin-details-application.js' });
  return { context, c, d, e, p, result: () => context.calc(d, p) };
}

function consistentCourse(per) {
  const detail = per.coinDetails;
  assert.equal(detail.net, per.net);
  assert.equal(detail.bonus, per.b);
  assert.equal(detail.malus, per.malus);
  close(detail.baseCoins + detail.extraCoins, per.releveCoins);
  close(detail.regularBonus + detail.noWalkBonus, detail.bonus);
  close(detail.walkPenalty + detail.objectivePenalty + detail.regularityPenalty, detail.malus);
  close(detail.baseCoins + detail.extraCoins + detail.bonus - detail.malus + detail.floorAdjustment, detail.net);
  assert.ok(detail.floorAdjustment >= 0);
}

for (const [name, values, expected, eligible, identical] of [
  ['1/1', [10], 1, false, 1],
  ['2/2', [10, 10], 2, true, 2],
  ['2/3', [10, 10, 11], 3, false, 2],
  ['4/5', [10, 10, 10, 10, 11], 5, true, 4],
  ['8/10', [10, 10, 10, 10, 10, 10, 10, 10, 11, 12], 10, true, 8],
]) {
  test(`le détail régularité ${name} décrit exactement le bonus automatique`, () => {
    const h = harness({ values, expected, manualFlag: !eligible });
    const per = h.result().per[0], detail = per.coinDetails;
    consistentCourse(per);
    assert.equal(detail.regular, eligible);
    assert.equal(detail.regularity.expected, expected);
    assert.equal(detail.regularity.identical, identical);
    close(detail.regularity.percent, identical / expected * 100);
    assert.equal(detail.regularBonus, eligible ? 5 : 0);
    const html = h.context.courseCoinDetailsHtml(detail, 'draft-pilot-course0');
    assert.match(html, /<details\b/);
    assert.match(html, /<summary\b/);
    assert.match(html, /[Rr]égularité/);
    assert.ok(html.includes(`${identical}/${expected}`), 'La fréquence est affichée sur tous les relevés attendus.');
    assert.match(html, /%/);
    assert.doesNotMatch(html, /data-a=["']cpReg["']/);
    assert.equal(status(html, 'regularity'), eligible ? 'obtained' : expected < 2 ? 'not-applicable' : 'not-obtained');
    if (name === '2/3') assert.match(html, /66,67 %/);
    if (name === '4/5' || name === '8/10') assert.match(html, /80 %/);
  });
}

test('les pièces de base et les dépassements restent séparés et cohérents', () => {
  const h = harness({ values: [10, 12, 9] });
  const per = h.result().per[0];
  consistentCourse(per);
  assert.equal(per.coinDetails.baseCoins, 10);
  assert.equal(per.coinDetails.extraCoins, 2);
  const html = h.context.courseCoinDetailsHtml(per.coinDetails, 'base');
  assert.match(html, /Objectifs/);
  assert.match(html, /Dépassements/);
  assert.ok(html.includes('10'));
  assert.ok(html.includes('2'));
});

test('un pourcentage de 80 % incomplet ne présente pas un bonus obtenu', () => {
  const h = harness({ values: [10, 10, 10, 10, null], expected: 5, manualFlag: true, sessionCount: 4 });
  const per = h.result().per[0], d = per.coinDetails;
  consistentCourse(per);
  assert.equal(d.regularity.percent, 80);
  assert.equal(d.readingsComplete, false);
  assert.equal(d.regularBonus, 0);
  assert.equal(d.noWalkBonus, 0);
  assert.equal(d.objectivePenalty, 3, 'Le malus provisoire existant reste décrit, pas supprimé.');
  assert.equal(d.regularityPenalty, 3);
  const html = h.context.courseCoinDetailsHtml(d, 'missing');
  assert.match(html, /[Pp]rovisoire/);
  assert.match(html, /incompl|attente/i);
  assert.match(html, /80/);
  assert.equal(status(html, 'regularity'), 'pending');
  assert.equal(status(html, 'noWalk'), 'pending');
  assert.equal(status(html, 'objectivePenalty'), 'applied');
});

test('les tableaux tronqués ou creux ne deviennent pas complets dans les explications', () => {
  for (const values of [[10, 10], [10, , 10]]) {
    const h = harness({ values, expected: 3, manualFlag: true });
    const d = h.result().per[0].coinDetails;
    assert.equal(d.readingsComplete, false);
    assert.equal(d.regularBonus, 0);
    assert.match(h.context.courseCoinDetailsHtml(d, 'missing'), /incompl|attente/i);
  }
});

test('la marche interdit les deux bonus et décrit séparément les trois malus appliqués', () => {
  const h = harness({ values: [10, 10], walks: [false, true], sessionCount: 4 });
  const per = h.result().per[0], d = per.coinDetails;
  consistentCourse(per);
  assert.equal(d.regularity.percent, 100);
  assert.equal(d.regularBonus, 0);
  assert.equal(d.noWalkBonus, 0);
  assert.equal(d.walkPenalty, 3);
  assert.equal(d.objectivePenalty, 3);
  assert.equal(d.regularityPenalty, 3);
  const html = h.context.courseCoinDetailsHtml(d, 'walk');
  assert.match(html, /Marche|marche/);
  assert.match(html, /Objectif/);
  assert.match(html, /Irrégularité|irrégularité/);
  assert.equal(status(html, 'regularity'), 'not-obtained');
  assert.equal(status(html, 'noWalk'), 'not-obtained');
  for (const component of ['walkPenalty', 'objectivePenalty', 'regularityPenalty']) assert.equal(status(html, component), 'applied');
});

test('avant le seuil, un malus non applicable est distinct d’un bonus obtenu', () => {
  const h = harness({ values: [10, 10], sessionCount: 2, settings: { malusStartSession: 7 } });
  const d = h.result().per[0].coinDetails;
  assert.equal(d.malusActive, false);
  assert.equal(d.regularBonus, 5);
  assert.equal(d.malus, 0);
  const html = h.context.courseCoinDetailsHtml(d, 'before');
  assert.match(html, /[Nn]on applicable/);
  assert.match(html, /séance 7/);
  assert.equal(status(html, 'regularity'), 'obtained');
  for (const component of ['walkPenalty', 'objectivePenalty', 'regularityPenalty']) assert.equal(status(html, component), 'not-applicable');
  assert.match(html, /[Oo]btenu/);
});

test('un montant réglé à zéro reste obtenu lorsque la condition est satisfaite', () => {
  const h = harness({ values: [10, 10], settings: { regBonus: 0, noWalkBonus: 0 } });
  const d = h.result().per[0].coinDetails;
  assert.equal(d.regular, true);
  assert.equal(d.noWalk, true);
  assert.equal(d.regularBonus, 0);
  const html = h.context.courseCoinDetailsHtml(d, 'zero');
  assert.equal(status(html, 'regularity'), 'obtained');
  assert.equal(status(html, 'noWalk'), 'obtained');
  assert.match(html, /[Oo]btenu/);
  assert.match(html, /[Rr]égularité/);
});

test('les montants personnalisés et décimaux ne sont pas remplacés par les valeurs par défaut', () => {
  const h = harness({ values: [10, 10], settings: { regBonus: 2.5, noWalkBonus: 1.25 } });
  const per = h.result().per[0];
  consistentCourse(per);
  assert.equal(per.coinDetails.regularBonus, 2.5);
  assert.equal(per.coinDetails.noWalkBonus, 1.25);
  assert.equal(per.net, 13.75);
  const html = h.context.courseCoinDetailsHtml(per.coinDetails, 'decimal');
  assert.match(html, /2[,.]5/);
  assert.match(html, /1[,.]25/);
  assert.match(html, /13[,.]75/);
});

test('une cible inconnue est annoncée sans masquer les bonus et malus réellement calculés', () => {
  const h = harness({ values: [10, 10], target: null, sessionCount: 4 });
  const per = h.result().per[0], d = per.coinDetails;
  consistentCourse(per);
  assert.equal(d.targetKnown, false);
  assert.equal(d.baseCoins, 0);
  assert.equal(d.extraCoins, 0);
  assert.equal(d.regularBonus, 5);
  assert.equal(d.objectivePenalty, 3);
  const html = h.context.courseCoinDetailsHtml(d, 'unknown-target');
  assert.equal(status(html, 'base'), 'pending');
  assert.equal(status(html, 'regularity'), 'obtained');
  assert.equal(status(html, 'objectivePenalty'), 'applied');
  assert.match(html, /[Cc]ible non renseignée|[Cc]ible à renseigner/);
});

test('le détail rend explicite le plancher à zéro propre à chaque course', () => {
  const h = harness({ values: [0, 1], sessionCount: 4, settings: { noWalkBonus: 0, objMalus: 9, regMalus: 7 } });
  const per = h.result().per[0], d = per.coinDetails;
  consistentCourse(per);
  assert.equal(d.rawNet, -16);
  assert.equal(d.floorAdjustment, 16);
  assert.equal(d.net, 0);
  assert.match(h.context.courseCoinDetailsHtml(d, 'floor'), /[Pp]lancher|[Ll]imitation|minimum/i);
});

test('la capture conserve aussi le delta échauffement et le plancher final de séance', () => {
  const h = harness({ rows: [[10, 10], [0, 1]], warm: 'low', warmMalus: 80 });
  const r = h.result();
  const saved = h.context.sessionCoinSnapshot(r, h.d);
  assert.equal(saved.coins, r.coins);
  assert.equal(saved.warmDelta, -80);
  close(saved.courseTotal, r.per.reduce((n, x) => n + x.net, 0));
  close(saved.courseTotal + saved.warmDelta + saved.sessionFloorAdjustment, saved.coins);
  assert.equal(saved.coins, 0);
  assert.ok(saved.sessionFloorAdjustment > 0);
  const html = h.context.savedCoinDetailsHtml({ xp: r.coins, coinDetails: saved }, 'history');
  assert.match(html, /[Éé]chauffement/);
  assert.match(html, /[Pp]lancher|[Ll]imitation|minimum/i);
});

test('le bilan reprend les données enregistrées et reste identique après un changement de réglages', () => {
  const h = harness();
  const r = h.result(), saved = h.context.sessionCoinSnapshot(r, h.d);
  const delta = { xp: r.coins, coinDetails: saved };
  const before = h.context.savedCoinDetailsHtml(delta, 'saved');
  const serialized = JSON.stringify(saved);
  h.context.S.settings.regBonus = 999;
  h.context.S.settings.noWalkBonus = 999;
  h.context.S.settings.malusStartSession = 2;
  h.e.cp[0][0] = 0;
  h.context.calc = () => { throw new Error('Un bilan enregistré ne doit jamais être recalculé.'); };
  assert.equal(h.context.savedCoinDetailsHtml(delta, 'saved'), before);
  assert.equal(JSON.stringify(saved), serialized);
  assert.doesNotMatch(before, /999/);
  assert.equal(saved.courses[0].regularBonus, 5);
});

test('la capture est indépendante des objets du calcul et survit à un aller-retour JSON', () => {
  const h = harness();
  const r = h.result(), saved = h.context.sessionCoinSnapshot(r, h.d);
  const before = JSON.stringify(saved);
  r.per[0].coinDetails.regularity.identical = 0;
  r.per[0].coinDetails.regularBonus = 123;
  assert.equal(JSON.stringify(saved), before);
  const restored = JSON.parse(before);
  assert.equal(h.context.savedCoinDetailsHtml({ xp: saved.coins, coinDetails: restored }, 'restore'),
    h.context.savedCoinDetailsHtml({ xp: saved.coins, coinDetails: saved }, 'restore'));
});

test('le détail enregistré en chaîne JSON conserve exactement le rendu de l’objet capturé', () => {
  const h = harness({ values: [10, 10, 10, 10, 11] });
  const r = h.result(), snapshot = h.context.sessionCoinSnapshot(r, h.d);
  const asObject = { xp: r.coins, coinDetails: snapshot };
  const asString = { xp: r.coins, coinDetails: JSON.stringify(snapshot) };
  assert.equal(h.context.savedCoinDetailsHtml(asString, 'json-history'),
    h.context.savedCoinDetailsHtml(asObject, 'json-history'));
  h.context.S.settings.regBonus = 999;
  assert.equal(h.context.savedCoinDetailsHtml(asString, 'json-history'),
    h.context.savedCoinDetailsHtml(asObject, 'json-history'));
  assert.equal(typeof asString.coinDetails, 'string', 'Le rendu ne réécrit pas l’instantané sauvegardé.');
});

test('une chaîne JSON de détail invalide garde le crédit historique sans inventer un calcul', () => {
  const h = harness();
  for (const malformed of ['{invalid', '', 'null', '[]']) {
    const delta = { xp: 87, coinDetails: malformed };
    const html = h.context.savedCoinDetailsHtml(delta, 'invalid-json');
    assert.match(html, /non enregistré/i);
    assert.ok(html.includes('87'));
    assert.doesNotMatch(html, /Total net crédité|80\s*%/);
    assert.equal(delta.coinDetails, malformed);
  }
});

test('les anciennes séances annoncent un détail absent sans inventer des montants ou pourcentages', () => {
  const h = harness();
  h.context.calc = () => { throw new Error('Ne pas recalculer l’historique.'); };
  const delta = { xp: 87, regular: 2, totalObjs: 3, walks: 1 };
  const before = JSON.stringify(delta);
  const html = h.context.savedCoinDetailsHtml(delta, 'old');
  assert.match(html, /non enregistré|indisponible/i);
  assert.ok(html.includes('87'));
  assert.doesNotMatch(html, /80\s*%|66[,.]67\s*%/);
  assert.equal(JSON.stringify(delta), before);
});

test('le bilan privilégie le total réellement crédité et annonce un détail discordant sans le corriger', () => {
  const h = harness();
  const saved = h.context.sessionCoinSnapshot(h.result(), h.d);
  const delta = { xp: 87, coinDetails: saved };
  const before = JSON.stringify(delta);
  const html = h.context.savedCoinDetailsHtml(delta, 'discordant');
  assert.match(html, /87 🪙/);
  assert.match(html, /total crédité conservé/);
  assert.equal(JSON.stringify(delta), before);
});

test('un total historique absent ou nul ne devient pas un crédit zéro inventé', () => {
  const h = harness();
  for (const delta of [undefined, {}, { xp: null }, { xp: '' }, { xp: false }]) {
    const html = h.context.savedCoinDetailsHtml(delta, 'unknown');
    assert.match(html, /non enregistré/i);
    assert.doesNotMatch(html, /0 🪙 enregistrées/);
  }
});

test('un instantané inconnu ou invalide est annoncé indisponible plutôt que réinterprété', () => {
  const h = harness();
  for (const snapshot of [{ version: 99, courses: [], coins: 87 }, { version: 1, courses: [], coins: null }]) {
    const html = h.context.savedCoinDetailsHtml({ xp: 87, coinDetails: snapshot }, 'unknown-snapshot');
    assert.match(html, /non enregistré/i);
    assert.ok(html.includes('87'));
    assert.doesNotMatch(html, /Total net crédité/);
  }
});

test('le mode rapide et les absences n’inventent pas de détails de course', () => {
  for (const options of [{ mode: 'quick', q: 12, qo: true }, { absent: true }]) {
    const h = harness(options), r = h.result();
    const saved = h.context.sessionCoinSnapshot(r, h.d);
    assert.equal(saved.coins, r.coins);
    assert.equal(saved.courses.length, 0);
    const html = h.context.savedCoinDetailsHtml({ xp: r.coins, coinDetails: saved }, 'no-course');
    assert.doesNotMatch(html, /4\/5|80\s*%/);
  }
});

test('le dépliage est natif, accessible et conserve l’état temporaire demandé', () => {
  const h = harness();
  const d = h.result().per[0].coinDetails;
  h.context.ui.coinOpen['safe-key'] = true;
  const html = h.context.courseCoinDetailsHtml(d, 'safe-key');
  assert.match(html, /<details\b[^>]*\bopen\b/);
  assert.match(html, /data-coin-key="safe-key"/);
  assert.match(html, /<summary\b/);
  assert.doesNotMatch(html, /role="dialog"|aria-modal|data-a="cpReg"/);
  const escaped = h.context.courseCoinDetailsHtml(d, 'x" onmouseover="bad');
  assert.doesNotMatch(escaped, /data-coin-key="x" onmouseover="bad/);
});

test('les champs de calcul existants restent identiques au commit validé dans les principaux cas de saisie', () => {
  const settings = [ {}, { regBonus: 0, noWalkBonus: 0 }, { regBonus: 2.5, noWalkBonus: 1.25, walkMalus: 2.75, objMalus: 5.5, regMalus: 4.25, malusStartSession: 2 } ];
  const rows = [[10], [10, 10], [10, 10, 11], [10, 10, 10, 10, 11], [10, null, 10], [0, 1], [11, 12, 13]];
  let cases = 0;
  for (const values of rows) for (const st of settings) for (const sessionCount of [0, 1, 4, 6]) for (const warm of ['done', 'good', 'low']) for (const walked of [false, true]) {
    const options = { values, settings: st, sessionCount, warm, walks: values.map((_, i) => walked && i === 0) };
    const current = plain(harness(options).result());
    const original = plain(harness(options, originalScoring, false).result());
    current.per.forEach(per => { delete per.coinDetails; });
    assert.deepEqual(current, original, `Comportement financier modifié : ${JSON.stringify(options)}`);
    cases++;
  }
  assert.equal(cases, 504);
});
