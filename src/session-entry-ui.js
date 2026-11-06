/* Saisie terrain : pastilles et commandes conservées, détail des pièces en ligne. */
function terrainRowHtml(p,d,co,ci,k,showMissing){
  const e=entry(d,p.id),tg=target(p,co,d),v=e.cp?.[ci]?.[k]??null,w=!!e.w?.[ci]?.[k];
  const coinDetail=calc(d,p).per[ci]?.coinDetails;
  const all=(e.cp?.[ci]||[]).map((x,j)=>`${j+1}:${e.w?.[ci]?.[j]?'🚶':x==null?'?':x}`).join(' · ');
  return `<div class="terrain-student-row" data-player="${p.id}" data-course="${ci}" data-releve="${k}">
    <div class="terrain-student-name">${av(p,'sm')}<div class="grow"><div class="nm">${esc(p.name)}</div><div class="meta">🎯 ${tg??'—'} ${courseTargetLabel(co)} · ${p.speed?String(+p.speed).replace('.',',')+' km/h':''}</div><div class="terrain-row-summary">${all}</div></div></div>
    <div class="terrain-student-controls"><button class="btn btn-yellow terrain-target-btn" data-a="cpTarget" data-id="${p.id}" data-i="${ci}" data-k="${k}" aria-label="Mettre l'objectif pour ${esc(p.name)}">🎯</button><div class="stepper"><button data-a="cpStep" data-id="${p.id}" data-i="${ci}" data-k="${k}" data-d="-1" aria-label="Diminuer le relevé ${k+1} de ${esc(p.name)}">−</button><b class="v ${w?'ko':v==null?'muted':tg!=null&&v>=tg?'ok':''}">${v??'?'}</b><button data-a="cpStep" data-id="${p.id}" data-i="${ci}" data-k="${k}" data-d="1" aria-label="Augmenter le relevé ${k+1} de ${esc(p.name)}">+</button></div><button class="mbtn" data-a="cpWalk" data-id="${p.id}" data-i="${ci}" data-k="${k}" aria-pressed="${w}" aria-label="Marche au relevé ${k+1} de ${esc(p.name)}">🚶</button></div>
    ${courseCoinDetailsHtml(coinDetail,`live:${d.id}:${p.id}:${ci}`)}
  </div>`;
}
