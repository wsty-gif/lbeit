// js/components/SearchForm.js
class SearchForm {
  constructor(container, onSearch) {
    this.el = container;
    this.onSearch = onSearch;
    this.state = { keyword: "", locations: [], jobs: [], prefs: [] };
    this.render();
  }

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

          <div class="search-condition">
            <div class="cond-row" id="open-loc">
              <span class="cond-label">勤務地</span>
              <span class="cond-value" id="val-loc">未設定</span>
              <span class="cond-arrow">＞</span>
            </div>
            <div class="cond-row" id="open-job">
              <span class="cond-label">職種</span>
              <span class="cond-value" id="val-job">未設定</span>
              <span class="cond-arrow">＞</span>
            </div>
            <div class="cond-row" id="open-pref">
              <span class="cond-label">こだわり条件</span>
              <span class="cond-value" id="val-pref">未設定</span>
              <span class="cond-arrow">＞</span>
            </div>
          </div>

          <button id="btn-search" class="btn btn-primary">この条件で検索する</button>
        </div>
      </div>

      <div id="slide-container">
        <div id="page-loc" class="slide-page"><div class="slide-inner"></div></div>
        <div id="page-job" class="slide-page"><div class="slide-inner"></div></div>
        <div id="page-pref" class="slide-page"><div class="slide-inner"></div></div>
      </div>
    `;

    // イベント設定
    this.el.querySelector("#sf-key").addEventListener("input", e => {
      this.state.keyword = e.target.value.trim();
    });

    this.el.querySelector("#open-loc").addEventListener("click", () => this.openSlide("loc"));
    this.el.querySelector("#open-job").addEventListener("click", () => this.openSlide("job"));
    this.el.querySelector("#open-pref").addEventListener("click", () => this.openSlide("pref"));

    this.el.querySelector("#btn-search").addEventListener("click", () => this.applySearch());

    this.buildLocationPage();
    this.buildJobPage();
    this.buildPrefPage();
    this.updateConditionLabels();
  }

  /** ラベル表示更新 */
  updateConditionLabels() {
    const loc = this.state.locations.length
      ? this.state.locations.slice(0, 2).join("、") + (this.state.locations.length > 2 ? " ほか" : "")
      : "未設定";
    const job = this.state.jobs.length
      ? this.state.jobs.slice(0, 2).join("、") + (this.state.jobs.length > 2 ? " ほか" : "")
      : "未設定";
    const pref = this.state.prefs.length
      ? this.state.prefs.slice(0, 2).join("、") + (this.state.prefs.length > 2 ? " ほか" : "")
      : "未設定";

    this.el.querySelector("#val-loc").textContent = loc;
    this.el.querySelector("#val-job").textContent = job;
    this.el.querySelector("#val-pref").textContent = pref;
  }

  /** スライドページ開閉 */
  openSlide(key) {
    const target = document.querySelector(`#page-${key}`);
    document.querySelector("#slide-container").classList.add("show");
    target.classList.add("active");
  }

  closeSlide(key) {
    const target = document.querySelector(`#page-${key}`);
    target.classList.remove("active");
    document.querySelector("#slide-container").classList.remove("show");
  }

  /** 勤務地ページ */
  buildLocationPage() {
    const container = document.querySelector("#page-loc .slide-inner");
    container.innerHTML = `
      <div class="slide-header">
        <button class="back-btn" id="back-loc">＜</button>
        <h3>勤務地</h3>
      </div>
      <div class="slide-content">
        <div class="grid-3">
          <ul class="side-list" id="region-menu"></ul>
          <div id="pref-wrap"></div>
        </div>
      </div>
      <div class="slide-footer">
        <button class="btn" id="clear-loc">クリア</button>
        <button class="btn btn-primary" id="apply-loc">内容を反映する</button>
      </div>
    `;

    document.querySelector("#back-loc").onclick = () => this.closeSlide("loc");

    const regionMenu = container.querySelector("#region-menu");
    const prefWrap = container.querySelector("#pref-wrap");
    const regions = Object.keys(this.ds.REGION_PREFS);

    regionMenu.innerHTML = regions
      .map((r, i) => `<li><button class="side-btn ${i === 0 ? "active" : ""}" data-region="${r}">${r}</button></li>`)
      .join("");

    const renderPrefs = region => {
      const prefs = this.ds.REGION_PREFS[region] || [];
      prefWrap.innerHTML = prefs
        .map(
          pref => `
          <div class="pref-block">
            <div class="pref-head">
              <span>${pref}</span>
              <button class="toggle" data-pref="${pref}">＋</button>
            </div>
            <div class="inner hidden" data-city-list="${pref}"></div>
          </div>
        `
        )
        .join("");

      prefWrap.querySelectorAll(".toggle").forEach(btn => {
        btn.addEventListener("click", () => {
          const pref = btn.getAttribute("data-pref");
          const list = prefWrap.querySelector(`[data-city-list="${pref}"]`);
          const isHidden = list.classList.contains("hidden");
          if (isHidden) {
            const cities = PREF_CITY_DATA[pref] || {};
            list.innerHTML = Object.keys(cities)
              .map(city => {
                const wards = cities[city];
                const hasWards = Array.isArray(wards) && wards.length > 0;
                return `
                  <div class="city-block">
                    <div class="city-head">
                      <label class="opt"><input class="checkbox" type="checkbox" data-loc="${pref}/${city}"> ${city}</label>
                      ${hasWards ? `<button class="toggle" data-city="${city}">＋</button>` : ""}
                    </div>
                    ${
                      hasWards
                        ? `<div class="inner hidden" data-ward-list="${city}">
                            ${wards
                              .map(
                                w =>
                                  `<label class="opt"><input class="checkbox" type="checkbox" data-loc="${pref}/${city}/${w}"> ${w}</label>`
                              )
                              .join("")}
                          </div>`
                        : ""
                    }
                  </div>
                `;
              })
              .join("");

            // 区の開閉
            list.querySelectorAll("[data-city]").forEach(b => {
              b.addEventListener("click", () => {
                const city = b.getAttribute("data-city");
                const w = list.querySelector(`[data-ward-list="${city}"]`);
                const h = w.classList.contains("hidden");
                w.classList.toggle("hidden", !h);
                b.textContent = h ? "－" : "＋";
              });
            });

            list.classList.remove("hidden");
            btn.textContent = "－";
          } else {
            list.classList.add("hidden");
            btn.textContent = "＋";
          }
        });
      });
    };

    regionMenu.querySelectorAll(".side-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        regionMenu.querySelectorAll(".side-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderPrefs(btn.getAttribute("data-region"));
      });
    });
    renderPrefs(regions[0]);

    document.querySelector("#clear-loc").onclick = () => {
      this.state.locations = [];
      this.updateConditionLabels();
    };
    document.querySelector("#apply-loc").onclick = () => {
      const checked = Array.from(document.querySelectorAll('#page-loc input[type="checkbox"]:checked')).map(c =>
        c.getAttribute("data-loc")
      );
      this.state.locations = checked;
      this.updateConditionLabels();
      this.closeSlide("loc");
    };
  }

  /** 職種ページ */
  buildJobPage() {
    const container = document.querySelector("#page-job .slide-inner");
    container.innerHTML = `
      <div class="slide-header">
        <button class="back-btn" id="back-job">＜</button>
        <h3>職種</h3>
      </div>
      <div class="slide-content">
        <input id="job-key" class="input" placeholder="職種をフリーワードで探す" style="margin-bottom:10px">
        <div id="job-list" style="display:flex;flex-direction:column;gap:8px;">
          ${this.ds.jobCategories.map(
            j => `<label class="opt"><input class="checkbox job-chk" type="checkbox" value="${j}"> ${j}</label>`
          ).join("")}
        </div>
      </div>
      <div class="slide-footer">
        <button class="btn" id="clear-job">クリア</button>
        <button class="btn btn-primary" id="apply-job">内容を反映する</button>
      </div>
    `;

    document.querySelector("#back-job").onclick = () => this.closeSlide("job");

    const filter = () => {
      const q = (document.querySelector("#job-key").value || "").trim();
      const items = this.ds.jobCategories.filter(j => j.includes(q));
      document.getElementById("job-list").innerHTML = items
        .map(j => `<label class="opt"><input class="checkbox job-chk" type="checkbox" value="${j}"> ${j}</label>`)
        .join("");
    };
    document.querySelector("#job-key").addEventListener("input", filter);

    document.querySelector("#clear-job").onclick = () => {
      this.state.jobs = [];
      this.updateConditionLabels();
    };
    document.querySelector("#apply-job").onclick = () => {
      const checked = Array.from(document.querySelectorAll(".job-chk:checked")).map(c => c.value);
      this.state.jobs = checked;
      this.updateConditionLabels();
      this.closeSlide("job");
    };
  }

  /** こだわり条件ページ */
  buildPrefPage() {
    const container = document.querySelector("#page-pref .slide-inner");
    container.innerHTML = `
      <div class="slide-header">
        <button class="back-btn" id="back-pref">＜</button>
        <h3>こだわり条件</h3>
      </div>
      <div class="slide-content">
        <div class="grid-3">
          <ul class="side-list" id="pref-menu"></ul>
          <div id="pref-wrap"></div>
        </div>
      </div>
      <div class="slide-footer">
        <button class="btn" id="clear-pref">クリア</button>
        <button class="btn btn-primary" id="apply-pref">内容を反映する</button>
      </div>
    `;

    document.querySelector("#back-pref").onclick = () => this.closeSlide("pref");

    const menu = container.querySelector("#pref-menu");
    const wrap = container.querySelector("#pref-wrap");
    const cats = Object.keys(this.ds.preferences);
    menu.innerHTML = cats
      .map((c, i) => `<li><button class="side-btn ${i === 0 ? "active" : ""}" data-cat="${c}">${c}</button></li>`)
      .join("");

    const renderCat = cat => {
      const opts = this.ds.preferences[cat] || [];
      wrap.innerHTML = opts
        .map(o => `<label class="opt"><input class="checkbox pref-chk" type="checkbox" value="${o}"> ${o}</label>`)
        .join("");
    };

    menu.querySelectorAll(".side-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        menu.querySelectorAll(".side-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderCat(btn.getAttribute("data-cat"));
      });
    });

    renderCat(cats[0]);

    document.querySelector("#clear-pref").onclick = () => {
      this.state.prefs = [];
      this.updateConditionLabels();
    };
    document.querySelector("#apply-pref").onclick = () => {
      const checked = Array.from(document.querySelectorAll(".pref-chk:checked")).map(c => c.value);
      this.state.prefs = checked;
      this.updateConditionLabels();
      this.closeSlide("pref");
    };
  }

  /** 検索実行 */
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
