/* La saisie reste silencieuse, y compris l’amorçage audio des gestes tactiles.
   Démarrer/Reprendre et les commandes Grand Prix gardent leur amorçage Safari. */
function v157PrimeGestureAudio(event){
  const target=event?.target,control=target?.closest?.('[data-a], [data-f]');
  const action=control?.dataset?.a,field=control?.dataset?.f;
  const entryActions=['cpTarget','cpStep','cpAll','cpWalk','cpReg','courseAllTargets','qStep','qObj','eWarm','eRecov','allWarm','allRecov','seanceValidateGroup','v157CorrectReading','terrainReleveSet','terrainRelevePrev','terrainReleveNext','undoLast','focusCurrentGroup'];
  if(entryActions.includes(action)||field==='qSet'||target?.closest?.('.active-entry-panel, .terrain-releve-nav'))return;
  if(ui.sheet?.type==='confirm'&&[...v157PendingValidations].some(key=>key.startsWith('read:')))return;
  if(S?.settings?.sound!==false)unlockAudio();
}
