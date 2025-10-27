const app = async () => {
  const formEl = document.getElementById("search-form");
  const resultEl = document.getElementById("search-results");
  const modalEl = document.getElementById("detail-modal");
  const detailEl = document.getElementById("detail-content");

  const detail = new Detail(detailEl);
  const results = new SearchResults(resultEl, (id) => {
    detail.show(id);
    modalEl.classList.remove("hidden");
  });

  const onSearch = async (filters) => {
    const list = await DataService.search(filters);
    results.show(list);
  };

  new SearchForm(formEl, onSearch);
  // 初期表示用ダミー検索（全件）
  onSearch({ keyword: "", prefecture: "", city: "" });
};

window.addEventListener("DOMContentLoaded", app);
