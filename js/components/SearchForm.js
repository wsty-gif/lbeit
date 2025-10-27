class SearchForm {
  constructor(container, onSearch) {
    this.container = container;
    this.onSearch = onSearch;

    this.state = {
      keyword: "",
      locations: [],          // {type:'pref'|'city', pref, city?}
      jobCategories: [],      // OR
      preferences: [],        // OR
      popular: [],            // OR
      annualMin: "",          // 万円
      employments: []         // OR
    };

    this.render();
  }

  async render() {
    const { REGION_PREFS, citiesByPref, jobCategories, preferences, POPULAR, ANNUALS, EMPLOYMENTS, PREFERENCE_GROUPS } =
      await DataService.distincts();

    const pillWrap = "flex flex-wrap gap-2";
    const pillLbl = "pill-label";
    const pillChk = "accent-orange-500";

    // ====== 本体フォーム ======
    this.container.innerHTML = `
      <div class="bg-white rounded-xl shadow p-4 md:p-5 space-y-4">
        <!-- キーワード -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">キーワード</label>
          <input id="sf-keyword" class="w-full h-12 rounded-lg border border-gray-300 px-3 text-[16px] bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="例：倉庫 ピッキング／伊丹駅／高収入">
        </div>

        <!-- メインボタン -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button id="btn-loc" class="h-12 rounded-lg border border-gray-300 bg-white font-semibold hover:bg-gray-50 flex items-center justify-between px-3">
            <span>勤務地</span><span class="text-xs text-gray-500">選択する</span>
          </button>
          <button id="btn-job" class="h-12 rounded-lg border border-gray-300 bg-white font-semibold hover:bg-gray-50 flex items-center justify-between px-3">
            <span>職種</span><span class="text-xs text-gray-500">選択する</span>
          </button>
          <button id="btn-pref" class="h-12 rounded-lg border border-gray-300 bg-white font-semibold hover:bg-gray-50 flex items-center justify-between px-3">
            <span>こだわり条件</span><span class="text-xs text-gray-500">選択する</span>
          </button>
        </div>

        <!-- 選択サマリー -->
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

        <!-- 人気の条件 -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">人気の条件</label>
          <div class="${pillWrap}" id="popular-wrap">
            ${POPULAR.map(p => `
              <label class="${pillLbl}">
                <input type="checkbox" value="${p}" class="${pillChk} pop-chk">
                <span>${p}</span>
              </label>`).join("")}
          </div>
        </div>

        <!-- 年収・雇用形態 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">年収</label>
            <select id="sf-annual" class="w-full h-12 rounded-lg border border-gray-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="">指定なし</option>
              ${ANNUALS.map(a => `<option value="${a}">${a}万円以上</option>`).join("")}
              <option value="1000">1000万円以上</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">雇用形態</label>
            <div class="${pillWrap}">
              ${EMPLOYMENTS.map(e => `
                <label class="${pillLbl}">
                  <input type="checkbox" value="${e}" class="${pillChk} emp-chk">
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

    // ====== モーダル生成（共通骨格） ======
    const makeModal = (id, title) => {
      const el = document.createElement("div");
      el.id = id;
      el.className = "fixed inset-0 z-50 hidden";
      el.innerHTML = `
        <div class="absolute inset-0 bg-black/50"></div>
        <div class="absolute inset-0 overflow-y-auto p-3">
          <div class="bg-white rounded-xl max-w-5xl mx-auto">
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
    const wireModal = (modal, onClear, onApply) => {
      const hide = () => modal.classList.add("hidden");
      modal.querySelector(".modal-close").addEventListener("click", hide);
      modal.querySelector(".modal-apply").addEventListener("click", ()=>{ onApply(); hide(); });
      modal.querySelector(".modal-clear").addEventListener("click", onClear);
      modal.addEventListener("click", (e)=>{ if (e.target === modal) hide(); });
    };

    // ===== 1) 勤務地モーダル =====
    const locModal = makeModal("loc-modal", "勤務地");
    const locBody = locModal.querySelector("[data-modal-body]");
    const regions = Object.keys(REGION_PREFS);
    let curRegion = regions[0];
    let locTmp = structuredClone(this.state.locations);

    const paintDots = () => {
      locBody.querySelectorAll("[data-rg]").forEach(b=>{
        const rg = b.dataset.rg;
        const prefs = new Set(REGION_PREFS[rg] || []);
        const has = locTmp.some(x => prefs.has(x.pref));
        b.querySelector("[data-dot]").classList.toggle("opacity-100", has);
      });
    };

    const renderLoc = () => {
      locBody.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- 左：地域ボタン -->
          <div class="space-y-2">
            ${regions.map((rg)=>`
              <button data-rg="${rg}" class="w-full text-left px-3 py-2 rounded-lg border ${rg===curRegion?'bg-orange-50 border-orange-300':''} flex items-center justify-between">
                <span>${rg}</span>
                <span data-dot class="w-2 h-2 rounded-full bg-red-500 opacity-0"></span>
              </button>`).join("")}
          </div>

          <!-- 右：都道府県→市（＋で展開） -->
          <div class="md:col-span-2 space-y-3" id="loc-right"></div>
        </div>
      `;
      // 地域クリック
      locBody.querySelectorAll("[data-rg]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          curRegion = btn.dataset.rg;
          renderLoc();
          paintDots();
          renderRight();
        });
      });

      renderRight();
      paintDots();
    };

    const renderRight = () => {
      const prefs = REGION_PREFS[curRegion] || [];
      const wrap = locBody.querySelector("#loc-right");
      wrap.innerHTML = prefs.map(pref=>{
        const selectedPref = locTmp.find(x => x.type==='pref' && x.pref===pref);
        const cities = (citiesByPref[pref] || []);
        const selectedCities = new Set(locTmp.filter(x => x.type==='city' && x.pref===pref).map(x=>x.city));
        const cityListId = `city-list-${pref}`;

        return `
          <div class="border rounded-lg overflow-hidden">
            <div class="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
              <div class="font-bold">${pref}</div>
              <div class="flex items-center gap-2">
                <label class="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" class="accent-orange-500 loc-pref" data-pref="${pref}" ${selectedPref?'checked':''}>
                  <span>都道府県で選択</span>
                </label>
                <button class="px-2 py-1 text-sm border rounded-lg expand-btn" data-target="${cityListId}">＋</button>
              </div>
            </div>
            <div class="p-3">
              <div id="${cityListId}" class="hidden max-h-56 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-x-4">
                ${cities.map(city=>`
                  <label class="flex items-center gap-2 py-1">
                    <input type="checkbox" class="accent-orange-500 loc-city" data-pref="${pref}" data-city="${city}" ${selectedCities.has(city)?'checked':''}>
                    <span class="text-sm">${city}</span>
                  </label>`).join("") || `<div class="text-xs text-gray-500">市区町村データなし</div>`}
              </div>
            </div>
          </div>
        `;
      }).join("");

      // prefチェック
      wrap.querySelectorAll(".loc-pref").forEach(chk=>{
        chk.addEventListener("change", ()=>{
          const pref = chk.dataset.pref;
          // pref選択時は当該県のcity選択はクリア
          locTmp = locTmp.filter(x => !(x.pref===pref));
          if (chk.checked) locTmp.push({type:'pref', pref});
          paintDots();
          renderRight(); // 見た目更新
        });
      });

      // cityチェック
      wrap.querySelectorAll(".loc-city").forEach(chk=>{
        chk.addEventListener("change", ()=>{
          const pref = chk.dataset.pref, city = chk.dataset.city;
          // city選択時は当該県のpref選択は外す
          locTmp = locTmp.filter(x => !(x.type==='pref' && x.pref===pref));
          if (chk.checked) locTmp.push({type:'city', pref, city});
          else locTmp = locTmp.filter(x => !(x.type==='city' && x.pref===pref && x.city===city));
          paintDots();
        });
      });

      // ＋で市一覧の開閉
      wrap.querySelectorAll(".expand-btn").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const list = wrap.querySelector("#"+btn.dataset.target);
          list.classList.toggle("hidden");
          btn.textContent = list.classList.contains("hidden") ? "＋" : "－";
        });
      });
    };

    renderLoc();

    wireModal(locModal,
      ()=>{ locTmp = []; renderLoc(); paintDots(); },           // クリア
      ()=>{ this.state.locations = structuredClone(locTmp); this.renderSummary(); } // 反映
    );

    // ===== 2) 職種モーダル =====
    const jobModal = makeModal("job-modal", "職種");
    const jobBody = jobModal.querySelector("[data-modal-body]");
    jobBody.innerHTML = `
      <div class="space-y-3">
        <input id="job-free" class="w-full h-12 rounded-lg border border-gray-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder="職種をフリーワードで探す">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" id="job-list"></div>
      </div>
    `;
    let jobTmp = structuredClone(this.state.jobCategories);

    const drawJobs = (q="") => {
      const wrap = jobBody.querySelector("#job-list");
      const items = jobCategories.filter(c => c.toLowerCase().includes(q.toLowerCase()));
      wrap.innerHTML = items.map(c=>`
        <label class="${pillLbl}">
          <input type="checkbox" class="accent-orange-500 job-chk" value="${c}" ${jobTmp.includes(c)?'checked':''}>
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

    // ===== 3) こだわり条件モーダル（左：大見出し／右：詳細） =====
    const prefModal = makeModal("pref-modal", "こだわり条件");
    const prefBody = prefModal.querySelector("[data-modal-body]");
    let prefTmp = structuredClone(this.state.preferences);

    const groups = Object.keys(PREFERENCE_GROUPS);
    let curGroup = groups[0];

    const renderPref = () => {
      prefBody.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-2">
            ${groups.map(g => `
              <button data-group="${g}" class="w-full text-left px-3 py-2 rounded-lg border ${g===curGroup?'bg-orange-50 border-orange-300':''}">
                ${g}
              </button>`).join("")}
          </div>
          <div class="md:col-span-2">
            <div id="pref-right" class="grid grid-cols-2 sm:grid-cols-3 gap-2"></div>
          </div>
        </div>
      `;
      // 左クリック
      prefBody.querySelectorAll("[data-group]").forEach(b=>{
        b.addEventListener("click", ()=>{
          curGroup = b.dataset.group;
          renderPref();
          drawRight();
        });
      });
      drawRight();
    };

    const drawRight = () => {
      const items = PREFERENCE_GROUPS[curGroup] || [];
      const wrap = prefBody.querySelector("#pref-right");
      wrap.innerHTML = (items.length ? items : preferences).map(c => `
        <label class="${pillLbl}">
          <input type="checkbox" class="accent-orange-500 pref-chk" value="${c}" ${prefTmp.includes(c)?'checked':''}>
          <span>${c}</span>
        </label>`).join("") || `<div class="text-sm text-gray-500">該当なし</div>`;
      wrap.querySelectorAll(".pref-chk").forEach(chk=>{
        chk.addEventListener("change", ()=>{
          if (chk.checked) prefTmp.push(chk.value);
          else prefTmp = prefTmp.filter(v => v !== chk.value);
        });
      });
    };

    renderPref();
    wireModal(prefModal,
      ()=>{ prefTmp = []; renderPref(); },
      ()=>{ this.state.preferences = [...new Set(prefTmp)]; this.renderSummary(); }
    );

    // ====== ボタン起動 ======
    this.container.querySelector("#btn-loc").addEventListener("click", ()=> locModal.classList.remove("hidden"));
    this.container.querySelector("#btn-job").addEventListener("click", ()=> jobModal.classList.remove("hidden"));
    this.container.querySelector("#btn-pref").addEventListener("click", ()=> prefModal.classList.remove("hidden"));

    // 人気の条件
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

    // クリア（サマリーのリンク）
    this.container.addEventListener("click", (e)=>{
      if (e.target.id === "clear-loc") { this.state.locations = []; this.renderSummary(); }
      if (e.target.id === "clear-job") { this.state.jobCategories = []; this.renderSummary(); }
      if (e.target.id === "clear-pref") { this.state.preferences = []; this.renderSummary(); }
    });

    // 検索実行
    this.container.querySelector("#sf-submit").addEventListener("click", async ()=>{
      await this.applySearch();
    });

    // 初回サマリー
    this.renderSummary();
  }

  renderSummary() {
    const chip = (t)=>`<span class="inline-flex items-center text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">${t}</span>`;

    // 勤務地
    const locSum = document.getElementById("sum-loc");
    const locChips = document.getElementById("sum-loc-chips");
    if (this.state.locations.length) {
      // 表示ルール：道府県のみ→「北海道」／道府県+市→「北海道、青森市」…のように選択の文字列をそのまま
      const labels = this.state.locations.map(x => x.type==='pref' ? x.pref : `${x.city}`);
      locChips.innerHTML = labels.map(chip).join(" ");
      locSum.classList.remove("hidden");
    } else locSum.classList.add("hidden");

    // 職種
    const jobSum = document.getElementById("sum-job");
    const jobChips = document.getElementById("sum-job-chips");
    if (this.state.jobCategories.length) {
      jobChips.innerHTML = this.state.jobCategories.map(chip).join(" ");
      jobSum.classList.remove("hidden");
    } else jobSum.classList.add("hidden");

    // こだわり
    const prefSum = document.getElementById("sum-pref");
    const prefChips = document.getElementById("sum-pref-chips");
    if (this.state.preferences.length) {
      prefChips.innerHTML = this.state.preferences.map(chip).join(" ");
      prefSum.classList.remove("hidden");
    } else prefSum.classList.add("hidden");
  }

  async applySearch() {
    const payload = { ...this.state };
    await this.onSearch(payload);
    const resultsEl = document.getElementById("search-results");
    resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
