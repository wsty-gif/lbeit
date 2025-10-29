// js/components/SearchForm.js
class SearchForm {
  constructor(container, onSearch) {
    this.el = container;
    this.onSearch = onSearch;

    // 検索条件（確定値）
    this.state = {
      keyword: "",
      locations: [],
      jobs: [],
      prefs: []
    };

    // 勤務地ページの一時選択（適用前）
    this._tempLoc = new Set();

    this.render();
  }

  /* ------------------------------
   * 初期描画
   * ------------------------------ */
  async render() {
    // DataService 読み込み（失敗時は仮データで続行）
    try {
      this.ds = await DataService.distincts();
    } catch (err) {
      console.warn("⚠️ DataService 読み込み失敗。仮データで続行:", err);
      this.ds = {
        REGION_PREFS: {
          北海道: ["北海道"],
          東北: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
          関東: ["東京都", "神奈川県", "千葉県", "埼玉県", "茨城県", "栃木県", "群馬県"]
        },
        jobCategories: ["カフェスタッフ", "接客", "倉庫", "事務"],
        preferences: { 人気条件: ["未経験OK", "土日祝休み"] }
      };
    }

    // 画面
    this.el.innerHTML = `
      <div class="card" style="padding:16px; position:relative; min-height:100vh; box-sizing:border-box; padding-bottom:80px;">
        <div style="display:grid;gap:16px;">
          <div>
            <label class="block text-sm font-semibold mb-1">キーワード検索</label>
            <input id="sf-key" class="input" placeholder="例：カフェ／接客／倉庫" />
          </div>

          ${this.condRow("loc", "勤務地", "fa-solid fa-location-dot")}
          ${this.condRow("job", "職種", "fa-solid fa-briefcase")}
          ${this.condRow("pref", "こだわり条件", "fa-solid fa-star")}
        </div>

        <!-- ✅ フッター（常時固定） -->
        <div id="search-footer" style="
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          background: #fff;
          border-top: 1px solid #ddd;
          padding: 10px 16px;
          z-index: 1000;
          box-sizing: border-box;
        ">
          <button id="btn-clear" style="
            flex: 1;
            border: 1px solid #333;
            background: #fff;
            color: #111;
            border-radius: 8px;
            padding: 10px;
            font-weight: 600;
          ">すべてクリア</button>

          <button id="btn-search" style="
            flex: 2;
            border: none;
            background: #e53935;
            color: #fff;
            border-radius: 8px;
            padding: 10px;
            font-weight: 700;
          ">この条件で検索する</button>
        </div>
      </div>
    `;


    // 入力イベント
    this.el.querySelector("#sf-key").addEventListener("input", e => {
      this.state.keyword = e.target.value.trim();
    });

    // 条件ページ遷移
    this.el.querySelector("#open-loc").addEventListener("click", () => this.openSlide("loc"));
    this.el.querySelector("#open-job").addEventListener("click", () => this.openSlide("job"));
    this.el.querySelector("#open-pref").addEventListener("click", () => this.openSlide("pref"));

    // 検索実行
    this.el.querySelector("#btn-search").addEventListener("click", () => this.applySearch());

    // スライドページのコンテナ
    this.ensureSlideContainer();

    // ページ構築
    this.buildLocationPage();
    this.buildJobPage();
    this.buildPrefPage();

    // ラベル更新
    this.updateConditionLabels();
  }

// ✅ condRow() と updateConditionLabels() の最新版
/* ===============================
 * condRow：常に2行構成＋「＞」は常時表示
 * =============================== */
condRow(key, label, icon) {
  const value = this.state[key + "ations"] || [];
  const hasValue = value.length > 0;
  const valText = hasValue ? value.join("、") : "未設定";
  const id = `val-${key}`;

  return `
    <div class="cond-row" id="open-${key}"
         style="border-bottom:1px solid #eee;padding:10px 0;cursor:pointer;">
      
      <!-- 上段 -->
      <div class="cond-header"
           style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="${icon}" style="color:#555;font-size:1.1rem;"></i>
          <span style="font-weight:600;">${label}</span>
        </div>
        <span class="clear-btn" data-clear="${key}"
              style="color:#007bff;font-size:0.9rem;white-space:nowrap;
                     display:${hasValue ? "inline" : "none"};">
          条件をクリア
        </span>
      </div>

      <!-- 下段 --><!-- 下段 -->
<div style="
  position: relative;
  margin-left: 28px;
  margin-top: 4px;
  overflow: hidden;
  max-width: 80vw; /* モバイルでも収まる最大幅 */
  height: 1.6em;
  box-sizing: border-box;
">
  <!-- テキスト部分 -->
  <span id="val-${key}"
        style="
          display: block;
          width: calc(100% - 28px); /* ＞分を確保 */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #444;
          font-size: 0.95rem;
          padding-right: 4px;
        ">
    ${valText}
  </span>

  <!-- ＞を右端固定 -->
  <span style="
    position: absolute;
    right: 0;
    top: 0;
    color: #999;
    font-size: 1.2rem;
    line-height: 1.6em;
    width: 24px;
    text-align: right;
    flex-shrink: 0;
  ">
    ＞
  </span>
</div>


    </div>
  `;
}

/* ===============================
 * updateConditionLabels：テキスト・クリア表示のみ制御
 * =============================== */
updateConditionLabels() {
  const format = (arr) => (arr && arr.length ? arr.join("、") : "未設定");
  const locText = this.state.locations.length
    ? this.state.locations.map(l => l.split("/").pop()).join("、")
    : "未設定";

  const fields = [
    { key: "loc", val: locText },
    { key: "job", val: format(this.state.jobs) },
    { key: "pref", val: format(this.state.prefs) }
  ];

  fields.forEach(({ key, val }) => {
    const span = this.el.querySelector(`#val-${key}`);
    const clearBtn = this.el.querySelector(`[data-clear="${key}"]`);
    if (span) span.textContent = val;
    if (clearBtn) {
      clearBtn.style.display = val === "未設定" ? "none" : "inline";
    }
  });

  /* ✅ 追加：カテゴリ別「条件をクリア」イベント設定 */
  this.el.querySelectorAll(".clear-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation(); // スライドを開かない
      const key = btn.dataset.clear;
      this.clearCategoryCondition(key);
    };
  });
}

