/* ===========================================
 * 🔧 Googleスプレッドシート連携 DataService
 * =========================================== */

const SPREADSHEET_JSON_URL =
  "https://script.google.com/macros/s/AKfycbxLzXy84sCicx8alhBvRjPHFxEDhVqMAKhyp2N6twaJzKW4vQ4i7eAkMP6zsiIqgZNyWQ/exec";

const DataService = {
  _cache: null,

  // =========================================================
  // 🔹 データを取得（Apps Script JSON API）
  // =========================================================
  async load() {
    if (this._cache) return this._cache;

    try {
      const res = await fetch(SPREADSHEET_JSON_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);

      const data = await res.json();
      const norm = (v) => (v || "").toString().trim();
      const splitCsv = (v) => norm(v).split(",").map(s => s.trim()).filter(Boolean);

      const rows = data.map((r) => ({
        id: norm(r["id"]),
        name: norm(r["店舗名"]),
        prefecture: norm(r["都道府県"]),
        city: norm(r["市区町村"]),
        address: norm(r["住所"]),
        station: norm(r["最寄駅"]),
        categories: splitCsv(
          r["職種カテゴリ（カンマ区切り）"] ||
          r["職種カテゴリ"] ||
          r["職種"]
        ),
        jobLabel: norm(r["職種表示文"]),
        employment: norm(r["雇用形態"]),
        wage: parseInt(norm(r["時給"]) || "0", 10) || 0,
        annual: parseInt(norm(r["年収目安"]) || "0", 10) || 0,
        timeShort: norm(r["勤務時間概要"]),
        timeDetail: norm(r["勤務時間詳細"]),
        payDetail: norm(r["給与詳細"]),
        placeDetail: norm(r["勤務地詳細"]),
        externalUrl: norm(r["外部URL"]),
        lineId: norm(r["LINE_ID"]),
        images: splitCsv(r["画像URL（カンマ区切り）"] || r["画像URL"]),
        features: splitCsv(r["こだわり（カンマ区切り）"] || r["こだわり"]),
      }));

      this._cache = rows;
      return rows;
    } catch (err) {
      console.error("❌ DataService.load 取得エラー:", err);
      this._cache = [];
      return [];
    }
  },

  // =========================================================
  // 🔎 検索処理
  // =========================================================
  async search(filters) {
    const rows = await this.load();
    let list = rows.slice();

    // キーワード（店名/駅/カテゴリ/職種表示文/市区町村/住所/こだわり）
    if (filters.keyword) {
      const q = filters.keyword.toLowerCase();
      list = list.filter(r =>
        [r.name, r.station, r.jobLabel, r.city, r.address, ...r.categories, ...r.features]
          .some(t => (t || "").toLowerCase().includes(q))
      );
    }

    // 勤務地 — OR 検索
    if (filters.locations?.length) {
      list = list.filter(r => {
        const label = r.prefecture + (r.city ? " " + r.city : "");
        return filters.locations.some(sel => {
          if (sel.type === 'pref') return r.prefecture === sel.pref;
          return r.prefecture === sel.pref && r.city === sel.city;
        }) || filters.locations.some(sel => label.includes(sel.free || ""));
      });
    }

    // 職種 — OR
    if (filters.jobCategories?.length) {
      list = list.filter(r => r.categories.some(c => filters.jobCategories.includes(c)));
    }

    // こだわり条件 — OR
    if (filters.preferences?.length) {
      list = list.filter(r => r.features.some(f => filters.preferences.includes(f)));
    }

    // 人気の条件 — OR
    if (filters.popular?.length) {
      list = list.filter(r => r.features.some(f => filters.popular.includes(f)));
    }

    // 年収（単位: 万円）
    if (filters.annualMin) {
      list = list.filter(r => r.annual && r.annual >= Number(filters.annualMin));
    }

    // 雇用形態 — OR
    if (filters.employments?.length) {
      list = list.filter(r => {
        const vals = (r.employment || "").split(",").map(s => s.trim());
        return vals.some(v => filters.employments.includes(v));
      });
    }

    return list;
  },

  // =========================================================
  // 🔸 UI用 distinct データ（一覧候補）
  // =========================================================
  async distincts() {
    const rows = await this.load();

    const REGION_PREFS = {
      "北海道・東北": ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県"],
      "関東": ["茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県"],
      "中部": ["新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県"],
      "近畿": ["三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県"],
      "中国": ["鳥取県","島根県","岡山県","広島県","山口県"],
      "四国": ["徳島県","香川県","愛媛県","高知県"],
      "九州・沖縄": ["福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"]
    };

    const citiesByPref = {};
    rows.forEach(r => {
      if (!r.prefecture) return;
      citiesByPref[r.prefecture] = citiesByPref[r.prefecture] || new Set();
      if (r.city) citiesByPref[r.prefecture].add(r.city);
    });
    Object.keys(citiesByPref).forEach(p => citiesByPref[p] = [...citiesByPref[p]].sort());

    const jobCategories = [...new Set(rows.flatMap(r => r.categories))].sort();
    const preferences = [...new Set(rows.flatMap(r => r.features))].sort();

    const POPULAR = ["高収入","未経験OK","日払いOK","週1〜OK","駅近","交通費全額","残業なし","シフト自由","深夜手当","無料送迎"];
    const ANNUALS = ["200","300","400","500","600","700","800","900","1000"]; // 万円
    const EMPLOYMENTS = ["正社員","派遣社員","業務委託","契約社員","アルバイト"];

    return { REGION_PREFS, citiesByPref, jobCategories, preferences, POPULAR, ANNUALS, EMPLOYMENTS };
  }
};
