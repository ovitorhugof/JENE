"use strict";
Jene.ready.then(async () => {
  const date = document.getElementById("attendance-date"), select = document.getElementById("attendance-category"), list = document.getElementById("attendance-list"), save = document.getElementById("save-attendance");
  let marks = {}, dirty = false, session = null, requestNumber = 0;
  select.innerHTML = Jene.categoryRecords.map(category => '<option value="' + Jene.escape(category.id) + '">' + Jene.escape(category.name) + "</option>").join(""); date.value = Jene.localDate();
  const category = () => Jene.categoryRecords.find(item => String(item.id) === select.value);
  const students = () => Jene.sortStudents(Jene.students.filter(student => student.statusAluno === "ativo" && String(student.categoryId) === select.value));
  function totals() {
    const group = students(), present = group.filter(student => marks[student.id] === "present").length, absent = group.filter(student => marks[student.id] === "absent").length, remaining = group.length - present - absent;
    document.getElementById("attendance-totals").innerHTML = '<span>Presentes: <strong>' + present + '</strong></span><span>Ausentes: <strong>' + absent + '</strong></span><span>A marcar: <strong>' + remaining + "</strong></span>";
    save.disabled = remaining > 0 || group.length === 0 || !date.value;
    document.getElementById("attendance-progress").innerHTML = '<p>' + (group.length - remaining) + " de " + group.length + ' alunos marcados</p><progress max="' + (group.length || 1) + '" value="' + (group.length - remaining) + '" aria-label="Progresso da chamada"></progress>';
  }
  function render() {
    const group = students(), name = category()?.name || "categoria"; document.getElementById("attendance-title").textContent = "Turma " + name; document.getElementById("attendance-size").textContent = group.length + (group.length === 1 ? " aluno" : " alunos");
    list.innerHTML = group.map(student => '<div class="attendance-row"><strong id="name-' + student.id + '">' + Jene.escape(student.name) + '</strong><div class="presence-options" role="group" aria-labelledby="name-' + student.id + '">' + [["present", "Presente", "tick"], ["absent", "Ausente", "close"]].map(([status, label, icon]) => '<label class="presence-option ' + (status === "absent" ? "absent" : "") + '"><input type="radio" name="attendance-' + student.id + '" value="' + status + '" data-id="' + student.id + '" ' + (marks[student.id] === status ? "checked" : "") + "><span>" + Jene.icon(icon) + label + "</span></label>").join("") + "</div></div>").join("") || '<p class="empty">Nenhum aluno ativo nesta categoria.</p>';
    document.getElementById("attendance-saved").textContent = dirty ? "Há alterações ainda não salvas." : session ? "Chamada salva no Supabase. Você pode ajustar as presenças." : "Marque todos os alunos antes de salvar."; document.getElementById("delete-attendance").hidden = !session; totals();
  }
  async function load() {
    const current = ++requestNumber; dirty = false; marks = {}; session = null; list.innerHTML = '<p class="empty">Carregando chamada...</p>'; save.disabled = true;
    if (!select.value || !date.value) { render(); return; }
    try { const loaded = await JeneAttendanceService.getSession(select.value, date.value); if (current !== requestNumber) return; session = loaded; const records = loaded ? await JeneAttendanceService.getAttendanceRecords(loaded.id) : []; if (current !== requestNumber) return; records.forEach(record => { marks[record.student_id] = record.status; }); render(); }
    catch (error) { if (current !== requestNumber) return; list.innerHTML = '<p class="empty">' + Jene.escape(error.message) + "</p>"; Jene.toast(error.message); }
  }
  list.addEventListener("change", event => { if (!event.target.dataset.id) return; marks[event.target.dataset.id] = event.target.value; dirty = true; totals(); document.getElementById("attendance-saved").textContent = "Há alterações ainda não salvas."; });
  select.addEventListener("change", load); date.addEventListener("change", load);
  save.addEventListener("click", async () => { const group = students(); if (!date.reportValidity() || !group.length || group.some(student => !marks[student.id])) return; const categoryId = select.value, sessionDate = date.value, categoryName = category().name; save.disabled = true; select.disabled = true; date.disabled = true; try { session = await JeneAttendanceService.saveAttendance(categoryId, sessionDate, group.map(student => ({ studentId: student.id, status: marks[student.id] }))); dirty = false; render(); Jene.toast("Chamada de " + categoryName + " salva no Supabase."); } catch (error) { Jene.toast(error.message); totals(); } finally { select.disabled = false; date.disabled = false; } });
  document.getElementById("delete-attendance").addEventListener("click", () => { if (!session) return; Jene.confirmAction("Excluir a chamada de " + category().name + " em " + Jene.date(date.value) + "?", async () => { try { await JeneAttendanceService.deleteSession(session.id); marks = {}; session = null; dirty = false; render(); Jene.toast("Chamada excluída."); } catch (error) { Jene.toast(error.message); return false; } }); });
  window.addEventListener("beforeunload", event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
  await load();
});
