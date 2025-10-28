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
      <div class="card">
        <div style="display:grid;gap:16px;">
          <div>
            <label class="block text-sm font-semibold mb-1">キーワード検索</label>
            <input id="sf-key" class="input" placeholder="例：カフェ／接客／倉庫" />
          </div>

          <div class="search-condition" style="border:1px solid #e5e5e5;border-radius:8px;background:#fff;overflow:hidden;">
            ${this.condRowTpl("loc","勤務地")}
            ${this.condRowTpl("job","職種")}
            ${this.condRowTpl("pref","こだわり条件")}
          </div>

          <button id="btn-search" class="btn btn-primary">この条件で検索する</button>
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

  /* ------------------------------
   * 共通UI片
   * ------------------------------ */
  condRowTpl(key, label) {
    return `
      <div class="cond-row" id="open-${key}"
        style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;">
        <span style="font-weight:600;">${label}</span>
        <span id="val-${key}" style="flex:1;text-align:right;color:#666;margin-right:8px;">未設定</span>
        <span style="color:#888;">＞</span>
      </div>`;
  }

  updateConditionLabels() {
    const txt = (arr) => arr.length ? arr.slice(0,2).join("、") + (arr.length>2?" ほか":"") : "未設定";
    const el = (id, v) => { const n=this.el.querySelector(id); if(n) n.textContent=v; };

    el("#val-loc",  txt(this.state.locations));
    el("#val-job",  txt(this.state.jobs));
    el("#val-pref", txt(this.state.prefs));
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
    document.getElementById("clear-loc").onclick=()=>{
      this._tempLoc.clear();
      // 現在表示中のチェックを全OFF
      document.querySelectorAll('#page-loc input[type="checkbox"][data-loc]').forEach(cb=>cb.checked=false);
      this.syncCheckboxesIn(document.getElementById("page-loc"));
      this.updateRegionDots(REGION_PREFS);
    };

    document.getElementById("apply-loc").onclick=()=>{
      this.state.locations = Array.from(this._tempLoc);
      this.updateConditionLabels();
      this.closeSlide("loc");
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

  // 都道府県の一括 ON/OFF
  setPrefChecked(pref, checked){
    // 自身
    this._set(checked, `${pref}`);
    // 配下の city / ward を全て
    const { type, cities, wardsMap } = this.getPrefData(pref);
    cities.forEach(city=>{
      this._set(checked, `${pref}/${city}`);
      const wards = (type==="object") ? (wardsMap[city] || []) : [];
      wards.forEach(w => this._set(checked, `${pref}/${city}/${w}`));
    });
  }

  // 市の一括 ON/OFF
  setCityChecked(pref, city, checked){
    this._set(checked, `${pref}/${city}`);

    // 市配下の区を一括
    const wards = this.getWards(pref, city);
    wards.forEach(w => this._set(checked, `${pref}/${city}/${w}`));

    if (checked) {
      // 親prefもON
      this._set(true, `${pref}`);
    } else {
      // 市の配下（市自身 or 区）が何もなければ pref も OFF 判定に進む
      if (!this._hasAnyUnderCity(pref, city)) {
        this._set(false, `${pref}/${city}`);
      }
      if (!this._hasAnyUnderPref(pref)) {
        this._set(false, `${pref}`);
      }
    }
  }

  // 区のON/OFF（親も自動）
  setWardChecked(pref, city, ward, checked){
    this._set(checked, `${pref}/${city}/${ward}`);

    if (checked) {
      // 市 & 都道府県もON
      this._set(true, `${pref}/${city}`);
      this._set(true, `${pref}`);
    } else {
      // その市に残りの ward が無ければ 市をOFF（＝市内のチェックが0なら外す）
      if (!this._hasAnyWardUnderCity(pref, city)) {
        this._set(false, `${pref}/${city}`);
      }
      // 都道府県配下にも何も無ければ 都道府県をOFF
      if (!this._hasAnyUnderPref(pref)) {
        this._set(false, `${pref}`);
      }
    }
  }

  // temp セット操作
  _set(on, loc){
    if (on) this._tempLoc.add(loc);
    else this._tempLoc.delete(loc);
  }

  // 都道府県配下に一つでも選択があるか（pref 自身、市、区のいずれか）
  _hasAnyUnderPref(pref){
    const prefix = `${pref}/`;
    for (const loc of this._tempLoc) {
      if (loc === pref || loc.startsWith(prefix)) return true;
    }
    return false;
  }

  // 市配下に一つでも選択があるか（市 or 区）
  _hasAnyUnderCity(pref, city){
    const cityKey = `${pref}/${city}`;
    const prefix = `${cityKey}/`;
    for (const loc of this._tempLoc) {
      if (loc === cityKey || loc.startsWith(prefix)) return true;
    }
    return false;
  }

  // 市内の「区」のみで判定（＝区が0なら false）
  _hasAnyWardUnderCity(pref, city){
    const prefix = `${pref}/${city}/`;
    for (const loc of this._tempLoc) {
      if (loc.startsWith(prefix)) return true;
    }
    return false;
  }

  /* ------------------------------
   * 職種ページ
   * ------------------------------ */
  buildJobPage(){
    const page=document.querySelector("#page-job .slide-inner");
    page.innerHTML=`
      ${this.headerTpl("職種","back-job")}
      <div style="flex:1;overflow:auto;padding:16px;">
        <input id="job-key" class="input" placeholder="職種をフリーワードで探す" style="margin-bottom:10px;width:100%;">
        <div id="job-list" style="display:flex;flex-direction:column;gap:8px;">
          ${this.ds.jobCategories.map(j=>`<label class="opt" style="display:block;padding:4px 0;font-size:14px;"><input class="checkbox job-chk" type="checkbox" value="${j}"> ${j}</label>`).join("")}
        </div>
      </div>
      <div class="footer-buttons" style="position:sticky;bottom:0;left:0;right:0;padding:10px 12px;background:#fff;border-top:1px solid #eee;display:flex;gap:8px;">
        <button class="btn-clear" id="clear-job" style="flex:1;min-width:88px;border:1px solid #222;background:#fff;color:#111;border-radius:8px;padding:10px;font-weight:600;">クリア</button>
        <button class="btn-apply" id="apply-job" style="flex:5;border:none;background:#e53935;color:#fff;border-radius:8px;padding:10px;font-weight:700;">内容を反映する</button>
      </div>`;

    document.getElementById("back-job").onclick=()=>this.closeSlide("job");

    // クリア / 適用
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

    // フィルタ
    const filter = ()=>{
      const q = (document.querySelector("#job-key").value||"").trim();
      const items = this.ds.jobCategories.filter(j=> j.includes(q));
      document.getElementById("job-list").innerHTML = items.map(j=>`
        <label class="opt" style="display:block;padding:4px 0;font-size:14px;">
          <input class="checkbox job-chk" type="checkbox" value="${j}"> ${j}
        </label>`).join("");
    };
    document.querySelector("#job-key").addEventListener("input", filter);
  }

  /* ------------------------------
   * こだわり条件ページ
   * ------------------------------ */
  buildPrefPage(){
    const page=document.querySelector("#page-pref .slide-inner");
    page.innerHTML=`
      ${this.headerTpl("こだわり条件","back-pref")}
      <div style="flex:1;overflow:auto;padding:16px;display:grid;grid-template-columns:33% 67%;gap:12px;">
        <ul id="pref-menu" style="list-style:none;padding:0;margin:0;border-right:1px solid #ddd;"></ul>
        <div id="pref-wrap"></div>
      </div>
      <div class="footer-buttons" style="position:sticky;bottom:0;left:0;right:0;padding:10px 12px;background:#fff;border-top:1px solid #eee;display:flex;gap:8px;">
        <button class="btn-clear" id="clear-pref" style="flex:1;min-width:88px;border:1px solid #222;background:#fff;color:#111;border-radius:8px;padding:10px;font-weight:600;">クリア</button>
        <button class="btn-apply" id="apply-pref" style="flex:5;border:none;background:#e53935;color:#fff;border-radius:8px;padding:10px;font-weight:700;">内容を反映する</button>
      </div>`;

    document.getElementById("back-pref").onclick=()=>this.closeSlide("pref");

    const menu=page.querySelector("#pref-menu"),wrap=page.querySelector("#pref-wrap");
    const cats=Object.keys(this.ds.preferences);

    menu.innerHTML=cats.map((c,i)=>`
      <li>
        <button class="side-btn ${i===0?"active":""}" data-cat="${c}"
          style="width:100%;text-align:left;padding:10px;background:${i===0?"#eaeaea":"#fafafa"};border:none;">
          ${c}
        </button>
      </li>`).join("");

    const renderCat=(cat)=>{
      const opts=this.ds.preferences[cat]||[];
      wrap.innerHTML=opts.map(o=>`
        <label class="opt" style="display:block;padding:6px 4px;font-size:14px;">
          <input class="checkbox pref-chk" type="checkbox" value="${o}"> ${o}
        </label>`).join("");
      // 状態同期
      wrap.querySelectorAll(".pref-chk").forEach(cb=>{
        cb.checked = this.state.prefs.includes(cb.value);
      });
    };

    menu.querySelectorAll(".side-btn").forEach(b=>b.addEventListener("click",()=>{
      menu.querySelectorAll(".side-btn").forEach(a=>{a.classList.remove("active");a.style.background="#fafafa";});
      b.classList.add("active");b.style.background="#eaeaea";
      renderCat(b.getAttribute("data-cat"));
    }));

    renderCat(cats[0]);

    document.getElementById("clear-pref").onclick=()=>{
      this.state.prefs = [];
      document.querySelectorAll("#page-pref .pref-chk").forEach(cb=>cb.checked=false);
      this.updateConditionLabels();
    };
    document.getElementById("apply-pref").onclick=()=>{
      const checked=Array.from(document.querySelectorAll("#page-pref .pref-chk:checked")).map(c=>c.value);
      this.state.prefs=checked;
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
