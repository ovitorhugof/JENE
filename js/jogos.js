"use strict";
(() => {
  const form=document.getElementById("match-form"),list=document.getElementById("match-list");
  const modal=Jene.dialog("match-dialog"),details=Jene.dialog("match-details");
  const field=name=>form.elements.namedItem(name),text=name=>field(name).value.trim();
  const players=document.getElementById("callup-list"),selected=new Set();
  const eligible=()=>Jene.state.students.filter(s=>s.statusAluno==="ativo"&&s.category===field("category").value);
  field("category").innerHTML='<option value="">Selecionar categoria</option>'+Jene.categories.map(c=>'<option>'+c+'</option>').join("");
  function error(name,message=""){
    const el=document.getElementById("error-"+name);el.textContent=message;el.hidden=!message;
    field(name).setAttribute("aria-invalid",String(Boolean(message)));
  }
  function count(){
    document.getElementById("callup-count").textContent="Convocados: "+selected.size+" de "+eligible().length;
    if(selected.size)document.getElementById("error-callup").hidden=true;
  }
  function renderPlayers(){
    selected.clear();
    players.innerHTML=eligible().map(s=>'<label class="callup-row"><input type="checkbox" value="'+Jene.escape(s.id)+'"><span><strong>'+Jene.escape(s.name)+'</strong><small>'+Jene.escape(s.category)+'</small></span></label>').join("")||'<p class="empty">'+(field("category").value?'Nenhum jogador ativo nesta categoria.':'Selecione uma categoria para ver os jogadores.')+'</p>';
    document.getElementById("error-callup").hidden=true;count();
  }
  field("category").addEventListener("change",renderPlayers);
  players.addEventListener("change",e=>{
    if(!e.target.matches('input[type="checkbox"]'))return;
    if(e.target.checked)selected.add(e.target.value);else selected.delete(e.target.value);count();
  });
  function transport(){
    const other=field("transport").value==="Outro";
    document.getElementById("custom-transport").hidden=!other;
    field("transportOther").disabled=!other;field("transportOther").required=other;
    if(!other){field("transportOther").value="";error("transportOther");}
  }
  field("transport").addEventListener("change",transport);
  form.addEventListener("input",e=>{if(document.getElementById("error-"+e.target.name))error(e.target.name);});
  function render(){
    const matches=[...Jene.state.matches].sort((a,b)=>(a.date+a.matchTime).localeCompare(b.date+b.matchTime));
    document.getElementById("match-count").textContent=matches.length+" jogos nesta sessão · Toque para ver a convocação";
    list.innerHTML=matches.map(m=>'<button type="button" class="payment-card match-card" data-match="'+Jene.escape(m.id)+'"><strong>JENE x '+Jene.escape(m.opponent)+'</strong><span class="badge">'+Jene.escape(m.category)+'</span><span>'+Jene.escape(Jene.date(m.date))+' · '+Jene.escape(m.matchTime)+'</span><span>'+Jene.escape(m.location)+'</span><span class="match-called">'+m.calledPlayers.length+' convocados '+Jene.icon("chevron")+'</span></button>').join("")||'<p class="empty">Nenhum jogo cadastrado. Toque em + Novo jogo para começar.</p>';
  }
  function showDetails(m){
    document.getElementById("match-details-title").textContent="JENE x "+m.opponent;
    const rows=[["Adversário",m.opponent],["Categoria",m.category],["Data",Jene.date(m.date)],["Horário do jogo",m.matchTime],["Horário de chegada",m.arrivalTime],["Local",m.location],["Transporte",m.transport==="Outro"?m.transportOther:m.transport]];
    document.getElementById("match-details-content").innerHTML='<dl class="student-detail-grid">'+rows.map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+Jene.escape(v||"Não informado")+'</dd></div>').join("")+'</dl><section class="student-notes"><h3>Observações</h3><p>'+Jene.escape(m.notes||"Nenhuma observação.")+'</p></section><section class="match-roster"><h3>Convocados — '+m.calledPlayers.length+'</h3><ol>'+m.calledPlayers.map(id=>{
      const snapshot=m.playerNames?.[id],student=Jene.state.students.find(s=>String(s.id)===String(id));
      return '<li>'+Jene.escape(snapshot||student?.name||"Jogador não disponível")+'</li>';
    }).join("")+'</ol></section>';
    details.showModal();details.scrollTop=0;document.getElementById("match-details-title").focus();
  }
  list.addEventListener("click",e=>{const b=e.target.closest("[data-match]");if(b)showDetails(Jene.state.matches.find(m=>String(m.id)===b.dataset.match));});
  document.getElementById("new-match").addEventListener("click",()=>{
    form.reset();form.querySelectorAll(".field-error").forEach(el=>{el.hidden=true;});
    form.querySelectorAll("[aria-invalid]").forEach(el=>el.removeAttribute("aria-invalid"));
    transport();renderPlayers();modal.showModal();modal.scrollTop=0;document.getElementById("match-title").focus();
  });
  form.addEventListener("submit",e=>{
    e.preventDefault();let first=null;
    ["opponent","category","date","matchTime","location","transportOther"].forEach(name=>{
      const input=field(name),invalid=!input.disabled&&((input.required&&!text(name))||!input.checkValidity()||(name==="category"&&!Jene.categories.includes(text(name))));
      error(name,invalid?"Preencha este campo com um valor válido.":"");if(invalid&&!first)first=input;
    });
    const called=eligible().filter(s=>selected.has(String(s.id)));
    document.getElementById("error-callup").hidden=called.length>0;
    if(first){first.focus();return;}
    if(!called.length){document.getElementById("error-callup").scrollIntoView({block:"center"});(players.querySelector("input")||field("category")).focus();return;}
    const match={id:Date.now().toString(36)+Math.random().toString(36).slice(2),...Object.fromEntries(["opponent","category","date","matchTime","arrivalTime","location","transport","transportOther","notes"].map(name=>[name,text(name)])),calledPlayers:called.map(s=>s.id),playerNames:Object.fromEntries(called.map(s=>[s.id,s.name]))};
    Jene.state.matches.push(match);
    const persisted=Jene.persist();modal.close();render();showDetails(match);
    if(persisted)Jene.toast("Jogo e convocação salvos nesta sessão.");
    else document.getElementById("match-details-content").insertAdjacentHTML("afterbegin",'<p class="field-error" role="alert">Armazenamento indisponível. Este jogo está disponível apenas nesta página e será perdido ao sair ou recarregar.</p>');
  });
  render();
})();
