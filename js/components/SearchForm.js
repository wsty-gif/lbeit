class SearchForm {
  constructor(container, onSearch) {
    this.container = container;
    this.onSearch = onSearch;
    this.state = { suggestions: null };
    this.render();
  }

  async render() {
    const { prefectures, keywords, categories, wages } = await DataService.distincts();

    this.container.innerHTML = `
      <div class="bg-white rounded-xl shadow p-4 md:p-5">
        <form id="searchForm" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">

          <!-- 都道府県（サジェスト） -->
          <div class="relative">
            <label class="block text-sm font-semibold text-gray-700 mb-1">都道府県</label>
            <input id="prefectureInput" class="custom-select w-full" placeholder="例：兵庫県" autocomplete="off">
            <div id="prefSuggest" class="suggest-box hidden"></div>
          </div>

          <!-- 最寄駅/キーワード（サジェスト） -->
          <div class="relative sm:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-1">キーワード（店名・駅・カテゴリ）</label>
            <input id="keywordInput" class="custom-select w-full" placeholder="例：伊丹駅／接客／カフェ" autocomplete="off">
            <div id="kwSuggest" class="suggest-box hidden"></div>
          </div>

          <!-- 最低時給（候補） -->
          <div class="relative">
            <label class="block text-sm font-semibold text-gray-700 mb-1">最低時給</label>
            <input id="wageInput" type="number" class="custom-select w-full" placeholder="例：1200" list="wageList">
            <datalist id="wageList">
              ${wages.map(w=>`<option value="${w}">`).join("")}
            </datalist>
          </div>

          <!-- 職種カテゴリ -->
          <div class="relative lg:col-span-4">
            <label class="block text-sm font-semibold text-gray-700 mb-2">仕事のカテゴリ（任意）</label>
            <div class="flex flex-wrap gap-2">
              <button type="button" data-cat="全て" class="cat-btn px-3 py-1.5 rounded-full border border-gray-300 bg-white text-sm font-medium">全て</button>
              ${categories.map(c=>`
                <button type="button" data-cat="${c}" class="cat-btn px-3 py-1.5 rounded-full border border-gray-300 bg-white text-sm">${c}</button>
              `).join("")}
            </div>
            <input type="hidden" id="categoryInput" value="全て">
          </div>

          <!-- 検索ボタン -->
          <div class="sm:col-span-2 lg:col-span-4">
            <button class="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:brightness-105 text-white font-bold h-12 rounded-lg shadow">
              この条件で検索する
            </button>
          </div>
        </form>
      </div>
    `;

    // サジェスト動作
    const prefectureInput = this.container.querySelector("#prefectureInput");
    const keywordInput    = this.container.querySelector("#keywordInput");
    const prefBox         = this.container.querySelector("#prefSuggest");
    const kwBox           = this.container.querySelector("#kwSuggest");
    const categoryInput   = this.container.querySelector("#categoryInput");

    const showSuggest = (box, items, onPick) => {
      if (!items.length) { box.classList.add("hidden"); return; }
      box.innerHTML = items.slice(0,10).map(v=>`<div class="suggest-item">${v}</div>`).join("");
      box.classList.remove("hidden");
      box.querySelectorAll(".suggest-item").forEach(el=>{
        el.addEventListener("click", ()=>{ onPick(el.textContent); box.classList.add("hidden"); });
      });
    };

    const filterArr = (arr, q) => arr.filter(v => v && v.toLowerCase().includes(q.toLowerCase()));

    prefectureInput.addEventListener("input", e=>{
      const q = e.target.value.trim();
      if (!q) { prefBox.classList.add("hidden"); return; }
      showSuggest(prefBox, filterArr(prefectures, q), (val)=> prefectureInput.value = val);
    });
    prefectureInput.addEventListener("blur", ()=> setTimeout(()=>prefBox.classList.add("hidden"), 120));

    keywordInput.addEventListener("input", e=>{
      const q = e.target.value.trim();
      if (!q) { kwBox.classList.add("hidden"); return; }
      showSuggest(kwBox, filterArr(keywords, q), (val)=> {
        // 追記型：既存キーワードにスペース区切りで追加
        if (keywordInput.value && !keywordInput.value.endsWith(" ")) keywordInput.value += " ";
        keywordInput.value += val;
      });
    });
    keywordInput.addEventListener("blur", ()=> setTimeout(()=>kwBox.classList.add("hidden"), 120));

    // カテゴリ選択
    this.container.querySelectorAll(".cat-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        this.container.querySelectorAll(".cat-btn").forEach(b=>b.classList.remove("ring","ring-orange-400","bg-orange-50"));
        btn.classList.add("ring","ring-orange-400","bg-orange-50");
        categoryInput.value = btn.dataset.cat || "全て";
      });
    });

    // 検索
    this.container.querySelector("#searchForm").addEventListener("submit", (e)=>{
      e.preventDefault();
      const payload = {
        prefecture: prefectureInput.value.trim(),
        minWage: this.container.querySelector("#wageInput").value.trim(),
        keyword: keywordInput.value.trim(),
        category: categoryInput.value
      };
      this.onSearch(payload);
    });
  }
}
