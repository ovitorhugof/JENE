"use strict";

(() => {
  const columns = "id, student_id, reference_month, due_date, amount_due, discount_amount, paid_amount, paid_date, status, created_at, updated_at";

  function requestError(message, error) {
    const wrapped = new Error(message, { cause: error });
    wrapped.code = error?.code;
    return wrapped;
  }

  const monthReference = value => /^\d{4}-\d{2}(?:-\d{2})?$/.test(value || "") ? value.slice(0, 7) + "-01" : "";
  const currentMonth = () => {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-01";
  };
  const dueDate = (reference, day) => {
    const [year, month] = reference.slice(0, 7).split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return reference.slice(0, 7) + "-" + String(Math.min(Math.max(Number(day), 1), lastDay)).padStart(2, "0");
  };

  function mapPayment(row) {
    const status = row.status === "paid" ? "Pago" : row.status === "exempt" ? "Isento" : row.due_date < window.Jene?.localDate?.() ? "Atrasado" : "Pendente";
    return {
      id: row.id,
      studentId: row.student_id,
      referenceMonth: row.reference_month,
      due: row.due_date,
      amount: Number(row.amount_due || 0),
      discountAmount: Number(row.discount_amount || 0),
      paidAmount: row.paid_amount === null ? null : Number(row.paid_amount),
      paidAt: row.paid_date || "",
      databaseStatus: row.status,
      status
    };
  }

  async function getPaymentsByMonth(referenceMonth) {
    const reference = monthReference(referenceMonth);
    if (!reference) throw new Error("Mês de referência inválido.");
    const { data, error } = await window.JeneSupabase.from("monthly_payments").select(columns)
      .eq("reference_month", reference).order("due_date", { ascending: true });
    if (error) throw requestError("Não foi possível carregar as mensalidades.", error);
    return (data || []).map(mapPayment);
  }

  async function getPaymentsByStudent(studentId) {
    const { data, error } = await window.JeneSupabase.from("monthly_payments").select(columns)
      .eq("student_id", studentId).order("reference_month", { ascending: false });
    if (error) throw requestError("Não foi possível carregar o histórico de mensalidades.", error);
    return (data || []).map(mapPayment);
  }

  async function generatePaymentsForMonth(referenceMonth) {
    const reference = monthReference(referenceMonth);
    if (!reference) throw new Error("Mês de referência inválido.");
    const { data: students, error: studentError } = await window.JeneSupabase.from("students")
      .select("id, full_name, fee_amount, fee_due_day, fee_type, discounted_fee_amount, status").eq("status", "ativo");
    if (studentError) throw requestError("Não foi possível carregar os alunos para gerar as mensalidades.", studentError);

    const skipped = [];
    let scholarshipCount = 0;
    const rows = (students || []).flatMap(student => {
      const feeType = student.fee_type || "normal";
      const base = Number(student.fee_amount);
      const discounted = Number(student.discounted_fee_amount);
      if (!Number.isInteger(Number(student.fee_due_day)) || Number(student.fee_due_day) < 1 || Number(student.fee_due_day) > 31) {
        skipped.push(student.full_name || student.id); return [];
      }
      if (feeType !== "isento" && (student.fee_amount === null || !Number.isFinite(base) || base < 0)) {
        skipped.push(student.full_name || student.id); return [];
      }
      if (feeType === "desconto" && (student.discounted_fee_amount === null || !Number.isFinite(discounted) || discounted < 0)) {
        skipped.push(student.full_name || student.id); return [];
      }
      if (feeType === "bolsa") scholarshipCount++;
      const amount = feeType === "isento" ? 0 : feeType === "desconto" ? discounted : base;
      return [{
        student_id: student.id,
        reference_month: reference,
        due_date: dueDate(reference, student.fee_due_day),
        amount_due: amount,
        discount_amount: feeType === "desconto" ? Math.max(0, base - discounted) : 0,
        status: feeType === "isento" ? "exempt" : "open"
      }];
    });
    if (!rows.length) return { created: 0, skipped, scholarshipCount };
    const { data, error } = await window.JeneSupabase.from("monthly_payments").upsert(rows, {
      onConflict: "student_id,reference_month", ignoreDuplicates: true
    }).select("id");
    if (error) throw requestError("Não foi possível gerar as mensalidades.", error);
    return { created: (data || []).length, skipped, scholarshipCount };
  }

  async function markPaid(id, { paidDate, paidAmount }) {
    const amount = Number(paidAmount);
    if (!paidDate || !Number.isFinite(amount) || amount < 0) throw new Error("Informe uma data e um valor de pagamento válidos.");
    const { data, error } = await window.JeneSupabase.from("monthly_payments")
      .update({ status: "paid", paid_date: paidDate, paid_amount: amount }).eq("id", id).select(columns).single();
    if (error) throw requestError("Não foi possível registrar o pagamento.", error);
    return mapPayment(data);
  }

  async function reopenPayment(id) {
    const { data, error } = await window.JeneSupabase.from("monthly_payments")
      .update({ status: "open", paid_date: null, paid_amount: null }).eq("id", id).select(columns).single();
    if (error) throw requestError("Não foi possível reabrir a mensalidade.", error);
    return mapPayment(data);
  }

  async function updatePayment(id, changes) {
    const payload = {};
    if (changes.dueDate !== undefined) payload.due_date = changes.dueDate;
    if (changes.amountDue !== undefined) payload.amount_due = Number(changes.amountDue);
    if (changes.discountAmount !== undefined) payload.discount_amount = Number(changes.discountAmount);
    if (changes.paidDate !== undefined) payload.paid_date = changes.paidDate || null;
    if (changes.paidAmount !== undefined) payload.paid_amount = changes.paidAmount === null || changes.paidAmount === "" ? null : Number(changes.paidAmount);
    if (changes.status !== undefined) payload.status = changes.status;
    const { data, error } = await window.JeneSupabase.from("monthly_payments").update(payload).eq("id", id).select(columns).single();
    if (error) throw requestError("Não foi possível atualizar a mensalidade.", error);
    return mapPayment(data);
  }

  window.JenePaymentsService = { currentMonth, monthReference, getPaymentsByMonth, getPaymentsByStudent, generatePaymentsForMonth, markPaid, reopenPayment, updatePayment };
})();
