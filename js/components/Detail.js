class Detail {
  constructor(container) {
    this.container = container;
  }

  show(acc) {
    const areaText = `${acc.prefecture}${acc.city ? acc.city : ""} ⁄ ${acc.station || "最寄駅未記載"}`;
    const mapQuery  = encodeURIComponent(acc.address || `${acc.prefecture}${acc.city || ""}`);
    const section = (title, body, id) => `
      <div class="bg-white rounded-lg border p-4">
        <p class="text-sm font-bold text-gray-800 mb-2">${title}</p>
        <div id="${id}" class="text-sm text-gray-800 whitespace-pre-wrap clip-4">${body || "未記載"}</div>
        ${body && body.length > 120 ? `<button data-target="${id}" class="more-btn mt-2">もっと見る</button>` : ``}
      </div>`;

    this.container.innerHTML = `
      <div class="sticky top-0 p-3 border-b bg-white rounded-t-xl flex items-center justify-between">
        <button id="closeDetail" class="text-gray-600 hover:text-gray-900 flex items-center gap-1">
          <i data-lucide="arrow-left" class="w-4 h-4"></i><span>戻る</span>
        </button>
        <a href="https://line.me/R/ti/p/@${acc.lineId}" target="_blank" class="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-3 py-2 rounded-lg">LINEで応募</a>
      </div>

      <div class="p-4 space-y-4">
        <div class="flex gap-3 items-start">
          <img src="${acc.image || "https://via.placeholder.com/800x500?text=No+Image"}" class="w-28 h-28 object-cover rounded-lg flex-shrink-0" alt="${acc.name}">
          <div class="flex-1">
            <h2 class="text-xl font-bold text-gray-900">${acc.name}</h2>
            <p class="text-sm text-gray-600 mt-1">${areaText}</p>
            <p class="text-orange-600 font-semibold mt-2">💰 時給 ${acc.wage.toLocaleString()}円〜</p>
          </div>
        </div>

        ${section("職種", acc.jobLabel, "sec-job")}
        ${section("給与", acc.payDetail, "sec-pay")}
        ${section("勤務時間", acc.timeDetail || acc.timeShort, "sec-time")}

        <div class="bg-white rounded-lg border p-4 space-y-3">
          <p class="text-sm font-bold text-gray-800">勤務地</p>
          <div class="text-sm text-gray-800 whitespace-pre-wrap">${acc.placeDetail || "未記載"}</div>
          <div class="text-xs text-gray-600">${acc.address ? `住所：${acc.address}` : ""}</div>
          <div class="pt-2">
            <a href="https://www.google.com/maps/search/?api=1&query=${mapQuery}" target="_blank"
               class="inline-flex items-center gap-2 text-blue-600 font-bold">
              <i data-lucide="map-pin" class="w-4 h-4"></i>勤務地のアクセス詳細を見る
            </a>
          </div>
        </div>
      </div>
    `;

    // もっと見る
    this.container.querySelectorAll(".more-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const target = this.container.querySelector("#"+btn.dataset.target);
        if (!target) return;
        const clipped = target.classList.contains("clip-4");
        target.classList.toggle("clip-4", !clipped);
        btn.textContent = clipped ? "閉じる" : "もっと見る";
      });
    });

    // 戻る
    this.container.querySelector("#closeDetail").addEventListener("click", ()=>{
      document.getElementById("detail-modal").classList.add("hidden");
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
  }
}
