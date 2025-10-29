class SearchResults {
  constructor(container, onDetail) {
    this.container = container;
    this.onDetail = onDetail;
  }

  show(list) {
    // --- ✅ 0件時 ---
    if (!list || list.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-16 bg-white rounded-xl shadow">
          <p class="text-gray-800 font-semibold text-lg mb-2">
            該当する求人は見つかりませんでした。
          </p>
          <p class="text-gray-500 text-sm">
            条件をゆるめて、再検索してください
          </p>
        </div>`;
      return;
    }

    // --- ✅ 結果あり ---
    this.container.innerHTML = `
      <div class="mb-3 text-sm text-gray-600">検索結果：<span class="font-bold">${list.length}</span>件</div>
      <div id="result-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${list.map(acc => this.card(acc)).join("")}
      </div>
    `;

    // 詳細ボタン処理
    this.container.querySelectorAll(".job-card").forEach(card => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("a")) return; // LINE応募ボタンを除外
        this.onDetail(card.dataset.id);
      });
    });

    // --- ✅ 検索結果の1件目にスクロール ---
    const firstCard = this.container.querySelector(".job-card");
    if (firstCard) {
      firstCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // --- ✅ カード生成 ---
  card(acc) {
    const catText = acc.categories.join("、 ");
    const areaText = `${acc.prefecture}${acc.city ? acc.city : ""} ⁄ ${acc.station || "最寄駅未記載"}`;
    return `
      <div class="job-card bg-white rounded-xl shadow hover:-translate-y-0.5 transition cursor-pointer overflow-hidden" data-id="${acc.id}">
        <div class="relative">
          <img src="${acc.image || "https://via.placeholder.com/800x500?text=No+Image"}" alt="${acc.name}" class="w-full h-44 object-cover">
        </div>
        <div class="p-4">
          <h3 class="text-base font-bold text-gray-900 mb-1 line-clamp-2">${acc.name}</h3>
          <p class="text-xs text-gray-600 mb-1">${areaText}</p>
          <p class="text-sm text-gray-700 mb-1 clip-2">${catText}</p>
          <p class="text-orange-600 font-semibold">💰 時給 ${acc.wage.toLocaleString()}円〜</p>
          <div class="mt-3 text-center">
            <a href="https://line.me/R/ti/p/@${acc.lineId}" target="_blank" class="inline-block bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-green-600">
              LINEで応募する
            </a>
          </div>
        </div>
      </div>
    `;
  }
}
