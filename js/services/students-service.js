"use strict";

(() => {
  const studentColumns = [
    "id", "full_name", "birth_date", "student_phone", "status", "enrollment_date",
    "guardian_name", "guardian_relationship", "guardian_phone", "guardian_alternate_phone",
    "fee_amount", "fee_due_day", "fee_type", "discounted_fee_amount",
    "preferred_number", "shirt_size", "shorts_size", "notes", "category_id"
  ].join(", ");

  let categoriesById = new Map();

  function setCategories(categories) {
    categoriesById = new Map(categories.map(category => [String(category.id), category]));
  }

  const nullableText = value => {
    const text = String(value ?? "").trim();
    return text || null;
  };

  const nullableNumber = value => value === "" || value === null || value === undefined ? null : Number(value);

  function mapDatabaseStudent(row) {
    const category = categoriesById.get(String(row.category_id));
    const feeType = row.fee_type || "normal";
    return {
      id: row.id,
      name: row.full_name || "",
      categoryId: row.category_id,
      category: category?.name || "Sem categoria",
      dataNascimento: row.birth_date || "",
      telefone: row.student_phone || "",
      statusAluno: row.status || "ativo",
      dataEntrada: row.enrollment_date || "",
      responsavel: {
        nome: row.guardian_name || "",
        parentesco: row.guardian_relationship || "",
        telefone: row.guardian_phone || "",
        telefoneAlternativo: row.guardian_alternate_phone || ""
      },
      mensalidade: {
        valor: row.fee_amount === null ? null : Number(row.fee_amount),
        vencimento: row.fee_due_day === null ? null : Number(row.fee_due_day),
        situacaoEspecial: feeType,
        valorComDesconto: row.discounted_fee_amount === null ? null : Number(row.discounted_fee_amount)
      },
      uniforme: {
        numeroPreferido: row.preferred_number,
        camisa: row.shirt_size || "",
        short: row.shorts_size || ""
      },
      observacoes: row.notes || ""
    };
  }

  function mapUiStudent(student) {
    return {
      full_name: nullableText(student.name),
      birth_date: nullableText(student.dataNascimento),
      student_phone: nullableText(student.telefone),
      status: student.statusAluno || "ativo",
      enrollment_date: nullableText(student.dataEntrada),
      guardian_name: nullableText(student.responsavel?.nome),
      guardian_relationship: nullableText(student.responsavel?.parentesco),
      guardian_phone: nullableText(student.responsavel?.telefone),
      guardian_alternate_phone: nullableText(student.responsavel?.telefoneAlternativo),
      fee_amount: nullableNumber(student.mensalidade?.valor),
      fee_due_day: nullableNumber(student.mensalidade?.vencimento),
      fee_type: student.mensalidade?.situacaoEspecial || "normal",
      discounted_fee_amount: student.mensalidade?.situacaoEspecial === "desconto"
        ? nullableNumber(student.mensalidade?.valorComDesconto)
        : null,
      preferred_number: nullableNumber(student.uniforme?.numeroPreferido),
      shirt_size: nullableText(student.uniforme?.camisa),
      shorts_size: nullableText(student.uniforme?.short),
      notes: nullableText(student.observacoes),
      category_id: student.categoryId
    };
  }

  function throwRequestError(message, error) {
    const requestError = new Error(message, { cause: error });
    requestError.code = error?.code;
    throw requestError;
  }

  async function getStudents() {
    const { data, error } = await window.JeneSupabase
      .from("students")
      .select(studentColumns)
      .order("full_name", { ascending: true });
    if (error) throwRequestError("Não foi possível carregar os alunos.", error);
    return (data || []).map(mapDatabaseStudent);
  }

  async function getStudentById(id) {
    const { data, error } = await window.JeneSupabase
      .from("students")
      .select(studentColumns)
      .eq("id", id)
      .maybeSingle();
    if (error) throwRequestError("Não foi possível carregar o aluno.", error);
    return data ? mapDatabaseStudent(data) : null;
  }

  async function createStudent(student) {
    const { data, error } = await window.JeneSupabase
      .from("students")
      .insert(mapUiStudent(student))
      .select(studentColumns)
      .single();
    if (error) throwRequestError("Não foi possível salvar o aluno.", error);
    return mapDatabaseStudent(data);
  }

  async function updateStudent(id, student) {
    const { data, error } = await window.JeneSupabase
      .from("students")
      .update(mapUiStudent(student))
      .eq("id", id)
      .select(studentColumns)
      .single();
    if (error) throwRequestError("Não foi possível atualizar o aluno.", error);
    return mapDatabaseStudent(data);
  }

  async function deactivateStudent(id) {
    const { data, error } = await window.JeneSupabase
      .from("students")
      .update({ status: "inativo" })
      .eq("id", id)
      .select(studentColumns)
      .single();
    if (error) throwRequestError("Não foi possível desativar o aluno.", error);
    return mapDatabaseStudent(data);
  }

  window.JeneStudentsService = {
    setCategories,
    mapDatabaseStudent,
    mapUiStudent,
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deactivateStudent
  };
})();
