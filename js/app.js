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

  new SearchForm(formEl, onSearch);

  // 初回（条件なし）
  onSearch({ keyword:"", locations:[], jobCategories:[], preferences:[], popular:[], annualMin:"", employments:[] });
};

window.addEventListener("DOMContentLoaded", app);
