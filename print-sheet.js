(()=>{
  if(window.__fahPrintSheetInstalled) return;
  window.__fahPrintSheetInstalled=true;

  const concreteCriteria={
    effort:['Deltar aktivt i timen','Prøver etter beste evne','Fortsetter når oppgaven er krevende','Utfordrer seg selv'],
    development:['Øver målrettet','Prøver å forbedre seg','Bruker tilbakemeldinger','Viser utvikling ut fra egne forutsetninger'],
    independence:['Kommer i gang med oppgaven','Arbeider selvstendig','Tar ansvar for egne oppgaver','Tar initiativ når det er naturlig'],
    cooperation:['Samarbeider med andre','Inkluderer andre','Oppmuntrer medelever','Bidrar positivt i gruppen'],
    movement:['Deltar i bevegelsesaktiviteten','Prøver ulike måter å løse oppgaven på','Tilpasser seg aktiviteten','Gjennomfører ut fra egne forutsetninger'],
    food:['Bidrar i tilberedningen','Velger helsefremmende matvarer','Kan begrunne matvalg','Bidrar positivt i måltidsfellesskapet'],
    health:['Ser sammenheng mellom fysisk aktivitet og helse','Ser sammenheng mellom kosthold og helse','Kan forklare virkninger på fysisk helse','Kan forklare virkninger på psykisk helse','Kan drøfte flere sider ved helsevalg']
  };

  const safe=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

  function printAssessmentSheet(){
    const session=activeSession();
    if(!session){ alert('Du må ha en aktiv time for å skrive ut vurderingsskjema.'); return; }

    const selected=criteria.filter(c=>(session.criteria||[]).includes(c.id));
    const columns=[];
    selected.forEach(c=>{
      (concreteCriteria[c.id]||[]).forEach(text=>columns.push({group:c.name,text}));
    });
    if(!columns.length){ alert('Det er ikke valgt noen vurderingskriterier for timen.'); return; }

    const legend=columns.map((x,i)=>`<div><strong>K${i+1}</strong> – ${safe(x.text)}</div>`).join('');
    const head=columns.map((_,i)=>`<th class="criterion">K${i+1}</th>`).join('');
    const rows=state.students.map(name=>`<tr><td class="name">${safe(name)}</td>${columns.map(()=>'<td class="box"></td>').join('')}<td class="note"></td></tr>`).join('');

    const w=window.open('','_blank');
    if(!w){ alert('Nettleseren blokkerte utskriftsvinduet. Tillat popup-vinduer og prøv igjen.'); return; }
    w.document.write(`<!doctype html><html lang="no"><head><meta charset="utf-8"><title>Vurderingsskjema – ${safe(session.activity)}</title><style>
      @page{size:A4 landscape;margin:9mm}
      body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:10px}
      h1{font-size:18px;margin:0 0 4px}.meta{margin-bottom:8px;font-size:11px}.legend{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px 12px;margin:7px 0 10px;font-size:8.5px}.legend-title{font-weight:700;margin-top:7px}.sheet{width:100%;border-collapse:collapse;table-layout:fixed}.sheet th,.sheet td{border:1px solid #777;padding:2px;text-align:center;height:24px}.sheet .name{text-align:left;width:110px;font-weight:600;padding-left:5px}.sheet .criterion{width:24px;font-size:8px}.sheet .box{width:24px}.sheet .note{width:120px}.sheet th.note{font-size:9px}.tip{margin-top:6px;font-size:8px;color:#444}.no-print{margin-top:12px}button{font-size:12px;padding:7px 10px}@media print{.no-print{display:none}}
    </style></head><body>
      <h1>Vurderingsskjema – Fysisk aktivitet og helse</h1>
      <div class="meta"><strong>Aktivitet:</strong> ${safe(session.activity)} &nbsp;&nbsp; <strong>Dato:</strong> ${safe(session.date)}</div>
      <div class="legend-title">Vurderingskriterier</div><div class="legend">${legend}</div>
      <table class="sheet"><thead><tr><th class="name">Elev</th>${head}<th class="note">Notat</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tip">Sett kryss, hake eller korte notater under kriteriene som eleven viser i timen.</div>
      <div class="no-print"><button onclick="window.print()">Skriv ut / lagre som PDF</button></div>
    </body></html>`);
    w.document.close();
    w.focus();
  }

  function addPrintButton(){
    const session=activeSession();
    const card=document.getElementById('activeLessonCard');
    if(!session||!card) return;
    const banner=card.querySelector('.session-banner');
    if(!banner||banner.querySelector('#printLessonSheetBtn')) return;
    const button=document.createElement('button');
    button.id='printLessonSheetBtn';
    button.textContent='Skriv ut vurderingsskjema';
    button.addEventListener('click',printAssessmentSheet);
    const existing=banner.querySelector('[data-go-register]');
    if(existing&&existing.parentElement===banner){
      const wrap=document.createElement('div');
      wrap.className='actions';
      existing.replaceWith(wrap);
      wrap.append(button,existing);
    }else banner.appendChild(button);
  }

  if(typeof renderLesson==='function'){
    const originalRenderLesson=renderLesson;
    renderLesson=function(){ originalRenderLesson(); addPrintButton(); };
  }
  document.addEventListener('click',()=>setTimeout(addPrintButton,0));
  setTimeout(addPrintButton,0);
})();