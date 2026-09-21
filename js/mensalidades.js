"use strict";
(() => {
  const params=new URLSearchParams(location.search);
  let filter=params.get("filtro")==="abertas"?"abertas":"Todas",studentId=params.get("aluno"),selected=null;
  const list=document.getElementById("payment-list");
  function render(){
    const s=Jene.summary();
    const focused=Jene.state.students.find(student=>String(student.id)===studentId);
    document.getElementById("payment-context").hidden=!studentId;
    document.getElementById("payment-context-name").textContent=focused?"Mensalidades de "+focused.name:"Aluno não encontrado";
    document.getElementById("finance-stats").innerHTML=Jene.stat("Previsto",Jene.money(s.expected),"","wallet")+Jene.stat("Recebido",Jene.money(s.received),"paid","check")+Jene.stat("Pendente",Jene.money(s.pending),"pending","clock")+Jene.stat("Em atraso",Jene.money(s.overdue),"overdue","alert");
    const students=Jene.state.students.filter(s=>s.status!=="Isento"&&(!studentId||String(s.id)===studentId)&&(filter==="Todas"||(filter==="abertas"?["Pendente","Atrasado"].includes(s.status):s.status===filter)));
    document.getElementById("payment-count").textContent=students.length+" mensalidades na amostra · Totais gerais ilustrativos";
    list.innerHTML=students.map(s=>'<article class="payment-card"><div class="student-row">'+Jene.identity(s)+'</div><div class="payment-details"><strong>'+Jene.money(s.amount)+'</strong><small>Vencimento: '+Jene.date(s.due)+'</small></div>'+Jene.badge(s.status,Jene.overdueText(s))+(s.status==="Pago"?'<p class="payment-date">'+Jene.icon('tick')+'Pago em '+Jene.date(s.paidAt)+'</p><button class="button secondary" data-pay="'+s.id+'">Editar pagamento</button><button class="button danger" data-undo="'+s.id+'">Desfazer pagamento</button>':'<p class="helper">Mensalidade de setembro</p><button class="button secondary" data-pay="'+s.id+'">'+Jene.icon('wallet')+'Registrar pagamento</button>')+'</article>').join("")||'<p class="empty">Nenhuma mensalidade neste filtro.</p>';
  }
  const items=[["Todas","Todas"],["Pago","Pagas"],["Pendente","Pendentes"],["Atrasado","Atrasadas"]];
  if(filter==="abertas")items.push(["abertas","Em aberto"]);
  Jene.filters(document.getElementById("payment-filters"),items,filter,value=>{filter=value;studentId=null;render();});
  const modal=Jene.dialog("payment-dialog"),input=document.getElementById("payment-date");
  input.max=Jene.localDate();
  list.addEventListener("click",e=>{
    const undo=e.target.closest("[data-undo]");
    if(undo){
      const student=Jene.state.students.find(s=>String(s.id)===undo.dataset.undo);
      Jene.confirmAction('Desfazer o pagamento de '+student.name+'? A mensalidade voltará a ficar em aberto.',()=>{
        if(!Jene.update(next=>{const s=next.students.find(s=>s.id===student.id);s.status=s.previousPaymentStatus||(s.due&&s.due<Jene.localDate()?"Atrasado":"Pendente");delete s.paidAt;delete s.previousPaymentStatus;}))return false;
        render();Jene.toast("Pagamento desfeito.");
      });return;
    }
    const button=e.target.closest("[data-pay]");if(!button)return;
    selected=Jene.state.students.find(s=>String(s.id)===button.dataset.pay);
    document.getElementById("payment-description").textContent=selected.name+" · "+selected.category+" · "+Jene.money(selected.amount);
    document.getElementById("payment-dialog-title").textContent=selected.status==="Pago"?"Editar pagamento":"Registrar pagamento";
    input.value=selected.status==="Pago"?selected.paidAt:Jene.localDate();modal.showModal();
  });
  document.getElementById("payment-form").addEventListener("submit",e=>{
    e.preventDefault();if(!selected||!input.reportValidity())return;
    if(!Jene.update(next=>{const s=next.students.find(s=>s.id===selected.id);if(s.status!=="Pago")s.previousPaymentStatus=s.status;s.status="Pago";s.paidAt=input.value;}))return;
    modal.close();render();Jene.toast("Pagamento salvo neste navegador.");
  });
  render();
})();

