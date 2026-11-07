/* V131.57 — Mes classes : priorité à l’ouverture et aux actions courantes. */
function vClassHome() {
  const year=normalizedSchoolYear(S.schoolYear);
  const archived=!!ui.showArchives;
  const visible=(S.classes||[]).filter(c=>archived?c.archived:!c.archived&&normalizedSchoolYear(c.schoolYear)===year)
    .slice().sort((a,b)=>a.name.localeCompare(b.name,'fr'));
  const activeCount=(S.classes||[]).filter(c=>!c.archived&&c.schoolYear===year).length;
  const archivesCount=(S.classes||[]).filter(c=>c.archived).length;
  const cards=visible.length?visible.map(k=>`
    <div class="class-card-wrap mr-year-class v157-class-item">
      <button class="class-card" data-a="classOpen" data-id="${esc(k.id)}">
        <span class="class-card-ico">🏫</span>
        <span class="v157-class-copy"><span class="class-card-name">${esc(k.name)}</span>
          <span class="class-card-meta">${esc(k.schoolYear||year)} · ${k.players.length} élève${k.players.length>1?'s':''}${k.sessions?.length?` · ${k.sessions.length} séance${k.sessions.length>1?'s':''}`:''}</span>
        </span><span class="class-card-arrow" aria-hidden="true">›</span>
      </button>
      <details class="v157-class-manage" data-v157-disclosure="${esc('home:manage:'+k.id)}" ${v157DisclosureOpen('home:manage:'+k.id)?'open':''}>
        <summary aria-label="Gérer la classe ${esc(k.name)}">Gérer <span aria-hidden="true">⌄</span></summary>
        <div class="v157-manage-actions">
          <button class="btn btn-ghost" data-a="classArchiveToggle" data-id="${esc(k.id)}">${archived?'↩ Réactiver':'📦 Archiver'}</button>
          <button class="btn btn-ghost danger" data-a="classHomeDel" data-id="${esc(k.id)}" aria-label="Supprimer la classe ${esc(k.name)}">🗑️ Supprimer</button>
        </div>
      </details>
    </div>`).join(''):`<div class="class-empty"><div style="font-size:35px">${archived?'📦':'🏫'}</div><b>${archived?'Aucune classe archivée':'Aucune classe pour '+esc(year)}</b><p class="hint">${archived?'Les classes archivées apparaîtront ici sans perdre leurs notes.':'Choisis une autre année ou ajoute une classe.'}</p></div>`;
  const hasStudents=S.classes.some(c=>c.players?.length);
  const backupDue=hasStudents && (!S.lastFullBackup || Date.now()-Number(S.lastFullBackup)>14*864e5);
  const backupStatus=backupDue?(S.lastFullBackup?'Le dernier export date de plus de 14 jours.':'Aucun export externe connu.'):(S.lastFullBackup?'Dernier export : '+fmtDate(S.lastFullBackup)+'.':'Les données sont enregistrées sur cet iPad.');
  return `<div class="class-home v157-home"><div class="class-home-shell">
    <header class="v157-home-header">
      <div class="class-home-brand"><img src="${HOME_TITLE_LOGO}" alt="Mario Run EPS"></div>
      <div class="v157-home-heading"><h1>${archived?'Classes archivées':'Mes classes'}</h1><p>${archived?'Retrouver une classe ancienne sans la supprimer.':'Ouvre une classe pour préparer ou reprendre ta séance.'}</p></div>
      <button class="btn btn-green v157-home-add" data-a="classCreateOpen">＋ Ajouter une classe</button>
    </header>
    <div class="v157-home-toolbar">
      <label>Année scolaire <select class="inp compact" data-f="schoolYear">${schoolYearOptions(year)}</select></label>
      <span class="v157-home-count">${visible.length} classe${visible.length>1?'s':''}${archived?' archivée'+(visible.length>1?'s':''):''}</span>
      ${archived?`<button class="btn btn-ghost" data-a="homeArchivesToggle" aria-pressed="true">🏫 Classes actives · ${activeCount}</button>`:''}
      <a class="v157-home-backup-link" href="#v157-home-backups">💾 Sauvegardes</a>
    </div>
    <div class="class-grid">${cards}</div>
    <section id="v157-home-backups" class="v157-backup-zone ${backupDue?'is-due':''}" aria-label="Sauvegardes et transfert">
      <div class="v157-backup-copy"><b>💾 ${backupDue?'Sauvegarde externe conseillée':'Sauvegardes & transfert'}</b><span>${esc(backupStatus)}</span></div>
      <div class="v157-backup-actions"><button class="btn ${backupDue?'btn-yellow':'btn-ghost'}" data-a="backupCenter">Sauvegardes & transfert</button>${backupDue?'<button class="btn btn-ghost" data-a="exportFullBackup">Exporter</button>':''}</div>
    </section>
    <details class="v157-home-tools" data-v157-disclosure="home:tools" ${v157DisclosureOpen('home:tools')?'open':''}>
      <summary>Archives et démonstration <span aria-hidden="true">⌄</span></summary>
      <div class="v157-home-tools-body"><button class="btn btn-ghost" data-a="homeArchivesToggle" aria-pressed="${archived}">${archived?'🏫 Classes actives':'📦 Archives'} · ${archived?activeCount:archivesCount}</button><div><b>Besoin d’un exemple ?</b><p>Teste l’application avec une classe de démonstration, sans modifier tes classes.</p></div><button class="btn btn-ghost" data-a="demo">🎮 Classe de démonstration</button></div>
    </details>
    <p class="home-safety-note">Données conservées sur cet iPad · PWA V131.57</p>
  </div></div>`;
}
