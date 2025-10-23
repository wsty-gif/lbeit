class Detail {
  constructor(container) {
    this.container = container;
  }

  show(account) {
    this.container.innerHTML = `
      <div class="p-6">
        <button id="closeDetail" class="text-gray-500 hover:text-gray-800 mb-4 flex items-center gap-2">
          <i data-lucide="arrow-left"></i> 戻る
        </button>

        <h2 class="text-2xl font-bold mb-2">${account["店舗名"]}</h2>
        <p class="text-gray-700 mb-2">${account["職種"]} / ${account["雇用形態"]}</p>
        <p class="text-orange-600 font-semibold mb-4">💰 時給 ${account["時給"]}円〜</p>
        <p class="text-gray-700 mb-4">${account["募集内容"]}</p>

        <a href="https://line.me/R/ti/p/@${account["LINE_ID"]}" target="_blank"
          class="inline-block bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600">
          LINEで応募する
        </a>
      </div>
    `;

    document.getElementById("closeDetail").onclick = () => {
      document.getElementById("detail-modal").classList.add("hidden");
    };
    lucide.createIcons();
  }
}
