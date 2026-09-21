"use strict";
// Melhorias de apresentação compartilhadas, sem dependências externas.
(() => {
  const page=document.body.dataset.page;
  const titles={index:"Visão geral",alunos:"Alunos",mensalidades:"Mensalidades",chamada:"Chamada",jogos:"Jogos"};
  const header=document.querySelector(".header-inner");
  const context=document.createElement("div");
  context.className="header-context";
  context.innerHTML='<span>Área de gestão</span>'+Jene.icon("chevron")+'<strong>'+titles[page]+'</strong>';
  header.querySelector(".brand").after(context);
  const nav=document.getElementById("main-nav");
  nav.insertAdjacentHTML("beforeend",'<a class="nav-link desktop-games" href="jogos.html" '+(page==="jogos"?'aria-current="page"':'')+'>'+Jene.icon("calendar")+'<span>Jogos</span></a>');
  nav.insertAdjacentHTML("afterbegin",'<span class="nav-caption">PRINCIPAL</span>');
  nav.insertAdjacentHTML("beforeend",'<div class="nav-footer">'+Jene.icon("shield")+'<strong>Seu time bem cuidado.</strong><p>Mais organização fora de campo.<br>Mais futebol dentro dele.</p><span>JENE Gestão · Demonstração</span></div>');
  document.querySelectorAll(".close-dialog").forEach(button=>{if(button.classList.contains("icon-button"))button.innerHTML=Jene.icon("close");});
  const addIcon=(selector,name)=>document.querySelectorAll(selector).forEach(el=>el.insertAdjacentHTML("afterbegin",Jene.icon(name)));
  addIcon("#edit-student","edit");addIcon("#student-payments","wallet");addIcon('.details-actions a[href="chamada.html"]',"check");
  addIcon('#student-form button[type="submit"]',"tick");addIcon('#payment-form button[type="submit"]',"tick");
  document.querySelectorAll("#student-form legend").forEach((el,index)=>el.insertAdjacentHTML("afterbegin",Jene.icon(["users","shield","calendar","wallet","note"][index])));
  document.querySelectorAll(".month:not([data-icon])").forEach(el=>el.insertAdjacentHTML("afterbegin",Jene.icon("calendar")));
  document.querySelectorAll(".quick-action").forEach((el,index)=>{
    const label=el.children[1];
    label.className="quick-copy";
    label.insertAdjacentHTML("beforeend",'<small>'+["Acompanhe os recebimentos","Registre a presença da turma","Traga mais um atleta para o time","Organize os jogos e as convocações"][index]+'</small>');
    el.lastElementChild.innerHTML=Jene.icon("arrow");
  });
  if(page==="index"){
    const summary=Jene.summary(),percent=summary.expected>0?Math.min(100,Math.round(summary.received/summary.expected*100)):0;
    document.querySelector(".income").insertAdjacentHTML("beforeend",'<div class="income-progress"><div><span>Do total previsto</span><strong>'+percent+'%</strong></div><progress max="100" value="'+percent+'" aria-label="Percentual recebido do total previsto"></progress><p>Previsto: '+Jene.money(summary.expected)+' · Totais ilustrativos</p><a href="mensalidades.html">Acompanhar mensalidades '+Jene.icon("arrow")+'</a></div>');
  }
  const search=document.getElementById("student-search");
  if(search){
    const clear=document.createElement("button");clear.type="button";clear.className="icon-button clear-search";clear.setAttribute("aria-label","Limpar busca");clear.innerHTML=Jene.icon("close");clear.hidden=!search.value;
    // O botão fica fora do label para manter a semântica do campo.
    const wrapper=document.createElement("div");wrapper.className="search-wrap";search.parentElement.before(wrapper);wrapper.append(search.parentElement,clear);
    search.addEventListener("input",()=>{clear.hidden=!search.value;});
    clear.addEventListener("click",()=>{search.value="";search.dispatchEvent(new Event("input",{bubbles:true}));search.focus();});
  }
})();
