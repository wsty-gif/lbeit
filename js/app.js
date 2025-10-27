const app = async () => {
  const formEl   = document.getElementById("search-form");
  const listEl   = document.getElementById("search-results");
  const modalEl  = document.getElementById("detail-modal");
  const detailEl = document.getElementById("detail-content");

  const detail = new Detail(detailEl);
  const results = new SearchResults(listEl, async (id) => {
    const data = await DataService.load();
    const acc = data.find(a => a.id === id);
    if (!acc) return;
    detail.show(acc);
    modalEl.classList.remove("hidden");
  });

  const onSearch = async (filters) => {
    const data = await DataService.search(filters);
    results.show(data);
    listEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ✅ 検索フォームをまず描画
  const form = new SearchForm(formEl, onSearch);

  // ✅ フォームの描画が完了してから初期データをロード
  // setTimeoutで確実にフォーム描画後に検索開始
  setTimeout(async () => {
    await onSearch({
      keyword: "",
      locations: [],
      jobCategories: [],
      preferences: [],
      popular: [],
      annualMin: "",
      employments: []
    });
  }, 100);
};

window.addEventListener("DOMContentLoaded", app);
