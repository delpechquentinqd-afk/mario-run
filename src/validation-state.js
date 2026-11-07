/* V131.57 — protections de validation ; les verrous restent hors des sauvegardes. */
const v157PendingValidations=new Set();
const v157ReadingCooldowns=new Map();
let v157ConfirmationSerial=0;
function v157ValidationPending(key){return v157PendingValidations.has(key);}
function v157ValidationCooldown(key){return Number(v157ReadingCooldowns.get(key)||0)>Date.now();}
function v157SyncValidationButtons(){
  if(typeof document==='undefined'||typeof document.querySelectorAll!=='function')return;
  document.querySelectorAll('button[data-validation-key]').forEach(button=>{
    const data=button.dataset||{};
    const cooling=v157ValidationCooldown(data.validationCooldown);
    const blocked=v157ValidationPending(data.validationKey)||cooling;
    button.disabled=blocked;
    if(blocked)button.setAttribute('aria-busy','true');
    else button.removeAttribute('aria-busy');
  });
}
function v157BeginValidation(key){
  if(!key||v157ValidationPending(key))return false;
  v157PendingValidations.add(key);v157SyncValidationButtons();return true;
}
function v157EndValidation(key){v157PendingValidations.delete(key);v157SyncValidationButtons();}
function v157CancelValidationPending(){v157PendingValidations.clear();v157SyncValidationButtons();}
function v157ReadingCooldownKey(c,d){return `reading:${c.id}:${d.id}`;}
function v157ReadingCooling(c,d){
  return v157ValidationCooldown(v157ReadingCooldownKey(c,d));
}
function v157BlockReadingTaps(c,d){
  const key=v157ReadingCooldownKey(c,d),until=Date.now()+400;
  v157ReadingCooldowns.set(key,until);v157SyncValidationButtons();
  setTimeout(()=>{
    if(v157ReadingCooldowns.get(key)===until&&Date.now()>=until)v157ReadingCooldowns.delete(key);
    v157SyncValidationButtons();
  },400);
}
function v157ConfirmationCallback(callback){
  const serial=++v157ConfirmationSerial;
  return ()=>{
    if(serial!==v157ConfirmationSerial)return;
    v157ConfirmationSerial++;
    v157CancelValidationPending();
    return typeof callback==='function'?callback():undefined;
  };
}
function v157CancelConfirmation(){v157ConfirmationSerial++;v157CancelValidationPending();}
function v157CommitKey(c,d){return `commit:${c.id}:${d.id}`;}
function v157CanCommit(c,d){
  return !!c&&!!d&&!!d.id&&cls()===c&&c.draft===d&&!(c.sessions||[]).some(session=>session.id===d.id);
}
function v157HasFinishedAt(session){
  const stamp=session?.finishedAt;
  return stamp!=null&&(typeof stamp==='number'||(typeof stamp==='string'&&stamp.trim()!==''))&&Number.isFinite(Number(stamp))&&Number(stamp)>0;
}
function v157SessionFinished(c,session=c?.sessions?.[c.sessions.length-1]){
  return !!c&&!c.draft&&v157HasFinishedAt(session);
}
function v157FinishKey(c,session){return `finish:${c.id}:${session.id}`;}
function v157FinishSession(){
  const c=cls();
  if(c?.draft)return commitCurrentSession(true);
  const session=c?.sessions?.[c.sessions.length-1];
  if(!c||!session?.id)return toast('Aucune séance enregistrée à terminer.');
  if(v157SessionFinished(c,session))return;
  const key=v157FinishKey(c,session);
  if(!v157BeginValidation(key))return;
  ask('Terminer la séance ?', 'La séance et le Grand Prix seront réinitialisés. Si une séance suivante a été préparée depuis le bilan, elle sera chargée automatiquement. Aucune sauvegarde externe ne sera créée automatiquement.', 'Terminer la séance', ()=>{
    v157EndValidation(key);
    // Une confirmation ancienne ne peut clôturer une autre séance ou classe.
    if(cls()!==c||c.draft||c.sessions?.[c.sessions.length-1]!==session||v157HasFinishedAt(session))return;
    session.finishedAt=Date.now();
    resetAndApplyQueuedNext();ui.lessonStage='prepa';ui.sessionStage='hub';ui.tab='bilan';
    save();writeLocalSnapshot('fin de séance',true);render();
  },true);
}
