"use strict";
(() => {
  let category="Todos",query="",editingId=null,selectedId=null;
  const list=document.getElementById("student-list"),form=document.getElementById("student-form");
  const modal=Jene.dialog("student-dialog"),details=Jene.dialog("student-details");
  const field=name=>form.elements.namedItem(name);
  const statusLabels={ativo:"Ativo",inativo:"Inativo",afastado:"Afastado"};
  const specialLabels={normal:"Normal",isento:"Isento",desconto:"Desconto",bolsa:"Bolsa"};
  const normalize=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  function render(){
    const students=Jene.state.students.filter(s=>(category==="Todos"||s.category===category)&&normalize(s.name).includes(normalize(query)));
    document.getElementById("active-count").textContent=Jene.summary().active+" alunos ativos · Total ilustrativo";
    document.getElementById("student-count").textContent=students.length+" alunos na amostra · Toque para ver os detalhes";
    list.innerHTML=students.map(s=>'<button type="button" class="student-row student-open" data-student="'+s.id+'" aria-label="Ver detalhes de '+Jene.escape(s.name)+'">'+Jene.identity(s)+'<span class="student-badges">'+Jene.badge(s.status)+'<span class="badge student-status">'+Jene.escape(statusLabels[s.statusAluno])+'</span></span><span class="row-arrow">'+Jene.icon('chevron')+'</span></button>').join("")||'<p class="empty">'+Jene.icon('search')+'Nenhum aluno encontrado. Tente outro nome ou categoria.</p>';
  }
  Jene.filters(document.getElementById("category-filters"),["Todos",...Jene.categories].map(c=>[c,c]),category,value=>{category=value;render();});
  document.getElementById("student-search").addEventListener("input",e=>{query=e.target.value.trim();render();});
  field("category").innerHTML='<option value="">Selecionar categoria</option>'+Jene.categories.map(c=>'<option>'+c+'</option>').join("");
  function updateAge(){
    const age=Jene.calculateAge(field("dataNascimento").value),minor=age!==null&&age<18;
    document.getElementById("student-age").textContent=age===null?"Idade calculada pelo nascimento.":"Idade: "+age+(age===1?" ano":" anos");
    ["responsavelNome","responsavelTelefone"].forEach(name=>{field(name).required=minor;field(name).setCustomValidity("");});
    form.querySelectorAll(".guardian-required").forEach(el=>{el.textContent=minor?" *":"";});
  }
  function updateDiscount(){
    const show=field("situacaoEspecial").value==="desconto";
    document.getElementById("discount-field").hidden=!show;
    field("valorComDesconto").disabled=!show;
  }
  function openForm(student=null){
    editingId=student?.id??null;form.reset();
    Array.from(form.elements).forEach(el=>{if(el.setCustomValidity)el.setCustomValidity("");});
    document.getElementById("student-dialog-title").textContent=student?"Editar aluno":"Novo aluno";
    field("dataNascimento").max=Jene.localDate();
    if(student){
      const values={name:student.name,category:student.category,dataNascimento:student.dataNascimento,telefone:student.telefone,statusAluno:student.statusAluno,
        responsavelNome:student.responsavel.nome,parentesco:student.responsavel.parentesco,responsavelTelefone:student.responsavel.telefone,telefoneAlternativo:student.responsavel.telefoneAlternativo,
        dataEntrada:student.dataEntrada,...student.mensalidade,observacoes:student.observacoes};
      Object.entries(values).forEach(([key,value])=>{if(field(key))field(key).value=value??"";});
    }
    updateAge();updateDiscount();modal.showModal();modal.scrollTop=0;document.getElementById("student-dialog-title").focus();
  }
  field("dataNascimento").addEventListener("input",updateAge);
  field("situacaoEspecial").addEventListener("change",updateDiscount);
  form.addEventListener("input",e=>{if(e.target.setCustomValidity)e.target.setCustomValidity("");});
  document.getElementById("new-student").addEventListener("click",()=>openForm());
  const valueOrDash=value=>value===null||value===undefined||value===""?"Não informado":String(value);
  function showDetails(student){
    selectedId=student.id;
    document.getElementById("student-details-title").textContent=student.name;
    const age=Jene.calculateAge(student.dataNascimento),fee=student.mensalidade;
    const rows=[
      ["Categoria",student.category],["Nascimento",student.dataNascimento?Jene.date(student.dataNascimento):""],
      ["Idade",age===null?"":age+(age===1?" ano":" anos")],["Status",statusLabels[student.statusAluno]],
      ["Responsável",student.responsavel.nome],["Parentesco",student.responsavel.parentesco],
      ["Telefone principal",student.responsavel.telefone],["Telefone alternativo",student.responsavel.telefoneAlternativo],
      ["Telefone do aluno",student.telefone],["Mensalidade",fee.valor===null?"":Jene.money(fee.valor)],
      ["Vencimento",fee.vencimento===null?"":"Dia "+fee.vencimento],["Situação especial",specialLabels[fee.situacaoEspecial]],
      ...(fee.situacaoEspecial==="desconto"?[["Valor com desconto",fee.valorComDesconto==null?"":Jene.money(fee.valorComDesconto)]]:[]),
      ["Número preferido",student.uniforme.numeroPreferido],["Camisa",student.uniforme.camisa],["Short",student.uniforme.short],
      ["Data de entrada",student.dataEntrada?Jene.date(student.dataEntrada):""]];
    document.getElementById("student-details-content").innerHTML='<dl class="student-detail-grid">'+rows.map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+Jene.escape(valueOrDash(value))+'</dd></div>').join("")+'</dl><section class="student-notes"><h3>Observações</h3><p>'+Jene.escape(student.observacoes||"Nenhuma observação.")+'</p></section>';
    document.getElementById("student-payments").href="mensalidades.html?aluno="+encodeURIComponent(student.id);
    details.showModal();details.scrollTop=0;document.getElementById("student-details-title").focus();
  }
  list.addEventListener("click",e=>{const button=e.target.closest("[data-student]");if(button)showDetails(Jene.state.students.find(s=>String(s.id)===button.dataset.student));});
  document.getElementById("edit-student").addEventListener("click",()=>{details.close();openForm(Jene.state.students.find(s=>s.id===selectedId));});
  document.getElementById("delete-student").addEventListener("click",()=>{
    const student=Jene.state.students.find(s=>s.id===selectedId);
    Jene.confirmAction('Excluir '+student.name+'? A mensalidade e as presenças deste aluno também serão removidas. O nome permanecerá nas convocações já salvas.',()=>{
      if(!Jene.deleteStudent(selectedId))return false;
      details.close();render();Jene.toast("Aluno excluído do armazenamento local.");
    });
  });
  form.addEventListener("submit",e=>{
    e.preventDefault();updateAge();
    const text=name=>field(name).value.trim(),number=name=>text(name)===""?null:Number(text(name));
    ["name","responsavelNome","responsavelTelefone"].forEach(name=>{if(field(name).required&&!text(name))field(name).setCustomValidity("Preencha este campo.");});
    if(Jene.calculateAge(text("dataNascimento"))===null)field("dataNascimento").setCustomValidity("Informe uma data de nascimento válida, até hoje.");
    if(!form.reportValidity())return;
    const previous=Jene.state.students.find(s=>s.id===editingId);
    const student={...previous,id:previous?.id??Date.now(),name:text("name"),category:text("category"),dataNascimento:text("dataNascimento"),telefone:text("telefone"),statusAluno:text("statusAluno"),
      responsavel:{nome:text("responsavelNome"),parentesco:text("parentesco"),telefone:text("responsavelTelefone"),telefoneAlternativo:text("telefoneAlternativo")},
      dataEntrada:text("dataEntrada"),
      mensalidade:{valor:number("valor"),vencimento:number("vencimento"),situacaoEspecial:text("situacaoEspecial"),...(text("situacaoEspecial")==="desconto"?{valorComDesconto:number("valorComDesconto")}: {})},observacoes:text("observacoes")};
    // A edição do cadastro não reescreve cobranças ou pagamentos existentes.
    if(!previous){
      student.status=student.mensalidade.situacaoEspecial==="isento"?"Isento":"Pendente";
      student.amount=student.status==="Isento"?0:student.mensalidade.valorComDesconto??student.mensalidade.valor??0;
      const day=student.mensalidade.vencimento;
      student.due=day?"2026-09-"+String(Math.min(day,30)).padStart(2,"0"):"";
    }
    const saved=Jene.saveStudent(student);if(!saved)return;
    modal.close();render();showDetails(saved);
    Jene.toast(previous?"Cadastro atualizado neste navegador.":"Aluno salvo neste navegador.");
  });
  render();if(new URLSearchParams(location.search).get("novo")==="1")openForm();
})();
