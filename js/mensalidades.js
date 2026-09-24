"use strict";
Jene.ready.then(async () => {
  const params = new URLSearchParams(location.search), list = document.getElementById("payment-list"), monthInput = document.getElementById("payment-month");
  let filter = params.get("filtro") === "abertas" ? "abertas" : "Todas", studentId = params.get("aluno"), selected = null, payments = [], loadNumber = 0;
  monthInput.value = /^\d{4}-\d{2}$/.test(params.get("mes") || "") ? params.get("mes") : JenePaymentsService.currentMonth().slice(0, 7);
  const studentFor = payment => Jene.students.find(student => String(student.id) === String(payment.studentId));
  const totals = () => payments.reduce((result, payment) => { result.expected += payment.amount; if (payment.status === "Pago") result.received += payment.paidAmount || 0; if (payment.status === "Pendente") result.pending += payment.amount; if (payment.status === "Atrasado") result.overdue += payment.amount; return result; }, { expected: 0, received: 0, pending: 0, overdue: 0 });
  function render() {
    const summary = totals(), focused = Jene.students.find(student => String(student.id) === studentId);
    document.getElementById("payment-heading-month").textContent = Jene.monthLabel(monthInput.value + "-01");
    document.getElementById("payment-context").hidden = !studentId; document.getElementById("payment-context-name").textContent = focused ? "Mensalidades de " + focused.name : "Aluno não encontrado";
    document.getElementById("finance-stats").innerHTML = Jene.stat("Previsto", Jene.money(summary.expected), "", "wallet") + Jene.stat("Recebido", Jene.money(summary.received), "paid", "check") + Jene.stat("Pendente", Jene.money(summary.pending), "pending", "clock") + Jene.stat("Em atraso", Jene.money(summary.overdue), "overdue", "alert");
    const shown = payments.filter(payment => (!studentId || String(payment.studentId) === studentId) && (filter === "Todas" || (filter === "abertas" ? ["Pendente", "Atrasado"].includes(payment.status) : payment.status === filter)));
    document.getElementById("payment-count").textContent = shown.length + (shown.length === 1 ? " mensalidade" : " mensalidades") + " neste filtro";
    list.innerHTML = shown.map(payment => { const student = studentFor(payment); if (!student) return ""; const action = payment.status === "Pago" ? '<p class="payment-date">' + Jene.icon("tick") + "Pago em " + Jene.date(payment.paidAt) + " · " + Jene.money(payment.paidAmount) + '</p><button class="button secondary" data-pay="' + payment.id + '">Editar pagamento</button><button class="button danger" data-undo="' + payment.id + '">Desfazer pagamento</button>' : payment.status === "Isento" ? '<p class="helper">Mensalidade isenta</p>' : '<p class="helper">Referência: ' + Jene.monthLabel(payment.referenceMonth) + '</p><button class="button secondary" data-pay="' + payment.id + '">' + Jene.icon("wallet") + "Registrar pagamento</button>"; return '<article class="payment-card"><div class="student-row">' + Jene.identity(student) + '</div><div class="payment-details"><strong>' + Jene.money(payment.amount) + "</strong><small>Vencimento: " + Jene.date(payment.due) + "</small></div>" + Jene.badge(payment.status, Jene.overdueText(payment)) + action + "</article>"; }).join("") || '<p class="empty">Nenhuma mensalidade neste filtro.</p>';
  }
  async function load() {
    const currentLoad = ++loadNumber;
    list.innerHTML = '<p class="empty">Carregando mensalidades...</p>';
    try { const loaded = await JenePaymentsService.getPaymentsByMonth(monthInput.value); if (currentLoad !== loadNumber) return; payments = loaded; render(); }
    catch (error) { if (currentLoad !== loadNumber) return; list.innerHTML = '<p class="empty">' + Jene.escape(error.message) + "</p>"; Jene.toast(error.message); }
  }
  const items = [["Todas", "Todas"], ["Pago", "Pagas"], ["Pendente", "Pendentes"], ["Atrasado", "Atrasadas"], ["Isento", "Isentas"], ["abertas", "Em aberto"]];
  Jene.filters(document.getElementById("payment-filters"), items, filter, value => { filter = value; studentId = null; render(); });
  const modal = Jene.dialog("payment-dialog"), dateInput = document.getElementById("payment-date"), amountInput = document.getElementById("payment-amount"), submit = document.querySelector('#payment-form button[type="submit"]'); dateInput.max = Jene.localDate();
  list.addEventListener("click", event => {
    const undo = event.target.closest("[data-undo]");
    if (undo) { const payment = payments.find(item => String(item.id) === undo.dataset.undo), student = studentFor(payment); Jene.confirmAction("Desfazer o pagamento de " + student.name + "? A mensalidade voltará a ficar em aberto.", async () => { try { await JenePaymentsService.reopenPayment(payment.id); await load(); Jene.toast("Pagamento desfeito."); } catch (error) { Jene.toast(error.message); return false; } }); return; }
    const button = event.target.closest("[data-pay]"); if (!button) return; selected = payments.find(item => String(item.id) === button.dataset.pay); const student = studentFor(selected);
    document.getElementById("payment-description").textContent = student.name + " · " + student.category + " · " + Jene.money(selected.amount); document.getElementById("payment-dialog-title").textContent = selected.status === "Pago" ? "Editar pagamento" : "Registrar pagamento";
    dateInput.value = selected.paidAt || Jene.localDate(); amountInput.value = selected.paidAmount ?? selected.amount; modal.showModal();
  });
  document.getElementById("payment-form").addEventListener("submit", async event => { event.preventDefault(); if (!selected || !event.currentTarget.reportValidity()) return; submit.disabled = true; try { await JenePaymentsService.markPaid(selected.id, { paidDate: dateInput.value, paidAmount: amountInput.value }); modal.close(); await load(); Jene.toast("Pagamento salvo no Supabase."); } catch (error) { Jene.toast(error.message); } finally { submit.disabled = false; } });
  function changeMonth(offset) { const [year, month] = monthInput.value.split("-").map(Number), next = new Date(year, month - 1 + offset, 1); monthInput.value = next.getFullYear() + "-" + String(next.getMonth() + 1).padStart(2, "0"); monthInput.dispatchEvent(new Event("change")); }
  document.getElementById("previous-month").onclick = () => changeMonth(-1); document.getElementById("next-month").onclick = () => changeMonth(1);
  monthInput.addEventListener("change", () => { const url = new URL(location.href); url.searchParams.set("mes", monthInput.value); history.replaceState(null, "", url); load(); });
  document.getElementById("generate-payments").addEventListener("click", async event => { const button = event.currentTarget, previous = document.getElementById("previous-month"), next = document.getElementById("next-month"), reference = monthInput.value; button.disabled = true; previous.disabled = true; next.disabled = true; monthInput.disabled = true; try { const result = await JenePaymentsService.generatePaymentsForMonth(reference); await load(); let message = result.created + (result.created === 1 ? " mensalidade criada." : " mensalidades criadas."); if (result.skipped.length) message += " " + result.skipped.length + " aluno(s) foram ignorados por cadastro financeiro incompleto."; if (result.scholarshipCount) message += " Bolsas mantiveram o valor integral configurado, conforme o comportamento anterior."; Jene.toast(message); } catch (error) { Jene.toast(error.message); } finally { button.disabled = false; previous.disabled = false; next.disabled = false; monthInput.disabled = false; } });
  await load();
});
