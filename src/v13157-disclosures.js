/* État de présentation temporaire : aucune modification des données de classe. */
function v157DisclosureOpen(key,fallback=false){
  const states=typeof ui==='undefined'?null:ui.v157Open;
  return states&&Object.prototype.hasOwnProperty.call(states,key)?states[key]===true:!!fallback;
}
function v157TrackDisclosure(event){
  const detail=event.target;
  if(!detail?.matches?.('details[data-v157-disclosure]'))return;
  ui.v157Open=ui.v157Open||Object.create(null);
  ui.v157Open[detail.dataset.v157Disclosure]=detail.open;
}
