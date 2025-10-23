class SearchForm {
  constructor(container, onSearch) {
    this.container = container;
    this.onSearch = onSearch;
    this.render();
  }

  async render() {
    const { keywords, categories, wages } = await DataService.distincts();

    // 都道府県リスト（固定）
    const prefectures = [
      "全て","北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
      "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
      "新潟県","富山県","石川県","福井県","山梨県","長野県",
      "岐阜県","静岡県","愛知県","三重県",
      "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
      "鳥取県","島根県","岡山県","広島県","山口県",
      "徳島県","香川県","愛媛県","高知県",
      "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"
    ];

    this.container.innerHTML = `
      <div class="bg-white rounded-xl shadow p-4 md:p-5">
        <form id="searchForm" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <!-- 都道府県 -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">都道府県</label>
            <select id="prefectureSelect" class="custom-select w-full">
              ${prefectures.map(p => `<option value="${p}">${p}</option>`).join("")}
            </select>
          </div>

          <!-- キーワード -->
          <div class="sm:col-span-2 relative">
            <label class="block text-sm font-semibold text-gray-700 mb-1">キーワード</label>
            <input id="keywordInput" class="custom-select w-full" placeholder="例：伊丹駅／接客／カフェ" autocomplete="off">
            <div id="kwSuggest" class="suggest-box hidden"></div>
          </div>

          <!-- 最低時給 -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">最低時給</label>
            <input id="wageInput" type="number" class="custom-select w-full" placeholder="例：1200" list="wageList">
            <datalist id="wageList">${wages.map(w=>`<option value="${w}">`).join("")}</datalist>
          </div>

          <!-- 職種カテゴリ -->
          <div class="lg:col-span-4">
            <label class="block text-sm font-semibold text-gray-700 mb-2">仕事のカテゴリ</label>
            <div class="flex flex-wrap gap-2">
              <button type="button" data-cat="全て" class="cat-btn px-3 py-1.5 rounded-full border border-gray-300 bg-white text-sm font-medium">全て</button>
              ${categories.map(c => `
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

    const keywordInput = this.container.querySelector("#keywordInput");
    const kwBox = this.container.querySelector("#kwSuggest");
    const categoryInput = this.container.querySelector("#categoryInput");

    // サジェスト動作
    const showSuggest = (box, items, onPick) => {
      if (!items.length) { box.classList.add("hidden"); return; }
      box.innerHTML = items.slice(0,10).map(v=>`<div class="suggest-item">${v}</div>`).join("");
      box.classList.remove("hidden");
      box.querySelectorAll(".suggest-item").forEach(el=>{
        el.addEventListener("click", ()=>{ onPick(el.textContent); box.classList.add("hidden"); });
      });
    };
    const filterArr = (arr, q) => arr.filter(v => v && v.toLowerCase().includes(q.toLowerCase()));

    keywordInput.addEventListener("input", e=>{
      const q = e.target.value.trim();
      if (!q) { kwBox.classList.add("hidden"); return; }
      showSuggest(kwBox, filterArr(keywords, q), (val)=> keywordInput.value = val);
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
        prefecture: document.getElementById("prefectureSelect").value,
        minWage: document.getElementById("wageInput").value,
        keyword: keywordInput.value.trim(),
        category: categoryInput.value
      };
      this.onSearch(payload);
    });
  }
}
