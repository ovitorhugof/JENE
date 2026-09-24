"use strict";

Jene.ready.then(() => {
  let category = "Todos";
  let query = "";
  let editingId = null;
  let selectedId = null;
  let saving = false;
  const list = document.getElementById("student-list");
  const form = document.getElementById("student-form");
  const submitButton = form.querySelector('button[type="submit"]');
  const modal = Jene.dialog("student-dialog");
  const details = Jene.dialog("student-details");
  const field = name => form.elements.namedItem(name);
  const statusLabels = { ativo: "Ativo", inativo: "Inativo", afastado: "Afastado" };
  const specialLabels = { normal: "Normal", isento: "Isento", desconto: "Desconto", bolsa: "Bolsa" };
  const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  function render() {
    if (Jene.dataError) {
      document.getElementById("active-count").textContent = "Cadastro indisponível";
      document.getElementById("student-count").textContent = "Não foi possível carregar a lista.";
      list.innerHTML = '<p class="empty">Não foi possível carregar os alunos. Verifique sua conexão e recarregue a página.</p>';
      return;
    }
    const students = Jene.sortStudents(
      Jene.students.filter(student => (category === "Todos" || student.category === category) && normalize(student.name).includes(normalize(query))),
      document.getElementById("student-sort").value
    );
    const active = Jene.students.filter(student => student.statusAluno === "ativo").length;
    document.getElementById("active-count").textContent = active + (active === 1 ? " aluno ativo" : " alunos ativos");
    document.getElementById("student-count").textContent = students.length + (students.length === 1 ? " aluno" : " alunos") + " · Toque para ver os detalhes";
    list.innerHTML = students.map(student => '<button type="button" class="student-row student-open" data-student="' + Jene.escape(student.id) + '" aria-label="Ver detalhes de ' + Jene.escape(student.name) + '">' + Jene.identity(student) + '<span class="student-badges"><span class="badge student-status">' + Jene.escape(statusLabels[student.statusAluno] || student.statusAluno) + '</span></span><span class="row-arrow">' + Jene.icon("chevron") + "</span></button>").join("") || '<p class="empty">' + Jene.icon("users") + (Jene.students.length ? "Nenhum aluno encontrado. Tente outro nome ou categoria." : "Nenhum aluno cadastrado. Use “Novo aluno” para começar.") + "</p>";
  }

  Jene.filters(document.getElementById("category-filters"), ["Todos", ...Jene.categories].map(value => [value, value]), category, value => { category = value; render(); });
  document.getElementById("student-search").addEventListener("input", event => { query = event.target.value.trim(); render(); });
  document.getElementById("student-sort").addEventListener("change", render);
  field("category").innerHTML = '<option value="">Selecionar categoria</option>' + Jene.categoryRecords.map(item => '<option value="' + Jene.escape(item.id) + '">' + Jene.escape(item.name) + "</option>").join("");

  function updateAge() {
    const age = Jene.calculateAge(field("dataNascimento").value);
    const minor = age !== null && age < 18;
    document.getElementById("student-age").textContent = age === null ? "Idade calculada pelo nascimento." : "Idade: " + age + (age === 1 ? " ano" : " anos");
    ["responsavelNome", "responsavelTelefone"].forEach(name => { field(name).required = minor; field(name).setCustomValidity(""); });
    form.querySelectorAll(".guardian-required").forEach(element => { element.textContent = minor ? " *" : ""; });
  }

  function updateDiscount() {
    const show = field("situacaoEspecial").value === "desconto";
    document.getElementById("discount-field").hidden = !show;
    field("valorComDesconto").disabled = !show;
  }

  function openForm(student = null) {
    editingId = student?.id ?? null;
    form.reset();
    Array.from(form.elements).forEach(element => { if (element.setCustomValidity) element.setCustomValidity(""); });
    document.getElementById("student-dialog-title").textContent = student ? "Editar aluno" : "Novo aluno";
    field("dataNascimento").max = Jene.localDate();
    if (student) {
      const values = {
        name: student.name, category: student.categoryId, dataNascimento: student.dataNascimento,
        telefone: student.telefone, statusAluno: student.statusAluno,
        responsavelNome: student.responsavel.nome, parentesco: student.responsavel.parentesco,
        responsavelTelefone: student.responsavel.telefone, telefoneAlternativo: student.responsavel.telefoneAlternativo,
        dataEntrada: student.dataEntrada, ...student.mensalidade,
        numeroPreferido: student.uniforme.numeroPreferido, camisa: student.uniforme.camisa,
        short: student.uniforme.short, observacoes: student.observacoes
      };
      Object.entries(values).forEach(([key, value]) => { if (field(key)) field(key).value = value ?? ""; });
    }
    updateAge();
    updateDiscount();
    modal.showModal();
    modal.scrollTop = 0;
    document.getElementById("student-dialog-title").focus();
  }

  field("dataNascimento").addEventListener("input", updateAge);
  field("situacaoEspecial").addEventListener("change", updateDiscount);
  form.addEventListener("input", event => { if (event.target.setCustomValidity) event.target.setCustomValidity(""); });
  document.getElementById("new-student").addEventListener("click", () => openForm());
  const valueOrDash = value => value === null || value === undefined || value === "" ? "Não informado" : String(value);

  function showDetails(student) {
    if (!student) return;
    selectedId = student.id;
    document.getElementById("student-details-title").textContent = student.name;
    const age = Jene.calculateAge(student.dataNascimento);
    const fee = student.mensalidade;
    const rows = [
      ["Categoria", student.category], ["Nascimento", student.dataNascimento ? Jene.date(student.dataNascimento) : ""],
      ["Idade", age === null ? "" : age + (age === 1 ? " ano" : " anos")], ["Status", statusLabels[student.statusAluno]],
      ["Responsável", student.responsavel.nome], ["Parentesco", student.responsavel.parentesco],
      ["Telefone principal", student.responsavel.telefone], ["Telefone alternativo", student.responsavel.telefoneAlternativo],
      ["Telefone do aluno", student.telefone], ["Mensalidade", fee.valor === null ? "" : Jene.money(fee.valor)],
      ["Vencimento", fee.vencimento === null ? "" : "Dia " + fee.vencimento], ["Situação especial", specialLabels[fee.situacaoEspecial] || fee.situacaoEspecial],
      ...(fee.situacaoEspecial === "desconto" ? [["Valor com desconto", fee.valorComDesconto == null ? "" : Jene.money(fee.valorComDesconto)]] : []),
      ["Número preferido", student.uniforme.numeroPreferido], ["Camisa", student.uniforme.camisa], ["Short", student.uniforme.short],
      ["Data de entrada", student.dataEntrada ? Jene.date(student.dataEntrada) : ""]
    ];
    document.getElementById("student-details-content").innerHTML = '<dl class="student-detail-grid">' + rows.map(([label, value]) => "<div><dt>" + label + "</dt><dd>" + Jene.escape(valueOrDash(value)) + "</dd></div>").join("") + '</dl><section class="student-notes"><h3>Observações</h3><p>' + Jene.escape(student.observacoes || "Nenhuma observação.") + "</p></section>";
    document.getElementById("student-payments").href = "mensalidades.html?aluno=" + encodeURIComponent(student.id);
    const deactivate = document.getElementById("delete-student");
    deactivate.hidden = student.statusAluno === "inativo";
    details.showModal();
    details.scrollTop = 0;
    document.getElementById("student-details-title").focus();
  }

  function replaceStudent(saved) {
    const index = Jene.students.findIndex(student => String(student.id) === String(saved.id));
    if (index < 0) Jene.students.push(saved); else Jene.students[index] = saved;
  }

  list.addEventListener("click", event => {
    const button = event.target.closest("[data-student]");
    if (button) showDetails(Jene.students.find(student => String(student.id) === button.dataset.student));
  });
  document.getElementById("edit-student").addEventListener("click", () => {
    details.close();
    openForm(Jene.students.find(student => String(student.id) === String(selectedId)));
  });
  document.getElementById("delete-student").addEventListener("click", () => {
    const student = Jene.students.find(item => String(item.id) === String(selectedId));
    if (!student) return;
    Jene.confirmAction("Desativar " + student.name + "? O cadastro e o histórico serão preservados, mas o aluno ficará inativo.", async () => {
      try {
        const saved = await JeneStudentsService.deactivateStudent(selectedId);
        replaceStudent({ ...student, ...saved, statusAluno: "inativo" });
        details.close();
        render();
        Jene.toast("Aluno desativado. O histórico foi preservado.");
      } catch (error) {
        Jene.toast(error.message || "Não foi possível desativar o aluno.");
        return false;
      }
      return true;
    });
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (saving) return;
    updateAge();
    const text = name => field(name).value.trim();
    const number = name => text(name) === "" ? null : Number(text(name));
    ["name", "responsavelNome", "responsavelTelefone"].forEach(name => { if (field(name).required && !text(name)) field(name).setCustomValidity("Preencha este campo."); });
    if (Jene.calculateAge(text("dataNascimento")) === null) field("dataNascimento").setCustomValidity("Informe uma data de nascimento válida, até hoje.");
    if (!form.reportValidity()) return;
    const previous = Jene.students.find(student => String(student.id) === String(editingId));
    const student = {
      name: text("name"), categoryId: text("category"), dataNascimento: text("dataNascimento"), telefone: text("telefone"), statusAluno: text("statusAluno"),
      responsavel: { nome: text("responsavelNome"), parentesco: text("parentesco"), telefone: text("responsavelTelefone"), telefoneAlternativo: text("telefoneAlternativo") },
      dataEntrada: text("dataEntrada"),
      mensalidade: { valor: number("valor"), vencimento: number("vencimento"), situacaoEspecial: text("situacaoEspecial"), valorComDesconto: text("situacaoEspecial") === "desconto" ? number("valorComDesconto") : null },
      uniforme: { numeroPreferido: number("numeroPreferido"), camisa: text("camisa"), short: text("short") },
      observacoes: text("observacoes")
    };
    saving = true;
    submitButton.disabled = true;
    submitButton.textContent = "Salvando…";
    try {
      let saved = previous ? await JeneStudentsService.updateStudent(previous.id, student) : await JeneStudentsService.createStudent(student);
      if (previous) saved = { ...saved, status: previous.status, amount: previous.amount, due: previous.due, paidAt: previous.paidAt, previousPaymentStatus: previous.previousPaymentStatus };
      replaceStudent(saved);
      modal.close();
      render();
      showDetails(saved);
      Jene.toast(previous ? "Cadastro atualizado no Supabase." : "Aluno salvo no Supabase.");
    } catch (error) {
      Jene.toast(error.message || "Não foi possível salvar o aluno.");
    } finally {
      saving = false;
      submitButton.disabled = false;
      submitButton.textContent = "Salvar aluno";
    }
  });

  render();
  if (new URLSearchParams(location.search).get("novo") === "1") openForm();
});
