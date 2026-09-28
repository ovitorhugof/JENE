"use strict";

(() => {
  const columns = "id, name, type, start_date, end_date, city, location, status, notes, created_at, updated_at, championship_categories(id, category_id, categories(id, name))";
  const wrap = (message, error) => Object.assign(new Error(message, { cause: error }), { code: error?.code });
  const nullableText = value => String(value ?? "").trim() || null;

  function mapChampionship(row) {
    return {
      id: row.id,
      name: row.name || "",
      type: row.type,
      startDate: row.start_date,
      endDate: row.end_date || "",
      city: row.city || "",
      location: row.location || "",
      status: row.status,
      notes: row.notes || "",
      categories: (row.championship_categories || []).map(item => ({
        linkId: item.id,
        id: item.category_id,
        name: item.categories?.name || "Categoria indisponível"
      })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  const championshipPayload = championship => ({
    name: championship.name.trim(),
    type: championship.type,
    start_date: championship.startDate,
    end_date: championship.endDate || null,
    city: nullableText(championship.city),
    location: nullableText(championship.location),
    status: championship.status,
    notes: nullableText(championship.notes)
  });

  async function getChampionships() {
    const { data, error } = await window.JeneSupabase.from("championships").select(columns)
      .order("start_date", { ascending: false }).order("name", { ascending: true });
    if (error) throw wrap("Não foi possível carregar os campeonatos.", error);
    return (data || []).map(mapChampionship);
  }

  async function getChampionshipById(id) {
    const { data, error } = await window.JeneSupabase.from("championships").select(columns).eq("id", id).single();
    if (error) throw wrap("Não foi possível carregar o campeonato.", error);
    return mapChampionship(data);
  }

  async function createChampionship(championship) {
    const { data, error } = await window.JeneSupabase.from("championships")
      .insert(championshipPayload(championship)).select("id").single();
    if (error) throw wrap("Não foi possível salvar o campeonato.", error);
    const links = championship.categoryIds.map(categoryId => ({ championship_id: data.id, category_id: categoryId }));
    const { error: categoryError } = await window.JeneSupabase.from("championship_categories").insert(links);
    if (categoryError) {
      await window.JeneSupabase.from("championships").delete().eq("id", data.id);
      throw wrap("Não foi possível associar as categorias. O campeonato foi desfeito para evitar um cadastro incompleto.", categoryError);
    }
    return getChampionshipById(data.id);
  }

  async function updateChampionship(id, championship, existingCategories = []) {
    const { error } = await window.JeneSupabase.from("championships").update(championshipPayload(championship)).eq("id", id);
    if (error) throw wrap("Não foi possível atualizar o campeonato.", error);
    const currentIds = new Set(existingCategories.map(item => String(item.id)));
    const desiredIds = new Set(championship.categoryIds.map(String));
    const additions = championship.categoryIds.filter(categoryId => !currentIds.has(String(categoryId)));
    if (additions.length) {
      const { error: insertError } = await window.JeneSupabase.from("championship_categories")
        .insert(additions.map(categoryId => ({ championship_id: id, category_id: categoryId })));
      if (insertError) throw wrap("Os dados foram atualizados, mas não foi possível incluir todas as categorias.", insertError);
    }
    const removals = existingCategories.filter(item => !desiredIds.has(String(item.id))).map(item => item.linkId);
    if (removals.length) {
      const { error: deleteError } = await window.JeneSupabase.from("championship_categories").delete().in("id", removals);
      if (deleteError) throw wrap("Os dados foram atualizados, mas não foi possível remover todas as categorias desmarcadas.", deleteError);
    }
    return getChampionshipById(id);
  }

  async function finishChampionship(id) {
    const { error } = await window.JeneSupabase.from("championships").update({ status: "finished" }).eq("id", id);
    if (error) throw wrap("Não foi possível finalizar o campeonato.", error);
    return getChampionshipById(id);
  }

  function calculateSummary(matches, league = false) {
    const valid = matches.filter(match => match.matchStatus === "finished" && Number.isInteger(match.jeneScore) && Number.isInteger(match.opponentScore));
    const summary = { played: valid.length, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
    valid.forEach(match => {
      summary.goalsFor += match.jeneScore;
      summary.goalsAgainst += match.opponentScore;
      if (match.jeneScore > match.opponentScore) { summary.wins++; summary.points += 3; }
      else if (match.jeneScore === match.opponentScore) { summary.draws++; summary.points += 1; }
      else summary.losses++;
    });
    summary.goalDifference = summary.goalsFor - summary.goalsAgainst;
    if (!league) delete summary.points;
    return summary;
  }

  window.JeneChampionshipsService = { getChampionships, getChampionshipById, createChampionship, updateChampionship, finishChampionship, calculateSummary };
})();
