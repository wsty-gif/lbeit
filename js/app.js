const app = async () => {
  const formEl   = document.getElementById("search-form");
  const resultEl = document.getElementById("search-results");
  const modalEl  = document.getElementById("detail-modal");
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

  // 先にフォームを描画
  new SearchForm(formEl, onSearch);

  // フォーム描画完了を待ってから全件検索
  setTimeout(() => {
    onSearch({
      keyword:"", locations:[], jobCategories:[],
      preferences:[], popular:[], annualMin:"",
      employments:[]
    });
  }, 50);
};

window.addEventListener("DOMContentLoaded", app);
