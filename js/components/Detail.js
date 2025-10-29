class Detail {
  constructor(container) {
    this.container = container;
  }

  show(acc) {
    const areaText = `${acc.prefecture}${acc.city ? acc.city : ""} ⁄ ${acc.station || "最寄駅未記載"}`;
    const mapQuery  = encodeURIComponent(acc.address || `${acc.prefecture}${acc.city || ""}`);

    const formatText = (text) => (text || "")
      .replace(/\\n/g, "\n")
      .replace(/\n/g, "<br>");



// 旧：単一画像のみ表示している箇所を以下に置き換え
const images = (acc.image || "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

const mainImage = images.length
  ? images[0]
  : "https://via.placeholder.com/800x500?text=No+Image";

let imageSlider = `
  <div class="relative">
    <img id="main-image" src="${mainImage}" alt="${acc.name}" class="w-full h-60 object-cover rounded-lg transition-all duration-300">
  </div>
`;

if (images.length > 1) {
  imageSlider += `
    <div id="thumbnail-list" class="flex gap-2 overflow-x-auto mt-2 pb-2">
      ${images
        .map(
          (url, i) => `
          <img src="${url}" 
               data-index="${i}"
               class="thumb w-20 h-14 object-cover rounded-md border ${
                 i === 0 ? "border-red-500" : "border-transparent"
               } cursor-pointer hover:opacity-80 transition">
        `
        )
        .join("")}
    </div>
  `;
}


    // ✅ 長文の高さ制御
    const longSection = (title, body, id) => {
      const safeText = formatText(body);
      return `
        <div class="bg-white rounded-lg border p-4 mb-4">
          <p class="text-sm font-bold text-gray-800 mb-2">${title}</p>
          <div id="${id}" class="text-sm text-gray-800 overflow-hidden relative max-h-48 transition-all duration-300" style="line-height:1.5;">
            <div class="content-inner">${safeText || "未記載"}</div>
          </div>
          ${body && body.length > 200
            ? `<button data-target="${id}" class="more-btn mt-2 text-blue-600 font-bold text-sm underline">もっと見る</button>`
            : ""}
        </div>
      `;
    };

    // ✅ HTML構成
    this.container.innerHTML = `
      <div class="sticky top-0 p-3 border-b bg-white rounded-t-xl flex items-center justify-between">
        <button id="closeDetail" class="text-gray-600 hover:text-gray-900 flex items-center gap-1">
          <i data-lucide="arrow-left" class="w-4 h-4"></i><span>戻る</span>
        </button>
        <a href="https://line.me/R/ti/p/@${acc.lineId}" target="_blank" 
           class="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-3 py-2 rounded-lg">
           LINEで応募
        </a>
      </div>

      <div class="p-4 space-y-4">
        ${imageSlider}

        <div>
          <h2 class="text-xl font-bold text-gray-900 mt-2">${acc.name}</h2>
          <p class="text-sm text-gray-600 mt-1">${areaText}</p>
          <p class="text-orange-600 font-semibold mt-2">💰 時給 ${acc.wage.toLocaleString()}円〜</p>
        </div>

        ${longSection("職種", acc.jobLabel, "sec-job")}
        ${longSection("給与", acc.payDetail, "sec-pay")}
        ${longSection("勤務時間", acc.timeDetail || acc.timeShort, "sec-time")}

        <div class="bg-white rounded-lg border p-4 space-y-3">
          <p class="text-sm font-bold text-gray-800">勤務地</p>
          <div class="text-sm text-gray-800 whitespace-pre-wrap">${formatText(acc.placeDetail) || "未記載"}</div>
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
// ✅ サムネイルクリックでメイン画像切替
const mainImgEl = this.container.querySelector("#main-image");
const thumbs = this.container.querySelectorAll(".thumb");

thumbs.forEach((thumb) => {
  thumb.addEventListener("click", (e) => {
    const index = Number(e.target.dataset.index);
    mainImgEl.src = images[index];

    // 枠線の更新
    thumbs.forEach((t) => t.classList.remove("border-red-500"));
    e.target.classList.add("border-red-500");
  });
});



    // ✅ 「もっと見る」ボタン処理
    this.container.querySelectorAll(".more-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = this.container.querySelector("#" + btn.dataset.target);
        const expanded = target.classList.toggle("max-h-full");
        btn.textContent = expanded ? "閉じる" : "もっと見る";
      });
    });

    // ✅ 画像カルーセル（クリック＋スワイプ対応）
    if (images.length > 1) {
      const slider = this.container.querySelector("#imgSlider");
      const prev = this.container.querySelector("#prevImg");
      const next = this.container.querySelector("#nextImg");
      let index = 0;

      const move = (dir) => {
        index = (index + dir + images.length) % images.length;
        slider.style.transform = `translateX(-${index * 100}%)`;
      };

      // ボタン操作
      prev?.addEventListener("click", () => move(-1));
      next?.addEventListener("click", () => move(1));

      // 🟩 スワイプ操作追加
      let startX = 0;
      let endX = 0;

      slider.addEventListener("touchstart", (e) => {
        startX = e.touches[0].clientX;
      });

      slider.addEventListener("touchmove", (e) => {
        endX = e.touches[0].clientX;
      });

      slider.addEventListener("touchend", () => {
        const diff = endX - startX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) move(-1); // 右スワイプ → 前の画像
          else move(1);           // 左スワイプ → 次の画像
        }
        startX = endX = 0;
      });
    }

    // ✅ 戻るボタン
    this.container.querySelector("#closeDetail").addEventListener("click", () => {
      document.getElementById("detail-modal").classList.add("hidden");
    });

    lucide.createIcons();
  }
}
