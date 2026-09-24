"use strict";

(() => {
  const transportToDb = { "Van": "van", "Ônibus": "onibus", "Carros particulares": "carros_particulares", "A pé": "a_pe", "Transporte próprio": "transporte_proprio", "Outro": "outro" };
  const transportFromDb = Object.fromEntries(Object.entries(transportToDb).map(([label, value]) => [value, label]));
  const matchColumns = "id, category_id, opponent, match_date, match_time, arrival_time, location, transport, transport_details, notes, created_at, updated_at, callups(id, match_id, student_id, player_name_snapshot, player_birth_date_snapshot, created_at)";
  const wrap = (message, error) => Object.assign(new Error(message, { cause: error }), { code: error?.code });

  function mapMatch(row) {
    const category = window.Jene?.categoryRecords?.find(item => String(item.id) === String(row.category_id));
    return {
      id: row.id, categoryId: row.category_id, category: category?.name || "Sem categoria", opponent: row.opponent,
      date: row.match_date, matchTime: row.match_time?.slice(0, 5) || "", arrivalTime: row.arrival_time?.slice(0, 5) || "",
      location: row.location, transport: transportFromDb[row.transport] || "", transportOther: row.transport_details || "", notes: row.notes || "",
      callups: (row.callups || []).map(item => ({ id: item.id, matchId: item.match_id, studentId: item.student_id, name: item.player_name_snapshot, birthDate: item.player_birth_date_snapshot || "" }))
    };
  }

  const matchPayload = match => ({
    category_id: match.categoryId, opponent: match.opponent.trim(), match_date: match.date, match_time: match.matchTime,
    arrival_time: match.arrivalTime || null, location: match.location.trim(), transport: transportToDb[match.transport] || null,
    transport_details: match.transport === "Outro" ? match.transportOther.trim() : null, notes: match.notes.trim() || null
  });
  const callupPayload = (matchId, player) => ({ match_id: matchId, student_id: player.studentId, player_name_snapshot: player.name, player_birth_date_snapshot: player.birthDate || null });

  async function getMatches() {
    const { data, error } = await window.JeneSupabase.from("matches").select(matchColumns).order("match_date", { ascending: true }).order("match_time", { ascending: true });
    if (error) throw wrap("Não foi possível carregar os jogos.", error);
    return (data || []).map(mapMatch);
  }

  async function getMatchById(id) {
    const { data, error } = await window.JeneSupabase.from("matches").select(matchColumns).eq("id", id).single();
    if (error) throw wrap("Não foi possível carregar o jogo.", error);
    return mapMatch(data);
  }

  async function createMatchWithCallups(match, players) {
    const { data, error } = await window.JeneSupabase.from("matches").insert(matchPayload(match)).select("id").single();
    if (error) throw wrap("Não foi possível salvar o jogo.", error);
    const { error: callupError } = await window.JeneSupabase.from("callups").insert(players.map(player => callupPayload(data.id, player)));
    if (callupError) {
      await window.JeneSupabase.from("matches").delete().eq("id", data.id);
      throw wrap("Não foi possível salvar a convocação. O jogo foi desfeito para evitar um cadastro incompleto.", callupError);
    }
    return getMatchById(data.id);
  }

  async function updateMatchWithCallups(id, match, players, existingCallups = []) {
    const { error } = await window.JeneSupabase.from("matches").update(matchPayload(match)).eq("id", id);
    if (error) throw wrap("Não foi possível atualizar o jogo.", error);
    const existingByStudent = new Map(existingCallups.filter(item => item.studentId).map(item => [String(item.studentId), item]));
    const desiredIds = new Set(players.map(item => String(item.studentId)));
    const additions = players.filter(item => !existingByStudent.has(String(item.studentId)));
    if (additions.length) {
      const { error: insertError } = await window.JeneSupabase.from("callups").insert(additions.map(player => callupPayload(id, player)));
      if (insertError) throw wrap("O jogo foi atualizado, mas não foi possível incluir todos os novos convocados.", insertError);
    }
    const removals = existingCallups.filter(item => item.studentId && !desiredIds.has(String(item.studentId))).map(item => item.id);
    if (removals.length) {
      const { error: deleteError } = await window.JeneSupabase.from("callups").delete().in("id", removals);
      if (deleteError) throw wrap("O jogo foi atualizado, mas não foi possível remover todos os convocados desmarcados.", deleteError);
    }
    return getMatchById(id);
  }

  async function deleteMatch(id) {
    const { error } = await window.JeneSupabase.from("matches").delete().eq("id", id);
    if (error) throw wrap("Não foi possível excluir o jogo.", error);
  }

  window.JeneMatchesService = { getMatches, getMatchById, createMatchWithCallups, updateMatchWithCallups, deleteMatch };
})();
