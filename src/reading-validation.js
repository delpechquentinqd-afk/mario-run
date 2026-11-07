/* V131.57 — une validation est liée à un brouillon, un groupe et un relevé.
   Les corrections rouvrent explicitement cette validation, sans changer les gains. */
function v157ReadingValidated(d,segment,k){
  return d?.timer?.validatedReleves?.[String(segment)]?.[k]===true;
}
function v157ReadingKey(c,d,segment,k){
  return `read:${c.id}:${d.id}:${segment}:${k}`;
}
function v157ReadingIdentityMatches(c,draft,t,segment,k,group){
  if(!c||cls()!==c||!draft||c.draft!==draft||seanceTimerEnsure(draft)!==t)return false;
  const inf=seanceSegmentInfo(draft);
  return !inf.done&&t.segment===segment&&inf.group===group&&
    terrainReleveIndex(draft,draft.courses[inf.courseIndex])===k;
}
function v157ReadingRequest(data){
  if(!data||typeof data.draft!=='string'||!data.draft)return null;
  for(const field of ['segment','k','group']){
    if(data[field]==null||String(data[field]).trim()==='')return null;
  }
  const segment=Number(data.segment),k=Number(data.k),group=Number(data.group);
  if(!Number.isInteger(segment)||segment<0||!Number.isInteger(k)||k<0||![1,2].includes(group))return null;
  const c=cls(),draft=c?.draft;
  if(!draft||draft.id!==data.draft)return null;
  const t=seanceTimerEnsure(draft);
  if(!v157ReadingIdentityMatches(c,draft,t,segment,k,group))return null;
  const inf=seanceSegmentInfo(draft),co=draft.courses[inf.courseIndex];
  if(k>=ncp(co,draft))return null;
  return {c,draft,t,segment,k,group,inf,co};
}
function v157DisableReadingButton(el){
  if(!el)return;
  el.disabled=true;
  el.setAttribute?.('aria-busy','true');
}
function v157ValidateReading(data,el){
  const request=v157ReadingRequest(data);
  if(!request)return;
  const {c,draft:dr,t,segment,k,group,inf,co}=request;
  const key=v157ReadingKey(c,dr,segment,k);
  if(v157ReadingValidated(dr,segment,k)||v157ReadingCooling(c,dr)||v157ValidationPending(key)||!v157BeginValidation(key))return;
  v157DisableReadingButton(el);
  v157BlockReadingTaps(c,dr);
  const groups=seanceGroups(c,dr),list=group===1?groups.one:groups.two,ci=inf.courseIndex,reps=ncp(co,dr),segmentKey=String(segment);
  const missingPlayers=list.filter(p=>{const e=entry(dr,p.id);return e.cp?.[ci]?.[k]==null&&!e.w?.[ci]?.[k];});
  const finishSegment=()=>{
    t.validatedSegments=t.validatedSegments||{};t.validatedSegments[segmentKey]=true;
    const last=t.segment>=Math.max(0,dr.courses.length*2-1);
    if(last&&t.phase==='awaiting'){t.completed=true;t.t0=null;t.acc=0;toast('✅ Dernier relevé validé · passage au Grand Prix');return commitCoursesAndContinueGP();}
    if(t.phase==='awaiting'){toast('✅ Dernier relevé validé · course suivante');return seanceTimerAdvance(c,dr);}
    if(t.phase==='rotation'){rerender();toast('✅ Dernier relevé validé · départ automatique à la fin de la rotation');return;}
    rerender();toast('✅ Dernier relevé de la course validé');
  };
  let consumed=false;
  const go=()=>{
    if(consumed)return;
    consumed=true;
    v157EndValidation(key);
    if(!v157ReadingIdentityMatches(c,dr,t,segment,k,group)||v157ReadingValidated(dr,segment,k))return;
    // Une confirmation peut rester ouverte au-delà des 400 ms initiaux.
    // Protéger aussi le relevé suivant au moment où la validation est acceptée.
    v157BlockReadingTaps(c,dr);
    pushUndo(`validation relevé ${k+1}`);
    t.validatedReleves=t.validatedReleves||{};t.validatedReleves[segmentKey]=t.validatedReleves[segmentKey]||{};t.validatedReleves[segmentKey][k]=true;
    save();
    // Une correction d’un ancien relevé peut être le dernier point restant à
    // revalider. Elle rétablit alors la validation du segment, sans exiger une
    // seconde validation d’un relevé qui était déjà acquis.
    const allValidated=Array.from({length:reps},(_,i)=>v157ReadingValidated(dr,segment,i)).every(Boolean);
    if(k<reps-1&&!allValidated){ui.terrainReleve=k+1;saveUi();rerender();setTimeout(focusActiveSeanceEntry,30);toast(`✅ Relevé ${k+1} validé · relevé ${k+2}`);return;}
    finishSegment();save();
  };
  if(missingPlayers.length>0){
    const names=missingPlayers.slice(0,8).map(p=>esc(p.name)).join(', ')+(missingPlayers.length>8?'…':'');
    try{
      ask('Valider ce relevé malgré des cases vides ?',`<b>${missingPlayers.length} élève${missingPlayers.length>1?'s':''} sans saisie au relevé ${k+1}</b><br>${names}`,'Valider ce relevé',go);
    }catch(error){v157EndValidation(key);throw error;}
  }else go();
}
function v157CorrectReading(data,el){
  const request=v157ReadingRequest(data);
  if(!request)return;
  const {c,draft:dr,t,segment,k}=request;
  if(!v157ReadingValidated(dr,segment,k)||v157ReadingCooling(c,dr))return;
  v157DisableReadingButton(el);
  v157BlockReadingTaps(c,dr);
  pushUndo(`correction relevé ${k+1}`);
  delete t.validatedReleves[String(segment)][k];
  if(t.validatedSegments)delete t.validatedSegments[String(segment)];
  t.completed=false;
  save();rerender();
}
function v157ReadingSegmentForPlayer(d,pid,ci){
  const c=cls();
  if(!c||c.draft!==d||!d?.courses?.[ci]||!(c.players||[]).some(p=>p.id===pid))return null;
  const groups=seanceGroups(c,d);
  const group=groups.one.some(p=>p.id===pid)?1:groups.two.some(p=>p.id===pid)?2:0;
  // Les actions de remplissage existantes incluent aussi les absents ; aucune
  // validation de groupe ne leur est attachée, donc leurs valeurs restent libres.
  if(!group)return -1;
  const first=(d.firstGroup||S.seanceCfg?.firstGroup||'mario')==='luigi'?2:1;
  const offset=group===first?0:1;
  return (d.groupRotation||'alternate')==='block'?ci+offset*d.courses.length:ci*2+offset;
}
function v157CanEditReading(d,pid,ci,k){
  ci=Number(ci);k=Number(k);
  if(!Number.isInteger(ci)||ci<0||!Number.isInteger(k)||k<0||!d?.courses?.[ci]||k>=ncp(d.courses[ci],d))return false;
  const segment=v157ReadingSegmentForPlayer(d,pid,ci);
  return segment===-1||segment!==null&&!v157ReadingValidated(d,segment,k);
}
function v157CanEditCourse(d,pid,ci){
  ci=Number(ci);
  if(!Number.isInteger(ci)||ci<0)return false;
  const segment=v157ReadingSegmentForPlayer(d,pid,ci);
  if(segment===null)return false;
  return segment===-1||!Object.values(d.timer?.validatedReleves?.[String(segment)]||{}).some(value=>value===true);
}
function v157CanEditCourseForAll(d,ci){
  const c=cls();
  return !!c&&c.draft===d&&!!d?.courses?.[Number(ci)]&&(c.players||[]).every(p=>v157CanEditCourse(d,p.id,ci));
}
