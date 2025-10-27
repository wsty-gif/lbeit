class SearchForm {
  constructor(container, onSearch) {
    this.container = container;
    this.onSearch = onSearch;
    this.filters = { keyword: "", prefecture: "", city: "" };
    this.render();
    this.bind();
  }

  async render() {
    const prefOptions = PREF_CITY_DATA.map(p => `<option value="${p.pref}">${p.pref}</option>`).join("");
    this.container.innerHTML = `
      <form id="job-search" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">キーワード</label>
          <input id="keyword" type="text" placeholder="例：コンビニ、カフェ、倉庫など" class="w-full border px-3 py-2 rounded-md"/>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">都道府県</label>
            <select id="pref" class="w-full">
              <option value="">選択してください</option>
              ${prefOptions}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">市区町村</label>
            <select id="city" class="w-full">
              <option value="">選択してください</option>
            </select>
          </div>
        </div>

        <button id="search-btn" type="submit" class="w-full bg-gradient-to-r from-orange-500 to-red-400 text-white font-bold py-2 rounded-lg hover:opacity-90 transition">
          この条件で検索
        </button>
      </form>
    `;
  }

  bind() {
    const prefEl = this.container.querySelector("#pref");
    const cityEl = this.container.querySelector("#city");
    const formEl = this.container.querySelector("#job-search");

    prefEl.addEventListener("change", () => {
      const selected = PREF_CITY_DATA.find(p => p.pref === prefEl.value);
      cityEl.innerHTML = '<option value="">選択してください</option>' +
        (selected ? selected.cities.map(c => `<option value="${c}">${c}</option>`).join("") : "");
    });

    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      this.filters.keyword = this.container.querySelector("#keyword").value.trim();
      this.filters.prefecture = prefEl.value;
      this.filters.city = cityEl.value;
      this.onSearch(this.filters);
    });
  }
}
