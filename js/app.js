"use strict";

window.Jene = (() => {
  const storageKey = "jene-demo-v1";
  const categories = [];
  const categoryRecords = [];
  let storageSnapshot = null;
  let storageError = "";
  let dataError = "";
  let state = { students: [], attendance: {}, matches: [], paymentState: {} };

  function readLocalDemoState() {
    try {
      const stored = localStorage.getItem(storageKey);
      storageSnapshot = stored;
      const source = stored === null ? sessionStorage.getItem(storageKey) : stored;
      if (source === null) return;
      const saved = JSON.parse(source);
      if (!saved || typeof saved !== "object") throw new Error("invalid-data");
      state.attendance = saved.attendance && typeof saved.attendance === "object" && !Array.isArray(saved.attendance) ? saved.attendance : {};
      state.matches = Array.isArray(saved.matches) ? saved.matches : [];
      state.paymentState = saved.paymentState && typeof saved.paymentState === "object" && !Array.isArray(saved.paymentState) ? saved.paymentState : {};
      if (Array.isArray(saved.students)) {
        saved.students.forEach(student => {
          if (student?.id == null) return;
          state.paymentState[String(student.id)] = {
            status: student.status, amount: student.amount, due: student.due,
            paidAt: student.paidAt, previousPaymentStatus: student.previousPaymentStatus
          };
        });
      }
    } catch {
      storageError = "Não foi possível carregar os dados locais dos módulos demonstrativos. Os registros existentes foram preservados; a gravação está bloqueada.";
    }
  }
  readLocalDemoState();

  const calculateAge = (value, today = new Date()) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const birth = new Date(value + "T12:00:00");
    if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return null;
    let age = today.getFullYear() - year;
    if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
    return age < 0 ? null : age;
  };

  function sortStudents(students, order = "name") {
    const byName = (a, b) => a.name.localeCompare(b.name, "pt-BR");
    return [...students].sort((a, b) => {
      if (order === "youngest" || order === "oldest") {
        const validA = calculateAge(a.dataNascimento) !== null;
        const validB = calculateAge(b.dataNascimento) !== null;
        if (validA !== validB) return validA ? -1 : 1;
        if (validA) {
          const difference = a.dataNascimento.localeCompare(b.dataNascimento);
          if (difference) return order === "youngest" ? -difference : difference;
        }
      }
      if (order === "category") {
        const rank = value => {
          const index = categories.indexOf(value);
          return index < 0 ? categories.length : index;
        };
        const difference = rank(a.category) - rank(b.category);
        if (difference) return difference;
      }
      return byName(a, b);
    });
  }

  function calledStudents(match) {
    return sortStudents(match.calledPlayers.map(id => {
      const student = state.students.find(item => String(item.id) === String(id));
      return { id, name: match.playerNames?.[id] || student?.name || "Jogador não disponível", dataNascimento: student?.dataNascimento || "", category: match.category };
    }));
  }

  function serializeLocalState(next) {
    return JSON.stringify({ attendance: next.attendance, matches: next.matches, paymentState: next.paymentState });
  }

  function capturePaymentState(next) {
    next.students.forEach(student => {
      next.paymentState[String(student.id)] = {
        status: student.status, amount: student.amount, due: student.due,
        paidAt: student.paidAt, previousPaymentStatus: student.previousPaymentStatus
      };
    });
  }

  function update(change) {
    if (storageError) { toast(storageError); return false; }
    try {
      if (localStorage.getItem(storageKey) !== storageSnapshot) {
        toast("Os dados demonstrativos foram alterados em outra aba. Recarregue a página antes de salvar.");
        return false;
      }
      const next = structuredClone(state);
      change(next);
      capturePaymentState(next);
      const serialized = serializeLocalState(next);
      localStorage.setItem(storageKey, serialized);
      storageSnapshot = serialized;
      state = next;
      Jene.state = state;
      return true;
    } catch {
      toast("Não foi possível salvar os dados demonstrativos neste navegador. Tente novamente.");
      return false;
    }
  }

  function saveMatch(match) {
    return update(next => {
      const index = next.matches.findIndex(item => item.id === match.id);
      if (index < 0) next.matches.push(match); else next.matches[index] = match;
    });
  }

  function confirmAction(message, action) {
    const modal = document.createElement("dialog");
    modal.setAttribute("aria-labelledby", "confirm-title");
    modal.innerHTML = '<h2 id="confirm-title">Confirmar ação</h2><p class="helper"></p><div class="dialog-actions"><button type="button" class="button secondary" data-cancel>Cancelar</button><button type="button" class="button danger" data-confirm>Confirmar</button></div>';
    modal.querySelector("p").textContent = message;
    document.body.append(modal);
    modal.querySelector("[data-cancel]").onclick = () => modal.close();
    modal.querySelector("[data-confirm]").onclick = async () => {
      const button = modal.querySelector("[data-confirm]");
      button.disabled = true;
      try { if (await action() !== false) modal.close(); }
      finally { if (modal.isConnected) button.disabled = false; }
    };
    modal.addEventListener("close", () => modal.remove());
    modal.showModal();
    modal.querySelector("[data-cancel]").focus();
  }

  const escape = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const localDate = () => { const value = new Date(); return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-"); };
  const date = value => value ? new Date(value + "T12:00:00").toLocaleDateString("pt-BR") : "Não informado";
  const statusClass = value => ({ Pago: "paid", Pendente: "pending", Atrasado: "overdue", Isento: "exempt" })[value] || "";
  const badge = (value, text = value) => '<span class="badge ' + statusClass(value) + '">' + escape(text) + "</span>";
  const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("");
  const identity = student => '<span class="avatar" aria-hidden="true">' + escape(initials(student.name)) + '</span><div class="student-info"><strong>' + escape(student.name) + "</strong><small>" + escape(student.category) + "</small></div>";
  const paths = {
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>', chevron: '<path d="m9 5 7 7-7 7"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2"/>',
    tick: '<path d="m5 12 4 4L19 6"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    note: '<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8V5a2 2 0 0 1 2-2h12m4 8h-6v5h6m-3-2.5h.01"/>',
    check: '<rect x="4" y="3" width="16" height="19" rx="2"/><path d="M9 3v3h6V3m-7 11 3 3 5-6"/>',
    userplus: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2m4-13v6m-3-3h6"/>',
    search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3h.01"/>',
    logout: '<path d="M10 17l5-5-5-5m5 5H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.check) + "</svg>";

  function toast(message) {
    const open = [...document.querySelectorAll("dialog[open]")].pop();
    if (open) {
      let feedback = open.querySelector(".dialog-feedback");
      if (!feedback) { feedback = document.createElement("p"); feedback.className = "dialog-feedback helper"; feedback.setAttribute("role", "status"); open.prepend(feedback); }
      feedback.textContent = message;
      feedback.scrollIntoView({ block: "nearest" });
    }
    const element = document.getElementById("toast");
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { element.hidden = true; }, 4500);
  }

  function summary() {
    return { active: state.students.filter(student => student.statusAluno === "ativo").length, Pago: 63, Pendente: 14, Atrasado: 10, expected: 8700, received: 6300, pending: 1400, overdue: 1000 };
  }
  const stat = (label, value, type = "", symbol = "users") => '<div class="stat ' + type + '"><span class="stat-symbol">' + icon(symbol) + '</span><span class="stat-label">' + label + "</span><strong>" + value + '</strong><small class="stat-hint">' + (symbol === "users" ? "Total no cadastro" : "Neste mês · demonstração") + "</small></div>";
  const overdueText = student => student.status === "Atrasado" && student.due ? "Atrasado há " + Math.max(0, Math.round((new Date(localDate() + "T12:00:00") - new Date(student.due + "T12:00:00")) / 86400000)) + " dias" : student.status;

  function filters(element, items, selected, callback) {
    element.innerHTML = items.map(([value, label]) => '<button class="filter" type="button" data-value="' + escape(value) + '" aria-pressed="' + (value === selected) + '">' + escape(label) + "</button>").join("");
    element.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      element.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
      callback(button.dataset.value);
    });
  }
  function dialog(id) {
    const element = document.getElementById(id);
    element.addEventListener("close", () => element.querySelector(".dialog-feedback")?.remove());
    element.querySelectorAll(".close-dialog").forEach(button => button.addEventListener("click", () => element.close()));
    return element;
  }
  const filenamePart = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/g, "") || "nao-informado";
  function csv(rows) {
    const cell = value => { let text = String(value ?? ""); if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
    return "\uFEFF" + rows.map(row => row.map(cell).join(";")).join("\r\n") + "\r\n";
  }

  async function loadRemoteData() {
    const records = await JeneCategoriesService.getCategories();
    categoryRecords.splice(0, categoryRecords.length, ...records);
    categories.splice(0, categories.length, ...records.map(category => category.name));
    JeneStudentsService.setCategories(records);
    const students = await JeneStudentsService.getStudents();
    const now = new Date();
    const yearMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-";
    students.forEach(student => {
      const localPayment = state.paymentState[String(student.id)];
      if (localPayment) Object.assign(student, localPayment);
      else if (student.mensalidade.situacaoEspecial !== "isento") {
        const day = student.mensalidade.vencimento;
        student.due = day ? yearMonth + String(Math.min(day, 28)).padStart(2, "0") : "";
        student.status = student.due && student.due < localDate() ? "Atrasado" : "Pendente";
      }
    });
    state.students = students;
    Jene.state = state;
  }

  const Jene = {
    categories, categoryRecords, state, update, saveMatch, confirmAction, calculateAge, sortStudents,
    calledStudents, filenamePart, csv, escape, money, date, localDate, badge, identity, icon, toast,
    summary, stat, overdueText, filters, dialog, get dataError() { return dataError; }
  };

  Jene.ready = Promise.resolve(window.JeneAuthReady).then(async access => {
    if (!access) return new Promise(() => {});
    try { await loadRemoteData(); }
    catch (error) { dataError = error.message || "Não foi possível carregar os dados do Supabase."; }
    if (storageError || dataError) {
      const warning = document.createElement("p"); warning.className = "storage-warning"; warning.setAttribute("role", "alert"); warning.textContent = storageError || dataError;
      document.getElementById("main")?.prepend(warning);
    }
    document.querySelectorAll("[data-icon]").forEach(element => { element.innerHTML = icon(element.dataset.icon); });
    const navItems = [["index", "Início", "home"], ["alunos", "Alunos", "users"], ["mensalidades", "Mensalidades", "wallet"], ["chamada", "Chamada", "check"]];
    document.getElementById("main-nav").innerHTML = navItems.map(([path, label, symbol]) => '<a class="nav-link" href="' + path + '.html" ' + (document.body.dataset.page === path ? 'aria-current="page"' : "") + ">" + icon(symbol) + "<span>" + label + "</span></a>").join("");
    if (document.body.dataset.page === "index") {
      const totals = summary();
      document.getElementById("home-stats").innerHTML = stat("Alunos ativos", totals.active) + stat("Pagos", totals.Pago, "paid", "check") + stat("Pendentes", totals.Pendente, "pending", "clock") + stat("Atrasados", totals.Atrasado, "overdue", "alert");
      document.getElementById("income-value").textContent = money(totals.received);
      const attention = state.students.filter(student => ["Atrasado", "Pendente"].includes(student.status)).slice(0, 3);
      document.getElementById("attention-list").innerHTML = attention.map(student => '<a class="student-row" href="mensalidades.html?aluno=' + student.id + '" aria-label="Ver mensalidade de ' + escape(student.name) + '">' + identity(student) + badge(student.status, overdueText(student)) + "</a>").join("") || '<p class="empty">Nenhuma mensalidade precisa de atenção.</p>';
    }
    return access;
  });
  return Jene;
})();
