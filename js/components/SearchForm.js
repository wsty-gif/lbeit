class SearchForm {
  constructor(container, onSearch) {
    this.el = container;
    this.onSearch = onSearch;
    this.state = {
      keyword: "",
      locations: [],
      jobs: [],
      prefs: []
    };
    this.tmp = { loc: new Set(), job: new Set(), pref: new Set() };
    this.render();
  }

  // ===============================
  // 初期画面
  // ===============================
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

    // イベント設定
    this.el.querySelector("#sf-key").value = this.state.keyword || "";
    this.el.querySelector("#sf-key").addEventListener("input", e => {
      this.state.keyword = e.target.value.trim();
    });
    this.el.querySelector("#btn-search").addEventListener("click", () => this.applySearch());

    // 各項目クリック → ページ開く
    ["loc", "job", "pref"].forEach(key => {
      const row = this.el.querySelector(`#open-${key}`);
      row?.addEventListener("click", () => this.openPage(key));
    });

    // 条件クリア
    this.el.querySelectorAll(".clear-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const key = btn.dataset.clear;
        if (key === "loc") this.state.locations = [];
        if (key === "job") this.state.jobs = [];
        if (key === "pref") this.state.prefs = [];
        this.render(); // 再描画で未設定に戻す
      });
    });

    // 詳細ページ生成
    this.buildLocPage();
    this.buildJobPage();
    this.buildPrefPage();
  }

  // ===============================
  // 各行（タイトル＋内容2行構成）
  // ===============================
  condRow(key, label, icon) {
    const values =
      key === "loc"
        ? this.summarizeLocations(this.state.locations)
        : key === "job"
        ? this.state.jobs
        : this.state.prefs;

    const hasValue = values && values.length > 0;
    const contentText = hasValue ? values.join("、") : "未設定";

    return `
      <div class="cond-row" id="open-${key}" style="border-bottom:1px solid #eee;padding:10px 0;cursor:pointer;">
        <!-- タイトル行 -->
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

        <!-- 内容行 -->
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

  // ===============================
  // 各設定ページのテンプレート
  // ===============================
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

  // ===============================
  // ページ開閉処理
  // ===============================
  openPage(key) {
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
      this.refreshChecks(key);
    };

    // 内容を反映
    page.querySelector(`[data-apply-${key}]`).onclick = () => {
      if (key === "loc") this.state.locations = Array.from(this.tmp.loc);
      if (key === "job") this.state.jobs = Array.from(this.tmp.job);
      if (key === "pref") this.state.prefs = Array.from(this.tmp.pref);
      this.render(); // ✅ 初期画面に反映
      page.style.transform = "translateX(100%)";
    };
  }

  // ===============================
  // 各設定ページ内容（簡易）
  // ===============================
  buildLocPage() {
    document.getElementById("loc-content").innerHTML = `
      <div style="padding:20px;">勤務地の設定画面です（仮）</div>
    `;
  }

  buildJobPage() {
    const cont = document.getElementById("job-content");
    const jobs = ["ホールスタッフ", "キッチン", "カフェ", "軽作業", "事務", "販売"];
    cont.innerHTML = jobs.map(j => `
      <label style="display:block;padding:10px 14px;border-bottom:1px solid #eee;">
        <input type="checkbox" class="job-chk" value="${j}" ${this.tmp.job.has(j)?"checked":""}>
        ${j}
      </label>
    `).join("");

    cont.querySelectorAll(".job-chk").forEach(ch => {
      ch.addEventListener("change", e => {
        const v = e.target.value;
        if (e.target.checked) this.tmp.job.add(v);
        else this.tmp.job.delete(v);
      });
    });
  }

  buildPrefPage() {
    const cont = document.getElementById("pref-content");
    const prefs = ["駅近", "交通費支給", "未経験OK", "高時給"];
    cont.innerHTML = prefs.map(p => `
      <label style="display:block;padding:10px 14px;border-bottom:1px solid #eee;">
        <input type="checkbox" class="pref-chk" value="${p}" ${this.tmp.pref.has(p)?"checked":""}>
        ${p}
      </label>
    `).join("");

    cont.querySelectorAll(".pref-chk").forEach(ch => {
      ch.addEventListener("change", e => {
        const v = e.target.value;
        if (e.target.checked) this.tmp.pref.add(v);
        else this.tmp.pref.delete(v);
      });
    });
  }

  refreshChecks(key) {
    if (key === "job") {
      document.querySelectorAll(".job-chk").forEach(ch => (ch.checked = false));
    }
    if (key === "pref") {
      document.querySelectorAll(".pref-chk").forEach(ch => (ch.checked = false));
    }
  }

  // ===============================
  // 勤務地の短縮表示
  // ===============================
  summarizeLocations(list) {
    if (!list || !list.length) return [];
    return list.slice(0, 1); // 仮で1件目だけ表示（長い場合は…）
  }

  // ===============================
  // 検索ボタン押下
  // ===============================
  applySearch() {
    this.onSearch?.([]);
  }
}

window.SearchForm = SearchForm;
