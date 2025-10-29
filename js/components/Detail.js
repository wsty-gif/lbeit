class Detail {
  constructor(container) {
    this.container = container;
  }

  show(acc) {
    // 🔧 背景スクロールを禁止
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    const areaText = `${acc.prefecture}${acc.city ? acc.city : ""} ⁄ ${acc.station || "最寄駅未記載"}`;
    const mapQuery  = encodeURIComponent(acc.address || `${acc.prefecture}${acc.city || ""}`);

    const formatText = (text) => (text || "")
      .replace(/\\n/g, "\n")
      .replace(/\n/g, "<br>");


// 🔧 画像URLを確実に配列化（どんな入力形式でもOKにする）
let images = [];

// ✅ data.js で images に配列が入っている前提
if (Array.isArray(acc.images)) {
  images = acc.images.map(s => s.trim()).filter(Boolean);
}
// fallback: 旧データ対応
else if (typeof acc.image === "string") {
  images = acc.image.split(",").map(s => s.trim()).filter(Boolean);
}

// ✅ 安全策
if (images.length === 0) {
  images = ["https://via.placeholder.com/800x500?text=No+Image"];
}


const mainImage = images[0];


// ✅ カルーセル構造（横スライド対応）
let imageSlider = `
<div class="relative overflow-hidden rounded-lg">
  <div id="imgSlider" class="flex transition-transform duration-300">
    ${images.map((url, i) => `
      <img id="${i === 0 ? 'main-image' : ''}"
           src="${url}" 
           alt="${acc.name}" 
           class="w-full h-60 object-cover flex-shrink-0 bg-gray-100 transition-transform duration-300">
    `).join("")}
  </div>


  ${images.length > 1 ? `
    <div id="thumbnail-list" class="flex gap-2 overflow-x-auto mt-2 pb-2">
      ${images.map((url, i) => `
        <img src="${url}" 
             data-index="${i}"
             class="thumb w-20 h-14 object-cover rounded-md border ${i === 0 ? "border-red-500" : "border-transparent"} cursor-pointer hover:opacity-80 transition block bg-gray-100">
      `).join("")}
    </div>
  ` : ""}
`;

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
      <div class="sticky top-0 z-50 p-3 border-b bg-white rounded-t-xl flex items-center justify-between shadow-sm">
        <button id="closeDetail" class="text-gray-600 hover:text-gray-900 flex items-center gap-1">
          <i data-lucide="arrow-left" class="w-4 h-4"></i><span>戻る</span>
        </button>
        <a href="https://line.me/R/ti/p/@${acc.lineId}" target="_blank" 
          class="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-3 py-2 rounded-lg">
          LINEで応募
        </a>
      </div>

      <div class="p-4 space-y-4 overflow-y-auto" style="max-height: calc(100vh - 60px); padding-bottom: 100px;">
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



    // ✅ 「もっと見る」ボタン処理
    this.container.querySelectorAll(".more-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = this.container.querySelector("#" + btn.dataset.target);
        const expanded = target.classList.toggle("max-h-full");
        btn.textContent = expanded ? "閉じる" : "もっと見る";
      });
    });

// ✅ カルーセル機能（クリック・スワイプ・サムネ連動）
if (images.length > 1) {
  const slider = this.container.querySelector("#imgSlider");
  const thumbs = this.container.querySelectorAll(".thumb");
  const prev = this.container.querySelector("#prevImg");
  const next = this.container.querySelector("#nextImg");
  let index = 0;

  const move = (dir) => {
    index = (index + dir + images.length) % images.length;
    slider.style.transform = `translateX(-${index * 100}%)`;
    thumbs.forEach((t, i) => {
      t.classList.toggle("border-red-500", i === index);
      t.classList.toggle("border-transparent", i !== index);
    });
  };

  prev?.addEventListener("click", () => move(-1));
  next?.addEventListener("click", () => move(1));

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener("click", () => {
      index = i;
      slider.style.transform = `translateX(-${index * 100}%)`;
      thumbs.forEach((t, n) => {
        t.classList.toggle("border-red-500", n === index);
        t.classList.toggle("border-transparent", n !== index);
      });
    });
  });

  // スワイプ操作対応
  let startX = 0;
  slider.addEventListener("touchstart", e => (startX = e.touches[0].clientX));
  slider.addEventListener("touchend", e => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 50) move(diff > 0 ? -1 : 1);
  });
}


    // ✅ 戻るボタン
    this.container.querySelector("#closeDetail").addEventListener("click", () => {
      document.getElementById("detail-modal").classList.add("hidden");
      // ✅ 戻る時に背景スクロールを復元
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    });

    lucide.createIcons();
  }
}
