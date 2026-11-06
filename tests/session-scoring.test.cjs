const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/session-scoring.js'), 'utf8');

function harness({ values = [10, 10, 10, 10, 11], expected = values.length,
  walks = values.map(() => false), regular = false, sessionCount = 0,
  title = 'Séance libre', settings = {}, intermittent = false } = {}) {
  const p = { id: 'pilot' };
  const d = {
    id: 'draft', title, mode: 'detail', warmBonus: 5, warmMalus: 3,
    courses: [intermittent ? { mode: 'intermittent', reps: expected } : { releves: expected }],
    e: { pilot: { ab: false, cp: [values], w: [walks], rg: [regular], warm: 'done' } }
  };
  const c = { sessions: Array.from({ length: sessionCount }, (_, i) => ({ id: `saved-${i}` })), draft: d };
  const context = vm.createContext({
    S: {
      settings: {
        regBonus: 5, noWalkBonus: 5, walkMalus: 3, objMalus: 3,
        regMalus: 3, malusStartSession: 5, warmPts: 5, recovPts: 5,
        ...settings
      }, preparation: {}
    },
    cls: () => c,
    ncp: co => co.mode === 'intermittent' ? co.reps : co.releves,
    target: () => 10,
    RELEVE_TARGET_COINS: 5,
    EXTRA_UNIT_COINS: 1
  });
  vm.runInContext(source, context, { filename: 'src/session-scoring.js' });
  return { ...context, c, d, p, e: d.e.pilot };
}

for (const [label, values, expected, result] of [
  ['4/5', [10, 10, 10, 10, 11], 5, true],
  ['3/5', [10, 10, 10, 11, 12], 5, false],
  ['8/10', [10, 10, 10, 10, 10, 10, 10, 10, 11, 12], 10, true],
  ['2/3', [10, 10, 11], 3, false],
  ['3/3', [10, 10, 10], 3, true],
  ['1/1', [10], 1, true],
  ['0/0', [], 0, false],
  ['valeur dominante après le premier relevé', [11, 10, 10, 10, 10], 5, true],
  ['valeurs nulles numériques identiques', [0, 0, 0, 0, 1], 5, true],
  ['chaînes numériques des anciennes sauvegardes', ['10', 10, '10', 10, 11], 5, true],
  ['relevé manquant malgré quatre valeurs identiques', [10, 10, 10, 10, null], 5, false],
  ['tableau tronqué, quatre relevés sur cinq attendus', [10, 10, 10, 10], 5, false],
  ['tableau trop long', [10, 10, 10, 10, 10, 10], 5, false],
  ['tableau creux', [10, 10, , 10, 10], 5, false],
  ['tableau entièrement creux', new Array(5), 5, false],
  ['nombre non fini', [10, 10, 10, 10, Infinity], 5, false],
  ['valeur non numérique', [10, 10, 10, 10, 'erreur'], 5, false]
]) {
  test(`régularité : ${label}`, () => {
    const h = harness({ values, expected });
    assert.equal(h.autoRegularityForCourse(h.e, 0, expected), result);
  });
}

test('le seuil est calculé sur le nombre attendu, y compris en intermittent', () => {
  const h = harness({ values: [10, 10, 10, 10], expected: 5, intermittent: true, regular: true });
  assert.equal(h.calc(h.d, h.p).per[0].regular, false);
  assert.equal(h.e.rg[0], false);
});

test('une marche interdit le bonus même avec 100 % de relevés identiques', () => {
  const h = harness({ values: [10, 10, 10, 10, 10], walks: [false, false, true, false, false], regular: true });
  const r = h.calc(h.d, h.p).per[0];
  assert.equal(r.regular, false);
  assert.equal(r.noWalk, false);
  assert.equal(r.b, 0);
});

test('le bonus est attribué automatiquement, même si rg sauvegardé vaut false', () => {
  const h = harness({ regular: false });
  const r = h.calc(h.d, h.p);
  assert.equal(r.per[0].regular, true);
  assert.equal(h.e.rg[0], true);
  assert.equal(r.per[0].b, 10);
  assert.equal(r.per[0].releveCoins, 26);
  assert.equal(r.coins, 36);
});

test('une attribution manuelle de rg ne contourne pas le seuil', () => {
  const h = harness({ values: [10, 10, 10, 11, 12], regular: true });
  const r = h.calc(h.d, h.p).per[0];
  assert.equal(r.regular, false);
  assert.equal(h.e.rg[0], false);
  assert.equal(r.b, 5); // Le seul bonus restant est celui de course sans marche.
});

