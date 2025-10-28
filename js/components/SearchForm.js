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
        <div style="display:grid;gap:10px;">
          <div>
            <label class="block text-sm font-semibold mb-1">キーワード</label>
            <input id="sf-key" class="input" placeholder="例：カフェ／接客／倉庫" />
          </div>

          <div class="grid-3col">
            <button id="btn-loc" class="btn">勤務地</button>
            <button id="btn-job" class="btn">職種</button>
            <button id="btn-pref" class="btn">こだわり条件</button>
          </div>

          <div id="chips" class="summary"></div>
          <button id="btn-search" class="btn btn-primary">この条件で検索する</button>
        </div>
      </div>

      ${this.modalTpl("loc","勤務地")}
      ${this.modalTpl("job","職種")}
      ${this.modalTpl("pref","こだわり条件")}
    `;

    this.el.querySelector("#sf-key").addEventListener("input", e => {
      this.state.keyword = e.target.value.trim();
    });
    this.el.querySelector("#btn-loc").addEventListener("click", () => this.openModal("loc"));
    this.el.querySelector("#btn-job").addEventListener("click", () => this.openModal("job"));
    this.el.querySelector("#btn-pref").addEventListener("click", () => this.openModal("pref"));
    this.el.querySelector("#btn-search").addEventListener("click", () => this.applySearch());

    this.buildLocationModal();
    this.buildJobModal();
    this.buildPrefModal();
    this.renderChips();
  }

  renderChips() {
    const wrap = this.el.querySelector("#chips");
    const locText = this.state.locations.slice(0,3).join("、") + (this.state.locations.length>3 ? " ほか" : "");
    const jobText = this.state.jobs.slice(0,3).join("、") + (this.state.jobs.length>3 ? " ほか" : "");
    const prefText = this.state.prefs.slice(0,3).join("、") + (this.state.prefs.length>3 ? " ほか" : "");

    wrap.innerHTML = `
      ${locText ? `<span class="badge">勤務地: ${locText} <button data-clear="loc" class="mini-x">×</button></span>` : ""}
      ${jobText ? `<span class="badge">職種: ${jobText} <button data-clear="job" class="mini-x">×</button></span>` : ""}
      ${prefText ? `<span class="badge">こだわり: ${prefText} <button data-clear="pref" class="mini-x">×</button></span>` : ""}
    `;
    wrap.querySelectorAll("[data-clear]").forEach(btn => {
      btn.addEventListener("click", () => {
        const k = btn.getAttribute("data-clear");
        this.state[k === "loc" ? "locations" : k === "job" ? "jobs" : "prefs"] = [];
        this.renderChips();
      });
    });
  }

  modalTpl(key, title) {
    return `
      <div class="modal" id="modal-${key}">
        <div class="backdrop" data-close></div>
        <div class="panel">
          <div class="card">
            <div class="head">
              <h3>${title}</h3>
              <button class="close" data-close><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="body" id="${key}-body"></div>
            <div class="foot">
              <button class="btn" data-clear-${key}>クリア</button>
              <div style="flex:1"></div>
              <button class="btn btn-primary" data-apply-${key}>内容を反映する</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  openModal(key) {
    const modal = document.querySelector(`#modal-${key}`);
    modal.classList.add("show");
    modal.querySelectorAll("[data-close]").forEach(b => b.onclick = () => modal.classList.remove("show"));
  }

  closeModal(key) {
    document.querySelector(`#modal-${key}`).classList.remove("show");
  }

  /** -------------------------------
   * 勤務地モーダル（階層構造）
   * ------------------------------- */
  buildLocationModal() {
    const body = document.querySelector("#loc-body");
    body.innerHTML = `
      <div class="grid-3">
        <ul class="side-list" id="region-menu"></ul>
        <div id="pref-wrap"></div>
      </div>
    `;

    const regionMenu = body.querySelector("#region-menu");
    const prefWrap = body.querySelector("#pref-wrap");

    const regions = Object.keys(this.ds.REGION_PREFS);
    regionMenu.innerHTML = regions.map((r, i) => `
      <li><button class="side-btn ${i===0?"active":""}" data-region="${r}">${r}</button></li>
    `).join("");

    const renderPrefs = region => {
      const prefs = this.ds.REGION_PREFS[region] || [];
      prefWrap.innerHTML = prefs.map(pref => `
        <div class="pref-block">
          <div class="pref-head">
            <span class="font-semibold">${pref}</span>
            <button class="toggle" data-pref="${pref}">＋</button>
          </div>
          <div class="inner hidden" data-city-list="${pref}"></div>
        </div>
      `).join("");

      prefWrap.querySelectorAll(".toggle").forEach(btn => {
        btn.addEventListener("click", () => {
          const pref = btn.getAttribute("data-pref");
          const list = prefWrap.querySelector(`[data-city-list="${pref}"]`);
          const isHidden = list.classList.contains("hidden");

          if (isHidden) {
            const cities = PREF_CITY_DATA[pref] || {};
            list.innerHTML = Object.keys(cities).map(city => {
              const wards = cities[city];
              const hasWards = Array.isArray(wards) && wards.length > 0;
              return `
                <div class="city-block">
                  <div class="city-head">
                    <label class="opt"><input class="checkbox" type="checkbox" data-loc="${pref}/${city}"> ${city}</label>
                    ${hasWards ? `<button class="toggle" data-city="${city}">＋</button>` : ""}
                  </div>
                  ${hasWards ? `<div class="inner hidden" data-ward-list="${city}">
                    ${wards.map(w => `<label class="opt"><input class="checkbox" type="checkbox" data-loc="${pref}/${city}/${w}"> ${w}</label>`).join("")}
                  </div>` : ""}
                </div>
              `;
            }).join("");

            // 区を開閉
            list.querySelectorAll('[data-city]').forEach(b => {
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

    document.querySelector("[data-clear-loc]").onclick = () => {
      this.state.locations = [];
      this.renderChips();
    };
    document.querySelector("[data-apply-loc]").onclick = () => {
      const checked = Array.from(document.querySelectorAll('#loc-body input[type="checkbox"]:checked'))
        .map(c => c.getAttribute("data-loc"));
      this.state.locations = checked;
      this.renderChips();
      this.closeModal("loc");
    };
  }

  /** -------------------------------
   * 職種モーダル（1行1項目表示）
   * ------------------------------- */
  buildJobModal() {
    const body = document.querySelector("#job-body");
    const listId = "job-list";
    body.innerHTML = `
      <input id="job-key" class="input" placeholder="職種をフリーワードで探す" style="margin-bottom:10px">
      <div id="${listId}" style="display:flex;flex-direction:column;gap:6px;">
        ${this.ds.jobCategories.map(j => `
          <label class="opt" style="width:100%;"><input class="checkbox job-chk" type="checkbox" value="${j}"> ${j}</label>
        `).join("")}
      </div>
    `;

    const filter = () => {
      const q = (document.querySelector("#job-key").value || "").trim();
      const items = this.ds.jobCategories.filter(j => j.includes(q));
      document.getElementById(listId).innerHTML = items.map(j => `
        <label class="opt" style="width:100%;"><input class="checkbox job-chk" type="checkbox" value="${j}"> ${j}</label>
      `).join("");
    };
    document.querySelector("#job-key").addEventListener("input", filter);

    document.querySelector("[data-clear-job]").onclick = () => {
      this.state.jobs = [];
      this.renderChips();
    };
    document.querySelector("[data-apply-job]").onclick = () => {
      const checked = Array.from(document.querySelectorAll('.job-chk:checked')).map(c => c.value);
      this.state.jobs = checked;
      this.renderChips();
      this.closeModal("job");
    };
  }

  /** -------------------------------
   * こだわり条件モーダル（カテゴリ→項目構造）
   * ------------------------------- */
  buildPrefModal() {
    const body = document.querySelector("#pref-body");
    body.innerHTML = `
      <div class="grid-3">
        <ul class="side-list" id="pref-menu"></ul>
        <div id="pref-wrap"></div>
      </div>
    `;

    const menu = body.querySelector("#pref-menu");
    const wrap = body.querySelector("#pref-wrap");
    const cats = Object.keys(this.ds.preferences);
    menu.innerHTML = cats.map((c,i)=>`<li><button class="side-btn ${i===0?"active":""}" data-cat="${c}">${c}</button></li>`).join("");

    const renderCat = cat => {
      const opts = this.ds.preferences[cat] || [];
      wrap.innerHTML = opts.map(o => `
        <label class="opt"><input class="checkbox pref-chk" type="checkbox" value="${o}"> ${o}</label>
      `).join("");
    };

    menu.querySelectorAll(".side-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        menu.querySelectorAll(".side-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderCat(btn.getAttribute("data-cat"));
      });
    });

    renderCat(cats[0]);

    document.querySelector("[data-clear-pref]").onclick = () => {
      this.state.prefs = [];
      this.renderChips();
    };
    document.querySelector("[data-apply-pref]").onclick = () => {
      const checked = Array.from(document.querySelectorAll('.pref-chk:checked')).map(c => c.value);
      this.state.prefs = checked;
      this.renderChips();
      this.closeModal("pref");
    };
  }

  /** -------------------------------
   * 検索実行
   * ------------------------------- */
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
