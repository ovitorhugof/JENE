"use strict";

(() => {
  const wrap = (message, error) => Object.assign(new Error(message, { cause: error }), { code: error?.code });

  async function getSession(categoryId, sessionDate) {
    const { data, error } = await window.JeneSupabase.from("attendance_sessions")
      .select("id, category_id, session_date, created_at").eq("category_id", categoryId).eq("session_date", sessionDate).maybeSingle();
    if (error) throw wrap("Não foi possível carregar a chamada.", error);
    return data;
  }

  async function getAttendanceRecords(sessionId) {
    if (!sessionId) return [];
    const { data, error } = await window.JeneSupabase.from("attendance_records")
      .select("id, session_id, student_id, status").eq("session_id", sessionId);
    if (error) throw wrap("Não foi possível carregar as presenças.", error);
    return data || [];
  }

  async function ensureSession(categoryId, sessionDate) {
    const existing = await getSession(categoryId, sessionDate);
    if (existing) return existing;
    const { data, error } = await window.JeneSupabase.from("attendance_sessions")
      .insert({ category_id: categoryId, session_date: sessionDate }).select("id, category_id, session_date, created_at").single();
    if (!error) return data;
    if (error.code === "23505") return getSession(categoryId, sessionDate);
    throw wrap("Não foi possível criar a chamada.", error);
  }

  const createSession = ensureSession;

  async function saveAttendance(categoryId, sessionDate, records) {
    const session = await ensureSession(categoryId, sessionDate);
    if (!records.length) return session;
    const payload = records.map(record => ({ session_id: session.id, student_id: record.studentId, status: record.status }));
    const { error } = await window.JeneSupabase.from("attendance_records").upsert(payload, { onConflict: "session_id,student_id" });
    if (error) throw wrap("Não foi possível salvar as presenças.", error);
    return session;
  }

  async function deleteSession(id) {
    const { error } = await window.JeneSupabase.from("attendance_sessions").delete().eq("id", id);
    if (error) throw wrap("Não foi possível excluir a chamada.", error);
  }

  window.JeneAttendanceService = { getSession, createSession, getAttendanceRecords, saveAttendance, deleteSession };
})();