/* ===============================
 * clearCategoryCondition：カテゴリごとにリセット＋UI反映（背景含む）
 * =============================== */
clearCategoryCondition(key) {
  if (key === "loc") {
    // 状態クリア
    this.state.locations = [];
    this._tempLoc.clear();

    // チェックと背景クリア
    const page = document.getElementById("page-loc");
    if (page) {
      page.querySelectorAll('input[type="checkbox"][data-loc]').forEach(cb => {
        cb.checked = false;
        const label = cb.closest("label.opt");
        if (label) label.style.background = "transparent";
      });
    }

    // 地域ドット更新
    const REGION_PREFS = this.normalizeRegions(this.ds.REGION_PREFS);
    this.updateRegionDots(REGION_PREFS);

  } else if (key === "job") {
    this.state.jobs = [];
    const page = document.getElementById("page-job");
    if (page) {
      page.querySelectorAll(".job-chk").forEach(cb => {
        cb.checked = false;
        const label = cb.closest("label.opt");
        if (label) label.style.background = "transparent";
      });
    }

  } else if (key === "pref") {
    this.state.prefs = [];
    const page = document.getElementById("page-pref");
    if (page) {
      page.querySelectorAll(".pref-chk").forEach(cb => {
        cb.checked = false;
        const label = cb.closest("label.pref-option");
        if (label) label.style.background = "transparent";
      });
    }
  }

  // ✅ 再同期（全体見た目をリセット）
  if (key === "loc") this.syncCheckboxesIn(document.getElementById("page-loc"));

  // 表示更新
  this.updateConditionLabels();
}


  ensureSlideContainer() {
    if (document.getElementById("slide-container")) return;
    const wrap = document.createElement("div");
    wrap.id = "slide-container";
    Object.assign(wrap.style, {
      position:"fixed", inset:"0", overflow:"hidden", zIndex:"2000", pointerEvents:"none"
    });

    ["loc","job","pref"].forEach(id=>{
      const p=document.createElement("div");
      p.id=`page-${id}`;
      p.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:#fff;transform:translateX(100%);transition:transform .3s ease;display:flex;flex-direction:column;visibility:hidden;";
      const inner=document.createElement("div");
      inner.className="slide-inner";
      inner.style.cssText="flex:1;display:flex;flex-direction:column;height:100%;";
      p.appendChild(inner);
      wrap.appendChild(p);
    });
    document.body.appendChild(wrap);
  }

  openSlide(key){
    if (key === "loc") {
      // 勤務地は一時選択を現状で初期化
      this._tempLoc = new Set(this.state.locations);
    }
    const c=document.getElementById("slide-container");
    if(!c) return;
    c.style.pointerEvents="auto";
    const p=document.getElementById(`page-${key}`);
    if(!p) return;
    p.style.visibility="visible";
    requestAnimationFrame(()=>{p.style.transform="translateX(0)";});
  }

  closeSlide(key){
    const c=document.getElementById("slide-container");
    const p=document.getElementById(`page-${key}`);
    if(!p) return;
    p.style.transform="translateX(100%)";
    setTimeout(()=>{p.style.visibility="hidden"; if(c) c.style.pointerEvents="none";}, 350);
  }

  headerTpl(title, backId){
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid #eee;background:#fafafa;">
        <button id="${backId}" style="background:none;border:none;font-size:18px;cursor:pointer;">＜</button>
        <h3 style="font-size:18px;font-weight:600;margin:0;">${title}</h3>
      </div>`;
  }

  /* ------------------------------
   * REGION_PREFS 正規化（「北海道・東北」を分離）
   * ------------------------------ */
  normalizeRegions(REGION_PREFS){
    const out = {};
    Object.entries(REGION_PREFS || {}).forEach(([region, prefs])=>{
      if (region.includes("北海道") && region.includes("東北")) {
        const setTohoku = new Set(["青森県","岩手県","宮城県","秋田県","山形県","福島県"]);
        const hokkaido = prefs.filter(p => p === "北海道");
        const tohoku   = prefs.filter(p => setTohoku.has(p));
        if (hokkaido.length) out["北海道"] = (out["北海道"] || []).concat(hokkaido);
        if (tohoku.length)   out["東北"]   = (out["東北"]   || []).concat(tohoku);
      } else {
        out[region] = (out[region] || []).concat(prefs);
      }
    });
    return out;
  }

  /* ------------------------------
   * データアクセス（prefCities.js）
   * ------------------------------ */
  getPrefData(pref){
    // 返り値: { type:"object"|"array", cities:[...], wardsMap:{} }
    const raw = (window.PREF_CITY_DATA || {})[pref];
    if (!raw) return { type:"none", cities:[], wardsMap:{} };

    if (Array.isArray(raw)) {
      // ["久御山町", "宇治市", ...]
      return { type:"array", cities: raw, wardsMap: {} };
    } else if (typeof raw === "object") {
      // { "京都市": ["北区",...], "久御山町": [] }
      const cities = Object.keys(raw);
      return { type:"object", cities, wardsMap: raw };
    }
    return { type:"none", cities:[], wardsMap:{} };
  }

  getWards(pref, city){
    const raw = (window.PREF_CITY_DATA || {})[pref];
    if (!raw) return [];
    if (Array.isArray(raw)) return []; // 配列型は市のみ
    const wards = raw[city];
    return Array.isArray(wards) ? wards : [];
  }

  /* ------------------------------
   * 勤務地ページ
   * ------------------------------ */
  buildLocationPage(){
    const page=document.querySelector("#page-loc .slide-inner");
    page.innerHTML=`
      ${this.headerTpl("勤務地","back-loc")}
      <div id="loc-main" style="flex:1;overflow:auto;padding:16px;display:grid;grid-template-columns:33% 67%;gap:12px;">
        <ul id="region-menu" style="list-style:none;padding:0;margin:0;border-right:1px solid #ddd;"></ul>
        <div id="pref-wrap"></div>
      </div>
      <div class="footer-buttons" style="position:sticky;bottom:0;left:0;right:0;padding:10px 12px;background:#fff;border-top:1px solid #eee;display:flex;gap:8px;">
        <button class="btn-clear" id="clear-loc" style="flex:1;min-width:88px;border:1px solid #222;background:#fff;color:#111;border-radius:8px;padding:10px;font-weight:600;">クリア</button>
        <button class="btn-apply" id="apply-loc" style="flex:5;border:none;background:#e53935;color:#fff;border-radius:8px;padding:10px;font-weight:700;">内容を反映する</button>
      </div>`;

    document.getElementById("back-loc").onclick=()=>this.closeSlide("loc");

    const regionMenu=page.querySelector("#region-menu");
    const prefWrap=page.querySelector("#pref-wrap");

    // 地域データを正規化（「北海道・東北」を分離）
    const REGION_PREFS = this.normalizeRegions(this.ds.REGION_PREFS);
    const regions = Object.keys(REGION_PREFS);

    // 左のエリアメニュー（赤丸で選択あり表示・折り返し防止）
    regionMenu.innerHTML=regions.map((r,i)=>`
      <li>
        <button class="side-btn ${i===0?"active":""}" data-region="${r}"
          style="width:100%;text-align:left;padding:10px;font-size:15px;background:${i===0?"#eaeaea":"#fafafa"};border:none;display:inline-flex;align-items:center;gap:6px;">
          <span>${r}</span>
          <span class="region-dot" data-region-dot="${r}" style="display:none;width:8px;height:8px;background:#e53935;border-radius:50%;"></span>
        </button>
      </li>`).join("");

    // 都道府県リスト描画
    const renderPrefs=(region)=>{
      const prefs=REGION_PREFS[region]||[];
      prefWrap.innerHTML=prefs.map(pref=>`
        <div style="border-bottom:1px solid #ddd;padding:8px 0;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <label class="opt" style="font-size:16px;display:flex;align-items:center;gap:6px;margin-right:auto;">
              <input type="checkbox" data-loc="${pref}">
              ${pref}
            </label>
            <button data-pref="${pref}" class="toggle" style="font-size:18px;border:none;background:none;cursor:pointer;">＋</button>
          </div>
          <div data-city-list="${pref}" style="display:none;padding-left:16px;"></div>
        </div>`).join("");

      // 都道府県チェック初期同期
      prefWrap.querySelectorAll('input[type="checkbox"][data-loc]').forEach(cb=>{
        const loc = cb.getAttribute("data-loc");
        cb.checked = this._tempLoc.has(loc);
      });

      // 展開ボタン
      prefWrap.querySelectorAll(".toggle").forEach(btn=>{
        btn.addEventListener("click",()=>{
          const pref=btn.getAttribute("data-pref");
          const list=prefWrap.querySelector(`[data-city-list="${pref}"]`);
          const visible=list.style.display==="block";
          if (visible) {
            list.style.display="none";
            btn.textContent="＋";
            return;
          }
          // 初回ロード or 再表示
          list.style.display="block";
          btn.textContent="－";
          if (!list.dataset.loaded) {
            this.renderCities(pref, list);
            list.dataset.loaded = "1";
          } else {
            this.syncCheckboxesIn(list);
          }
        });
      });

      // 都道府県 change（配下一括 ON/OFF）
      prefWrap.addEventListener("change", (e)=>{
        if (!e.target.matches('input[type="checkbox"][data-loc]')) return;
        const loc = e.target.getAttribute("data-loc");
        const checked = e.target.checked;
        const parts = loc.split("/");
        if (parts.length === 1) {
          // prefecture
          this.setPrefChecked(loc, checked);
          this.syncCheckboxesIn(prefWrap);
          this.updateRegionDots(REGION_PREFS);
        }
      });

      // 初期同期
      this.syncCheckboxesIn(prefWrap);
      this.updateRegionDots(REGION_PREFS);
    };

    // 左メニュー切替
    regionMenu.querySelectorAll(".side-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        regionMenu.querySelectorAll(".side-btn").forEach(b=>{b.classList.remove("active");b.style.background="#fafafa";});
        btn.classList.add("active");btn.style.background="#eaeaea";
        renderPrefs(btn.getAttribute("data-region"));
      });
    });

    renderPrefs(regions[0]);

    // クリア / 適用
    // クリアボタン
    document.getElementById("clear-loc").onclick = () => {
      this._tempLoc.clear();
      // チェック全解除
      document.querySelectorAll('#page-loc input[type="checkbox"][data-loc]').forEach(cb => cb.checked = false);
      this.syncCheckboxesIn(document.getElementById("page-loc"));
      const REGION_PREFS = this.normalizeRegions(this.ds.REGION_PREFS);
      this.updateRegionDots(REGION_PREFS);

      // ステートも更新して表示反映
      this.state.locations = [];
      this.updateConditionLabels();
    };

    // ✅ 内容を反映するボタン
    // ✅ 内容を反映するボタン
    document.getElementById("apply-loc").onclick = () => {
      // 選択結果を state に反映
      this.state.locations = Array.from(this._tempLoc);

      // スライドを閉じたあとにラベル更新を実行（非同期でDOM確実反映）
      this.closeSlide("loc");
      setTimeout(() => this.updateConditionLabels(), 400);
    };


  }

  // 都道府県配下の市・区を描画
  renderCities(pref, container){
    const { type, cities, wardsMap } = this.getPrefData(pref);

    const html = cities.map(city=>{
      const wards = (type === "object") ? (wardsMap[city] || []) : [];
      const hasW  = Array.isArray(wards) && wards.length > 0;

      return `
        <div style="border-bottom:1px solid #eee;padding:6px 0;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <label class="opt" style="font-size:15px;display:flex;align-items:center;gap:6px;margin-right:auto;">
              <input type="checkbox" data-loc="${pref}/${city}">
              ${city}
            </label>
            ${hasW?`<button data-city="${city}" data-pref="${pref}" class="toggle city-toggle" style="border:none;background:none;font-size:16px;cursor:pointer;">＋</button>`:""}
          </div>
          ${hasW?`<div data-ward-list="${pref}/${city}" style="display:none;padding-left:16px;">
            ${wards.map(w=>`
              <div style="border-bottom:1px solid #f0f0f0;padding:4px 0;">
                <label class="opt" style="font-size:14px;display:flex;align-items:center;gap:6px;">
                  <input type="checkbox" data-loc="${pref}/${city}/${w}">
                  ${w}
                </label>
              </div>
            `).join("")}
          </div>`:""}
        </div>`;
    }).join("");

    container.innerHTML = html;

    // チェック状態同期
    this.syncCheckboxesIn(container);

    // 市の展開トグル
    container.querySelectorAll(".city-toggle").forEach(b=>{
      b.addEventListener("click", ()=>{
        const pref = b.getAttribute("data-pref");
        const city = b.getAttribute("data-city");
        const wardWrap = container.querySelector(`[data-ward-list="${pref}/${city}"]`);
        const shown = wardWrap.style.display === "block";
        wardWrap.style.display = shown ? "none":"block";
        b.textContent = shown ? "＋":"－";
        if (!shown) {
          // 表示されたらチェック同期
          this.syncCheckboxesIn(wardWrap);
        }
      });
    });

    // 市・区の change を委譲で拾う
    container.addEventListener("change", (e)=>{
      if (!e.target.matches('input[type="checkbox"][data-loc]')) return;
      const loc = e.target.getAttribute("data-loc");
      const checked = e.target.checked;
      const parts = loc.split("/");

      if (parts.length === 3) {
        // ward
        this.setWardChecked(parts[0], parts[1], parts[2], checked);
      } else if (parts.length === 2) {
        // city
        this.setCityChecked(parts[0], parts[1], checked);
      }
      // 見た目反映
      this.syncCheckboxesIn(container);
      this.syncCheckboxesIn(document.getElementById("page-loc"));
      // REGION_PREFS が必要なので再取得
      const REGION_PREFS = this.normalizeRegions(this.ds.REGION_PREFS);
      this.updateRegionDots(REGION_PREFS);
    });
  }

  // 市のON/OFF（区も一括・親も自動）
  setCityChecked(pref, city, checked) {
    this._set(checked, `${pref}/${city}`);

    // 区をすべて一括でON/OFF
    const wards = this.getWards(pref, city) || [];
    wards.forEach(w => this._set(checked, `${pref}/${city}/${w}`));

    if (checked) {
      // ONなら親の都道府県もON
      this._set(true, pref);
    } else {
      // 区を含め全てOFFなら市OFF
      if (!this._hasAnyUnderCity(pref, city)) {
        this._set(false, `${pref}/${city}`);
      }
      // 都道府県配下に子（市 or 区）が残っていなければ府県もOFF
      if (!this._hasAnyChildrenUnderPref(pref)) {
        this._set(false, pref);
      }
    }
  }

  /* ------------------------------
   * チェック状態 同期/装飾
   * ------------------------------ */
  syncCheckboxesIn(root){
    if (!root) return;
    root.querySelectorAll('input[type="checkbox"][data-loc]').forEach(cb=>{
      const loc = cb.getAttribute("data-loc");
      cb.checked = this._tempLoc.has(loc);
      // 赤いチェック
      cb.style.accentColor = cb.checked ? "#e53935" : "";
      // 選択中ラベルの薄赤背景
      const label = cb.closest("label.opt");
      if (label) {
        label.style.background = cb.checked ? "rgba(255,0,0,0.08)" : "transparent";
        label.style.borderRadius = "6px";
      }
    });
  }

  updateRegionDots(REGION_PREFS){
    const regions = Object.keys(REGION_PREFS || {});
    regions.forEach(r=>{
      const dot = document.querySelector(`[data-region-dot="${r}"]`);
      if (!dot) return;
      const prefs = REGION_PREFS[r] || [];
      const has = Array.from(this._tempLoc).some(loc=>{
        return prefs.some(pref => loc === pref || loc.startsWith(pref + "/"));
      });
      dot.style.display = has ? "inline-block" : "none";
    });
  }

  /* ------------------------------
   * 親子連動ロジック（勤務地）
   * ------------------------------ */

  // 都道府県の一括 ON/OFF（既存のままでOK）
  setPrefChecked(pref, checked){
    this._set(checked, `${pref}`);
    const { type, cities, wardsMap } = this.getPrefData(pref);
    cities.forEach(city=>{
      this._set(checked, `${pref}/${city}`);
      const wards = (type==="object") ? (wardsMap[city] || []) : [];
      wards.forEach(w => this._set(checked, `${pref}/${city}/${w}`));
    });
  }

  // 区のON/OFF（親も自動）
  setWardChecked(pref, city, ward, checked) {
    this._set(checked, `${pref}/${city}/${ward}`);

    if (checked) {
      // 区をON → 市と府県もON
      this._set(true, `${pref}/${city}`);
      this._set(true, pref);
    } else {
      // 区が全て外れたら市OFF
      if (!this._hasAnyWard(pref, city)) {
        this._set(false, `${pref}/${city}`);
      }
      // 市が全OFFなら府県もOFF
      if (!this._hasAnyChildrenUnderPref(pref)) {
        this._set(false, pref);
      }
    }
  }

  // 都道府県配下に何か残っているか？
  _hasAnyUnderPref(pref) {
    const prefix = `${pref}/`;
    // 都道府県自身 or 子（市／区）が1つでもある場合true
    return Array.from(this._tempLoc).some(loc => loc === pref || loc.startsWith(prefix));
  }

  // 市内の区が残っているか？
  _hasAnyWard(pref, city) {
    const prefix = `${pref}/${city}/`;
    return Array.from(this._tempLoc).some(loc => loc.startsWith(prefix));
  }

  // temp セット操作
  _set(on, loc){
    if (on) this._tempLoc.add(loc);
    else this._tempLoc.delete(loc);
  }

  // 都道府県配下に「子（市/区）」が残っているか？（親自身は除外）
  _hasAnyChildrenUnderPref(pref) {
    const prefix = `${pref}/`;
    return Array.from(this._tempLoc).some(loc => loc.startsWith(prefix));
  }

  // 市配下に何か残っているか（市そのもの or その区）
  _hasAnyUnderCity(pref, city){
    const cityKey = `${pref}/${city}`;
    const prefix = `${cityKey}/`;
    for (const loc of this._tempLoc) {
      if (loc === cityKey || loc.startsWith(prefix)) return true;
    }
    return false;
  }

  // 市内の「区」が1つでも残っているか（区のみ）
  _hasAnyWard(pref, city) {
    const prefix = `${pref}/${city}/`;
    return Array.from(this._tempLoc).some(loc => loc.startsWith(prefix));
  }

  buildJobPage(){
    const page=document.querySelector("#page-job .slide-inner");
    page.innerHTML=`
      ${this.headerTpl("職種","back-job")}
      <div style="flex:1;overflow:auto;padding:16px;">
        <div style="width:95%;margin:0 auto 10px;display:flex;align-items:center;background:#f5f5f5;border-radius:25px;padding:6px 12px;">
          <i class="fa fa-search text-gray-500 mr-2"></i>
          <input id="job-key" placeholder="職種をフリーワードで探す" style="background:none;border:none;outline:none;width:100%;color:#333;font-size:1rem;caret-color:#555;"/>
        </div>
        <div id="job-list" style="display:flex;flex-direction:column;gap:0;">
          ${this.ds.jobCategories.map(j=>`
            <div style="border-bottom:1px solid #e5e7eb;">
              <label class="opt" style="display:block;padding:10px 0;font-size:16px;">
                <input class="checkbox job-chk" type="checkbox" value="${j}"> ${j}
              </label>
            </div>`).join("")}
        </div>
      </div>
      <div class="footer-buttons" style="position:sticky;bottom:0;left:0;right:0;padding:10px 12px;background:#fff;border-top:1px solid #eee;display:flex;gap:8px;">
        <button class="btn-clear" id="clear-job" style="flex:1;border:1px solid #222;background:#fff;color:#111;border-radius:8px;padding:10px;font-weight:600;">クリア</button>
        <button class="btn-apply" id="apply-job" style="flex:5;border:none;background:#e53935;color:#fff;border-radius:8px;padding:10px;font-weight:700;">内容を反映する</button>
      </div>`;

    document.getElementById("back-job").onclick=()=>this.closeSlide("job");

    document.getElementById("clear-job").onclick=()=>{
      this.state.jobs = [];
      document.querySelectorAll('#page-job .job-chk').forEach(cb=>cb.checked=false);
      this.updateConditionLabels();
    };
    document.getElementById("apply-job").onclick=()=>{
      const checked=Array.from(document.querySelectorAll("#page-job .job-chk:checked")).map(c=>c.value);
      this.state.jobs=checked;
      this.updateConditionLabels();
      this.closeSlide("job");
    };

    const filter = ()=>{
      const q = (document.querySelector("#job-key").value||"").trim();
      const items = this.ds.jobCategories.filter(j=> j.includes(q));
      document.getElementById("job-list").innerHTML = items.map(j=>`
        <div style="border-bottom:1px solid #e5e7eb;">
          <label class="opt" style="display:block;padding:10px 0;font-size:16px;">
            <input class="checkbox job-chk" type="checkbox" value="${j}"> ${j}
          </label>
        </div>`).join("");
    };
    document.querySelector("#job-key").addEventListener("input", filter);
  }
/* ------------------------------
 * こだわり条件ページ（丸枠スタイル付き）
 * ------------------------------ */
/* ------------------------------
 * こだわり条件ページ（1行ごと＋チェックボックス入り）
 * ------------------------------ */
buildPrefPage() {
  const prefsData = {
    "人気条件": [
      "未経験歓迎", "土日祝休み", "完全週休２日制", "年間休日１２０日以上", "在宅勤務（リモートワーク）OK", "転勤なし", "服装自由", "年齢不問", "学歴不問", "語学力を活かせる"
    ],
    "求める人材": [
      "未経験者歓迎", "経験者歓迎", "管理職・マネジメント経験歓迎", "年齢不問", "大卒以上", "学歴不問", "第二新卒歓迎", "既卒歓迎", "フリーター歓迎", "ブランクOK", "子育て世代歓迎", "障がい者歓迎", "転職回数不問", "６０代も応募可", "７０代も応募可"
    ],
    "職場環境": [
      "女性が活躍中", "外国人が活躍中", "中途入社５０％以上", "高定着率", "服装自由", "ひげOK", "髪型・髪色自由", "ネイルOK", "ピアスOK"
    ],
    "勤務地・アクセス": [
      "在宅勤務（リモートワーク）OK", "フルリモート", "転勤なし", "車・バイク通勤OK"
    ],
    "勤務時間・休日": [
      "土日祝休み", "完全週休２日制", "年間休日１２０日以上", "連続休暇取得可能", "残業なし（原則定時退社）", "残業月２０時間以内", "フレックスタイム制", "時短勤務あり"
    ],
    "給与": [
      "固定給２５万円以上", "固定給３５万円以上", "賞与あり", "歩合制あり", "完全歩合制"
    ],
    "待遇・福利厚生": [
      "産休・育休あり", "子育てサポートあり", "介護休暇・介護サポートあり", "交通費支給", "家賃補助・在宅手当あり", "寮・社宅あり", "社食・まかない・食事補助あり", "社員割引あり", "資格取得支援・手当あり", "退職金あり", "定年６５歳以上", "定年後勤務延長・再雇用あり"
    ],
    "仕事の特徴": [
      "語学力を活かせる", "海外勤務・海外出張あり", "出張なし", "ノルマなし", "直行直帰", "副業・WワークOK"
    ],
    "募集・選考の特徴": [
      "急募", "大量募集", "面接１回", "リモート面接OK", "職場見学可"
    ]
  };

  const page = document.querySelector("#page-pref .slide-inner");
  page.innerHTML = `
    ${this.headerTpl("こだわり条件","back-pref")}
    <div id="pref-main" style="display:grid;grid-template-columns:33% 67%;height:100%;overflow:hidden;">
      <!-- 左メニュー -->
      <ul id="pref-menu" style="list-style:none;margin:0;padding:0;overflow-y:auto;border-right:1px solid #ddd;background:#f9f9f9;">
        ${Object.keys(prefsData).map((c, i) => `
          <li>
            <button class="side-btn ${i===0 ? "active" : ""}" data-cat="${c}"
              style="display:block;width:100%;padding:10px 8px;text-align:left;border:none;background:${i===0?"#fff":"#f9f9f9"};cursor:pointer;">
              ${c}
            </button>
          </li>`).join("")}
      </ul>

      <!-- 右側リスト -->
      <div id="pref-content" style="overflow-y:auto;padding:10px 16px;scroll-behavior:smooth;">
        ${Object.entries(prefsData).map(([cat, opts]) => `
          <div class="pref-section" id="sec-${cat}" style="margin-bottom:24px;">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:8px;border-bottom:1px solid #ddd;padding-bottom:4px;">${cat}</h3>
            ${opts.map(o => `
              <label class="pref-option">
                <input type="checkbox" class="pref-chk" value="${o}">
                <span>${o}</span>
              </label>
            `).join("")}
          </div>`).join("")}
      </div>
    </div>

    <div class="footer-buttons" style="position:sticky;bottom:0;left:0;right:0;padding:10px 12px;background:#fff;border-top:1px solid #eee;display:flex;gap:8px;">
      <button id="clear-pref" class="btn-clear" style="flex:1;border:1px solid #222;background:#fff;color:#111;border-radius:8px;padding:10px;font-weight:600;">クリア</button>
      <button id="apply-pref" class="btn-apply" style="flex:5;border:none;background:#e53935;color:#fff;border-radius:8px;padding:10px;font-weight:700;">内容を反映する</button>
    </div>
  `;

  // 戻るボタン
  document.getElementById("back-pref").onclick = () => this.closeSlide("pref");

  // 左メニュークリック → 対応セクションまでスクロール
  const content = page.querySelector("#pref-content");
  page.querySelectorAll("#pref-menu .side-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-cat");
      const target = content.querySelector(`#sec-${cat}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // スクロール監視 → 表示中カテゴリの背景ハイライト
  const sections = content.querySelectorAll(".pref-section");
  const menuBtns = page.querySelectorAll("#pref-menu .side-btn");
  content.addEventListener("scroll", () => {
    let current = "";
    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.3) current = sec.id.replace("sec-", "");
    });
    menuBtns.forEach(btn => {
      btn.style.background = (btn.getAttribute("data-cat") === current) ? "#fff" : "#f9f9f9";
    });
  });

  // 状態同期（チェック反映）
  content.querySelectorAll(".pref-chk").forEach(cb => {
    cb.checked = this.state.prefs.includes(cb.value);
    cb.addEventListener("change", e => {
      const val = e.target.value;
      if (e.target.checked) {
        if (!this.state.prefs.includes(val)) this.state.prefs.push(val);
      } else {
        this.state.prefs = this.state.prefs.filter(v => v !== val);
      }
    });
  });

  // クリア・反映
  document.getElementById("clear-pref").onclick = () => {
    this.state.prefs = [];
    content.querySelectorAll(".pref-chk").forEach(cb => cb.checked = false);
    this.updateConditionLabels();
  };

  document.getElementById("apply-pref").onclick = () => {
    this.updateConditionLabels();
    this.closeSlide("pref");
  };
}




  /* ------------------------------
   * 検索実行
   * ------------------------------ */
  async applySearch(){
    const all=await DataService.getAllAccounts();
    const k=(this.state.keyword||"").toLowerCase();

    const filtered=all.filter(job=>{
      const text=`${job.name} ${job.station} ${job.jobCategories?.join(" ")} ${job.jobDisplay} ${job.address}`.toLowerCase();
      const passKey=k?text.includes(k):true;

      const passLoc=this.state.locations.length
        ? this.state.locations.some(loc=>{
            const [pref, city, ward] = loc.split("/");
            const s = `${job.prefecture}/${job.city}`;
            if (ward) return `${job.prefecture}/${job.city}/${job.ward||""}`.includes(loc);
            return s.includes(city) || job.prefecture===pref;
          })
        : true;

      const passJob=this.state.jobs.length
        ? (job.jobCategories||[]).some(j=> this.state.jobs.includes(j))
        : true;

      const passPref=this.state.prefs.length
        ? (job.tags||[]).some(t=> this.state.prefs.includes(t))
        : true;

      return passKey && passLoc && passJob && passPref;
    });

    this.onSearch(filtered);
  }
}

/* ===== ヘルパ ===== */

 // ※ この関数は明示的に使用していませんが、将来の表示用に残しています
function fixCity(c){
  return c?.replace(/^京都市/,'').replace(/^大阪市/,'').replace(/^神戸市/,'');
}
