class Detail {
  constructor(container) { this.container = container; }

  async show(id) {
    const data = await DataService.load();
    const acc = data.find(a => a.id === id);
    if (!acc) return;

    const areaText = `${acc.prefecture}${acc.city ? acc.city : ""} ⁄ ${acc.station || "最寄駅未記載"}`;
    const mapQuery  = encodeURIComponent(acc.address || `${acc.prefecture}${acc.city || ""}`);
    const formatText = (t) => (t||"").replace(/\\n/g,"\n").replace(/\n/g,"<br>");

    const images = (acc.image||"").split(",").map(s=>s.trim()).filter(Boolean);
    const slider = images.length ? `
      <div class="relative overflow-hidden rounded-lg touch-pan-x select-none">
        <div class="flex transition-transform duration-300 ease-in-out" id="imgSlider">
          ${images.map(url => `<img src="${url}" class="w-full h-64 sm:h-72 object-cover flex-shrink-0" alt="${acc.name}">`).join("")}
        </div>
        ${images.length>1 ? `
          <button id="prevImg" class="absolute top-1/2 left-3 -translate-y-1/2 bg-white/70 p-2 rounded-full shadow hover:bg-white">
            <i data-lucide="chevron-left"></i>
          </button>
          <button id="nextImg" class="absolute top-1/2 right-3 -translate-y-1/2 bg-white/70 p-2 rounded-full shadow hover:bg-white">
            <i data-lucide="chevron-right"></i>
          </button>`:``}
      </div>` : "";

    const longSection = (title, body, id) => `
      <div class="bg-white rounded-lg border p-4 mb-4">
        <p class="text-sm font-bold text-gray-800 mb-2">${title}</p>
        <div id="${id}" class="text-sm text-gray-800 overflow-hidden relative max-h-48 transition-all duration-300" style="line-height:1.6;">
          <div class="content-inner">${formatText(body) || "未記載"}</div>
        </div>
        ${(body && body.length > 200) ? `<button data-target="${id}" class="mt-2 text-blue-600 font-bold text-sm underline more-btn">もっと見る</button>` : ``}
      </div>`;

    this.container.innerHTML = `
      <div class="sticky top-0 p-3 border-b bg-white rounded-t-xl flex items-center justify-between">
        <button id="closeDetail" class="text-gray-600 hover:text-gray-900 flex items-center gap-1">
          <i data-lucide="arrow-left" class="w-4 h-4"></i><span>戻る</span>
        </button>
        ${acc.lineId ? `<a href="https://line.me/R/ti/p/@${acc.lineId}" target="_blank" class="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-3 py-2 rounded-lg">LINEで応募</a>`:""}
      </div>

      <div class="p-4 space-y-4">
        ${slider}
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
            <a href="https://www.google.com/maps/search/?api=1&query=${mapQuery}" target="_blank" class="inline-flex items-center gap-2 text-blue-600 font-bold">
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
        const expanded = target.classList.toggle("max-h-full");
        btn.textContent = expanded ? "閉じる" : "もっと見る";
      });
    });

    // スライダー
    if (images.length>1){
      const sliderEl = this.container.querySelector("#imgSlider");
      const prev = this.container.querySelector("#prevImg");
      const next = this.container.querySelector("#nextImg");
      let index = 0;
      const move = (d)=>{ index = (index + d + images.length) % images.length; sliderEl.style.transform = `translateX(-${index*100}%)`; };
      prev?.addEventListener("click", ()=>move(-1));
      next?.addEventListener("click", ()=>move(1));
      let sx=0, ex=0;
      sliderEl.addEventListener("touchstart", e=> sx=e.touches[0].clientX);
      sliderEl.addEventListener("touchmove",  e=> ex=e.touches[0].clientX);
      sliderEl.addEventListener("touchend", ()=>{ const diff=ex-sx; if(Math.abs(diff)>50) move(diff>0?-1:1); sx=ex=0; });
    }

    // 閉じる
    document.getElementById("detail-close")?.addEventListener("click", ()=>document.getElementById("detail-modal").classList.add("hidden"));
    this.container.querySelector("#closeDetail")?.addEventListener("click", ()=>document.getElementById("detail-modal").classList.add("hidden"));

    lucide.createIcons();
  }
}
