/* V131.57 — mêmes crédits et instantanés, validation par identité de brouillon. */
function commitCoursesAndContinueGP(){
  const c=cls(),d=c?.draft;
  if(!d) return ui.sessionStage='gp',render();
  if(!v157CanCommit(c,d))return;
  const validationKey=v157CommitKey(c,d);
  if(!v157BeginValidation(validationKey))return;
  const t=seanceTotals(d);
  if(!t.n){v157EndValidation(validationKey);return toast('Aucun résultat saisi pour le moment');}
  const hasGP=Number(S.preparation?.gpMinutes??15)>0;
  ask('Valider les courses ?', `<b>${t.n} élève${t.n>1?'s':''}</b> vont recevoir <b>${fmtNum(t.coinsT)} 🪙</b>. ${hasGP?'Tu passeras ensuite au Grand Prix.':'La séance d’évaluation sera ensuite envoyée directement au bilan.'}`, 'Valider', () => {
    v157EndValidation(validationKey);
    if(!v157CanCommit(c,d))return;
    const deltas={},ups=[];
    c.players.forEach(p=>{
      const r=calc(d,p), e=entry(d,p.id); const hasData=d.mode==='quick'?((e.q||0)!==0||!!e.qo):(e.cp||[]).some(row=>(row||[]).some(v=>v!=null)); if(e.ab||(!hasData&&!r.carr&&!r.warmDelta))return;
      const adj=sessionSpeedAdjustment(p,d,r);
      const l0=level(p),s0=stage(p); p.xp+=r.coins;p.carr+=r.carr; if(adj)p.speed=adj.next;
      const rs=releveSummary(r); deltas[p.id]={xp:r.coins,carr:r.carr,objs:r.objs||0,totalObjs:r.per?.filter(x=>x.t!=null).length||0,attained:r.per?.filter(x=>x.ok&&!x.exceeded).length||0,exceeded:r.per?.filter(x=>x.exceeded).length||0,unmet:r.per?.filter(x=>x.t!=null&&!x.ok).length||0,regular:r.per?.filter(x=>x.regular).length||0,walks:r.per?.filter(x=>x.walked).length||0,...rs,warm:r.warmDelta||0,warmQuality:e.warm||'done',speedAdjustment:adj||null,coinDetails:JSON.stringify(sessionCoinSnapshot(r,d))};
      addLog(p,'seance',d.title+(r.objs?` · ${r.objs} objectif${r.objs>1?'s':''} 🎯`:''),{xp:r.coins,carr:r.carr});
      if(level(p)>l0||stage(p)>s0)ups.push(p.name);
    });
    c.sessions.push({id:d.id,t:Date.now(),title:d.title,deltas,n:t.n,total:t.coinsT,carrT:t.carrT,presetId:S.preparation?.sessionPresetId||null,assessmentType:sessionAssessmentType(selectedSessionPreset()||S.preparation||{}),assessmentCoefficient:sessionAssessmentCoefficient(selectedSessionPreset()||S.preparation||{}),evaluationProtocolId:(S.preparation?.isEvaluation?(S.preparation?.evaluationProtocolId||classProtocolIdForPreset(c,S.preparation?.sessionPresetId)):DEFAULT_EVALUATION_PROTOCOL_ID),evaluationProtocolSnapshot:(S.preparation?.isEvaluation?protocolSnapshot(evaluationProtocolById(S.preparation?.evaluationProtocolId||classProtocolIdForPreset(c,S.preparation?.sessionPresetId))):null),protocolScores:{},hasGP:Number(S.preparation?.gpMinutes??15)>0,gpPct:gpThemeParams(d).pct,participation:sessionParticipationSnapshot(c),deviceSnapshot:{device:d.device||S.seanceCfg?.device||'plots',plots:{...deviceParams('plots',d)}}});
    c.draft=null; ui.open={}; ensureGPProfiles(c); autoSyncPreparation(); save();
    if(hasGP){ui.sessionStage='gp'; ui.gp='race'; render(); window.scrollTo(0,0); fanfare(); toast('Courses validées · place au Grand Prix ! 🏁');}
    else{ui.sessionStage='hub';ui.tab='bilan';render();window.scrollTo(0,0);fanfare();toast('Évaluation enregistrée · bilan disponible ✅');}
  });
}

