class SearchForm {
  constructor(container, onSearch) {
    this.container = container;
    this.onSearch = onSearch;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <form id="searchForm" class="bg-white p-5 rounded-lg shadow space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          <div>
            <label class="font-semibold text-gray-700">都道府県</label>
            <input id="prefecture" class="custom-select" placeholder="例: 京都府">
          </div>

          <div>
            <label class="font-semibold text-gray-700">職種</label>
            <select id="category" class="custom-select">
              <option>全て</option>
              <option>飲食</option>
              <option>販売</option>
              <option>接客</option>
              <option>軽作業</option>
              <option>事務</option>
              <option>その他</option>
            </select>
          </div>

          <div>
            <label class="font-semibold text-gray-700">雇用形態</label>
            <select id="employment" class="custom-select">
              <option>全て</option>
              <option>アルバイト</option>
              <option>パート</option>
              <option>正社員</option>
            </select>
          </div>

          <div>
            <label class="font-semibold text-gray-700">最低時給</label>
            <input id="salary" type="number" class="custom-select" placeholder="1000">
          </div>

          <div class="md:col-span-2">
            <label class="font-semibold text-gray-700">キーワード</label>
            <input id="keyword" class="custom-select" placeholder="例: カフェ・接客など">
          </div>

        </div>

        <div class="text-center pt-4">
          <button type="submit" class="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600">
            検索する
          </button>
        </div>
      </form>
    `;

    document.getElementById("searchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const filters = {
        prefecture: document.getElementById("prefecture").value.trim(),
        category: document.getElementById("category").value,
        employment: document.getElementById("employment").value,
        salary: document.getElementById("salary").value,
        keyword: document.getElementById("keyword").value.trim(),
      };
      this.onSearch(filters);
    });
  }
}