test('une série incomplète ne gagne aucun bonus malgré rg=true sauvegardé', () => {
  const h = harness({ values: [10, 10, 10, 10, null], regular: true });
  const r = h.calc(h.d, h.p).per[0];
  assert.equal(r.regular, false);
  assert.equal(r.noWalk, false);
  assert.equal(r.b, 0);
});

test('syncRegularity réévalue après saisie, marche et correction', () => {
  const h = harness();
  assert.equal(h.syncRegularity(h.e, 0, h.d), true);
  h.e.cp[0][3] = 12;
  assert.equal(h.syncRegularity(h.e, 0, h.d), false);
  h.e.cp[0][3] = 10;
  h.e.w[0][0] = true;
  assert.equal(h.syncRegularity(h.e, 0, h.d), false);
  h.e.w[0][0] = false;
  assert.equal(h.syncRegularity(h.e, 0, h.d), true);
});

test('les fréquences sont indépendantes pour chaque course', () => {
  const h = harness({ values: [10, 10, 10, 11, 12] });
  h.d.courses.push({ releves: 5 });
  h.e.cp.push([10, 10, 10, 10, 11]);
  h.e.w.push([false, false, false, false, false]);
  h.e.rg.push(false);
  const r = h.calc(h.d, h.p);
  assert.equal(r.per[0].regular, false);
  assert.equal(r.per[1].regular, true);
});

for (const title of ['Cycle 4 · séance 99', 'V131.55', 'Séance n°100', 'Séance sans chiffre', '']) {
  test(`malus : le titre « ${title} » ne déclenche pas les malus avant la séance 5`, () => {
    const h = harness({ title, sessionCount: 3 });
    assert.equal(h.calc(h.d, h.p).malusActive, false);
  });
}

for (const title of ['Séance n°1', 'Cycle 2 · séance 1', 'Séance sans chiffre', '']) {
  test(`malus : la véritable séance 5 déclenche les malus avec le titre « ${title} »`, () => {
    const h = harness({ title, sessionCount: 4 });
    assert.equal(h.calc(h.d, h.p).malusActive, true);
  });
}

test('le seuil personnalisé des malus est conservé', () => {
  for (const [sessionCount, active] of [[5, false], [6, true], [7, true]]) {
    const h = harness({ sessionCount, settings: { malusStartSession: 7 } });
    assert.equal(h.calc(h.d, h.p).malusActive, active);
  }
});

test('le plancher historique des malus à la séance 2 est conservé', () => {
  for (const [sessionCount, active] of [[0, false], [1, true]]) {
    const h = harness({ sessionCount, settings: { malusStartSession: 1 } });
    assert.equal(h.calc(h.d, h.p).malusActive, active);
  }
});

test('le malus de régularité utilise le même calcul automatique que le bonus', () => {
  const h = harness({ sessionCount: 4, values: [10, 10, 10, 11, 12], regular: true });
  const r = h.calc(h.d, h.p).per[0];
  assert.equal(r.malusActive, true);
  assert.equal(r.malus, 3);
  h.e.cp[0][3] = 10;
  const corrected = h.calc(h.d, h.p).per[0];
  assert.equal(corrected.regular, true);
  assert.equal(corrected.malus, 0);
});

test('les brouillons V131.55 restent lisibles sans nouveau champ de séance', () => {
  const h = harness({ title: 'Cycle 4 · séance 900', sessionCount: 2, regular: true });
  const saved = JSON.stringify(h.d);
  h.c.draft = JSON.parse(saved);
  const r = h.calc(h.c.draft, h.p);
  assert.equal(r.malusActive, false);
  assert.equal(r.per[0].regular, true);
  assert.equal(h.c.draft.id, h.d.id);
  assert.equal(h.c.draft.title, h.d.title);
  assert.deepEqual(h.c.draft.e.pilot.cp, h.e.cp);
  assert.deepEqual(h.c.draft.e.pilot.w, h.e.w);
});

test('les séances déjà validées et leurs deltas restent inchangés', () => {
  const h = harness({ sessionCount: 4 });
  h.c.sessions[0].deltas = { pilot: { coins: 87, regular: 3, totalReleves: 5 } };
  const before = JSON.stringify(h.c.sessions);
  h.calc(h.d, h.p);
  assert.equal(JSON.stringify(h.c.sessions), before);
});

test('les absences et le mode rapide conservent leurs règles existantes', () => {
  const h = harness();
  h.e.ab = true;
  assert.equal(h.calc(h.d, h.p).coins, 0);
  h.e.ab = false;
  h.d.mode = 'quick';
  h.e.q = 12;
  h.e.qo = true;
  assert.equal(h.calc(h.d, h.p).coins, 17);
});
