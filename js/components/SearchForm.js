class SearchForm {
  constructor(container, onSearch) {
    this.el = container;
    this.onSearch = onSearch;
    // 画面状態
    this.state = {
      keyword: "",
      locations: [], // ["京都府","京都府/京都市","京都府/京都市/伏見区"] のように格納
      jobs: [],
      prefs: []
    };
    // 選択ページ（スライド表示）用の一時バッファ
    this.tmp = { loc: new Set(), job: new Set(), pref: new Set() };

    // 地域→都道府県（最低限：北海道/東北を分離）
    this.REGION_PREFS = {
      "北海道": ["北海道"],
      "東北": ["青森県","岩手県","宮城県","秋田県","山形県","福島県"],
      "関東": ["茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県"],
      "中部": ["新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県"],
      "近畿": ["三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県"],
      "中国": ["鳥取県","島根県","岡山県","広島県","山口県"],
      "四国": ["徳島県","香川県","愛媛県","高知県"],
      "九州・沖縄": ["福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"]
    };

    // 区データ（必要最低限）
    this.WARD_DATA = {
      "京都市": ["北区","上京区","左京区","中京区","東山区","下京区","南区","右京区","伏見区","山科区","西京区"],
      "大阪市": ["都島区","福島区","此花区","西区","港区","大正区","天王寺区","浪速区","西淀川区","東淀川区","東成区","生野区","旭区","城東区","阿倍野区","住吉区","東住吉区","西成区","淀川区","鶴見区","住之江区","平野区","北区","中央区"],
      "神戸市": ["東灘区","灘区","兵庫区","長田区","須磨区","垂水区","北区","中央区","西区"]
    };

    this.render();
  }

  /* =========================
   * 初期画面（2行固定UI）
   * ========================= */
  render() {
    this.el.innerHTML = `
      <div class="card" style="padding:16px;">
        <div style="display:grid;gap:16px;">
          <div>
            <label class="block text-sm font-semibold mb-1">キーワード検索</label>
            <input id="sf-key" class="input" placeholder="例：カフェ／接客／倉庫" />
          </div>

          ${this.condRow("loc", "勤務地", "fa-solid fa-location-dot")}
          ${this.condRow("job", "職種", "fa-solid fa-briefcase")}
          ${this.condRow("pref", "こだわり条件", "fa-solid fa-star")}

          <button id="btn-search" class="btn btn-primary">この条件で検索する</button>
        </div>
      </div>

      ${this.pageTpl("loc","勤務地設定")}
      ${this.pageTpl("job","職種設定")}
      ${this.pageTpl("pref","こだわり条件設定")}
    `;

    // 値の復元
    this.el.querySelector("#sf-key").value = this.state.keyword || "";

    // イベント
    this.el.querySelector("#sf-key").addEventListener("input", e => {
      this.state.keyword = e.target.value.trim();
    });
    this.el.querySelector("#btn-search").addEventListener("click", () => this.applySearch());

    // 行クリック（詳細ページをスライド表示）
    this.el.querySelector("#open-loc").addEventListener("click", () => this.openPage("loc"));
    this.el.querySelector("#open-job").addEventListener("click", () => this.openPage("job"));
    this.el.querySelector("#open-pref").addEventListener("click", () => this.openPage("pref"));

    // 条件クリア（タイトル行の右端）
    this.el.querySelectorAll(".clear-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const key = btn.dataset.clear;
        if (key === "loc") this.state.locations = [];
        if (key === "job") this.state.jobs = [];
        if (key === "pref") this.state.prefs = [];
        this.render(); // 表示更新
      });
    });

    // 詳細ページ内容の構築
    this.buildLocPage();
    this.buildJobPage();
    this.buildPrefPage();
  }

  // 2行固定レイアウト（未設定 or 設定済み）
  condRow(key, label, icon) {
    const values = (key === "loc")
      ? this.summarizeLocations(this.state.locations)
      : (key === "job" ? this.state.jobs : this.state.prefs);

    const hasValue = (values && values.length > 0);
    const contentText = hasValue ? values.join("、") : "未設定";

    return `
      <div class="cond-row" id="open-${key}" style="border-bottom:1px solid #eee;padding:10px 0;cursor:pointer;">
        <!-- 1行目：タイトル + 右端ボタン -->
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="${icon}" style="color:#555;font-size:1.1rem;"></i>
            <span style="font-weight:600;">${label}</span>
          </div>
          ${
            hasValue
              ? `<span class="clear-btn" data-clear="${key}" style="color:#1d4ed8;font-size:0.9rem;">条件をクリア</span>`
              : ``
          }
        </div>
        <!-- 2行目：内容（未設定 or 値） 右端に＞（未設定時のみ） -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-left:28px;margin-top:4px;">
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#444;font-size:0.95rem;">
            ${contentText}
          </span>
          ${
            hasValue
              ? ``
              : `<span style="color:#999;font-size:1.2rem;">＞</span>`
          }
        </div>
      </div>
    `;
  }

  /* =========================
   * スライドページ（共通）
   * ========================= */
  pageTpl(key, title) {
    return `
      <div id="page-${key}" style="
        position:fixed;inset:0;background:#fff;z-index:60;transform:translateX(100%);
        transition:transform .25s ease;
        display:flex;flex-direction:column;
      ">
        <div style="padding:12px 14px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:8px;">
          <button data-back-${key} style="border:1px solid #ddd;background:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;">戻る</button>
          <h3 style="font-weight:700;">${title}</h3>
        </div>
        <div id="${key}-content" style="flex:1;min-height:0;overflow:auto;"></div>
        <div style="position:sticky;bottom:0;background:#fff;border-top:1px solid #eee;padding:10px;">
          <div style="display:flex;gap:10px;">
            <button data-clear-${key} style="flex:0 0 28%;border:1px solid #222;background:#fff;color:#111;border-radius:10px;padding:12px 10px;font-weight:700;cursor:pointer;">クリア</button>
            <button data-apply-${key} style="flex:1;background:#ef4444;color:#fff;border:none;border-radius:10px;padding:12px 10px;font-weight:700;cursor:pointer;">内容を反映する</button>
          </div>
        </div>
      </div>
    `;
  }

  openPage(key) {
    // 一時バッファ初期化
    if (key === "loc") this.tmp.loc = new Set(this.state.locations);
    if (key === "job") this.tmp.job = new Set(this.state.jobs);
    if (key === "pref") this.tmp.pref = new Set(this.state.prefs);

    const page = document.getElementById(`page-${key}`);
    page.style.transform = "translateX(0%)";

    // 戻る
    page.querySelector(`[data-back-${key}]`).onclick = () => {
      page.style.transform = "translateX(100%)";
    };

    // クリア
    page.querySelector(`[data-clear-${key}]`).onclick = () => {
      if (key === "loc") this.tmp.loc.clear();
      if (key === "job") this.tmp.job.clear();
      if (key === "pref") this.tmp.pref.clear();
      // 見た目更新
      if (key === "loc") this.refreshLocChecks();
      if (key === "job") this.refreshJobChecks();
      if (key === "pref") this.refreshPrefChecks();
    };

    // 反映
    page.querySelector(`[data-apply-${key}]`).onclick = () => {
      if (key === "loc") this.state.locations = Array.from(this.tmp.loc);
      if (key === "job") this.state.jobs = Array.from(this.tmp.job);
      if (key === "pref") this.state.prefs = Array.from(this.tmp.pref);
      this.render(); // 初期画面へ反映
      page.style.transform = "translateX(100%)";
    };
  }

  /* =========================
   * 勤務地ページ
   * ========================= */
  buildLocPage() {
    const cont = document.getElementById("loc-content");
    cont.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;min-height:100%;height:100%;">
        <!-- 左：地域 -->
        <div style="border-right:1px solid #eee;">
          <ul id="region-menu" style="list-style:none;margin:0;padding:6px;">
            ${Object.keys(this.REGION_PREFS).map((r,i)=>`
              <li>
                <button class="region-btn ${i===0?"active":""}" data-region="${r}" style="
                  width:100%;text-align:left;border:none;background:#fff;cursor:pointer;
                  padding:10px 8px;border-radius:8px;margin-bottom:6px;font-weight:${i===0?"700":"600"};
                  ${i===0?"background:#f8fafc;":""}
                ">${r}<span class="red-dot" data-dot-region="${r}" style="display:none;margin-left:6px;background:#dc2626;width:8px;height:8px;border-radius:9999px;vertical-align:middle;"></span></button>
              </li>
            `).join("")}
          </ul>
        </div>
        <!-- 中：都道府県 -->
        <div style="border-right:1px solid #eee;overflow:auto;" id="pref-pane"></div>
        <!-- 右：市・区 -->
        <div style="overflow:auto;padding:8px;" id="city-pane">
          <div style="color:#888;">左の都道府県を選ぶと市区町村が表示されます</div>
        </div>
      </div>
    `;

    const prefPane = cont.querySelector("#pref-pane");
    const cityPane = cont.querySelector("#city-pane");
    const regions = Object.keys(this.REGION_PREFS);

    const renderPrefs = (region) => {
      const prefs = this.REGION_PREFS[region] || [];
      prefPane.innerHTML = prefs.map(pref => {
        const checked = this._isPrefAllSelected(pref);
        return `
          <div style="padding:10px 10px;border-bottom:1px solid #f1f5f9;">
            <label style="display:flex;align-items:center;gap:8px;">
              <input type="checkbox" class="pref-chk" data-pref="${pref}" ${checked?"checked":""} style="accent-color:#dc2626;width:16px;height:16px;">
              <span style="font-weight:700;font-size:15px;">${pref}</span>
              <button class="pref-toggle" data-pref="${pref}" style="margin-left:auto;border:1px solid #ddd;background:#fff;border-radius:6px;padding:4px 8px;cursor:pointer;">＋</button>
            </label>
          </div>
        `;
      }).join("");

      // 県チェック→配下一括選択
      prefPane.querySelectorAll(".pref-chk").forEach(ch => {
        ch.addEventListener("change", (e) => {
          const pref = e.target.getAttribute("data-pref");
          const on = e.target.checked;
          this.setPrefChecked(pref, on);
          this.refreshLocChecks();
          this.updateRegionDot();
        });
      });

      // 県の「＋」→ 市表示
      prefPane.querySelectorAll(".pref-toggle").forEach(btn => {
        btn.addEventListener("click", () => {
          const pref = btn.getAttribute("data-pref");
          renderCities(pref);
        });
      });
    };

    const renderCities = (pref) => {
      const cities = (window.PREF_CITY_DATA && window.PREF_CITY_DATA[pref]) || [];
      cityPane.innerHTML = `
        <div style="padding:8px 8px 0 8px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-weight:700;">${pref}</span>
          </div>
          <div>
            ${cities.map(city => {
              const wards = this.WARD_DATA[city] || [];
              const cChecked = this._isCityAllSelected(pref, city, wards);
              return `
                <div style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" class="city-chk" data-pref="${pref}" data-city="${city}" ${cChecked?"checked":""} style="accent-color:#dc2626;width:16px;height:16px;">
                    <span style="font-weight:600;font-size:15px;">${city}</span>
                    ${wards.length?`<button class="city-toggle" data-pref="${pref}" data-city="${city}" style="margin-left:auto;border:1px solid #ddd;background:#fff;border-radius:6px;padding:2px 6px;cursor:pointer;">＋</button>`:""}
                  </div>
                  ${wards.length?`
                    <div class="ward-box" data-pref="${pref}" data-city="${city}" style="margin-left:24px;margin-top:6px;display:none;">
                      ${wards.map(w => {
                        const wChecked = this.tmp.loc.has(`${pref}/${city}/${w}`);
                        return `
                          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f7f7f7;">
                            <input type="checkbox" class="ward-chk" data-pref="${pref}" data-city="${city}" data-ward="${w}" ${wChecked?"checked":""} style="accent-color:#dc2626;width:16px;height:16px;">
                            <span>${w}</span>
                          </div>
                        `;
                      }).join("")}
                    </div>
                  `:""}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;

      // 市チェック
      cityPane.querySelectorAll(".city-chk").forEach(ch => {
        ch.addEventListener("change", (e) => {
          const pref = e.target.getAttribute("data-pref");
          const city = e.target.getAttribute("data-city");
          const on = e.target.checked;
          this.setCityChecked(pref, city, on);
          this.refreshLocChecks();
          this.updateRegionDot();
        });
      });

      // 市の＋ → 区表示切替
      cityPane.querySelectorAll(".city-toggle").forEach(btn => {
        btn.addEventListener("click", () => {
          const pref = btn.getAttribute("data-pref");
          const city = btn.getAttribute("data-city");
          const box = cityPane.querySelector(`.ward-box[data-pref="${pref}"][data-city="${city}"]`);
          const now = box.style.display !== "none";
          box.style.display = now ? "none" : "block";
          btn.textContent = now ? "＋" : "－";
        });
      });

      // 区チェック
      cityPane.querySelectorAll(".ward-chk").forEach(ch => {
        ch.addEventListener("change", (e) => {
          const pref = e.target.getAttribute("data-pref");
          const city = e.target.getAttribute("data-city");
          const ward = e.target.getAttribute("data-ward");
          const on = e.target.checked;
          this.setWardChecked(pref, city, ward, on);
          this.refreshLocChecks();
          this.updateRegionDot();
        });
      });
    };

    // 地域切替
    cont.querySelectorAll(".region-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        cont.querySelectorAll(".region-btn").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        renderPrefs(btn.getAttribute("data-region"));
      });
    });

    // 初期表示
    renderPrefs(regions[0]);
  }

  // 勤務地：都道府県ON/OFF（配下すべて一括）
  setPrefChecked(pref, on) {
    if (!window.PREF_CITY_DATA || !window.PREF_CITY_DATA[pref]) {
      // 市データなしでもprefだけは反映
      this._set(on, pref);
      return;
    }
    const cities = window.PREF_CITY_DATA[pref];
    // 県自身
    this._set(on, pref);
    // 市
    cities.forEach(city => {
      this._set(on, `${pref}/${city}`);
      const wards = this.WARD_DATA[city] || [];
      wards.forEach(w => this._set(on, `${pref}/${city}/${w}`));
    });
    // OFFの時は余計なのを整理（全子要素がないならpref外す）
    if (!on && !this._hasAnyChildrenUnderPref(pref)) {
      this._set(false, pref);
    }
  }

  // 勤務地：市ON/OFF（区も一括・親も自動）
  setCityChecked(pref, city, on) {
    this._set(on, `${pref}/${city}`);
    const wards = this.WARD_DATA[city] || [];
    wards.forEach(w => this._set(on, `${pref}/${city}/${w}`));
    if (on) {
      // ON時は親もON
      this._set(true, pref);
    } else {
      // 市配下に何もなければ市OFF（市自体も外す）
      if (!this._hasAnyWard(pref, city)) {
        this._set(false, `${pref}/${city}`);
      }
      // 府県配下に子がなければ府県もOFF
      if (!this._hasAnyChildrenUnderPref(pref)) {
        this._set(false, pref);
      }
    }
  }

  // 勤務地：区ON/OFF（親も自動）
  setWardChecked(pref, city, ward, on) {
    this._set(on, `${pref}/${city}/${ward}`);
    if (on) {
      // 区をON → 市/府県もON
      this._set(true, `${pref}/${city}`);
      this._set(true, pref);
    } else {
      // 区が全て外れたら市OFF
      if (!this._hasAnyWard(pref, city)) {
        this._set(false, `${pref}/${city}`);
      }
      // 市も全OFFになったら府県OFF
      if (!this._hasAnyChildrenUnderPref(pref)) {
        this._set(false, pref);
      }
    }
  }

  // 一時集合のON/OFF
  _set(on, key) {
    if (!key) return;
    const S = this.tmp.loc;
    if (on) S.add(key); else S.delete(key);
  }

  // 県の配下に子があるか
  _hasAnyChildrenUnderPref(pref) {
    const S = this.tmp.loc;
    for (const v of S) {
      if (v === pref) return true;
      if (v.startsWith(`${pref}/`)) return true;
    }
    return false;
  }

  // 市の配下（区）が一つでもあるか
  _hasAnyWard(pref, city) {
    const S = this.tmp.loc;
    const prefix = `${pref}/${city}/`;
    for (const v of S) {
      if (v.startsWith(prefix)) return true;
    }
    // 区を持たない市の場合：市自体が残っていれば true
    return S.has(`${pref}/${city}`);
  }

  // 府県が全選択か（＝pref自体が選ばれている or 全市区が選択）
  _isPrefAllSelected(pref) {
    const S = this.tmp.loc;
    if (S.has(pref)) return true;
    const cities = (window.PREF_CITY_DATA && window.PREF_CITY_DATA[pref]) || [];
    if (!cities.length) return S.has(pref);
    // 全市が（区含め）ONかのざっくり判定：市キーが各市で最低1件あればONとみなす
    return cities.every(city => this._isCityAllSelected(pref, city, this.WARD_DATA[city] || []));
  }

  // 市が全選択か（＝市キーがON or 区が全部ON）
  _isCityAllSelected(pref, city, wards) {
    const S = this.tmp.loc;
    if (S.has(`${pref}/${city}`)) return true;
    if (!wards.length) return S.has(`${pref}/${city}`);
    return wards.every(w => S.has(`${pref}/${city}/${w}`));
  }

  // チェック見た目の再描画（pref/city/ward）
  refreshLocChecks() {
    // 都道府県チェック更新
    document.querySelectorAll(".pref-chk").forEach(ch => {
      const pref = ch.getAttribute("data-pref");
      ch.checked = this._isPrefAllSelected(pref);
      ch.parentElement.parentElement.style.background = ch.checked ? "rgba(220,38,38,0.06)" : "#fff";
    });
    // 市チェック更新
    document.querySelectorAll(".city-chk").forEach(ch => {
      const pref = ch.getAttribute("data-pref");
      const city = ch.getAttribute("data-city");
      const wards = this.WARD_DATA[city] || [];
      ch.checked = this._isCityAllSelected(pref, city, wards);
      // 行の背景
      const row = ch.closest("div[style*='border-bottom']");
      if (row) row.style.background = ch.checked ? "rgba(220,38,38,0.06)" : "#fff";
    });
    // 区チェック更新
    document.querySelectorAll(".ward-chk").forEach(ch => {
      const pref = ch.getAttribute("data-pref");
      const city = ch.getAttribute("data-city");
      const ward = ch.getAttribute("data-ward");
      ch.checked = this.tmp.loc.has(`${pref}/${city}/${ward}`);
    });
  }

  // 地域メニューの赤丸（選択があれば点灯）
  updateRegionDot() {
    const regions = Object.keys(this.REGION_PREFS);
    regions.forEach(r => {
      const prefs = this.REGION_PREFS[r] || [];
      let picked = false;
      for (const pref of prefs) {
        if (this._hasAnyChildrenUnderPref(pref)) { picked = true; break; }
      }
      const dot = document.querySelector(`[data-dot-region="${r}"]`);
      if (dot) dot.style.display = picked ? "inline-block" : "none";
    });
  }

  // 初期画面表示用に勤務地を要約（府県 > 市 > 区）
  summarizeLocations(list) {
    if (!list || !list.length) return [];
    // 階層へ分解
    const byPref = {};
    for (const v of list) {
      const parts = v.split("/");
      const pref = parts[0];
      const city = parts[1];
      const ward = parts[2];
      if (!byPref[pref]) byPref[pref] = {};
      if (city) {
        if (!byPref[pref][city]) byPref[pref][city] = new Set();
        if (ward) byPref[pref][city].add(ward);
        else byPref[pref][city].add("*CITY*"); // 市自体が選択
      } else {
        // 府県直
        byPref[pref]["*PREF*"] = new Set(["*PREF*"]);
      }
    }
    const out = [];
    Object.keys(byPref).forEach(pref => {
      const cities = byPref[pref];
      // 県直がある → 府県名のみ
      if (cities["*PREF*"]) { out.push(pref); return; }
      const cityNames = Object.keys(cities);
      // すべての市が[*CITY*]扱いなら県名のみ
      const allCityFlag = cityNames.length &&
        cityNames.every(c => cities[c].has("*CITY*"));
      if (allCityFlag) { out.push(pref); return; }
      // そうでなければ、代表で府県名を出す（見やすさ優先）
      out.push(pref);
    });
    return out;
    // ※ 必要なら「京都府、京都市、伏見区…」の粒度に拡張可能
  }

  /* =========================
   * 職種ページ（簡易）
   * ========================= */
  buildJobPage() {
    const cont = document.getElementById("job-content");
    const sampleJobs = [
      "接客・販売","ホール","キッチン","カフェスタッフ","倉庫作業","仕分け・シール貼り",
      "品出し（ピッキング）","レジ","警備員","交通誘導","コールセンター","軽作業"
    ];
    cont.innerHTML = `
      <div style="padding:10px;">
        <input id="job-key" placeholder="職種をフリーワードで探す" style="width:100%;border:1px solid #ddd;border-radius:8px;height:38px;padding:0 10px;margin-bottom:10px;">
        <div id="job-list" style="display:grid;gap:8px;">
          ${sampleJobs.map(j=>`
            <label style="display:flex;align-items:center;gap:8px;border:1px solid #f1f5f9;border-radius:8px;padding:10px;">
              <input type="checkbox" class="job-chk" value="${j}" ${this.tmp.job.has(j)?"checked":""} style="accent-color:#dc2626;width:16px;height:16px;">
              <span>${j}</span>
            </label>
          `).join("")}
        </div>
      </div>
    `;
    cont.querySelectorAll(".job-chk").forEach(ch=>{
      ch.addEventListener("change",(e)=>{
        const v = e.target.value;
        if (e.target.checked) this.tmp.job.add(v); else this.tmp.job.delete(v);
      });
    });
    cont.querySelector("#job-key").addEventListener("input", e=>{
      const q = e.target.value.trim();
      cont.querySelectorAll(".job-chk").forEach(ch=>{
        const row = ch.closest("label");
        row.style.display = (!q || ch.value.includes(q)) ? "" : "none";
      });
    });
  }

  /* =========================
   * こだわりページ（簡易）
   * ========================= */
  buildPrefPage() {
    const cont = document.getElementById("pref-content");
    const cats = {
      "人気条件": ["未経験OK","駅近","シフト自由","土日祝休み"],
      "勤務時間・休日": ["週2・3〜OK","残業なし","10時以降勤務OK"],
      "給与": ["高収入","日払い","給与UP"],
      "待遇・福利厚生": ["交通費支給","従業員割引あり"]
    };
    const catNames = Object.keys(cats);
    cont.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 2fr;min-height:100%;">
        <div style="border-right:1px solid #eee;">
          ${catNames.map((c,i)=>`
            <button class="pref-cat ${i===0?"active":""}" data-cat="${c}" style="
              display:block;width:100%;text-align:left;border:none;background:#fff;cursor:pointer;
              padding:10px;border-bottom:1px solid #f6f6f6;font-weight:${i===0?"700":"600"};
              ${i===0?"background:#f8fafc;":""}
            ">${c}</button>
          `).join("")}
        </div>
        <div id="pref-items" style="padding:10px;"></div>
      </div>
    `;
    const renderItems = (c)=>{
      const items = cats[c] || [];
      const box = cont.querySelector("#pref-items");
      box.innerHTML = items.map(v=>`
        <label style="display:flex;align-items:center;gap:8px;border:1px solid #f1f5f9;border-radius:8px;padding:10px;margin-bottom:8px;">
          <input type="checkbox" class="pref-chk" value="${v}" ${this.tmp.pref.has(v)?"checked":""} style="accent-color:#dc2626;width:16px;height:16px;">
          <span>${v}</span>
        </label>
      `).join("");
      box.querySelectorAll(".pref-chk").forEach(ch=>{
        ch.addEventListener("change",(e)=>{
          const v = e.target.value;
          if (e.target.checked) this.tmp.pref.add(v); else this.tmp.pref.delete(v);
        });
      });
    };
    cont.querySelectorAll(".pref-cat").forEach(btn=>{
      btn.addEventListener("click",()=>{
        cont.querySelectorAll(".pref-cat").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        renderItems(btn.getAttribute("data-cat"));
      });
    });
    renderItems(catNames[0]);
  }

  /* =========================
   * 検索実行
   * ========================= */
  async applySearch() {
    const all = await DataService.getAllAccounts();
    const k = (this.state.keyword || "").toLowerCase();

    const filtered = all.filter(job => {
      const text = `${job.name} ${job.station} ${(job.jobCategories||[]).join(" ")} ${job.jobDisplay||""} ${job.address||""}`.toLowerCase();
      const passKey = k ? text.includes(k) : true;

      const passLoc = this.state.locations.length
        ? this.state.locations.some(loc => {
            const [pref, city, ward] = loc.split("/");
            const s = `${job.prefecture||""}/${job.city||""}`;
            if (ward) return `${job.prefecture||""}/${job.city||""}/${job.ward||""}`.includes(loc);
            return s.includes(city||"") || (job.prefecture===pref);
          })
        : true;

      const passJob = this.state.jobs.length
        ? (job.jobCategories||[]).some(j => this.state.jobs.includes(j))
        : true;

      const passPref = this.state.prefs.length
        ? (job.tags||[]).some(t => this.state.prefs.includes(t))
        : true;

      return passKey && passLoc && passJob && passPref;
    });

    this.onSearch(filtered);
  }

  /* =========================
   * 外部からの反映（必要時）
   * ========================= */
  updateSelection(key, values) {
    if (key === "loc") this.state.locations = values || [];
    if (key === "job") this.state.jobs = values || [];
    if (key === "pref") this.state.prefs = values || [];
    this.render();
  }
}

window.SearchForm = SearchForm;
