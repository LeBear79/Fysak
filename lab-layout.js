(()=>{
  if(window.__fahLabLayoutInstalled) return;
  window.__fahLabLayoutInstalled=true;

  const register=document.getElementById('register');
  if(!register) return;

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
    box.innerHTML=relevant.length?relevant.map(c=>`
      <div class="card compact-criterion">
        <div class="criteria-title">${esc(c.name)}</div>
        <div class="criteria-goal">${esc(c.goal)}</div>
        <div class="level-grid">${levels.map((level,index)=>`<button class="level-btn ${selectedLevels[c.id]===index+1?'selected':''}" data-level="${index+1}" data-criterion="${c.id}">${esc(level)}</button>`).join('')}</div>
      </div>`).join(''):'<div class="notice warning">Ingen vurderingskriterier er valgt for denne timen.</div>';
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

  const originalSaveRecord=saveRecord;
  saveRecord=function(){
    originalSaveRecord();
    renderRoster();
  };

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
    if(e.target.closest('#closeRegisterEditorBtn')){
      openStudent=null;resetForm();renderRegisterContext();return;
    }
    if(e.target.closest('#saveBtn')){saveRecord();return;}
    if(e.target.closest('#resetBtn')){
      resetForm();
      const s=document.getElementById('saveStatus');
      if(s) s.textContent='Vurderingen er nullstilt.';
    }
  });

  document.getElementById('registerSearch')?.addEventListener('input',renderRoster);

  const originalRenderStudents=renderStudents;
  renderStudents=function(){
    originalRenderStudents();
    fillStudentSelect();
    renderRoster();
  };

  const subtitle=document.querySelector('#mainApp header .subtitle');
  if(subtitle&&!subtitle.textContent.includes('v2.3')) subtitle.textContent+=' · v2.3';

  fillStudentSelect();
  renderRegisterContext();
})();