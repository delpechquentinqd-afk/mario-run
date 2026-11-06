/* V131.56 — présentation du calcul existant et de son instantané enregistré.
   Aucun montant ni droit au bonus n’est calculé par ces fonctions de rendu. */
function coinAmount(value){
  const n=Number(value);
  return Number.isFinite(n)?String(n).replace('.',','):'—';
}
function coinSignedAmount(value,zeroPlus=false){
  const n=Number(value);
  if(!Number.isFinite(n))return '—';
  return n<0?'−'+coinAmount(-n):n>0||zeroPlus?'+'+coinAmount(n):'0';
}
function coinPercent(value){
  const n=Number(value);
  return Number.isFinite(n)?n.toFixed(2).replace(/\.?0+$/,'').replace('.',','):'—';
}
function coinDetailOpen(key){
  return typeof ui!=='undefined'&&!!ui.coinOpen?.[key];
}
function coinDetailRow(label,amount,state,note='',negative=false,component=''){
  const status={obtained:'✅ Obtenu',applied:'⚠️ Appliqué',pending:'⏳ En attente',unearned:'○ Non obtenu',inactive:'— Non applicable',none:'— Non appliqué',recorded:'✓ Enregistré'};
  const shown=negative?(Number(amount)>0?'−'+coinAmount(amount):'0'):coinSignedAmount(amount,state==='obtained');
  const semanticState={unearned:'not-obtained',inactive:'not-applicable',none:'not-applied'}[state]||state;
  return `<div class="coin-detail-row coin-state-${state}" data-coin-component="${esc(component)}" data-status="${esc(semanticState)}"><div class="coin-detail-label"><b>${esc(label)}</b><span class="coin-detail-state">${status[state]||status.recorded}</span>${note?`<small>${esc(note)}</small>`:''}</div><strong class="coin-detail-amount">${esc(shown)} 🪙</strong></div>`;
}
function courseCoinDetailsHtml(detail,key,options={}){
  if(!detail||detail.version!==1)return '';
  const r=detail.regularity||{}, expected=Number(r.expected??detail.expected)||0;
  const incomplete=!detail.readingsComplete;
  const label=options.label||'Course';
  const provisional=incomplete?(options.saved?'Saisie incomplète lors de la validation':'Provisoire · saisie incomplète'):'';
  const frequency=`${Number(r.identical)||0}/${expected} relevés identiques · ${coinPercent(r.percent||0)} %`;
  let regularState=detail.regular?'obtained':'unearned', regularReason=frequency;
  if(!detail.regular){
    if(expected<2){regularState='inactive';regularReason+=' · Au moins deux relevés attendus.';}
    else if(r.walked||detail.walked){regularReason+=' · Marche observée.';}
    else if(!r.complete){regularState='pending';regularReason+=' · Tous les relevés doivent être renseignés.';}
    else regularReason+=' · Seuil de 80 % non atteint.';
  }
  const noWalkState=detail.noWalk?'obtained':detail.walked?'unearned':'pending';
  const noWalkReason=detail.noWalk?'Course renseignée sans marche.':detail.walked?'Marche observée.':'Course à renseigner entièrement.';
  const beforeThreshold=!detail.malusActive;
  const inactiveReason=`À partir de la séance ${detail.malusStartSession} · séance ${detail.sessionNo} actuellement.`;
  const penaltyState=hit=>beforeThreshold?'inactive':hit?'applied':'none';
  const penaltyNote=(hit,note)=>beforeThreshold?inactiveReason:hit&&incomplete?`${note} Montant actuel provisoire : saisie incomplète.`:note;
  const objectiveNote=!detail.targetKnown?'Cible non renseignée : objectif non validé.':detail.ok?'Objectif global atteint.':'Objectif global non atteint ou non validé.';
  const regularityNote=detail.regular?'Course régulière.':'Régularité non validée.';
  const bonusObtained=detail.regular||detail.noWalk, penaltyApplied=!beforeThreshold&&(detail.walked||!detail.ok||!detail.regular);
  const badges=`<span class="coin-status-badge coin-bonus ${bonusObtained?'coin-active':'coin-neutral'}">${bonusObtained?'Bonus obtenus '+coinSignedAmount(detail.bonus,true):'Aucun bonus'}</span><span class="coin-status-badge coin-malus ${penaltyApplied?'coin-active':'coin-neutral'}">${beforeThreshold?'Malus inactifs':penaltyApplied?'Malus appliqués '+(Number(detail.malus)>0?'−'+coinAmount(detail.malus):'0'):'Aucun malus'}</span>`;
  const rows=[
    coinDetailRow('Objectifs de relevé atteints',detail.baseCoins,detail.targetKnown?'recorded':'pending',detail.targetKnown?'Pièces de base sur les relevés atteignant la cible.':'Vitesse ou cible à renseigner.',false,'base'),
    coinDetailRow('Dépassements de la cible',detail.extraCoins,'recorded','Pièces supplémentaires sur les relevés au-dessus de la cible.',false,'extra'),
    coinDetailRow('Bonus de régularité',detail.regularBonus,regularState,regularReason,false,'regularity'),
    coinDetailRow('Bonus sans marche',detail.noWalkBonus,noWalkState,noWalkReason,false,'noWalk'),
    coinDetailRow('Malus pour marche',detail.walkPenalty,penaltyState(detail.walked),penaltyNote(detail.walked,detail.walked?'Marche observée.':'Aucune marche observée.'),true,'walkPenalty'),
    coinDetailRow('Malus objectif non atteint',detail.objectivePenalty,penaltyState(!detail.ok),penaltyNote(!detail.ok,objectiveNote),true,'objectivePenalty'),
    coinDetailRow('Malus pour irrégularité',detail.regularityPenalty,penaltyState(!detail.regular),penaltyNote(!detail.regular,regularityNote),true,'regularityPenalty'),
  ].join('');
  const floor=Number(detail.floorAdjustment)>0?`<div class="coin-floor-note">Plancher de course à 0 🪙 : ${esc(coinSignedAmount(detail.floorAdjustment))} 🪙 d’ajustement. Les malus ne rendent pas le gain de la course négatif.</div>`:'';
  return `<details class="coin-details" data-coin-key="${esc(key)}" ${coinDetailOpen(key)?'open':''}><summary><span class="coin-net"><span>${esc(label)}</span><strong>${esc(coinAmount(detail.net))} 🪙 net</strong></span><span class="coin-summary-badges">${badges}</span>${incomplete?`<span class="coin-summary-status">${options.saved?'Relevés incomplets':'Provisoire'}</span>`:''}<span class="coin-summary-action">Détail <span aria-hidden="true">▾</span></span></summary><div class="coin-detail-body">${provisional?`<p class="coin-provisional">${esc(provisional)}</p>`:''}${rows}${floor}<div class="coin-detail-total"><b>Total net de la course</b><strong>${esc(coinAmount(detail.net))} 🪙</strong></div><p class="coin-auto-note">Bonus et malus automatiques · détail du calcul${options.saved?' enregistré':''}.</p></div></details>`;
}
function sessionCoinSnapshot(result,draft){
  const courses=(result.per||[]).map(course=>course.coinDetails).filter(Boolean);
  const courseTotal=(result.per||[]).reduce((sum,course)=>sum+Number(course.net||0),0);
  // Les différences de plancher décrivent le résultat de calc ; aucun barème
  // n’est réappliqué. Le clone empêche les saisies futures de changer l’historique.
  return JSON.parse(JSON.stringify({version:1,mode:draft.mode,coins:result.coins,warmDelta:result.warmDelta||0,courses,courseTotal,sessionFloorAdjustment:draft.mode==='quick'?0:result.coins-(courseTotal+(result.warmDelta||0))}));
}
function savedCoinDetailsHtml(delta,key){
  // L’instantané peut être encodé dans un champ JSON optionnel pour conserver
  // le budget de validation des anciennes sauvegardes, sans changer leur schéma.
  // Les objets déjà enregistrés restent lisibles ; un détail illisible est ignoré.
  let snapshot=delta?.coinDetails;
  if(typeof snapshot==='string'){
    try{snapshot=JSON.parse(snapshot);}catch(_){snapshot=null;}
  }
  const xp=delta?.xp;
  const credited=xp!=null&&(typeof xp==='number'||(typeof xp==='string'&&xp.trim()!==''))&&Number.isFinite(Number(xp))?Number(xp):null;
  if(!snapshot||snapshot.version!==1||!Array.isArray(snapshot.courses)||(typeof snapshot.coins!=='number'||!Number.isFinite(snapshot.coins))){
    return `<div class="coin-unavailable">${credited!=null?`<b>${esc(coinAmount(credited))} 🪙 enregistrées</b> · `:''}Détail des pièces non enregistré pour cette séance. Aucun calcul rétroactif.</div>`;
  }
  const total=credited??Number(snapshot.coins);
  const differs=credited!=null&&credited!==Number(snapshot.coins)?`<p class="coin-provisional">Le détail enregistré indique ${esc(coinAmount(snapshot.coins))} 🪙 ; le total crédité conservé est ${esc(coinAmount(credited))} 🪙.</p>`:'';
  let content='';
  if(snapshot.mode==='quick')content='<p class="coin-unavailable">Saisie rapide : total enregistré sans détail automatique par course.</p>';
  else content=snapshot.courses.map((course,i)=>courseCoinDetailsHtml(course,`${key}:course:${i}`,{label:`Course ${i+1}`,saved:true})).join('');
  const warm=coinDetailRow('Échauffement',snapshot.warmDelta||0,'recorded','Variation de pièces enregistrée pour l’échauffement.');
  const floor=Number(snapshot.sessionFloorAdjustment)>0?`<div class="coin-floor-note">Plancher de séance à 0 🪙 : ${esc(coinSignedAmount(snapshot.sessionFloorAdjustment))} 🪙 d’ajustement.</div>`:'';
  return `<details class="coin-details coin-history" data-coin-key="${esc(key)}" ${coinDetailOpen(key)?'open':''}><summary><span class="coin-net"><span>Pièces enregistrées</span><strong>${esc(coinAmount(total))} 🪙</strong></span><span class="coin-summary-action">Détail <span aria-hidden="true">▾</span></span></summary><div class="coin-detail-body">${differs}${content}${warm}${floor}<div class="coin-detail-total"><b>Total net crédité pour la séance</b><strong>${esc(coinAmount(total))} 🪙</strong></div><p class="coin-auto-note">Montants figés lors de la validation · les réglages actuels ne sont pas réappliqués.</p></div></details>`;
}
