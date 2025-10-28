// js/components/SearchForm.js
class SearchForm {
  constructor(container, onSearch) {
    this.el = container;
    this.onSearch = onSearch;

    this.state = {
      keyword: "",
      locations: [], // 確定状態（適用後）
      jobs: [],
      prefs: []
    };

    this._tempLoc = new Set(); // 勤務地ページ内での一時選択（適用前）
    this.render();
  }

  /* ------------------------------
   * 初期描画
   * ------------------------------ */
  async render() {
    const ds = await DataService.distincts();
    this.ds = ds;

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

    // スライドページのコンテナを確保
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
    // 勤務地だけ一時選択セットを現在値で初期化
    if (key === "loc") {
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
   * データアクセス（prefCities.js）
   * ------------------------------ */
  getPrefData(pref){
    // 返り値は { type:"object"|"array", cities:[...], wardsMap:{} }
    const raw = (window.PREF_CITY_DATA || {})[pref];
    if (!raw) return { type:"none", cities:[], wardsMap:{} };

    if (Array.isArray(raw)) {
      // ["久御山町", "宇治市", ...] など
      return { type:"array", cities: raw, wardsMap: {} };
    } else if (typeof raw === "object") {
      // { "京都市": ["北区",...], "久御山町": [] } など
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
      <div class="footer-buttons">
        <button class="btn-clear" id="clear-loc">クリア</button>
        <button class="btn-apply" id="apply-loc">内容を反映する</button>
      </div>`;

    document.getElementById("back-loc").onclick=()=>this.closeSlide("loc");

    const regionMenu=page.querySelector("#region-menu");
    const prefWrap=page.querySelector("#pref-wrap");
    const regions=Object.keys(this.ds.REGION_PREFS);

    // 左のエリアメニュー
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
      const prefs=this.ds.REGION_PREFS[region]||[];
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

      // 都道府県チェック → 配下一括
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
            // 再表示時、チェック状態を同期
            this.syncCheckboxesIn(list);
          }
        });
      });

      // 都道府県の change （配下を全ON/OFF）
      prefWrap.addEventListener("change", (e)=>{
        if (!e.target.matches('input[type="checkbox"][data-loc]')) return;
        const loc = e.target.getAttribute("data-loc");
        const checked = e.target.checked;
        const parts = loc.split("/");
        if (parts.length === 1) {
          // prefecture
          this.setPrefChecked(loc, checked);
          this.syncCheckboxesIn(prefWrap);
          this.updateRegionDots();
        }
      });

      // 初期の見た目同期
      this.syncCheckboxesIn(prefWrap);
      this.updateRegionDots();
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
      // 画面上のチェックをすべて外し、temp選択もクリア
      this._tempLoc.clear();
      // 現在ページのチェックUIも全解除
      document.querySelectorAll('#page-loc input[type="checkbox"][data-loc]').forEach(cb=>cb.checked=false);
      this.syncCheckboxesIn(document.getElementById("page-loc"));
      this.updateRegionDots();
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

    // cityブロック群を構築
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
      this.updateRegionDots();
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

  updateRegionDots(){
    // 地域内にひとつでも選択があれば dot を表示
    const regions = Object.keys(this.ds.REGION_PREFS || {});
    regions.forEach(r=>{
      const dot = document.querySelector(`[data-region-dot="${r}"]`);
      if (!dot) return;
      const prefs = this.ds.REGION_PREFS[r] || [];
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
      // pref配下に残りが無ければprefもOFF
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
      // その市に残りの ward が無ければ 市をOFF
      if (!this._hasAnyUnderCity(pref, city)) {
        this._set(false, `${pref}/${city}`);
      }
      // 都道府県配下にも何も無ければ 都道府県をOFF
      if (!this._hasAnyUnderPref(pref)) {
        this._set(false, `${pref}`);
      }
    }
    // ✅ UIを再描画
    this.syncCheckboxesIn(document.getElementById("page-loc"));
    this.updateRegionDots();
  }


  // temp セット操作
  _set(on, loc){
    if (on) this._tempLoc.add(loc);
    else this._tempLoc.delete(loc);
  }

  // 都道府県配下に一つでも選択があるか
  _hasAnyUnderPref(pref){
    const prefix = `${pref}/`;
    for (const loc of this._tempLoc) {
      if (loc === pref || loc.startsWith(prefix)) return true;
    }
    return false;
  }

  // 市配下に一つでも選択があるか
  _hasAnyUnderCity(pref, city){
    const prefix = `${pref}/${city}/`;
    for (const loc of this._tempLoc) {
      if (loc === `${pref}/${city}` || loc.startsWith(prefix)) return true;
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
      <div class="footer-buttons">
        <button class="btn-clear" id="clear-job">クリア</button>
        <button class="btn-apply" id="apply-job">内容を反映する</button>
      </div>`;

    document.getElementById("back-job").onclick=()=>this.closeSlide("job");

    // クリア / 適用
    document.getElementById("clear-job").onclick=()=>{
      this.state.jobs = [];
      // 画面上のチェックを外す
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
      <div class="footer-buttons">
        <button class="btn-clear" id="clear-pref">クリア</button>
        <button class="btn-apply" id="apply-pref">内容を反映する</button>
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
      // 表示中のチェックも外す
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