function commitCurrentSession(finalizeAfter=false){
  const c=cls(), d=c?.draft;
  if(!d){
    if(finalizeAfter)return v157FinishSession();
    return toast('Aucune séance ouverte');
  }
  if(!v157CanCommit(c,d))return;
  const validationKey=v157CommitKey(c,d);
  if(!v157BeginValidation(validationKey))return;
  const t=seanceTotals(d);
  if(!t.n){v157EndValidation(validationKey);return toast('Aucun résultat saisi pour le moment');}
  ask('Enregistrer la séance ?', `<b>${t.n} élève${t.n>1?'s':''}</b> vont recevoir <b>${fmtNum(t.coinsT)} 🪙</b> au total${t.carrT?` et <b>${t.carrT}</b> points de carrosserie`:''}.`, 'Enregistrer', async () => {
    v157EndValidation(validationKey);
    if(!v157CanCommit(c,d))return;
    const deltas={}, ups=[];
    c.players.forEach(p=>{
      const r=calc(d,p), e=entry(d,p.id); const hasData=d.mode==='quick'?((e.q||0)!==0||!!e.qo):(e.cp||[]).some(row=>(row||[]).some(v=>v!=null)); if(e.ab||(!hasData&&!r.carr&&!r.warmDelta))return;
      const adj=sessionSpeedAdjustment(p,d,r);
      const l0=level(p),s0=stage(p); p.xp+=r.coins;p.carr+=r.carr; if(adj)p.speed=adj.next;
      const rs=releveSummary(r); deltas[p.id]={xp:r.coins,carr:r.carr,objs:r.objs||0,totalObjs:r.per?.filter(x=>x.t!=null).length||0,attained:r.per?.filter(x=>x.ok&&!x.exceeded).length||0,exceeded:r.per?.filter(x=>x.exceeded).length||0,unmet:r.per?.filter(x=>x.t!=null&&!x.ok).length||0,regular:r.per?.filter(x=>x.regular).length||0,walks:r.per?.filter(x=>x.walked).length||0,...rs,warm:r.warmDelta||0,warmQuality:e.warm||'done',speedAdjustment:adj||null,coinDetails:JSON.stringify(sessionCoinSnapshot(r,d))};
      addLog(p,'seance',d.title+(r.objs?` · ${r.objs} objectif${r.objs>1?'s':''} 🎯`:''),{xp:r.coins,carr:r.carr});
      if(level(p)>l0||stage(p)>s0)ups.push(p.name);
    });
    c.sessions.push({id:d.id,t:Date.now(),title:d.title,deltas,n:t.n,total:t.coinsT,carrT:t.carrT,presetId:S.preparation?.sessionPresetId||null,assessmentType:sessionAssessmentType(selectedSessionPreset()||S.preparation||{}),assessmentCoefficient:sessionAssessmentCoefficient(selectedSessionPreset()||S.preparation||{}),evaluationProtocolId:(S.preparation?.isEvaluation?(S.preparation?.evaluationProtocolId||classProtocolIdForPreset(c,S.preparation?.sessionPresetId)):DEFAULT_EVALUATION_PROTOCOL_ID),evaluationProtocolSnapshot:(S.preparation?.isEvaluation?protocolSnapshot(evaluationProtocolById(S.preparation?.evaluationProtocolId||classProtocolIdForPreset(c,S.preparation?.sessionPresetId))):null),protocolScores:{},hasGP:Number(S.preparation?.gpMinutes??15)>0,gpPct:gpThemeParams(d).pct,participation:sessionParticipationSnapshot(c),deviceSnapshot:{device:d.device||S.seanceCfg?.device||'plots',plots:{...deviceParams('plots',d)}}});
    c.gpSession=null;c.gpSequence=null;
    ensureGPProfiles(c);['runner1','runner2','whole','teams'].forEach(k=>{if(c.gpProfiles?.[k])resetGPProfileRace(c,k);});
    c.gp=c.gpProfiles?.teams||c.gp;c.hands=c.gp.hands||{};
    c.draft=null;ui.open={};save();closeSheet();ui.tab='bilan';render();window.scrollTo(0,0);
    fanfare();confetti();
    toast(ups.length?`Séance enregistrée ! Niveau ou kart supérieur pour ${ups.slice(0,3).join(', ')}${ups.length>3?'…':''} 🎉`:'Séance enregistrée ! 🎉');
    if(finalizeAfter){
      const finished=c.sessions.find(session=>session.id===d.id);
      if(finished)finished.finishedAt=Date.now();
      resetAndApplyQueuedNext();
      ui.lessonStage='prepa'; ui.sessionStage='hub'; ui.tab='bilan';
      save();
      render();
    }
  });
}

