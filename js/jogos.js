"use strict";
Jene.ready.then(async () => {
  const form = document.getElementById("match-form"), list = document.getElementById("match-list"), modal = Jene.dialog("match-dialog"), details = Jene.dialog("match-details"), players = document.getElementById("callup-list"), selected = new Set();
  const field = name => form.elements.namedItem(name), text = name => field(name).value.trim();
  let matches = [], editing = null, selectedMatch = null;
  field("category").innerHTML = '<option value="">Selecionar categoria</option>' + Jene.categoryRecords.map(category => '<option value="' + Jene.escape(category.id) + '">' + Jene.escape(category.name) + "</option>").join("");
  const categoryFor = id => Jene.categoryRecords.find(category => String(category.id) === String(id));
  const eligible = () => Jene.students.filter(student => student.statusAluno === "ativo" && String(student.categoryId) === field("category").value);
  function choices() {
    const current = eligible().map(student => ({ studentId: student.id, selectionKey: String(student.id), name: student.name, birthDate: student.dataNascimento, category: student.category }));
    if (editing && String(editing.categoryId) === field("category").value) editing.callups.forEach(callup => { if (!current.some(item => callup.studentId && String(item.studentId) === String(callup.studentId))) current.push({ ...callup, selectionKey: callup.studentId ? String(callup.studentId) : "historical:" + callup.id, category: editing.category, historical: true, immutable: !callup.studentId }); });
    return current.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }
  function error(name, message = "") { const element = document.getElementById("error-" + name); element.textContent = message; element.hidden = !message; field(name).setAttribute("aria-invalid", String(Boolean(message))); }
  function count() { document.getElementById("callup-count").textContent = "Convocados: " + selected.size + " de " + choices().length; if (selected.size) document.getElementById("error-callup").hidden = true; }
  function renderPlayers(preserve = false) {
    if (!preserve) selected.clear(); const available = choices();
    players.innerHTML = available.map(player => '<label class="callup-row"><input type="checkbox" value="' + Jene.escape(player.selectionKey) + '" ' + (selected.has(player.selectionKey) ? "checked" : "") + (player.immutable ? " disabled" : "") + '><span><strong>' + Jene.escape(player.name) + "</strong><small>" + Jene.escape(player.category) + (player.historical ? " · Convocação anterior; aluno indisponível" : "") + "</small></span></label>").join("") || '<p class="empty">' + (field("category").value ? "Nenhum jogador ativo nesta categoria." : "Selecione uma categoria para ver os jogadores.") + "</p>";
    document.getElementById("error-callup").hidden = true; count();
  }
  field("category").addEventListener("change", () => renderPlayers());
  players.addEventListener("change", event => { if (!event.target.matches('input[type="checkbox"]')) return; if (event.target.checked) selected.add(event.target.value); else selected.delete(event.target.value); count(); });
  function transport() { const other = field("transport").value === "Outro"; document.getElementById("custom-transport").hidden = !other; field("transportOther").disabled = !other; field("transportOther").required = other; if (!other) { field("transportOther").value = ""; error("transportOther"); } }
  field("transport").addEventListener("change", transport); form.addEventListener("input", event => { if (document.getElementById("error-" + event.target.name)) error(event.target.name); });
  function render() { document.getElementById("match-count").textContent = matches.length + (matches.length === 1 ? " jogo salvo" : " jogos salvos") + " · Toque para ver a convocação"; list.innerHTML = matches.map(match => '<button type="button" class="payment-card match-card" data-match="' + Jene.escape(match.id) + '"><strong>JENE x ' + Jene.escape(match.opponent) + '</strong><span class="badge">' + Jene.escape(match.category) + "</span><span>" + Jene.escape(Jene.date(match.date)) + " · " + Jene.escape(match.matchTime) + "</span><span>" + Jene.escape(match.location) + '</span><span class="match-called">' + match.callups.length + " convocados " + Jene.icon("chevron") + "</span></button>").join("") || '<p class="empty">Nenhum jogo cadastrado. Toque em + Novo jogo para começar.</p>'; }
  const matchInfo = match => [["Adversário", match.opponent], ["Categoria", match.category], ["Data", Jene.date(match.date)], ["Horário do jogo", match.matchTime], ["Horário de chegada", match.arrivalTime], ["Local", match.location], ["Transporte", match.transport === "Outro" ? match.transportOther : match.transport]];
  function showDetails(match) { selectedMatch = match; document.getElementById("match-details-title").textContent = "JENE x " + match.opponent; document.getElementById("match-details-content").innerHTML = '<dl class="student-detail-grid">' + matchInfo(match).map(([label, value]) => "<div><dt>" + label + "</dt><dd>" + Jene.escape(value || "Não informado") + "</dd></div>").join("") + '</dl><section class="student-notes"><h3>Observações</h3><p>' + Jene.escape(match.notes || "Nenhuma observação.") + '</p></section><section class="match-roster"><h3>Convocados — ' + match.callups.length + "</h3><ol>" + match.callups.map(player => "<li>" + Jene.escape(player.name) + "</li>").join("") + "</ol></section>"; details.showModal(); details.scrollTop = 0; document.getElementById("match-details-title").focus(); }
  list.addEventListener("click", event => { const button = event.target.closest("[data-match]"); if (button) showDetails(matches.find(match => String(match.id) === button.dataset.match)); });
  function openForm(match = null) {
    editing = match; form.reset(); form.querySelectorAll(".field-error").forEach(element => { element.hidden = true; }); form.querySelectorAll("[aria-invalid]").forEach(element => element.removeAttribute("aria-invalid")); modal.querySelector(".dialog-feedback")?.remove(); document.getElementById("match-title").textContent = match ? "Editar jogo" : "Novo jogo";
    if (match) { const values = { ...match, category: match.categoryId }; Object.keys(values).forEach(name => { if (field(name)) field(name).value = values[name] ?? ""; }); }
    transport(); selected.clear(); if (match) match.callups.forEach(callup => { selected.add(callup.studentId ? String(callup.studentId) : "historical:" + callup.id); }); renderPlayers(true); modal.showModal(); modal.scrollTop = 0; document.getElementById("match-title").focus();
  }
  document.getElementById("new-match").addEventListener("click", () => openForm());
  document.getElementById("export-match").addEventListener("click", () => {
    const match = matches.find(item => item.id === selectedMatch?.id); if (!match) return;
    const rows = [["JENE Gestão"], ["Convocação"], [], ...matchInfo(match).map(([label, value]) => [label, value || "Não informado"]), ["Observações", match.notes || "Não informado"], [], ["Convocados", match.callups.length], [], ["Nº", "Nome", "Data de nascimento", "Categoria"], ...match.callups.map((player, index) => [index + 1, player.name, player.birthDate ? Jene.date(player.birthDate) : "Não informado", match.category])];
    const link = document.createElement("a"); let url; try { url = URL.createObjectURL(new Blob([Jene.csv(rows)], { type: "text/csv;charset=utf-8;" })); link.href = url; link.download = "convocacao-jene-" + Jene.filenamePart(match.opponent) + "-" + Jene.filenamePart(match.category) + "-" + Jene.filenamePart(match.date.split("-").reverse().join("-")) + ".csv"; link.hidden = true; document.body.append(link); link.click(); Jene.toast("Exportação da convocação iniciada."); } catch { Jene.toast("Não foi possível exportar a convocação. Tente novamente."); } finally { link.remove(); if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  });
  document.getElementById("edit-match").addEventListener("click", () => { details.close(); openForm(selectedMatch); });
  document.getElementById("delete-match").addEventListener("click", () => { if (!selectedMatch) return; Jene.confirmAction("Excluir o jogo contra " + selectedMatch.opponent + " e sua convocação?", async () => { try { await JeneMatchesService.deleteMatch(selectedMatch.id); matches = matches.filter(match => match.id !== selectedMatch.id); details.close(); render(); Jene.toast("Jogo e convocação excluídos."); } catch (error) { Jene.toast(error.message); return false; } }); });
  form.addEventListener("submit", async event => {
    event.preventDefault(); let first = null;
    ["opponent", "category", "date", "matchTime", "location", "transportOther"].forEach(name => { const input = field(name), invalid = !input.disabled && ((input.required && !text(name)) || !input.checkValidity() || (name === "category" && !categoryFor(text(name)))); error(name, invalid ? "Preencha este campo com um valor válido." : ""); if (invalid && !first) first = input; });
    const called = choices().filter(player => selected.has(player.selectionKey)); document.getElementById("error-callup").hidden = called.length > 0;
    if (first) { first.focus(); return; } if (!called.length) { document.getElementById("error-callup").scrollIntoView({ block: "center" }); (players.querySelector("input") || field("category")).focus(); return; }
    const submit = form.querySelector('button[type="submit"]'); submit.disabled = true;
    const match = { categoryId: text("category"), opponent: text("opponent"), date: text("date"), matchTime: text("matchTime"), arrivalTime: text("arrivalTime"), location: text("location"), transport: text("transport"), transportOther: text("transportOther"), notes: text("notes") };
    const writableCallups = called.filter(player => !player.immutable);
    try { const saved = editing ? await JeneMatchesService.updateMatchWithCallups(editing.id, match, writableCallups, editing.callups) : await JeneMatchesService.createMatchWithCallups(match, writableCallups); const index = matches.findIndex(item => item.id === saved.id); if (index < 0) matches.push(saved); else matches[index] = saved; matches.sort((a, b) => (a.date + a.matchTime).localeCompare(b.date + b.matchTime)); modal.close(); render(); showDetails(saved); Jene.toast("Jogo e convocação salvos no Supabase."); } catch (error) { Jene.toast(error.message); } finally { submit.disabled = false; }
  });
  list.innerHTML = '<p class="empty">Carregando jogos...</p>';
  try { matches = await JeneMatchesService.getMatches(); render(); } catch (error) { list.innerHTML = '<p class="empty">' + Jene.escape(error.message) + "</p>"; Jene.toast(error.message); }
});
