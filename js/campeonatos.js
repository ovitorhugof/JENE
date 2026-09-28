"use strict";

Jene.ready.then(async () => {
  const list = document.getElementById("championship-list");
  const form = document.getElementById("championship-form");
  const modal = Jene.dialog("championship-dialog");
  const details = Jene.dialog("championship-details");
  const categoryList = document.getElementById("championship-categories");
  const typeLabels = { one_day: "Torneio de um dia", league: "Liga", knockout: "Mata-mata", other: "Outro" };
  const statusLabels = { planned: "Planejado", ongoing: "Em andamento", finished: "Finalizado", cancelled: "Cancelado" };
  let championships = [], matches = [], editing = null, selected = null;
  const field = name => form.elements.namedItem(name);
  const text = name => field(name).value.trim();

  categoryList.innerHTML = Jene.categoryRecords.map(category => '<label class="category-choice"><input type="checkbox" name="categoryIds" value="' + Jene.escape(category.id) + '"><span>' + Jene.escape(category.name) + "</span></label>").join("") || '<p class="empty">Nenhuma categoria ativa disponível.</p>';
  const matchesFor = id => matches.filter(match => String(match.championshipId) === String(id));
  const dateRange = championship => championship.endDate && championship.endDate !== championship.startDate ? Jene.date(championship.startDate) + " a " + Jene.date(championship.endDate) : Jene.date(championship.startDate);

  function render() {
    document.getElementById("championship-count").textContent = championships.length + (championships.length === 1 ? " campeonato cadastrado" : " campeonatos cadastrados");
    list.innerHTML = championships.map(championship => {
      const related = matchesFor(championship.id);
      return '<button type="button" class="championship-card" data-championship="' + Jene.escape(championship.id) + '"><span class="championship-card-top"><strong>' + Jene.escape(championship.name) + '</strong><span class="badge championship-status status-' + Jene.escape(championship.status) + '">' + Jene.escape(statusLabels[championship.status]) + '</span></span><span>' + Jene.escape(typeLabels[championship.type]) + ' · ' + Jene.escape(dateRange(championship)) + '</span><span>' + Jene.escape(championship.city || "Cidade não informada") + '</span><span class="championship-categories">' + Jene.escape(championship.categories.map(category => category.name).join(" · ")) + '</span><span class="match-called">' + related.length + (related.length === 1 ? " jogo" : " jogos") + Jene.icon("chevron") + "</span></button>";
    }).join("") || '<div class="empty-state"><span class="empty-state-icon">' + Jene.icon("trophy") + '</span><h2>Nenhum campeonato cadastrado.</h2><p>Crie o primeiro campeonato para organizar jogos, fases e resultados.</p><button class="button" type="button" data-create-championship>Criar campeonato</button></div>';
  }

  function openForm(championship = null) {
    editing = championship;
    form.reset();
    document.getElementById("championship-title").textContent = championship ? "Editar campeonato" : "Novo campeonato";
    document.getElementById("championship-category-error").hidden = true;
    if (championship) {
      ["name", "type", "startDate", "endDate", "city", "location", "status", "notes"].forEach(name => { field(name).value = championship[name] || ""; });
      const ids = new Set(championship.categories.map(category => String(category.id)));
      categoryList.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = ids.has(input.value); });
    } else {
      field("status").value = "planned";
      field("startDate").value = Jene.localDate();
    }
    modal.showModal();
    modal.scrollTop = 0;
    document.getElementById("championship-title").focus();
  }

  function matchGroupLabel(match) {
    const round = match.roundNumber ? "Rodada " + match.roundNumber : match.roundName;
    return match.stage || round || "Jogos";
  }

  function resultText(match) {
    if (match.matchStatus === "cancelled") return "Cancelado";
    if (match.matchStatus !== "finished") return "Agendado";
    return "JENE " + match.jeneScore + " × " + match.opponentScore + " " + match.opponent;
  }

  function statistics(summary, league) {
    const items = [["Jogos", summary.played], ["Vitórias", summary.wins], ["Empates", summary.draws], ["Derrotas", summary.losses], ["GP", summary.goalsFor], ["GC", summary.goalsAgainst], ["Saldo", summary.goalDifference]];
    if (league) items.push(["Pontos", summary.points]);
    return '<div class="summary-grid">' + items.map(([label, value]) => '<div><span>' + label + '</span><strong>' + value + "</strong></div>").join("") + "</div>";
  }

  function showDetails(championship) {
    selected = championship;
    const related = matchesFor(championship.id).sort((a, b) => (a.date + a.matchTime).localeCompare(b.date + b.matchTime));
    const categorySections = championship.categories.map(category => {
      const categoryMatches = related.filter(match => String(match.categoryId) === String(category.id));
      const grouped = Map.groupBy ? Map.groupBy(categoryMatches, matchGroupLabel) : categoryMatches.reduce((groups, match) => { const key = matchGroupLabel(match); (groups[key] ||= []).push(match); return groups; }, {});
      const entries = grouped instanceof Map ? [...grouped.entries()] : Object.entries(grouped);
      const groups = entries.map(([label, group]) => '<section class="match-group"><h4>' + Jene.escape(label) + '</h4>' + group.map(match => '<a class="championship-match" href="jogos.html?jogo=' + encodeURIComponent(match.id) + '"><span><strong>' + Jene.escape(match.matchTime || "--:--") + " · JENE x " + Jene.escape(match.opponent) + '</strong><small>' + Jene.escape(Jene.date(match.date)) + " · " + Jene.escape(match.location) + '</small></span><span class="match-result">' + Jene.escape(resultText(match)) + "</span></a>").join("") + "</section>").join("");
      return '<section class="category-summary"><h3>' + Jene.escape(category.name) + '</h3>' + statistics(JeneChampionshipsService.calculateSummary(categoryMatches, championship.type === "league"), championship.type === "league") + (groups || '<p class="empty">Nenhum jogo nesta categoria.</p>') + "</section>";
    }).join("");
    document.getElementById("championship-details-title").textContent = championship.name;
    document.getElementById("championship-details-content").innerHTML = '<dl class="student-detail-grid"><div><dt>Tipo</dt><dd>' + Jene.escape(typeLabels[championship.type]) + '</dd></div><div><dt>Status</dt><dd>' + Jene.escape(statusLabels[championship.status]) + '</dd></div><div><dt>Período</dt><dd>' + Jene.escape(dateRange(championship)) + '</dd></div><div><dt>Cidade / local</dt><dd>' + Jene.escape([championship.city, championship.location].filter(Boolean).join(" · ") || "Não informado") + '</dd></div><div class="full-field"><dt>Categorias</dt><dd>' + Jene.escape(championship.categories.map(category => category.name).join(" · ")) + '</dd></div></dl><section class="student-notes"><h3>Observações</h3><p>' + Jene.escape(championship.notes || "Nenhuma observação.") + '</p></section><div class="championship-sections">' + categorySections + "</div>";
    const firstCategory = championship.categories[0]?.id;
    document.getElementById("championship-add-match").href = "jogos.html?novo=1&campeonato=" + encodeURIComponent(championship.id) + (firstCategory ? "&categoria=" + encodeURIComponent(firstCategory) : "");
    document.getElementById("finish-championship").hidden = championship.status === "finished" || championship.status === "cancelled";
    if (!details.open) details.showModal();
    details.scrollTop = 0;
    document.getElementById("championship-details-title").focus();
  }

  document.getElementById("new-championship").addEventListener("click", () => openForm());
  list.addEventListener("click", event => {
    if (event.target.closest("[data-create-championship]")) return openForm();
    const card = event.target.closest("[data-championship]");
    if (card) showDetails(championships.find(item => String(item.id) === card.dataset.championship));
  });
  field("type").addEventListener("change", () => { if (field("type").value === "one_day") field("endDate").value = field("startDate").value; });
  field("startDate").addEventListener("change", () => { if (field("type").value === "one_day") field("endDate").value = field("startDate").value; });
  categoryList.addEventListener("change", () => { document.getElementById("championship-category-error").hidden = Boolean(categoryList.querySelector(":checked")); });
  document.getElementById("edit-championship").addEventListener("click", () => { details.close(); openForm(selected); });
  document.getElementById("finish-championship").addEventListener("click", () => {
    if (!selected) return;
    Jene.confirmAction("Finalizar " + selected.name + "? O histórico e os jogos serão preservados.", async () => {
      try {
        const saved = await JeneChampionshipsService.finishChampionship(selected.id);
        championships[championships.findIndex(item => item.id === saved.id)] = saved;
        selected = saved; render(); showDetails(saved); Jene.toast("Campeonato finalizado.");
      } catch (error) { Jene.toast(error.message); return false; }
    });
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const categoryIds = [...categoryList.querySelectorAll(":checked")].map(input => input.value);
    document.getElementById("championship-category-error").hidden = categoryIds.length > 0;
    field("endDate").setCustomValidity(field("endDate").value && field("endDate").value < field("startDate").value ? "A data final não pode ser anterior à data inicial." : "");
    if (!categoryIds.length || !form.reportValidity()) return;
    const championship = { name: text("name"), type: text("type"), startDate: text("startDate"), endDate: text("endDate"), city: text("city"), location: text("location"), status: text("status"), notes: text("notes"), categoryIds };
    const submit = form.querySelector('button[type="submit"]'); submit.disabled = true;
    try {
      const saved = editing ? await JeneChampionshipsService.updateChampionship(editing.id, championship, editing.categories) : await JeneChampionshipsService.createChampionship(championship);
      const index = championships.findIndex(item => item.id === saved.id);
      if (index < 0) championships.unshift(saved); else championships[index] = saved;
      modal.close(); render(); showDetails(saved); Jene.toast("Campeonato salvo no Supabase.");
    } catch (error) { Jene.toast(error.message); } finally { submit.disabled = false; }
  });

  try {
    [championships, matches] = await Promise.all([JeneChampionshipsService.getChampionships(), JeneMatchesService.getMatches()]);
    render();
    const requested = new URLSearchParams(location.search).get("campeonato");
    if (requested) { const championship = championships.find(item => String(item.id) === requested); if (championship) showDetails(championship); }
  } catch (error) { list.innerHTML = '<p class="empty">' + Jene.escape(error.message) + "</p>"; Jene.toast(error.message); }
});
