/* Sections réutilisant les préférences et l’action prepToggle existantes. */
function prepSection(id,n,title,summary,body){
 const open=S.uiPrefs?.prepOpen?.[id]!==false && (S.uiPrefs?.prepOpen?.[id]===true || ['paddock','session','verify'].includes(id));
 const sectionId='v157-prep-'+String(id).replace(/[^A-Za-z0-9_-]/g,'-');
 return `<section class="prep-section ${open?'':'collapsed'}"><button class="prep-section-head" data-a="prepToggle" data-id="${esc(id)}" aria-expanded="${open}" aria-controls="${sectionId}">${n!==''?`<span class="num">${n}</span>`:''}<span style="min-width:0"><span class="ttl">${esc(title)}</span><span class="sum">${esc(summary||'')}</span></span><span class="chev" aria-hidden="true">${open?'⌃':'⌄'}</span></button><div class="prep-section-body" id="${sectionId}">${body}</div></section>`;
}
