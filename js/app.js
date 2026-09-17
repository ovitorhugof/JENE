"use strict";
window.Jene = (() => {
  const categories = ["Sub-9", "Sub-11", "Sub-13", "Sub-15", "Sub-17"];
  const seed = [
    {id:1,name:"Carlos Eduardo",category:"Sub-13",status:"Atrasado",amount:100,due:"2026-09-04"},
    {id:2,name:"João Vitor",category:"Sub-11",status:"Atrasado",amount:100,due:"2026-09-10"},
    {id:3,name:"Matheus Lima",category:"Sub-15",status:"Pendente",amount:100,due:"2026-09-20"},
    {id:4,name:"Pedro Henrique",category:"Sub-13",status:"Pago",amount:100,due:"2026-09-10",paidAt:"2026-09-08"},
    {id:5,name:"Lucas Gabriel",category:"Sub-9",status:"Pago",amount:100,due:"2026-09-10",paidAt:"2026-09-08"},
    {id:6,name:"Rafael Santos",category:"Sub-17",status:"Pendente",amount:100,due:"2026-09-20"},
    {id:7,name:"Gabriel Oliveira",category:"Sub-13",status:"Isento",amount:0,due:"2026-09-10"},
    {id:8,name:"Davi Souza",category:"Sub-11",status:"Pago",amount:100,due:"2026-09-10",paidAt:"2026-09-08"},
    {id:9,name:"Miguel Costa",category:"Sub-15",status:"Pago",amount:100,due:"2026-09-10",paidAt:"2026-09-08"},
    {id:10,name:"Arthur Ribeiro",category:"Sub-13",status:"Pendente",amount:100,due:"2026-09-20"}
  ];
  // Cadastro independente da cobrança demonstrativa (status, amount, due).
  const birthdays = ["2013-06-12","2015-04-23","2011-08-05","2013-03-14","2017-07-19","2009-11-02","2013-01-30","2015-09-08","2011-12-15","2013-05-21"];
  function normalizeStudent(s) {
    return {...s, dataNascimento:s.dataNascimento || "", telefone:s.telefone || "",
      statusAluno:s.statusAluno || "ativo", dataEntrada:s.dataEntrada || "",
      responsavel:{nome:"",parentesco:"",telefone:"",telefoneAlternativo:"",...s.responsavel},
      uniforme:{numeroPreferido:null,camisa:"",short:"",...s.uniforme},
      mensalidade:{valor:s.amount ?? null,vencimento:s.due ? Number(s.due.slice(-2)) : null,
        situacaoEspecial:s.status === "Isento" ? "isento" : "normal",...s.mensalidade},
      observacoes:s.observacoes || ""};
  }
  seed.forEach((s,i)=>Object.assign(s,normalizeStudent({...s,dataNascimento:birthdays[i],
    dataEntrada:"2025-02-10",responsavel:{nome:["Ana","Marcos","Juliana","Marcos","Cláudia","Paulo","Fernanda","Renata","José","Luciana"][i]+" "+s.name.split(" ").pop(),
      parentesco:i%2 ? "Pai" : "Mãe",telefone:"(35) 99999-"+String(1000+i)},
    uniforme:{numeroPreferido:i+7,camisa:i%2 ? "P" : "Infantil 14",short:"P"}})));
  const key = "jene-demo-v1";
  let state = {students:seed.map(s=>({...s})), attendance:{}};
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (saved && Array.isArray(saved.students) && saved.attendance) state = saved;
  } catch { /* A demonstração também funciona sem armazenamento disponível. */ }
  // Migra cadastros antigos sem inventar nascimento ou responsável.
  state.students = state.students.map(normalizeStudent);
  const calculateAge = (value, today = new Date()) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year,month,day] = value.split("-").map(Number);
    const birth = new Date(value+"T12:00:00");
    if (birth.getFullYear()!==year || birth.getMonth()!==month-1 || birth.getDate()!==day) return null;
    let age=today.getFullYear()-year;
    if (today.getMonth()+1<month || (today.getMonth()+1===month && today.getDate()<day)) age--;
    return age<0 ? null : age;
  };
  // Ponto único de gravação do cadastro para uma futura fonte de dados.
  function saveStudent(student) {
    const index=state.students.findIndex(s=>s.id===student.id);
    const normalized=normalizeStudent(student);
    if(index<0)state.students.push(normalized);else state.students[index]=normalized;
    persist();return normalized;
  }
  const persist = () => {
    try { sessionStorage.setItem(key, JSON.stringify(state)); }
    catch { toast("Armazenamento indisponível. Alterações válidas apenas nesta página."); }
  };
  const escape = value => String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = value => value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const localDate = () => { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"); };
  const date = value => value ? new Date(value+"T12:00:00").toLocaleDateString("pt-BR") : "Não informado";
  const statusClass = value => ({Pago:"paid",Pendente:"pending",Atrasado:"overdue",Isento:"exempt"}[value] || "");
  const badge = (value,text=value) => '<span class="badge '+statusClass(value)+'">'+escape(text)+'</span>';
  const initials = name => name.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join("");
  const identity = s => '<span class="avatar" aria-hidden="true">'+escape(initials(s.name))+'</span><div class="student-info"><strong>'+escape(s.name)+'</strong><small>'+escape(s.category)+'</small></div>';
  const paths = {
    arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2"/>',
    tick:'<path d="m5 12 4 4L19 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z"/>',
    shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    note:'<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h5"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8V5a2 2 0 0 1 2-2h12m4 8h-6v5h6m-3-2.5h.01"/>',
    check:'<rect x="4" y="3" width="16" height="19" rx="2"/><path d="M9 3v3h6V3m-7 11 3 3 5-6"/>',
    userplus:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2m4-13v6m-3-3h6"/>',
    search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert:'<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3h.01"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.check)+'</svg>';
  function toast(message) {
    const el=document.getElementById("toast"); el.textContent=message; el.hidden=false;
    clearTimeout(toast.timer); toast.timer=setTimeout(()=>{el.hidden=true;},4500);
  }
  function summary() {
    const result={active:87,Pago:63,Pendente:14,Atrasado:10,expected:8700,received:6300,pending:1400,overdue:1000};
    const adjust=(s,direction)=>{
      if(s.status!=="Isento") { result[s.status]+=direction; result.expected+=direction*s.amount; }
      if(s.status==="Pago")result.received+=direction*s.amount;
      if(s.status==="Pendente")result.pending+=direction*s.amount;
      if(s.status==="Atrasado")result.overdue+=direction*s.amount;
    };
    seed.forEach(s=>adjust(s,-1)); state.students.forEach(s=>adjust(s,1));
    result.active+=state.students.filter(s=>s.statusAluno==="ativo").length-seed.length;
    return result;
  }
  const stat=(label,value,type="",symbol="users")=>'<div class="stat '+type+'"><span class="stat-symbol">'+icon(symbol)+'</span><span class="stat-label">'+label+'</span><strong>'+value+'</strong><small class="stat-hint">'+(symbol==="users"?'Total ilustrativo':'Neste mês · demonstração')+'</small></div>';
  const overdueText=s=>s.status==="Atrasado"?"Atrasado há "+Math.max(0,Math.round((new Date("2026-09-16T12:00:00")-new Date(s.due+"T12:00:00"))/86400000))+" dias":s.status;
  function filters(element,items,selected,callback) {
    element.innerHTML=items.map(([value,label])=>'<button class="filter" type="button" data-value="'+escape(value)+'" aria-pressed="'+(value===selected)+'">'+escape(label)+'</button>').join("");
    element.addEventListener("click",e=>{
      const button=e.target.closest("button");if(!button)return;
      element.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));callback(button.dataset.value);
    });
  }
  function dialog(id) {
    const el=document.getElementById(id);
    el.querySelectorAll(".close-dialog").forEach(b=>b.addEventListener("click",()=>el.close()));
    return el;
  }
  return {categories,state,persist,saveStudent,calculateAge,escape,money,date,localDate,badge,identity,icon,toast,summary,stat,overdueText,filters,dialog};
})();
document.querySelectorAll("[data-icon]").forEach(el=>{el.innerHTML=Jene.icon(el.dataset.icon);});
const navItems=[["index","Início","home"],["alunos","Alunos","users"],["mensalidades","Mensalidades","wallet"],["chamada","Chamada","check"]];
document.getElementById("main-nav").innerHTML=navItems.map(([path,label,icon])=>'<a class="nav-link" href="'+path+'.html" '+(document.body.dataset.page===path?'aria-current="page"':'')+'>'+Jene.icon(icon)+'<span>'+label+'</span></a>').join("");
if(document.body.dataset.page==="index"){
  const s=Jene.summary();
  document.getElementById("home-stats").innerHTML=Jene.stat("Alunos ativos",s.active)+Jene.stat("Pagos",s.Pago,"paid","check")+Jene.stat("Pendentes",s.Pendente,"pending","clock")+Jene.stat("Atrasados",s.Atrasado,"overdue","alert");
  document.getElementById("income-value").textContent=Jene.money(s.received);
  const attention=Jene.state.students.filter(s=>["Atrasado","Pendente"].includes(s.status)).slice(0,3);
  document.getElementById("attention-list").innerHTML=attention.map(s=>'<a class="student-row" href="mensalidades.html?aluno='+s.id+'" aria-label="Ver mensalidade de '+Jene.escape(s.name)+'">'+Jene.identity(s)+Jene.badge(s.status,Jene.overdueText(s))+'</a>').join("")||'<p class="empty">Nenhuma mensalidade precisa de atenção nesta amostra.</p>';
}
