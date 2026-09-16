"use strict";
(() => {
  let category="Todos",query="";
  const list=document.getElementById("student-list");
  function render(){
    const normalize=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const students=Jene.state.students.filter(s=>(category==="Todos"||s.category===category)&&normalize(s.name).includes(normalize(query)));
    document.getElementById("active-count").textContent=Jene.summary().active+" alunos ativos";
    document.getElementById("student-count").textContent=students.length+" alunos na amostra · Total geral ilustrativo";
    list.innerHTML=students.map(s=>'<article class="student-row">'+Jene.identity(s)+Jene.badge(s.status)+'</article>').join("")||'<p class="empty">Nenhum aluno encontrado. Tente outro nome ou categoria.</p>';
  }
  Jene.filters(document.getElementById("category-filters"),["Todos",...Jene.categories].map(c=>[c,c]),category,value=>{category=value;render();});
  document.getElementById("student-search").addEventListener("input",e=>{query=e.target.value.trim();render();});
  const modal=Jene.dialog("student-dialog"),form=document.getElementById("student-form");
  document.getElementById("new-category").innerHTML=Jene.categories.map(c=>'<option>'+c+'</option>').join("");
  document.getElementById("new-student").addEventListener("click",()=>modal.showModal());
  form.elements.name.addEventListener("input",()=>form.elements.name.setCustomValidity(""));
  form.addEventListener("submit",e=>{
    e.preventDefault();const data=new FormData(form),name=data.get("name").trim();
    if(name.length<3){form.elements.name.setCustomValidity("Informe um nome com pelo menos 3 caracteres.");form.elements.name.reportValidity();return;}
    const status=data.get("status");
    Jene.state.students.push({id:Date.now(),name,category:data.get("category"),status,amount:status==="Isento"?0:100,due:status==="Atrasado"?"2026-09-10":"2026-09-20",...(status==="Pago"?{paidAt:Jene.localDate()}: {})});
    Jene.persist();form.reset();modal.close();
    query="";document.getElementById("student-search").value="";category="Todos";
    document.querySelectorAll("#category-filters button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.value===category)));
    render();Jene.toast("Aluno cadastrado nesta demonstração.");
  });
  render();if(new URLSearchParams(location.search).get("novo")==="1")modal.showModal();
})();

