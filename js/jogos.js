"use strict";
(() => {
  const form=document.getElementById("match-form"),list=document.getElementById("match-list");
  const modal=Jene.dialog("match-dialog"),details=Jene.dialog("match-details");
  const field=name=>form.elements.namedItem(name),text=name=>field(name).value.trim();
  const players=document.getElementById("callup-list"),selected=new Set();
  let editing=null,selectedMatch=null;
  const eligible=()=>Jene.state.students.filter(s=>s.statusAluno==="ativo"&&s.category===field("category").value);
  // Mantém convocações históricas ao editar informações do jogo.
  const choices=()=>{
    const current=eligible();
    if(editing&&editing.category===field("category").value)Jene.calledStudents(editing).forEach(player=>{
      if(!current.some(s=>String(s.id)===String(player.id)))current.push({...player,historical:true});
    });
    return Jene.sortStudents(current);
  };
  field("category").innerHTML='<option value="">Selecionar categoria</option>'+Jene.categories.map(c=>'<option>'+c+'</option>').join("");
  function error(name,message=""){
    const el=document.getElementById("error-"+name);el.textContent=message;el.hidden=!message;
    field(name).setAttribute("aria-invalid",String(Boolean(message)));
  }
  function count(){
    document.getElementById("callup-count").textContent="Convocados: "+selected.size+" de "+choices().length;
    if(selected.size)document.getElementById("error-callup").hidden=true;
  }
  function renderPlayers(){
    selected.clear();
    players.innerHTML=choices().map(s=>'<label class="callup-row"><input type="checkbox" value="'+Jene.escape(s.id)+'"><span><strong>'+Jene.escape(s.name)+'</strong><small>'+Jene.escape(s.category)+(s.historical?' · Convocação anterior; aluno indisponível':'')+'</small></span></label>').join("")||'<p class="empty">'+(field("category").value?'Nenhum jogador ativo nesta categoria.':'Selecione uma categoria para ver os jogadores.')+'</p>';
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
    document.getElementById("match-count").textContent=matches.length+" jogos salvos · Toque para ver a convocação";
    list.innerHTML=matches.map(m=>'<button type="button" class="payment-card match-card" data-match="'+Jene.escape(m.id)+'"><strong>JENE x '+Jene.escape(m.opponent)+'</strong><span class="badge">'+Jene.escape(m.category)+'</span><span>'+Jene.escape(Jene.date(m.date))+' · '+Jene.escape(m.matchTime)+'</span><span>'+Jene.escape(m.location)+'</span><span class="match-called">'+m.calledPlayers.length+' convocados '+Jene.icon("chevron")+'</span></button>').join("")||'<p class="empty">Nenhum jogo cadastrado. Toque em + Novo jogo para começar.</p>';
  }
  const matchInfo=m=>[["Adversário",m.opponent],["Categoria",m.category],["Data",Jene.date(m.date)],["Horário do jogo",m.matchTime],["Horário de chegada",m.arrivalTime],["Local",m.location],["Transporte",m.transport==="Outro"?m.transportOther:m.transport]];
  function showDetails(m){
    selectedMatch=m;
    document.getElementById("match-details-title").textContent="JENE x "+m.opponent;
    const rows=matchInfo(m);
    document.getElementById("match-details-content").innerHTML='<dl class="student-detail-grid">'+rows.map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+Jene.escape(v||"Não informado")+'</dd></div>').join("")+'</dl><section class="student-notes"><h3>Observações</h3><p>'+Jene.escape(m.notes||"Nenhuma observação.")+'</p></section><section class="match-roster"><h3>Convocados — '+m.calledPlayers.length+'</h3><ol>'+Jene.calledStudents(m).map(s=>'<li>'+Jene.escape(s.name)+'</li>').join("")+'</ol></section>';
    details.showModal();details.scrollTop=0;document.getElementById("match-details-title").focus();
  }
  list.addEventListener("click",e=>{const b=e.target.closest("[data-match]");if(b)showDetails(Jene.state.matches.find(m=>String(m.id)===b.dataset.match));});
  function openForm(match=null){
    editing=match;
    form.reset();form.querySelectorAll(".field-error").forEach(el=>{el.hidden=true;});
    form.querySelectorAll("[aria-invalid]").forEach(el=>el.removeAttribute("aria-invalid"));
    modal.querySelector(".dialog-feedback")?.remove();
    document.getElementById("match-title").textContent=match?"Editar jogo":"Novo jogo";
    if(match)Object.keys(match).forEach(name=>{if(field(name))field(name).value=match[name]??"";});
    transport();renderPlayers();
    if(match){match.calledPlayers.forEach(id=>selected.add(String(id)));players.querySelectorAll("input").forEach(input=>{input.checked=selected.has(input.value);});count();}
    modal.showModal();modal.scrollTop=0;document.getElementById("match-title").focus();
  }
  document.getElementById("new-match").addEventListener("click",()=>openForm());
  document.getElementById("export-match").addEventListener("click",()=>{
    const match=Jene.state.matches.find(m=>m.id===selectedMatch?.id);if(!match)return;
    const rows=[["JENE Gestão"],["Convocação"],[],...matchInfo(match).map(([label,value])=>[label,value||"Não informado"]),["Observações",match.notes||"Não informado"],[],["Convocados",match.calledPlayers.length],[],["Nº","Nome","Data de nascimento","Categoria"],...Jene.calledStudents(match).map((s,index)=>[index+1,s.name,Jene.calculateAge(s.dataNascimento)===null?"Não informado":Jene.date(s.dataNascimento),s.category])];
    const link=document.createElement("a");let url;
    try{
      url=URL.createObjectURL(new Blob([Jene.csv(rows)],{type:"text/csv;charset=utf-8;"}));
      link.href=url;link.download='convocacao-jene-'+Jene.filenamePart(match.opponent)+'-'+Jene.filenamePart(match.category)+'-'+Jene.filenamePart(match.date.split("-").reverse().join("-"))+'.csv';
      link.hidden=true;document.body.append(link);link.click();Jene.toast("Exportação da convocação iniciada.");
    }catch{Jene.toast("Não foi possível exportar a convocação. Tente novamente.");}
    finally{link.remove();if(url)setTimeout(()=>URL.revokeObjectURL(url),1000);}
  });
  document.getElementById("edit-match").addEventListener("click",()=>{details.close();openForm(selectedMatch);});
  document.getElementById("delete-match").addEventListener("click",()=>{
    Jene.confirmAction('Excluir o jogo contra '+selectedMatch.opponent+' e sua convocação?',()=>{
      if(!Jene.update(next=>{next.matches=next.matches.filter(m=>m.id!==selectedMatch.id);}))return false;
      details.close();render();Jene.toast("Jogo excluído do armazenamento local.");
    });
  });
  form.addEventListener("submit",e=>{
    e.preventDefault();let first=null;
    ["opponent","category","date","matchTime","location","transportOther"].forEach(name=>{
      const input=field(name),invalid=!input.disabled&&((input.required&&!text(name))||!input.checkValidity()||(name==="category"&&!Jene.categories.includes(text(name))));
      error(name,invalid?"Preencha este campo com um valor válido.":"");if(invalid&&!first)first=input;
    });
    const called=choices().filter(s=>selected.has(String(s.id)));
    document.getElementById("error-callup").hidden=called.length>0;
    if(first){first.focus();return;}
    if(!called.length){document.getElementById("error-callup").scrollIntoView({block:"center"});(players.querySelector("input")||field("category")).focus();return;}
    const match={id:editing?.id??Date.now().toString(36)+Math.random().toString(36).slice(2),...Object.fromEntries(["opponent","category","date","matchTime","arrivalTime","location","transport","transportOther","notes"].map(name=>[name,text(name)])),calledPlayers:called.map(s=>s.id),playerNames:Object.fromEntries(called.map(s=>[s.id,editing?.playerNames?.[s.id]||s.name]))};
    if(!Jene.saveMatch(match))return;
    modal.close();render();showDetails(match);Jene.toast("Jogo e convocação salvos neste navegador.");
  });
  render();
})();
