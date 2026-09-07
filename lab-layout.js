(()=>{
  if(window.__fahLabLayoutInstalled) return;
  window.__fahLabLayoutInstalled=true;

  const register=document.getElementById('register');
  if(!register) return;

  const concreteCriteria={
    effort:['Deltar aktivt i timen','Prøver etter beste evne','Fortsetter når oppgaven er krevende','Utfordrer seg selv'],
    development:['Øver målrettet','Prøver å forbedre seg','Bruker tilbakemeldinger','Viser utvikling ut fra egne forutsetninger'],
    independence:['Kommer i gang med oppgaven','Arbeider selvstendig','Tar ansvar for egne oppgaver','Tar initiativ når det er naturlig'],
    cooperation:['Samarbeider med andre','Inkluderer andre','Oppmuntrer medelever','Bidrar positivt i gruppen'],
    movement:['Deltar i bevegelsesaktiviteten','Prøver ulike måter å løse oppgaven på','Tilpasser seg aktiviteten','Gjennomfører ut fra egne forutsetninger'],
    food:['Bidrar i tilberedningen','Velger helsefremmende matvarer','Kan begrunne matvalg','Bidrar positivt i måltidsfellesskapet'],
    health:['Ser sammenheng mellom fysisk aktivitet og helse','Ser sammenheng mellom kosthold og helse','Kan forklare virkninger på fysisk helse','Kan forklare virkninger på psykisk helse','Kan drøfte flere sider ved helsevalg']
  };

  register.innerHTML=`
    <div id="registerSessionBanner"></div>
    <div class="card">
      <div class="register-toolbar">
        <label class="register-search"><span>Søk etter elev</span><input id="registerSearch" type="search" placeholder="Søk etter elev..."></label>
        <div id="registerRosterCount" class="muted small"></div>
      </div>
      <select id="studentSelect" hidden></select>
      <div id="registerRoster" class="roster-table" style="margin-top:12px"></div>
    </div>
    <div id="registerEditor" class="register-editor" hidden>
      <div class="card">
        <div class="editor-head">
          <div>
            <div class="small muted">Vurderer elev</div>
            <div id="selectedStudentHeading" class="section-title" style="margin:2px 0 0"></div>
            <div id="studentAttendanceInfo" class="small muted" style="margin-top:4px"></div>
          </div>
          <button id="closeRegisterEditorBtn">Lukk</button>
        </div>
      </div>
      <div class="card">
        <div class="section-title">Hurtigobservasjoner</div>
        <div class="muted small" style="margin-bottom:10px">Velg alle observasjonene som passer for denne timen.</div>
        <div id="quickTags" class="tags"></div>
      </div>
      <div id="assessmentCards"></div>
      <div class="card">
        <label><span>Egen kommentar</span><textarea id="noteInput" placeholder="Kort individuell kommentar til eleven..."></textarea></label>
      </div>
      <div class="actions">
        <button id="saveBtn" class="primary">Lagre observasjon</button>
        <button id="resetBtn">Nullstill vurdering</button>
        <span id="saveStatus" class="status" aria-live="polite"></span>
      </div>
    </div>`;

  let openStudent=null;
  let selectedCriteriaMarks=new Set();

  const fillStudentSelect=()=>{
    const sel=document.getElementById('studentSelect');
    if(!sel) return;
    const current=sel.value;
    sel.innerHTML=state.students.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
    if(openStudent&&state.students.includes(openStudent)) sel.value=openStudent;
    else if(state.students.includes(current)) sel.value=current;
  };

  const renderRoster=()=>{
    const session=activeSession();
    const box=document.getElementById('registerRoster');
    const count=document.getElementById('registerRosterCount');
    if(!box) return;
    if(!session){
      box.innerHTML='<div class="muted" style="padding:14px">Ingen aktiv time.</div>';
      if(count) count.textContent='';
      return;
    }
    const q=(document.getElementById('registerSearch')?.value||'').trim().toLowerCase();
    const pupils=state.students.filter(n=>n.toLowerCase().includes(q));
    if(count) count.textContent=`${pupils.length} av ${state.students.length} elever`;
    const rows=pupils.map(name=>{
      const status=session.attendance?.[name]||'present';
      const recs=state.records.filter(r=>String(r.sessionId)===String(session.id)&&r.student===name).length;
      const isOpen=name===openStudent;
      return `<div class="roster-row ${isOpen?'active':''}" data-fah-student="${esc(name)}">
        <div><div class="roster-name">${esc(name)}</div>${isOpen?'<div class="small muted">Åpen for vurdering</div>':''}</div>
        <div class="roster-status"><span class="status-pill ${status}">${esc(attendanceLabel(status))}</span></div>
        <div class="roster-observations">${recs} observasjon${recs===1?'':'er'}</div>
        <div class="roster-action"><button class="small-btn ${isOpen?'selected':''}" data-fah-student="${esc(name)}">${isOpen?'Lukk':'Vurder'}</button></div>
      </div>`;
    }).join('');
    box.innerHTML=`<div class="roster-head"><div>Elev</div><div>Status</div><div>Observasjoner</div><div>Vurdering</div></div>${rows||'<div class="muted" style="padding:14px">Ingen elever funnet.</div>'}`;
  };

  renderTags=function(){
    const box=document.getElementById('quickTags');
    if(!box) return;
    box.innerHTML=state.tags.map((tag,index)=>`<button class="tag-btn ${selectedTags.has(index)?'selected':''}" data-tag="${index}">${esc(tag)}</button>`).join('');
  };

  renderAssessment=function(){
    const session=activeSession();
    const activeIds=session?.criteria||[];
    const relevant=criteria.filter(c=>activeIds.includes(c.id));
    const box=document.getElementById('assessmentCards');
    if(!box) return;
    box.innerHTML=relevant.length?relevant.map(c=>{
      const marks=concreteCriteria[c.id]||[];
      return `<div class="card compact-criterion">
        <div class="criteria-title">${esc(c.name)}</div>
        <div class="criteria-goal">${esc(c.goal)}</div>
        <div class="criterion-mark-grid">${marks.map(mark=>{
          const key=`${c.id}::${mark}`;
          return `<button class="criterion-mark ${selectedCriteriaMarks.has(key)?'selected':''}" data-criterion-mark="${esc(key)}"><span class="mark-check">✓</span>${esc(mark)}</button>`;
        }).join('')}</div>
      </div>`;
    }).join(''):'<div class="notice warning">Ingen vurderingskriterier er valgt for denne timen.</div>';
  };

  updateStudentAttendanceInfo=function(){
    const session=activeSession();
    const student=document.getElementById('studentSelect')?.value;
    const el=document.getElementById('studentAttendanceInfo');
    const btn=document.getElementById('saveBtn');
    if(!el||!btn) return;
    if(!session||!student){el.textContent='';btn.disabled=true;return;}
    const status=session.attendance?.[student]||'present';
    if(status==='absent'){el.textContent='Fravær – eleven kan ikke vurderes i denne timen.';btn.disabled=true;}
    else if(status==='exempt'){el.textContent='Fritatt – eleven kan ikke vurderes i denne timen.';btn.disabled=true;}
    else{el.textContent='Til stede';btn.disabled=false;}
  };

  renderRegisterContext=function(){
    const session=activeSession();
    const banner=document.getElementById('registerSessionBanner');
    const editor=document.getElementById('registerEditor');
    fillStudentSelect();
    if(!session){
      if(banner) banner.innerHTML='<div class="notice warning">Du må opprette eller velge en time før du registrerer vurderinger.</div>';
      if(editor) editor.hidden=true;
      renderRoster();
      return;
    }
    if(banner) banner.innerHTML=`<div class="card"><div class="session-banner"><div><div class="small muted">Aktiv time</div><strong>${esc(session.activity)}</strong><div class="small muted">${esc(session.date)} · ${session.criteria.map(id=>criteria.find(c=>c.id===id)?.name).filter(Boolean).map(esc).join(' · ')}</div></div><button data-go-lesson>Endre time/fravær</button></div></div>`;
    renderRoster();
    if(!openStudent||!state.students.includes(openStudent)){
      if(editor) editor.hidden=true;
      return;
    }
    const sel=document.getElementById('studentSelect');
    if(sel) sel.value=openStudent;
    if(editor) editor.hidden=false;
    const heading=document.getElementById('selectedStudentHeading');
    if(heading) heading.textContent=openStudent;
    renderTags();
    renderAssessment();
    updateStudentAttendanceInfo();
  };

  const originalResetForm=resetForm;
  resetForm=function(){
    originalResetForm();
    selectedCriteriaMarks.clear();
    renderAssessment();
  };

  saveRecord=function(){
    const session=activeSession();
    const student=document.getElementById('studentSelect')?.value;
    const statusEl=document.getElementById('saveStatus');
    if(!session){if(statusEl)statusEl.textContent='Velg en aktiv time først.';return;}
    if(!student){if(statusEl)statusEl.textContent='Velg en elev.';return;}
    if((session.attendance?.[student]||'present')!=='present'){if(statusEl)statusEl.textContent='Eleven er ikke registrert som til stede.';return;}
    const note=document.getElementById('noteInput')?.value.trim()||'';
    if(selectedCriteriaMarks.size===0&&selectedTags.size===0&&!note){if(statusEl)statusEl.textContent='Marker minst ett kriterium, en hurtigobservasjon eller skriv et notat.';return;}
    const criteriaMarks=[...selectedCriteriaMarks].map(key=>{
      const sep=key.indexOf('::');
      return {criterionId:key.slice(0,sep),text:key.slice(sep+2)};
    });
    state.records.push({
      id:uid(),sessionId:session.id,student,date:session.date,activity:session.activity,
      levels:{},criteriaMarks,tags:[...selectedTags].map(i=>state.tags[i]).filter(Boolean),note
    });
    saveState();
    resetForm();
    renderProfile();
    renderRoster();
    if(statusEl)statusEl.textContent='Observasjonen er lagret.';
  };

  const originalRenderProfile=renderProfile;
  renderProfile=function(){
    originalRenderProfile();
    const student=document.getElementById('profileStudent')?.value||state.students[0];
    if(!student) return;
    const records=state.records.filter(r=>r.student===student).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
    const summary=document.getElementById('profileSummary');
    if(summary){
      summary.innerHTML=criteria.map(c=>{
        const marks=records.flatMap(r=>(r.criteriaMarks||[]).filter(m=>m.criterionId===c.id).map(m=>m.text));
        const counts={};marks.forEach(m=>counts[m]=(counts[m]||0)+1);
        const items=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
        return `<div class="card"><strong>${esc(c.name)}</strong><div class="small muted" style="margin:5px 0 8px">${marks.length?`${marks.length} markering${marks.length===1?'':'er'}`:'Mangler vurderingsgrunnlag'}</div>${items.length?items.map(([m,n])=>`<div class="profile-mark"><span>${esc(m)}</span><strong>${n}</strong></div>`).join(''):''}</div>`;
      }).join('');
    }
    const history=document.getElementById('historyList');
    if(history){
      history.innerHTML=records.length?records.map(r=>`<div class="history-row"><div style="min-width:0"><strong>${esc(r.activity)}</strong><div class="small muted">${esc(r.date)}</div>${r.criteriaMarks?.length?`<div class="history-marks">${r.criteriaMarks.map(m=>`<span class="pill">✓ ${esc(m.text)}</span>`).join('')}</div>`:''}${r.tags?.length?`<div style="margin-top:6px">${r.tags.map(t=>`<span class="pill">${esc(t)}</span>`).join('')}</div>`:''}${r.note?`<div style="margin-top:8px">${esc(r.note)}</div>`:''}</div><button class="danger" data-delete-record="${r.id}">Slett</button></div>`).join(''):'<div class="muted">Ingen observasjoner registrert ennå.</div>';
    }
  };

  const printBtn=document.getElementById('printProfileBtn');
  if(printBtn){
    const clean=printBtn.cloneNode(true);
    printBtn.replaceWith(clean);
    clean.addEventListener('click',()=>{
      const student=document.getElementById('profileStudent')?.value||state.students[0];
      if(!student) return;
      const records=state.records.filter(r=>r.student===student).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
      let present=0,absent=0,exempt=0;
      state.sessions.forEach(s=>{const v=s.attendance?.[student];if(v==='absent')absent++;else if(v==='exempt')exempt++;else if(v==='present')present++;});
      const rows=criteria.map(c=>{
        const marks=records.flatMap(r=>(r.criteriaMarks||[]).filter(m=>m.criterionId===c.id).map(m=>m.text));
        const unique=[...new Set(marks)];
        return `<tr><td>${esc(c.name)}</td><td>${unique.length?unique.map(m=>`✓ ${esc(m)}`).join('<br>'):'Mangler vurderingsgrunnlag'}</td></tr>`;
      }).join('');
      const history=records.length?records.map(r=>`<div class="record"><strong>${esc(r.date)} – ${esc(r.activity)}</strong>${r.criteriaMarks?.length?`<div>${r.criteriaMarks.map(m=>`✓ ${esc(m.text)}`).join('<br>')}</div>`:''}${r.tags?.length?`<div>Hurtigobservasjoner: ${r.tags.map(esc).join(', ')}</div>`:''}${r.note?`<div>Notat: ${esc(r.note)}</div>`:''}</div>`).join(''):'<p>Ingen observasjoner registrert.</p>';
      const w=window.open('','_blank');
      if(!w){alert('Nettleseren blokkerte utskriftsvinduet. Tillat popup-vinduer og prøv igjen.');return;}
      w.document.write(`<!doctype html><html lang="no"><head><meta charset="utf-8"><title>Elevvurdering – ${esc(student)}</title><style>body{font-family:Arial,sans-serif;color:#111;margin:32px;line-height:1.4}h1{margin-bottom:4px}h2{margin-top:28px;font-size:18px}.muted{color:#555}.summary{display:flex;gap:28px;margin:18px 0}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #ccc}th{border-bottom:2px solid #555}.record{padding:10px 0;border-bottom:1px solid #ddd;font-size:14px}@media print{body{margin:15mm}.no-print{display:none}}</style></head><body><h1>Elevvurdering – Fysisk aktivitet og helse</h1><div class="muted">Elev: ${esc(student)}</div><div class="summary"><div><strong>${records.length}</strong><br>registreringer</div><div><strong>${present}</strong><br>til stede</div><div><strong>${absent}</strong><br>fravær</div><div><strong>${exempt}</strong><br>fritatt</div></div><h2>Vurderingskriterier som er observert</h2><table><thead><tr><th>Område</th><th>Markerte kriterier</th></tr></thead><tbody>${rows}</tbody></table><h2>Registrerte observasjoner</h2>${history}<div class="no-print" style="margin-top:24px"><button onclick="window.print()">Skriv ut / lagre som PDF</button></div></body></html>`);
      w.document.close();w.focus();
    });
  }

  document.addEventListener('click',e=>{
    const studentTarget=e.target.closest('[data-fah-student]');
    if(studentTarget){
      const name=studentTarget.dataset.fahStudent;
      openStudent=openStudent===name?null:name;
      resetForm();
      renderRegisterContext();
      if(openStudent) setTimeout(()=>document.getElementById('registerEditor')?.scrollIntoView({behavior:'smooth',block:'start'}),40);
      return;
    }
    const mark=e.target.closest('[data-criterion-mark]');
    if(mark){
      const key=mark.dataset.criterionMark;
      selectedCriteriaMarks.has(key)?selectedCriteriaMarks.delete(key):selectedCriteriaMarks.add(key);
      renderAssessment();return;
    }
    if(e.target.closest('#closeRegisterEditorBtn')){openStudent=null;resetForm();renderRegisterContext();return;}
    if(e.target.closest('#saveBtn')){saveRecord();return;}
    if(e.target.closest('#resetBtn')){resetForm();const s=document.getElementById('saveStatus');if(s)s.textContent='Vurderingen er nullstilt.';}
  });

  document.getElementById('registerSearch')?.addEventListener('input',renderRoster);

  const originalRenderStudents=renderStudents;
  renderStudents=function(){originalRenderStudents();fillStudentSelect();renderRoster();};

  const subtitle=document.querySelector('#mainApp header .subtitle');
  if(subtitle&&!subtitle.textContent.includes('v2.4')) subtitle.textContent=subtitle.textContent.replace(/ · v\d+(\.\d+)*/g,'')+' · v2.4';

  fillStudentSelect();
  renderRegisterContext();
  renderProfile();
})();