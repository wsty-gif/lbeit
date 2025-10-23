const app = async () => {
  const formContainer = document.getElementById("search-form");
  const resultsContainer = document.getElementById("search-results");
  const detailModal = document.getElementById("detail-modal");
  const detailContent = document.getElementById("detail-content");

  const detail = new Detail(detailContent);
  const results = new SearchResults(resultsContainer, async (id) => {
    const data = await DataService.loadAccounts();
    const acc = data.find((a) => a.id === id);
    detail.show(acc);
    detailModal.classList.remove("hidden");
  });

  new SearchForm(formContainer, async (filters) => {
    const data = await DataService.searchAccounts(filters);
    results.show(data);
  });
};

window.addEventListener("DOMContentLoaded", app);
