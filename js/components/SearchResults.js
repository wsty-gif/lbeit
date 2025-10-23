class SearchResults {
  constructor(container, onDetail) {
    this.container = container;
    this.onDetail = onDetail;
  }

  show(accounts) {
    if (!accounts || accounts.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-16 bg-white rounded-lg shadow">
          <div class="text-6xl mb-3">🔍</div>
          <p class="text-gray-700 font-semibold">該当する求人は見つかりませんでした。</p>
        </div>`;
      return;
    }

    this.container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${accounts
          .map(
            (acc) => `
          <div class="bg-white rounded-lg shadow-md overflow-hidden hover:-translate-y-1 transition cursor-pointer" data-id="${acc["id"]}">
            <img src="${acc["画像URL"]}" alt="${acc["店舗名"]}" class="w-full h-48 object-cover">
            <div class="p-4">
              <h3 class="text-lg font-bold mb-1">${acc["店舗名"]}</h3>
              <p class="text-sm text-gray-600">${acc["職種"]} / ${acc["雇用形態"]}</p>
              <p class="text-orange-600 font-semibold mt-1">💰 時給 ${acc["時給"]}円〜</p>
              <p class="text-sm text-gray-700 line-clamp-2">${acc["募集内容"] || ""}</p>
              <a href="https://line.me/R/ti/p/@${acc["LINE_ID"]}" target="_blank"
                 class="block bg-green-500 text-white text-center rounded-lg py-2 mt-3 font-semibold hover:bg-green-600">
                LINEで応募する
              </a>
            </div>
          </div>`
          )
          .join("")}
      </div>
    `;

    this.container.querySelectorAll(".bg-white").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        this.onDetail(card.dataset.id);
      });
    });
  }
}
