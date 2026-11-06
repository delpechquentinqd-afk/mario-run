/* V131.57 — présentation du minuteur ; phases, durées et calculs inchangés. */
function seanceTimerPanel(c,d){
  const t=seanceTimerEnsure(d),inf=seanceSegmentInfo(d);
  if(inf.done||t.completed)return `<div class="session-timer done"><b>✅ Courses terminées</b></div>`;
  const isRotation=t.phase==='rotation', isAwaiting=t.phase==='awaiting', isReady=t.phase==='ready', duration=isRotation?normalizedRotation(d.interval):inf.runSec, elapsed=seanceElapsed(d)/1000, left=isAwaiting?0:Math.max(0,duration-elapsed);
  const role=inf.group===1?'mario':'luigi', marks=!isRotation?seanceReleveMarks(inf.co,d):[], next=marks.find(x=>x>elapsed+.15), ist=(!isRotation&&!isAwaiting&&!isReady)?seanceIntermittentState(inf.co,d,elapsed):null;
  const signalText=isRotation?'Rotation':isAwaiting?'Valider la saisie':isReady?'Prêt à démarrer':ist?(ist.phase==='effort'?`EFFORT ${ist.rep}/${ist.reps} · relevé dans ${fmtTimerSec(ist.nextReleve)}`:`REPOS ${ist.rep}/${ist.reps} · reprise dans ${fmtTimerSec(ist.nextEffort)}`):(next!=null?`Relevé ${fmtTimerSec(next-elapsed)}`:'Dernier relevé');
  return `<div class="session-timer ${isRotation?'rotation':isAwaiting?'awaiting':ist?.phase==='effort'?'phase-effort':ist?.phase==='repos'?'phase-rest':'phase-run'}">
    <div class="mini-timer-line"><b>Course ${inf.courseIndex+1} · ${roleMini(role)} ${inf.group===1?'Mario':'Luigi'}</b><span class="bigtime" id="seance-timer-value">${fmtTimerSec(left)}</span><span class="next-signal" id="seance-next-signal">${signalText}</span></div>
    <div class="timer-actions">${isAwaiting?'<button class="btn btn-yellow" data-a="focusCurrentGroup">✍️ Saisie / validation</button>':isRotation?'<span class="chip">Rotation automatique</span>':`<button class="btn ${t.t0?'btn-yellow':'btn-green'}" data-a="seanceTimerToggle">${t.t0?'⏸ Pause':(isReady?'▶️ Démarrer':'▶️ Reprendre')}</button>`}<button class="btn btn-ghost session-undo" data-a="undoLast" ${undoSlot?'':'disabled'}>${undoSlot?`↶ ${esc(undoSlot.label)}`:'↶ Dernière saisie'}</button><button class="btn btn-ghost v157-focus-toggle" data-a="teacherFocus"><span class="v157-focus-enter">🎯 Mode terrain</span><span class="v157-focus-leave">↩ Quitter le mode terrain</span></button></div>
  </div>`;
}
