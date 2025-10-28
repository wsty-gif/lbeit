// js/components/SearchForm.js
class SearchForm {
  constructor(container, onSearch) {
    this.el = container;
    this.onSearch = onSearch;
    this.state = { keyword: "", locations: [], jobs: [], prefs: [] };
    this.render();
  }

  /** ========== 基本描画 ========== */
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

    // 入力
    this.el.querySelector("#sf-key").addEventListener("input", e => {
      this.state.keyword = e.target.value.trim();
    });

    // クリック（スライドオープン）
    this.el.querySelector("#open-loc").addEventListener("click", () => this.openSlide("loc"));
    this.el.querySelector("#open-job").addEventListener("click", () => this.openSlide("job"));
    this.el.querySelector("#open-pref").addEventListener("click", () => this.openSlide("pref"));

    // 検索
    this.el.querySelector("#btn-search").addEventListener("click", () => this.applySearch());

    // スライドページDOMを<body>直下へ用意（CSS不要のインライン制御）
    this.ensureSlideContainer();

    // 各ページ構築
    this.buildLocationPage();
    this.buildJobPage();
    this.buildPrefPage();

    // ラベル初期化
    this.updateConditionLabels();
  }

  condRowTpl(key, label) {
    return `
      <div class="cond-row" id="open-${key}"
        style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;">
        <span class="cond-label" style="font-weight:600;">${label}</span>
        <span class="cond-value" id="val-${key}" style="flex:1;text-align:right;color:#666;margin-right:8px;">未設定</span>
        <span class="cond-arrow" style="color:#888;">＞</span>
      </div>
    `;
  }

  /** ========== ラベル更新 ========== */
  updateConditionLabels() {
    const txt = (arr) => arr.length
      ? arr.slice(0,2).join("、") + (arr.length>2 ? " ほか" : "")
      : "未設定";
    const loc = txt(this.state.locations);
    const job = txt(this.state.jobs);
    const pref = txt(this.state.prefs);
    this.el.querySelector("#val-loc").textContent = loc;
    this.el.querySelector("#val-job").textContent = job;
    this.el.querySelector("#val-pref").textContent = pref;
  }

  /** ========== スライドコンテナ生成（インラインスタイルで動かす） ========== */
  ensureSlideContainer() {
    if (document.getElementById("slide-container")) return;

    const wrap = document.createElement("div");
    wrap.id = "slide-container";
    Object.assign(wrap.style, {
      position: "fixed",
      inset: "0",
      overflow: "hidden",
      zIndex: "2000",
      pointerEvents: "none" // 閉じてる間はクリック無効
    });

    const mkPage = (id) => {
      const p = document.createElement("div");
      p.id = `page-${id}`;
      p.className = "slide-page";
      Object.assign(p.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        background: "#fff",
        transform: "translateX(100%)",
        transition: "transform 0.35s ease",
        display: "flex",
        flexDirection: "column",
        visibility: "hidden"
      });
      const inner = document.createElement("div");
      inner.className = "slide-inner";
      Object.assign(inner.style, {
        display: "flex",
        flexDirection: "column",
        height: "100%"
      });
      p.appendChild(inner);
      return p;
    };

    wrap.appendChild(mkPage("loc"));
    wrap.appendChild(mkPage("job"));
    wrap.appendChild(mkPage("pref"));

    document.body.appendChild(wrap);

    // ESCで閉じる
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        ["loc","job","pref"].forEach(k => this.closeSlide(k));
      }
    });
  }

  /** ========== 開閉（CSS不要のJS制御） ========== */
  openSlide(key) {
    const container = document.getElementById("slide-container");
    if (!container) return;
    container.style.pointerEvents = "auto"; // 有効化

    const page = document.getElementById(`page-${key}`);
    if (!page) return;
    page.style.visibility = "visible";
    // リフロー後にトランジション
    requestAnimationFrame(() => {
      page.style.transform = "translateX(0)";
    });
  }

  closeSlide(key) {
    const container = document.getElementById("slide-container");
    const page = document.getElementById(`page-${key}`);
    if (!page) return;
    page.style.transform = "translateX(100%)";
    // アニメ後に不可視
    setTimeout(() => {
      page.style.visibility = "hidden";
      // 全ページ閉なら pointer-events を無効化
      const openExists = ["loc","job","pref"].some(k => {
        const p = document.getElementById(`page-${k}`);
        return p && p.style.visibility === "visible";
      });
      if (!openExists && container) {
        container.style.pointerEvents = "none";
      }
    }, 360);
  }

  /** ========== ページヘッダ共通 ========== */
  headerTpl(title, backId) {
    return `
      <div class="slide-header"
        style="display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid #eee;background:#fafafa;">
        <button class="back-btn" id="${backId}" style="background:transparent;border:none;font-size:18px;cursor:pointer;">＜</button>
        <h3 style="font-size:18px;font-weight:600;margin:0;">${title}</h3>
      </div>
    `;
  }

  /** ========== 勤務地ページ ========== */
  buildLocationPage() {
    const page = document.querySelector("#page-loc .slide-inner");
    page.innerHTML = `
      ${this.headerTpl("勤務地", "back-loc")}
      <div class="slide-content" style="flex:1;overflow:auto;padding:16px;display:grid;grid-template-columns:33% 67%;gap:12px;">
        <ul id="region-menu" style="list-style:none;padding:0;margin:0;border-right:1px solid #ddd;"></ul>
        <div id="pref-wrap"></div>
      </div>
      <div class="slide-footer" style="padding:10px 16px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:8px;">
        <button class="btn" id="clear-loc">クリア</button>
        <button class="btn btn-primary" id="apply-loc">内容を反映する</button>
      </div>
    `;

    document.getElementById("back-loc").onclick = () => this.closeSlide("loc");

    const regionMenu = page.querySelector("#region-menu");
    const prefWrap = page.querySelector("#pref-wrap");
    const regions = Object.keys(this.ds.REGION_PREFS);

    // 左カラム：大括り
    regionMenu.innerHTML = regions.map((r,i)=>`
      <li style="display:flex;align-items:center;justify-content:space-between;">
        <button class="side-btn ${i===0?"active":""}" data-region="${r}" style="flex:1;text-align:left;">
          ${r}
        </button>
        <span class="dot" data-dot="${r}" style="width:8px;height:8px;border-radius:50%;background:#e53935;display:none;margin-left:6px;"></span>
      </li>
    `).join("");

const renderPrefs = (region) => {
  const prefs = this.ds.REGION_PREFS[region] || [];
  const selected = new Set(this.state.locations || []); // ✅ 現在の選択を保持
  prefWrap.innerHTML = prefs.map(pref => `
    <div class="pref-block" style="border-bottom:1px solid #ddd;padding:10px 0;">
      <div class="pref-head" style="display:flex;justify-content:space-between;align-items:center;">
        <label class="opt" style="display:flex;align-items:center;gap:8px;font-size:16px;">
          <input class="checkbox pref-chk" type="checkbox" data-pref="${pref}" style="accent-color:#e53935;">
          <span style="font-weight:600;">${pref}</span>
        </label>
        <button class="toggle" data-pref="${pref}" style="background:transparent;border:none;cursor:pointer;font-weight:bold;font-size:18px;color:#444">＋</button>
      </div>
      <div class="inner hidden" data-city-list="${pref}" style="display:none;padding-left:16px;margin-top:6px;"></div>
    </div>
  `).join("");

  // ✅ キャッシュオブジェクトを保持（閉じても再生成しない）
  if (!this._cityCache) this._cityCache = {};

  prefWrap.querySelectorAll(".toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const pref = btn.getAttribute("data-pref");
      const list = prefWrap.querySelector(`[data-city-list="${pref}"]`);
      const isHidden = list.style.display === "none";

      if (isHidden) {
        // ✅ キャッシュ利用（初回のみ生成）
        if (!this._cityCache[pref]) {
          const citiesObj = (window.PREF_CITY_DATA && window.PREF_CITY_DATA[pref]) || {};
          const cityNames = Object.keys(citiesObj);

          const html = cityNames.map(city => {
            const wards = Array.isArray(citiesObj[city]) ? citiesObj[city] : [];
            const hasWards = wards.length > 0;

            return `
              <div class="city-block" style="border-bottom:1px solid #eee;padding:8px 0;">
                <div class="city-head" style="display:flex;justify-content:space-between;align-items:center;">
                  <label class="opt" style="display:block;padding:4px 0;font-size:16px;">
                    <input class="checkbox city-chk" type="checkbox" data-loc="${pref}/${city}" data-pref="${pref}" style="accent-color:#e53935;margin-right:6px;">
                    ${city}
                  </label>
                  ${hasWards ? `<button class="toggle" data-city="${city}" style="background:transparent;border:none;cursor:pointer;font-weight:bold;font-size:16px;color:#444">＋</button>` : ""}
                </div>

                ${hasWards ? `
                  <div class="inner hidden" data-ward-list="${city}" style="display:none;padding-left:16px;margin-top:6px;">
                    ${wards.map(w => `
                      <div style="border-bottom:1px solid #f0f0f0;padding:6px 0;">
                        <label class="opt" style="display:block;font-size:15px;">
                          <input class="checkbox ward-chk" type="checkbox" data-loc="${pref}/${city}/${w}" data-pref="${pref}" style="accent-color:#e53935;margin-right:6px;">
                          ${w}
                        </label>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              </div>
            `;
          }).join("");

          this._cityCache[pref] = html; // ✅ キャッシュ保存
        }

        list.innerHTML = this._cityCache[pref];
        list.style.display = "block";
        btn.textContent = "－";

        // ✅ イベントをバインド（再生成時のみ）
        list.querySelectorAll("[data-city]").forEach(b => {
          b.addEventListener("click", () => {
            const city = b.getAttribute("data-city");
            const w = list.querySelector(`[data-ward-list="${city}"]`);
            const isHiddenWard = w && (w.style.display === "none");
            if (w) {
              w.style.display = isHiddenWard ? "block" : "none";
              b.textContent = isHiddenWard ? "－" : "＋";
            }
          });
        });

        // ✅ チェック状態を再反映
        list.querySelectorAll("input.checkbox").forEach(cb => {
          if (selected.has(cb.getAttribute("data-loc"))) {
            cb.checked = true;
            cb.closest("label").style.background = "#ffecec";
          }
        });

      } else {
        list.style.display = "none";
        btn.textContent = "＋";
      }
    });
  });

  // ✅ 都道府県チェック：配下すべてON/OFF
  prefWrap.querySelectorAll(".pref-chk").forEach(prefChk => {
    prefChk.addEventListener("change", () => {
      const pref = prefChk.getAttribute("data-pref");
      const checked = prefChk.checked;

      // ✅ キャッシュ済みならその内部も更新
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = this._cityCache[pref] || "";
      tempDiv.querySelectorAll("input[type='checkbox']").forEach(cb => {
        cb.checked = checked;
        const loc = cb.getAttribute("data-loc");
        if (checked) selected.add(loc); else selected.delete(loc);
      });
      this._cityCache[pref] = tempDiv.innerHTML;

      const parentDiv = prefChk.closest(".pref-head");
      if (parentDiv) parentDiv.style.background = checked ? "#ffecec" : "transparent";
      const regionBtn = document.querySelector(".side-btn.active");
      if (regionBtn) updateRegionDot(regionBtn.getAttribute("data-region"));
      this.state.locations = Array.from(selected);
    });
  });

  // ✅ 個別チェック保持＋即時反映
  prefWrap.addEventListener("change", e => {
    if (e.target.classList.contains("checkbox")) {
      const label = e.target.closest("label");
      if (label) label.style.background = e.target.checked ? "#ffecec" : "transparent";
      const loc = e.target.getAttribute("data-loc");
      if (e.target.checked) selected.add(loc); else selected.delete(loc);
      this.state.locations = Array.from(selected);

      // ✅ キャッシュを更新（閉じても保持）
      const pref = e.target.getAttribute("data-pref");
      const container = prefWrap.querySelector(`[data-city-list="${pref}"]`);
      if (container) this._cityCache[pref] = container.innerHTML;

      const regionBtn = document.querySelector(".side-btn.active");
      if (regionBtn) updateRegionDot(regionBtn.getAttribute("data-region"));
    }
  });

  // ✅ 初回レンダー時に既存選択を反映
  prefWrap.querySelectorAll("input.checkbox").forEach(cb => {
    if (selected.has(cb.getAttribute("data-loc"))) {
      cb.checked = true;
      cb.closest("label").style.background = "#ffecec";
    }
  });
};
  
    // 地域切替
    regionMenu.querySelectorAll(".side-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        regionMenu.querySelectorAll(".side-btn").forEach(b => {
          b.classList.remove("active");
          b.style.background = "#fafafa";
          b.style.fontWeight = "normal";
        });
        btn.classList.add("active");
        btn.style.background = "#eaeaea";
        btn.style.fontWeight = "600";
        renderPrefs(btn.getAttribute("data-region"));
      });
    });

    renderPrefs(regions[0]);

    // クリア・反映
    document.getElementById("clear-loc").onclick = () => {
      this.state.locations = [];
      this.updateConditionLabels();
    };
    document.getElementById("apply-loc").onclick = () => {
      const checked = Array.from(document.querySelectorAll('#page-loc input[type="checkbox"]:checked'))
        .map(c => c.getAttribute("data-loc"));
      this.state.locations = checked;
      this.updateConditionLabels();
      this.closeSlide("loc");
    };
  }

  /** ========== 職種ページ ========== */
  buildJobPage() {
    const page = document.querySelector("#page-job .slide-inner");
    page.innerHTML = `
      ${this.headerTpl("職種", "back-job")}
      <div class="slide-content" style="flex:1;overflow:auto;padding:16px;display:block;">
        <input id="job-key" class="input" placeholder="職種をフリーワードで探す" style="margin-bottom:10px;width:100%;">
        <div id="job-list" style="display:flex;flex-direction:column;gap:8px;">
          ${this.ds.jobCategories.map(j => `
            <label class="opt" style="display:block;padding:4px 0;font-size:14px;">
              <input class="checkbox job-chk" type="checkbox" value="${j}" style="margin-right:6px;"> ${j}
            </label>
          `).join("")}
        </div>
      </div>
      <div class="footer-buttons">
        <button class="btn-clear" data-clear-loc>クリア</button>
        <button class="btn-apply" data-apply-loc>内容を反映する</button>
      </div>
    `;

    document.getElementById("back-job").onclick = () => this.closeSlide("job");

    const filter = () => {
      const q = (document.getElementById("job-key").value || "").trim();
      const items = this.ds.jobCategories.filter(j => j.includes(q));
      document.getElementById("job-list").innerHTML = items.map(j => `
        <label class="opt" style="display:block;padding:4px 0;font-size:14px;">
          <input class="checkbox job-chk" type="checkbox" value="${j}" style="margin-right:6px;"> ${j}
        </label>
      `).join("");
    };
    document.getElementById("job-key").addEventListener("input", filter);

    document.getElementById("clear-job").onclick = () => {
      this.state.jobs = [];
      this.updateConditionLabels();
    };
    document.getElementById("apply-job").onclick = () => {
      const checked = Array.from(document.querySelectorAll("#page-job .job-chk:checked")).map(c => c.value);
      this.state.jobs = checked;
      this.updateConditionLabels();
      this.closeSlide("job");
    };
  }

  /** ========== こだわり条件ページ ========== */
  buildPrefPage() {
    const page = document.querySelector("#page-pref .slide-inner");
    page.innerHTML = `
      ${this.headerTpl("こだわり条件", "back-pref")}
      <div class="slide-content" style="flex:1;overflow:auto;padding:16px;display:grid;grid-template-columns:33% 67%;gap:12px;">
        <ul id="pref-menu" style="list-style:none;padding:0;margin:0;border-right:1px solid #ddd;"></ul>
        <div id="pref-wrap"></div>
      </div>
      <div class="slide-footer" style="padding:10px 16px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:8px;">
        <button class="btn" id="clear-pref">クリア</button>
        <button class="btn btn-primary" id="apply-pref">内容を反映する</button>
      </div>
    `;

    document.getElementById("back-pref").onclick = () => this.closeSlide("pref");

    const menu = page.querySelector("#pref-menu");
    const wrap = page.querySelector("#pref-wrap");
    const cats = Object.keys(this.ds.preferences);

    menu.innerHTML = cats.map((c,i)=>`
      <li>
        <button class="side-btn ${i===0?"active":""}" data-cat="${c}"
          style="width:100%;text-align:left;padding:10px 12px;border:none;background:${i===0?"#eaeaea":"#fafafa"};cursor:pointer;${i===0?"font-weight:600;":""}">
          ${c}
        </button>
      </li>
    `).join("");

    const renderCat = (cat) => {
      const opts = this.ds.preferences[cat] || [];
      wrap.innerHTML = opts.map(o => `
        <label class="opt" style="display:block;padding:4px 0;font-size:14px;">
          <input class="checkbox pref-chk" type="checkbox" value="${o}" style="margin-right:6px;"> ${o}
        </label>
      `).join("");
    };

    menu.querySelectorAll(".side-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        menu.querySelectorAll(".side-btn").forEach(b => {
          b.classList.remove("active");
          b.style.background = "#fafafa";
          b.style.fontWeight = "normal";
        });
        btn.classList.add("active");
        btn.style.background = "#eaeaea";
        btn.style.fontWeight = "600";
        renderCat(btn.getAttribute("data-cat"));
      });
    });

    renderCat(cats[0]);

    document.getElementById("clear-pref").onclick = () => {
      this.state.prefs = [];
      this.updateConditionLabels();
    };
    document.getElementById("apply-pref").onclick = () => {
      const checked = Array.from(document.querySelectorAll("#page-pref .pref-chk:checked")).map(c => c.value);
      this.state.prefs = checked;
      this.updateConditionLabels();
      this.closeSlide("pref");
    };
  }

  /** ========== 検索 ========== */
  async applySearch() {
    const all = await DataService.getAllAccounts();
    const k = (this.state.keyword || "").toLowerCase();

    const filtered = all.filter(job => {
      const text = `${job.name} ${job.station} ${job.jobCategories?.join(" ")} ${job.jobDisplay} ${job.address}`.toLowerCase();
      const passKey = k ? text.includes(k) : true;

      const passLoc = this.state.locations.length
        ? this.state.locations.some(loc => {
            const [pref, city, ward] = loc.split("/");
            const s = `${job.prefecture}/${job.city}`;
            if (ward) return `${job.prefecture}/${job.city}/${job.ward || ""}`.includes(loc);
            return s.includes(city) || job.prefecture === pref;
          })
        : true;

      const passJob = this.state.jobs.length
        ? (job.jobCategories || []).some(j => this.state.jobs.includes(j))
        : true;

      const passPref = this.state.prefs.length
        ? (job.tags || []).some(t => this.state.prefs.includes(t))
        : true;

      return passKey && passLoc && passJob && passPref;
    });

    this.onSearch(filtered);
  }
}
