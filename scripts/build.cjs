#!/usr/bin/env node
'use strict';

// V131.56 published source is the immutable baseline. V131.57 replaces only
// the approved screen presentations and validation guards; calculations are retained.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { gunzipSync, gzipSync } = require('node:zlib');
const ROOT = path.resolve(__dirname, '..');
const BASE_COMMIT = 'c2255f4a6875670792b18581e4552c28b09a7fa7';
const PART_NAMES = [1, 2, 3].map(i => `app-part-${i}.gz`);

function baselineFile(name) {
  try {
    return execFileSync('git', ['show', `${BASE_COMMIT}:${name}`], {
      cwd: ROOT, maxBuffer: 40 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    throw new Error(`Impossible de lire ${name} dans la V131.56 (${BASE_COMMIT}). Conserver ce commit dans l’historique Git.`, { cause: error });
  }
}
function replaceExactly(text, before, after, count = 1) {
  const found = text.split(before).length - 1;
  if (found !== count) throw new Error(`Remplacement ambigu : ${JSON.stringify(before.slice(0, 90))} ; attendu ${count}, trouvé ${found}.`);
  return text.split(before).join(after);
}
function source(name) { return fs.readFileSync(path.join(ROOT, 'src', name), 'utf8').trimEnd() + '\n'; }
function replaceBlock(html,start,end,file){
  const a=html.indexOf(start), b=html.indexOf(end,a+start.length);
  if(a<0||b<=a)throw new Error(`Bloc V131.56 introuvable : ${start}`);
  return replaceExactly(html,html.slice(a,b),source(file));
}
function reconstruct() {
  const archived=PART_NAMES.map(baselineFile), parts=archived.map(part=>gunzipSync(part));
  const original=Buffer.concat(parts).toString('utf8');
  let html=replaceExactly(original,'PWA V131.56','PWA V131.57',4);
  html=replaceBlock(html,'function vClassHome()','function vWelcome()','home-classes.js');
  html=replaceBlock(html,'function classOverview()','function cycleSessionDetail(','home-overview.js');
  html=replaceBlock(html,'function prepSection(','function sessionSummaryStrip(','preparation-section.js');
  html=replaceBlock(html,'function essentialPreparationView()','function inlineSheetView(','preparation-view.js');
  html=replaceBlock(html,'function seanceTimerPanel(','function seanceTimerAdvance(','session-timer-ui.js');
  html=replaceBlock(html,'function terrainRowHtml(','function updateTerrainCurrentMissing(','session-entry-ui.js');
  html=replaceBlock(html,'function seanceEntry(','function refreshRow(','session-view.js');
  html=replaceBlock(html,'function commitCoursesAndContinueGP()','function rollbackSessionSpeedIfSafe(','session-commit.js');
  html=replaceExactly(html,'function rollbackSessionSpeedIfSafe(',source('validation-state.js')+'\nfunction rollbackSessionSpeedIfSafe(');
  html=replaceExactly(html,'function balanceTeams(',source('reading-validation.js')+'\n'+source('validation-ui.js')+'\nfunction balanceTeams(');
  const readingStart=html.indexOf('  seanceValidateGroup: d => {'),readingEnd=html.indexOf('  seanceToGP:',readingStart);
  if(readingStart<0||readingEnd<=readingStart)throw new Error('Action de validation du relevé introuvable.');
  html=replaceExactly(html,html.slice(readingStart,readingEnd),'  seanceValidateGroup: (data,el) => v157ValidateReading(data,el),\n  v157CorrectReading: (data,el) => v157CorrectReading(data,el),\n');
  html=replaceExactly(html,"function ask(title, msg, ok, cb, danger) { confirmCb = cb; openSheet('confirm', {title, msg, ok, danger}); }","function ask(title, msg, ok, cb, danger) { confirmCb = v157ConfirmationCallback(cb); openSheet('confirm', {title, msg, ok, danger}); }");
  html=replaceExactly(html,'function closeSheet() { ui.sheet = null; renderSheet(); }','function closeSheet() { ui.sheet = null; confirmCb = null; v157CancelConfirmation(); renderSheet(); v157SyncValidationButtons(); }');
  html=replaceExactly(html,'  confirmOk: () => { const cb = confirmCb; confirmCb = null; closeSheet(); cb && cb(); },',"  confirmOk: (_d,el) => { const cb=confirmCb;if(!cb)return;if(el){el.disabled=true;el.setAttribute('aria-busy','true');}confirmCb=null;ui.sheet=null;renderSheet();return cb(); },");
  const finishStart=html.indexOf('  finishSessionBackup: () => {'),finishEnd=html.indexOf('\n',finishStart);
  if(finishStart<0||finishEnd<=finishStart)throw new Error('Action de clôture introuvable.');
  html=replaceExactly(html,html.slice(finishStart,finishEnd),"  finishSessionBackup: (_d,el) => {if(el){el.disabled=true;el.setAttribute('aria-busy','true');}return cls()?.draft?commitCurrentSession(true):v157FinishSession();},");
  html=replaceExactly(html,'<div class="savebar"><button class="btn btn-red big" data-a="finishSessionBackup">🏁 Fin de séance</button></div>','${v157FinishControls(c)}');
  for(const action of ['cpTarget','cpStep','cpWalk']){
    const before=`  ${action}: (d,el) => {`;
    html=replaceExactly(html,before,before+' if(!v157CanEditReading(cls()?.draft,terrainPlayerId(d,el),+d.i,+d.k))return;');
  }
  html=replaceExactly(html,'  cpAll: (d,el) => {','  cpAll: (d,el) => { if(!v157CanEditCourse(cls()?.draft,terrainPlayerId(d,el),+d.i))return;');
  html=replaceExactly(html,'  courseAllTargets: d => {','  courseAllTargets: d => { if(!v157CanEditCourseForAll(cls()?.draft,+d.i))return;');
  html=replaceExactly(html,'function vClassHome()',source('v13157-disclosures.js')+'\nfunction vClassHome()');
  // State-aware resume only navigates to the existing draft; no timer is started.
  html=replaceExactly(html,'  goPrepare: () => {',"  v157ResumeSession: () => {ui.tab='lesson';ui.lessonStage='seance';ui.sessionStage=cls()?.draft?'courses':'hub';render();window.scrollTo(0,0);},\n  goPrepare: () => {");
  html=replaceExactly(html,'/* ---------- Démarrage : aucune interface modifiable avant la lecture IndexedDB. ---------- */',"document.addEventListener('toggle',v157TrackDisclosure,true);\n\n/* ---------- Démarrage : aucune interface modifiable avant la lecture IndexedDB. ---------- */");
  const css=['home-v13157.css','preparation-v13157.css','session-v13157.css'].map(source).join('\n');
  const pwa='<script>\n/* V131.39';
  html=replaceExactly(html,pwa,'<style id="v131-57-ergonomie">\n'+css+'</style>\n'+pwa);
  return {archived,parts,original,html};
}
function buildArtifacts(){
  const reconstructed=reconstruct(), {archived,parts,html}=reconstructed;
  const merged=Buffer.from(html,'utf8'),cut1=parts[0].length,cut2=cut1+parts[1].length;
  const chunks=[merged.subarray(0,cut1),merged.subarray(cut1,cut2),merged.subarray(cut2)];
  const artifacts=new Map(PART_NAMES.map((name,i)=>[name,chunks[i].equals(parts[i])?archived[i]:gzipSync(chunks[i],{level:9,mtime:0})]));
  artifacts.set('index.html',Buffer.from(replaceExactly(baselineFile('index.html').toString('utf8'),'13156','13157',3)));
  let sw=replaceExactly(baselineFile('sw.js').toString('utf8'),'mario-run-v131-56','mario-run-v131-57');
  sw=replaceExactly(sw,'13156','13157',3);artifacts.set('sw.js',Buffer.from(sw));
  return {...reconstructed,artifacts};
}
function main(args=process.argv.slice(2)){
  if(args.some(arg=>!['--check','--extract'].includes(arg)))throw new Error('Usage : node scripts/build.cjs [--check] [--extract]');
  const check=args.includes('--check'),{artifacts,original,html}=buildArtifacts();
  if(args.includes('--extract')){
    const dir=path.join(ROOT,'work');fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'app-v13156.html'),original);
    fs.writeFileSync(path.join(dir,'app-v13157.html'),html);
  }
  for(const [name,content] of artifacts){
    const destination=path.join(ROOT,name), current=fs.existsSync(destination)?fs.readFileSync(destination):null;
    if(current?.equals(content))continue;
    if(name==='app-part-3.gz'&&current){try{if(gunzipSync(current).equals(gunzipSync(content)))continue;}catch(_){}}
    if(check)throw new Error(`${name} n’est pas à jour : exécuter npm run build.`);
    fs.writeFileSync(destination,content);
  }
  process.stdout.write(check?'Artefacts V131.57 vérifiés.\n':'Artefacts V131.57 reconstruits.\n');
}
module.exports={BASE_COMMIT,PART_NAMES,baselineFile,replaceExactly,reconstruct,buildArtifacts,main};
if(require.main===module){try{main();}catch(error){process.stderr.write(`${error.message}\n`);process.exitCode=1;}}
