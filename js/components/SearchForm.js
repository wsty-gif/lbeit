class SearchForm {
  constructor(container, onSearch) {
    this.container = container;
    this.onSearch = onSearch;

    this.state = {
      keyword: "",
      locations: [],          // {type:'pref'|'city', pref, city?} の配列
      jobCategories: [],      // カテゴリ配列（OR）
      preferences: [],        // こだわり配列（OR）
      popular: [],            // 人気の条件（OR）
      annualMin: "",          // 年収（万円）
      employments: []         // 雇用形態（OR）
    };

    this.render();
  }

  async render() {
    const { REGION_PREFS, citiesByPref, jobCategories, preferences, POPULAR, ANNUALS, EMPLOYMENTS } =
      await DataService.distincts();

    // --- 選択内容の丸チップ表示（共通）
    const chips = (arr) => arr.map(t => `<span class="inline-flex items-center text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">${t}</span>`).join(" ");

    // --- 本体フォーム
    this.container.innerHTML = `
      <div class="bg-white rounded-xl shadow p-4 md:p-5 space-y-4">

        <!-- 1行目：キーワード -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">キーワード</label>
          <input id="sf-keyword" class="custom-select w-full" placeholder="例：倉庫 ピッキング／伊丹駅／高収入">
        </div>

        <!-- 2行目：ボタン3つ -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button id="btn-loc" class="h-12 rounded-lg border border-gray-300 bg-white font-semibold hover:bg-gray-50 flex items-center justify-between px-3">
            <span>勤務地</span>
            <span class="text-xs text-gray-500">選択する</span>
          </button>
          <button id="btn-job" class="h-12 rounded-lg border border-gray-300 bg-white font-semibold hover:bg-gray-50 flex items-center justify-between px-3">
            <span>職種</span>
            <span class="text-xs text-gray-500">選択する</span>
          </button>
          <button id="btn-pref" class="h-12 rounded-lg border border-gray-300 bg-white font-semibold hover:bg-gray-50 flex items-center justify-between px-3">
            <span>こだわり条件</span>
            <span class="text-xs text-gray-500">選択する</span>
          </button>
        </div>

        <!-- 選択要約（クリア可能） -->
        <div class="space-y-2 text-sm">
          <div id="sum-loc" class="flex items-center gap-2 hidden">
            <span class="font-bold">勤務地</span>
            <div class="flex flex-wrap gap-1" id="sum-loc-chips"></div>
            <button id="clear-loc" class="text-blue-600 underline ml-auto">条件をクリア</button>
          </div>
          <div id="sum-job" class="flex items-center gap-2 hidden">
            <span class="font-bold">職種</span>
            <div class="flex flex-wrap gap-1" id="sum-job-chips"></div>
            <button id="clear-job" class="text-blue-600 underline ml-auto">条件をクリア</button>
          </div>
          <div id="sum-pref" class="flex items-center gap-2 hidden">
            <span class="font-bold">こだわり</span>
            <div class="flex flex-wrap gap-1" id="sum-pref-chips"></div>
            <button id="clear-pref" class="text-blue-600 underline ml-auto">条件をクリア</button>
          </div>
        </div>

        <!-- 人気の条件（チェック複数選択 → OR） -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">人気の条件</label>
          <div class="flex flex-wrap gap-2" id="popular-wrap">
            ${POPULAR.map(p => `
              <label class="inline-flex items-center gap-2 text-sm border rounded-full px-3 py-1 cursor-pointer">
                <input type="checkbox" value="${p}" class="pop-chk accent-orange-500">
                <span>${p}</span>
              </label>`).join("")}
          </div>
        </div>

        <!-- 年収・雇用形態 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">年収</label>
            <select id="sf-annual" class="custom-select w-full">
              <option value="">指定なし</option>
              ${ANNUALS.map(a => `<option value="${a}">${a}万円以上</option>`).join("")}
              <option value="1000">1000万円以上</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">雇用形態</label>
            <div class="flex flex-wrap gap-2">
              ${EMPLOYMENTS.map(e => `
                <label class="inline-flex items-center gap-2 text-sm border rounded-full px-3 py-1 cursor-pointer">
                  <input type="checkbox" value="${e}" class="emp-chk accent-orange-500">
                  <span>${e}</span>
                </label>`).join("")}
            </div>
          </div>
        </div>

        <!-- 検索ボタン -->
        <div class="pt-2">
          <button id="sf-submit" class="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:brightness-105 text-white font-bold h-12 rounded-lg shadow">
            この条件で検索する
          </button>
        </div>
      </div>
    `;

    // --- モーダルを body に生成（共通の骨格）
    const makeModal = (id, title) => {
      const el = document.createElement("div");
      el.id = id;
      el.className = "fixed inset-0 z-50 hidden";
      el.innerHTML = `
        <div class="absolute inset-0 bg-black/50"></div>
        <div class="absolute inset-0 overflow-y-auto p-3">
          <div class="bg-white rounded-xl max-w-4xl mx-auto">
            <div class="flex items-center justify-between p-4 border-b">
              <h3 class="text-lg font-bold">${title}</h3>
              <button class="modal-close p-2"><i data-lucide="x"></i></button>
            </div>
            <div class="p-4" data-modal-body></div>
            <div class="flex items-center justify-between p-4 border-t">
              <button class="modal-clear h-10 px-4 rounded-lg border font-semibold">クリア</button>
              <button class="modal-apply h-10 px-4 rounded-lg bg-orange-500 text-white font-bold">内容を反映する</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(el);
      if (typeof lucide !== "undefined") lucide.createIcons();
      return el;
    };

    // ====== 1) 勤務地モーダル ======
    const locModal = makeModal("loc-modal", "勤務地");
    const locBody = locModal.querySelector("[data-modal-body]");

    // 左：地域、右：都道府県＋市
    const regions = Object.keys(REGION_PREFS);
    locBody.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <ul id="loc-region" class="space-y-2">
            ${regions.map((rg, idx)=>`
              <li>
                <button data-rg="${rg}" class="w-full text-left px-3 py-2 rounded-lg border ${idx===0?'bg-orange-50 border-orange-300':''}">
                  ${rg} <span class="inline-block ml-2 align-middle text-[10px] text-white bg-red-500 rounded-full px-2" data-dot style="display:none;">●</span>
                </button>
              </li>`).join("")}
          </ul>
        </div>
        <div class="md:col-span-2">
          <div id="loc-right" class="space-y-3"></div>
        </div>
      </div>
    `;

    let locTmp = structuredClone(this.state.locations); // モーダル内ワーク

    const renderLocRight = (rg) => {
      const prefs = REGION_PREFS[rg] || [];
      const html = prefs.map(pref => {
        const cities = citiesByPref[pref] || [];
        const checkedPref = !!locTmp.find(x => x.type==='pref' && x.pref===pref);
        const cityItems = cities.map(city => {
          const checked = !!locTmp.find(x => x.type==='city' && x.pref===pref && x.city===city);
          return `
            <label class="flex items-center gap-2 py-1">
              <input type="checkbox" data-city="${city}" data-pref="${pref}" class="accent-orange-500 loc-city" ${checked?'checked':''}>
              <span>${city}</span>
            </label>`;
        }).join("");
        return `
          <div class="border rounded-lg">
            <div class="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
              <div class="font-bold">${pref}</div>
              <button class="px-2 py-1 text-sm border rounded-lg add-expand" data-pref="${pref}">＋</button>
            </div>
            <div class="px-3 py-2">
              <label class="inline-flex items-center gap-2 mr-3">
                <input type="checkbox" class="accent-orange-500 loc-pref" data-pref="${pref}" ${checkedPref?'checked':''}>
                <span>都道府県ごと選択</span>
              </label>
              <div class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4" data-city-wrap>
                ${cityItems || `<div class="text-xs text-gray-500">この都道府県に市データがありません</div>`}
              </div>
            </div>
          </div>`;
      }).join("");
      locBody.querySelector("#loc-right").innerHTML = html;

      // prefチェック
      locBody.querySelectorAll(".loc-pref").forEach(chk=>{
        chk.addEventListener("change", ()=>{
          const pref = chk.dataset.pref;
          // 同prefの city 選択はクリア
          locTmp = locTmp.filter(x => !(x.pref===pref));
          if (chk.checked) locTmp.push({type:'pref', pref});
          paintDots();
        });
      });

      // cityチェック
      locBody.querySelectorAll(".loc-city").forEach(chk=>{
        chk.addEventListener("change", ()=>{
          const pref = chk.dataset.pref, city = chk.dataset.city;
          // 同prefの pref選択は排他
          locTmp = locTmp.filter(x => !(x.type==='pref' && x.pref===pref));
          if (chk.checked) locTmp.push({type:'city', pref, city});
          else locTmp = locTmp.filter(x => !(x.type==='city' && x.pref===pref && x.city===city));
          paintDots();
        });
      });

      // 「＋」でそのprefの市一覧開閉（今回は簡易でスクロール誘導）
      locBody.querySelectorAll(".add-expand").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          btn.closest(".border").querySelector("[data-city-wrap]").scrollIntoView({behavior:"smooth", block:"start"});
        });
      });
    };

    const paintDots = () => {
      // 地域ボタン右の赤丸表示（何か選択がその地域にあれば表示）
      locBody.querySelectorAll("#loc-region [data-rg]").forEach(b=>{
        const rg = b.dataset.rg;
        const prefs = new Set(REGION_PREFS[rg] || []);
        const has = locTmp.some(x => prefs.has(x.pref));
        b.querySelector("[data-dot]").style.display = has ? "inline-block" : "none";
      });
    };

    // 初期：最初の地域
    let curRegion = regions[0];
    renderLocRight(curRegion);
    paintDots();

    // 左の地域クリック
    locBody.querySelectorAll("#loc-region [data-rg]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        curRegion = btn.dataset.rg;
        locBody.querySelectorAll("#loc-region [data-rg]").forEach(b=>b.classList.remove("bg-orange-50","border-orange-300"));
        btn.classList.add("bg-orange-50","border-orange-300");
        renderLocRight(curRegion);
        paintDots();
      });
    });

    // モーダル共通操作
    const wireModal = (modal, onClear, onApply) => {
      const hide = () => modal.classList.add("hidden");
      modal.querySelector(".modal-close").addEventListener("click", hide);
      modal.querySelector(".modal-apply").addEventListener("click", ()=>{ onApply(); hide(); });
      modal.querySelector(".modal-clear").addEventListener("click", onClear);
      modal.addEventListener("click", (e)=>{ if (e.target === modal) hide(); });
    };

    wireModal(locModal,
      // クリア
      ()=>{
        locTmp = [];
        renderLocRight(curRegion);
        paintDots();
      },
      // 反映
      ()=>{
        this.state.locations = structuredClone(locTmp);
        this.renderSummary();
      }
    );

    // ====== 2) 職種モーダル ======
    const jobModal = makeModal("job-modal", "職種");
    const jobBody = jobModal.querySelector("[data-modal-body]");
    jobBody.innerHTML = `
      <div class="space-y-3">
        <input id="job-free" class="custom-select w-full" placeholder="職種をフリーワードで探す">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" id="job-list"></div>
      </div>
    `;
    let jobTmp = structuredClone(this.state.jobCategories);

    const drawJobs = (q="") => {
      const wrap = jobBody.querySelector("#job-list");
      const items = jobCategories.filter(c => c.toLowerCase().includes(q.toLowerCase()));
      wrap.innerHTML = items.map(c=>`
        <label class="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
          <input type="checkbox" class="job-chk accent-orange-500" value="${c}" ${jobTmp.includes(c)?'checked':''}>
          <span>${c}</span>
        </label>
      `).join("") || `<div class="text-sm text-gray-500">該当なし</div>`;
      wrap.querySelectorAll(".job-chk").forEach(chk=>{
        chk.addEventListener("change", ()=>{
          if (chk.checked) jobTmp.push(chk.value);
          else jobTmp = jobTmp.filter(v => v !== chk.value);
        });
      });
    };
    drawJobs();

    jobBody.querySelector("#job-free").addEventListener("input", e=> drawJobs(e.target.value));

    wireModal(jobModal,
      ()=>{ jobTmp = []; drawJobs(); },
      ()=>{ this.state.jobCategories = [...new Set(jobTmp)]; this.renderSummary(); }
    );

    // ====== 3) こだわり条件モーダル ======
    const prefModal = makeModal("pref-modal", "こだわり条件");
    const prefBody = prefModal.querySelector("[data-modal-body]");
    let prefTmp = structuredClone(this.state.preferences);

    const drawPrefs = (q="") => {
      const items = preferences.filter(c => c.toLowerCase().includes(q.toLowerCase()));
      prefBody.innerHTML = `
        <div class="space-y-3">
          <input id="pref-free" class="custom-select w-full" placeholder="こだわりをフリーワードで探す">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${items.map(c=>`
              <label class="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
                <input type="checkbox" class="pref-chk accent-orange-500" value="${c}" ${prefTmp.includes(c)?'checked':''}>
                <span>${c}</span>
              </label>`).join("")}
          </div>
        </div>
      `;
      prefBody.querySelectorAll(".pref-chk").forEach(chk=>{
        chk.addEventListener("change", ()=>{
          if (chk.checked) prefTmp.push(chk.value);
          else prefTmp = prefTmp.filter(v => v !== chk.value);
        });
      });
      prefBody.querySelector("#pref-free").addEventListener("input", e=> drawPrefs(e.target.value));
    };
    drawPrefs();

    wireModal(prefModal,
      ()=>{ prefTmp = []; drawPrefs(); },
      ()=>{ this.state.preferences = [...new Set(prefTmp)]; this.renderSummary(); }
    );

    // ====== ボタンでモーダル起動 ======
    this.container.querySelector("#btn-loc").addEventListener("click", ()=> locModal.classList.remove("hidden"));
    this.container.querySelector("#btn-job").addEventListener("click", ()=> jobModal.classList.remove("hidden"));
    this.container.querySelector("#btn-pref").addEventListener("click", ()=> prefModal.classList.remove("hidden"));

    // ====== 人気の条件（チェック → OR）
    this.container.querySelectorAll(".pop-chk").forEach(chk=>{
      chk.addEventListener("change", ()=>{
        if (chk.checked) this.state.popular.push(chk.value);
        else this.state.popular = this.state.popular.filter(v=>v!==chk.value);
      });
    });

    // 年収
    this.container.querySelector("#sf-annual").addEventListener("change", (e)=>{
      this.state.annualMin = e.target.value;
    });

    // 雇用形態
    this.container.querySelectorAll(".emp-chk").forEach(chk=>{
      chk.addEventListener("change", ()=>{
        if (chk.checked) this.state.employments.push(chk.value);
        else this.state.employments = this.state.employments.filter(v=>v!==chk.value);
      });
    });

    // キーワード
    this.container.querySelector("#sf-keyword").addEventListener("input", (e)=>{
      this.state.keyword = e.target.value.trim();
    });

    // クリア操作（サマリー行）
    this.container.addEventListener("click", (e)=>{
      if (e.target.id === "clear-loc") { this.state.locations = []; this.renderSummary(); }
      if (e.target.id === "clear-job") { this.state.jobCategories = []; this.renderSummary(); }
      if (e.target.id === "clear-pref") { this.state.preferences = []; this.renderSummary(); }
    });

    // 検索ボタン
    this.container.querySelector("#sf-submit").addEventListener("click", async ()=>{
      await this.applySearch();
    });

    // 初回サマリー反映
    this.renderSummary();
  }

  renderSummary() {
    // サマリー表示＆隠し
    const has = (arr)=> arr && arr.length>0;
    const locSum = document.getElementById("sum-loc");
    const jobSum = document.getElementById("sum-job");
    const prefSum = document.getElementById("sum-pref");

    const locChips = document.getElementById("sum-loc-chips");
    const jobChips = document.getElementById("sum-job-chips");
    const prefChips = document.getElementById("sum-pref-chips");

    // 勤務地の表示ラベル：例）北海道／北海道, 青森市
    if (this.state.locations.length) {
      const labels = this.state.locations.map(x => x.type==='pref' ? x.pref : `${x.city}`);
      locChips.innerHTML = labels.map(t=>`<span class="inline-flex items-center text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">${t}</span>`).join(" ");
      locSum.classList.remove("hidden");
    } else {
      locSum.classList.add("hidden");
    }

    if (this.state.jobCategories.length) {
      jobChips.innerHTML = this.state.jobCategories.map(t=>`<span class="inline-flex items-center text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">${t}</span>`).join(" ");
      jobSum.classList.remove("hidden");
    } else jobSum.classList.add("hidden");

    if (this.state.preferences.length) {
      prefChips.innerHTML = this.state.preferences.map(t=>`<span class="inline-flex items-center text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">${t}</span>`).join(" ");
      prefSum.classList.remove("hidden");
    } else prefSum.classList.add("hidden");
  }

  async applySearch() {
    const payload = { ...this.state };
    await this.onSearch(payload);
    // 検索結果に視線移動は app.js 側で
  }
}
