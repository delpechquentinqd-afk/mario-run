/* États explicites de validation, sans nouveau calcul de pièces. */
function v157ReadingAttributes(c,d,inf,k){
  return `data-draft="${esc(d.id)}" data-segment="${seanceTimerEnsure(d).segment}" data-k="${k}" data-group="${inf.group}"`;
}
function v157ReadingValidationControls(c,d,inf,k){
  const t=seanceTimerEnsure(d),attrs=v157ReadingAttributes(c,d,inf,k);
  if(v157ReadingValidated(d,t.segment,k))return `<div class="v157-validation-status" role="status">✓ Relevé ${k+1} validé</div><button class="btn btn-ghost" data-a="v157CorrectReading" ${attrs}>Corriger le relevé ${k+1}</button>`;
  const key=v157ReadingKey(c,d,t.segment,k),pending=v157ValidationPending(key),cooling=v157ReadingCooling(c,d);
  const groups=seanceGroups(c,d),list=inf.group===1?groups.one:groups.two;
  const missing=list.filter(p=>{const e=entry(d,p.id);return e.cp?.[inf.courseIndex]?.[k]==null&&!e.w?.[inf.courseIndex]?.[k];}).length;
  const label=k<ncp(d.courses[inf.courseIndex],d)-1?`Valider le relevé ${k+1} · suivant`:'Valider le dernier relevé';
  return `<button class="btn btn-green big block" data-a="seanceValidateGroup" ${attrs} data-validation-key="${esc(key)}" data-validation-cooldown="${esc(v157ReadingCooldownKey(c,d))}" ${pending||cooling?'disabled':''} aria-busy="${pending}">✅ ${pending?'Validation en cours…':label}${missing?` · ${missing} manquant${missing>1?'s':''}`:''}</button>`;
}
function v157CommitControls(c,d,label){
  const key=v157CommitKey(c,d),pending=v157ValidationPending(key);
  return `<button class="btn btn-green big" data-a="seanceToGP" data-validation-key="${esc(key)}" ${pending?'disabled':''} aria-busy="${pending}">${pending?'Validation en cours…':esc(label)}</button>`;
}
function v157FinishControls(c){
  const last=c?.sessions?.[c.sessions.length-1];
  if(v157SessionFinished(c,last))return `<div class="savebar v157-session-finished"><div class="v157-validation-status" role="status">✓ Séance terminée</div><p>Les résultats sont conservés dans ce bilan.</p><div class="row"><button class="btn btn-green" data-a="goPrepare">Préparer la suivante</button><button class="btn btn-ghost" data-a="openGradeSheet">Fiche du bilan</button><button class="btn btn-ghost" data-a="backupCenter">Sauvegardes et export</button></div></div>`;
  if(!c?.draft&&!last)return '<div class="savebar"><button class="btn btn-green" data-a="goPrepare">Préparer une séance</button></div>';
  const key=c.draft?v157CommitKey(c,c.draft):v157FinishKey(c,last),pending=v157ValidationPending(key);
  return `<div class="savebar"><button class="btn btn-red big" data-a="finishSessionBackup" data-validation-key="${esc(key)}" ${pending?'disabled':''} aria-busy="${pending}">${pending?'Validation en cours…':'🏁 Terminer la séance'}</button></div>`;
}
