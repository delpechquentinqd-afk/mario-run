/* Sources de calcul reconstituées depuis V131.55 (1ec9464).
   Réinjectées par scripts/build.cjs ; les ressources et le stockage restent inchangés. */
function entry(d, pid) {
  if (!d.e[pid]) d.e[pid] = {ab:false, cp:d.courses.map(co => Array(ncp(co, d)).fill(null)), w:d.courses.map(co => Array(ncp(co, d)).fill(false)), rg:d.courses.map(() => false), q:0, qo:false, wu:false, rc:false, warm:'done'};
  return d.e[pid];
}

function courseRegularity(e,i,expectedCount){
  const vals=e?.cp?.[i]||[], walks=e?.w?.[i]||[];
  const expected=Number.isInteger(expectedCount)&&expectedCount>0?expectedCount:0;
  const counts=new Map();
  let filled=0, identical=0;
  for(let k=0;k<Math.min(expected,vals.length);k++){
    const v=vals[k];
    if(v==null || !['number','string'].includes(typeof v) || (typeof v==='string' && !v.trim()) || !Number.isFinite(Number(v))) continue;
    filled++;
    const value=Number(v), count=(counts.get(value)||0)+1;
    counts.set(value,count);
    identical=Math.max(identical,count);
  }
  const complete=expected>0 && vals.length===expected && filled===expected;
  const walked=walks.some(Boolean), percent=expected?identical/expected*100:0;
  // Le pourcentage reste informatif pendant la saisie. Seule une course complète,
  // sans marche, avec au moins deux relevés attendus peut attribuer le bonus.
  const eligible=expected>=2 && complete && !walked && identical*5>=expected*4;
  return {expected,filled,identical,percent,complete,walked,eligible};
}
function autoRegularityForCourse(e,i,expectedCount){
  return courseRegularity(e,i,expectedCount).eligible;
}
function syncRegularity(e,i,d=cls()?.draft){
  if(!e || !Number.isInteger(i) || !d?.courses?.[i]) return false;
  const auto=autoRegularityForCourse(e,i,ncp(d.courses[i],d));
  // rg reste compatible avec les anciens brouillons, mais ne fait jamais autorité.
  if(!Array.isArray(e.rg)) e.rg=[];
  e.rg[i]=auto;
  return auto;
}

function calc(d, p) {
  const e = entry(d, p.id), st = S.settings;
  const carr = e.ab ? 0 : (e.wu ? st.warmPts : 0) + (e.rc ? st.recovPts : 0);
  const warmDelta=e.ab?0:(e.warm==='good'?Number(d.warmBonus??S.preparation?.warmBonus??5):e.warm==='low'?-Number(d.warmMalus??S.preparation?.warmMalus??3):0);
  if (e.ab) return {coins:0, carr:0, objs:0, per:[],warmDelta:0};
  if (d.mode === 'quick') return {coins:Math.max(0,(e.q || 0) + (e.qo ? RELEVE_TARGET_COINS : 0)+warmDelta), carr, objs:e.qo ? 1 : 0, per:[],warmDelta};
  const sessionNo = (cls()?.sessions?.length||0)+1;
  const malusStartSession=Math.max(2, Number(st.malusStartSession||5));
  const malusActive = sessionNo >= malusStartSession;
  let total = warmDelta, objs = 0;
  const per = d.courses.map((co, i) => {
    const t = target(p, co, d), vals = e.cp[i], walks = e.w[i];
    const regularity=courseRegularity(e,i,ncp(co,d));
    const regular=syncRegularity(e,i,d);
    let s = 0, filled = 0, walked = false, releveCoins=0, extraUnits=0, reachedReleves=0;
    vals.forEach((v, k) => {
      if (walks[k]) walked = true;
      if (v == null) return;
      filled++;
      const nv=Number(v)||0;
      if (!walks[k]) s += nv;
      if(!walks[k] && t!=null && nv>=Number(t)){
        reachedReleves++;
        const extra=Math.max(0,nv-Number(t));
        extraUnits+=extra;
        releveCoins+=RELEVE_TARGET_COINS + extra*EXTRA_UNIT_COINS;
      }
    });
    const targetTotal=t!=null ? t*vals.length : null;
    const complete=filled===vals.length && vals.length>0;
    const ok=targetTotal!=null && complete && !walked && s>=targetTotal;
    const noWalk = complete && !walked;
    const exceeded = targetTotal!=null && complete && !walked && s>targetTotal;
    // Ces composantes alimentent directement les gains : le détail affiché et
    // enregistré décrit ce calcul, sans appliquer un second barème.
    const regularBonus=regular?st.regBonus:0, noWalkBonus=noWalk?st.noWalkBonus:0;
    const walkPenalty=malusActive&&walked?st.walkMalus:0;
    const objectivePenalty=malusActive&&!ok?st.objMalus:0;
    const regularityPenalty=malusActive&&!regular?st.regMalus:0;
    const bonus = regularBonus + noWalkBonus;
    const malus = malusActive ? (walkPenalty + objectivePenalty + regularityPenalty) : 0;
    const rawNet=releveCoins + bonus - malus;
    const net = Math.max(0, rawNet);
    total += net; if (ok) objs++;
    const attainedReleves=targetTotal!=null?vals.reduce((n,v,k)=>n+(!walks[k]&&v!=null&&Number(v)===Number(t)?1:0),0):0;
    const exceededReleves=targetTotal!=null?vals.reduce((n,v,k)=>n+(!walks[k]&&v!=null&&Number(v)>Number(t)?1:0),0):0;
    const unmetReleves=targetTotal!=null?vals.reduce((n,v,k)=>n+(v==null||walks[k]||Number(v)<Number(t)?1:0),0):0;
    const walkReleves=walks.filter(Boolean).length;
    const regularReleves=regular?vals.length:0;
    const extraCoins=extraUnits*EXTRA_UNIT_COINS;
    const coinDetails={version:1,baseCoins:releveCoins-extraCoins,extraCoins,
      regularBonus,noWalkBonus,walkPenalty,objectivePenalty,regularityPenalty,
      regularity,complete,readingsComplete:regularity.complete,expected:regularity.expected,
      filled,walked,noWalk,regular,ok,malusActive,malusStartSession,sessionNo,
      bonus,malus,rawNet,floorAdjustment:net-rawNet,net,targetKnown:t!=null};
    return {t, targetTotal, s, ok, exceeded, regular, attainedReleves,exceededReleves,unmetReleves,walkReleves,regularReleves,totalReleves:vals.length,b:bonus, malus, net, filled, walked, noWalk, malusActive,releveCoins,extraUnits,reachedReleves,coinDetails};
  });
  return {coins:Math.max(0,total), carr, objs, per, malusActive,warmDelta};
}
