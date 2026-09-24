"use strict";

(() => {
  async function getCategories() {
    const { data, error } = await window.JeneSupabase
      .from("categories")
      .select("id, name, active, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error("Não foi possível carregar as categorias.", { cause: error });
    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order
    }));
  }

  window.JeneCategoriesService = { getCategories };
})();
