"use strict";
(() => {
  const date=Jene.localDate(),select=document.getElementById("attendance-category"),list=document.getElementById("attendance-list");
  let marks={},dirty=false;
  select.innerHTML=Jene.categories.map(c=>'<option'+(c==="Sub-13"?' selected':"")+'>'+c+'</option>').join("");
  document.getElementById("attendance-date").textContent=Jene.date(date);
  const students=()=>Jene.state.students.filter(s=>s.category===select.value);
  const key=()=>date+"_"+select.value;
  const drafts={};
  function totals(){
    const group=students(),present=group.filter(s=>marks[s.id]==="Presente").length,absent=group.filter(s=>marks[s.id]==="Ausente").length,remaining=group.length-present-absent;
    document.getElementById("attendance-totals").innerHTML='<span>Presentes: <strong>'+present+'</strong></span><span>Ausentes: <strong>'+absent+'</strong></span><span>A marcar: <strong>'+remaining+'</strong></span>';
    document.getElementById("save-attendance").disabled=remaining>0||group.length===0;
  }
  function render(){
    marks={...(drafts[key()]||Jene.state.attendance[key()]||{})};dirty=Boolean(drafts[key()]);
    document.getElementById("attendance-title").textContent="Turma "+select.value;
    document.getElementById("attendance-size").textContent=students().length+" alunos";
    list.innerHTML=students().map(s=>'<div class="attendance-row"><strong id="name-'+s.id+'">'+Jene.escape(s.name)+'</strong><div class="presence-options" role="group" aria-labelledby="name-'+s.id+'">'+["Presente","Ausente"].map(status=>'<label class="presence-option '+(status==="Ausente"?"absent":"")+'"><input type="radio" name="attendance-'+s.id+'" value="'+status+'" data-id="'+s.id+'" '+(marks[s.id]===status?"checked":"")+'><span>'+status+'</span></label>').join("")+'</div></div>').join("")||'<p class="empty">Nenhum aluno nesta categoria.</p>';
    document.getElementById("attendance-saved").textContent=dirty?"Há alterações ainda não salvas.":Jene.state.attendance[key()]?"Chamada salva nesta sessão. Você pode ajustar as presenças.":"Marque todos os alunos antes de salvar.";
    totals();
  }
  list.addEventListener("change",e=>{marks[e.target.dataset.id]=e.target.value;drafts[key()]={...marks};dirty=true;totals();document.getElementById("attendance-saved").textContent="Há alterações ainda não salvas.";});
  select.addEventListener("change",render);
  document.getElementById("save-attendance").addEventListener("click",()=>{
    if(students().some(s=>!marks[s.id]))return;
    Jene.state.attendance[key()]={...marks};Jene.persist();delete drafts[key()];dirty=false;
    document.getElementById("attendance-saved").textContent="Chamada salva nesta sessão. Você pode ajustar as presenças.";Jene.toast("Chamada de "+select.value+" salva na demonstração.");
  });
  window.addEventListener("beforeunload",e=>{if(Object.keys(drafts).length){e.preventDefault();e.returnValue="";}});
  render();
})();

