class SearchResults {
  constructor(container, onDetail) {
    this.container = container;
    this.onDetail = onDetail;
  }

  show(list) {
    if (!list || list.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-16 bg-white rounded-xl shadow">
          <div class="text-6xl mb-3">🔍</div>
          <p class="text-gray-700 font-semibold">該当する求人は見つかりませんでした。</p>
        </div>`;
      return;
    }

    this.container.innerHTML = `
      <div class="mb-3 text-sm text-gray-600">検索結果：<span class="font-bold">${list.length}</span>件</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${list.map(acc => this.card(acc)).join("")}
      </div>
    `;

    this.container.querySelectorAll(".job-card").forEach(card=>{
      card.addEventListener("click", (e)=>{
        if (e.target.closest("a")) return;
        this.onDetail(card.dataset.id);
      });
    });
  }

  // 指定：店名＋「都道府県市区町村 / 最寄駅」＋カテゴリ＋時給
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
