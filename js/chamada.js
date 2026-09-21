"use strict";
(() => {
  const date=document.getElementById("attendance-date"),select=document.getElementById("attendance-category"),list=document.getElementById("attendance-list");
  let marks={},dirty=false;
  select.innerHTML=Jene.categories.map(c=>'<option'+(c==="Sub-13"?' selected':"")+'>'+c+'</option>').join("");
  date.value=Jene.localDate();
  const students=()=>Jene.sortStudents(Jene.state.students.filter(s=>s.category===select.value));
  const key=()=>date.value+"_"+select.value;
  const drafts={};
  function totals(){
    const group=students(),present=group.filter(s=>marks[s.id]==="Presente").length,absent=group.filter(s=>marks[s.id]==="Ausente").length,remaining=group.length-present-absent;
    document.getElementById("attendance-totals").innerHTML='<span>Presentes: <strong>'+present+'</strong></span><span>Ausentes: <strong>'+absent+'</strong></span><span>A marcar: <strong>'+remaining+'</strong></span>';
    document.getElementById("save-attendance").disabled=remaining>0||group.length===0||!date.value;
    document.getElementById("attendance-progress").innerHTML='<p>'+ (group.length-remaining)+' de '+group.length+' alunos marcados</p><progress max="'+(group.length||1)+'" value="'+(group.length-remaining)+'" aria-label="Progresso da chamada"></progress>';
  }
  function render(){
    marks={...(drafts[key()]||Jene.state.attendance[key()]||{})};dirty=Boolean(drafts[key()]);
    document.getElementById("attendance-title").textContent="Turma "+select.value;
    document.getElementById("attendance-size").textContent=students().length+" alunos";
    list.innerHTML=students().map(s=>'<div class="attendance-row"><strong id="name-'+s.id+'">'+Jene.escape(s.name)+'</strong><div class="presence-options" role="group" aria-labelledby="name-'+s.id+'">'+["Presente","Ausente"].map(status=>'<label class="presence-option '+(status==="Ausente"?"absent":"")+'"><input type="radio" name="attendance-'+s.id+'" value="'+status+'" data-id="'+s.id+'" '+(marks[s.id]===status?"checked":"")+'><span>'+Jene.icon(status==="Presente"?"tick":"close")+status+'</span></label>').join("")+'</div></div>').join("")||'<p class="empty">Nenhum aluno nesta categoria.</p>';
    document.getElementById("attendance-saved").textContent=dirty?"Há alterações ainda não salvas.":Jene.state.attendance[key()]?"Chamada salva neste navegador. Você pode ajustar as presenças.":"Marque todos os alunos antes de salvar.";
    document.getElementById("delete-attendance").hidden=!Jene.state.attendance[key()];
    totals();
  }
  list.addEventListener("change",e=>{marks[e.target.dataset.id]=e.target.value;drafts[key()]={...marks};dirty=true;totals();document.getElementById("attendance-saved").textContent="Há alterações ainda não salvas.";});
  select.addEventListener("change",render);
  date.addEventListener("change",render);
  document.getElementById("save-attendance").addEventListener("click",()=>{
    if(!date.reportValidity()||!students().length||students().some(s=>!marks[s.id]))return;
    if(!Jene.update(next=>{next.attendance[key()]={...marks};}))return;
    delete drafts[key()];dirty=false;render();Jene.toast("Chamada de "+select.value+" salva neste navegador.");
  });
  document.getElementById("delete-attendance").addEventListener("click",()=>{
    const selectedKey=key();
    Jene.confirmAction('Excluir a chamada de '+select.value+' em '+Jene.date(date.value)+'?',()=>{
      if(!Jene.update(next=>{delete next.attendance[selectedKey];}))return false;
      delete drafts[selectedKey];render();Jene.toast("Chamada excluída.");
    });
  });
  window.addEventListener("beforeunload",e=>{if(Object.keys(drafts).length){e.preventDefault();e.returnValue="";}});
  render();
})();
