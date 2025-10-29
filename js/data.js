/* ===========================================
 * 🔧 Googleスプレッドシート連携 DataService（完全修正版）
 * =========================================== */

const SPREADSHEET_JSON_URL =
  "https://script.google.com/macros/s/AKfycbxLzXy84sCicx8alhBvRjPHFxEDhVqMAKhyp2N6twaJzKW4vQ4i7eAkMP6zsiIqgZNyWQ/exec";

const DataService = {
  _cache: null,

  // =========================================================
  // 🔹 データ取得（Apps Script JSON API）
  // =========================================================
  async load() {
    if (this._cache) return this._cache;

    try {
      const res = await fetch(SPREADSHEET_JSON_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);

      const data = await res.json();
      const norm = (v) => (v || "").toString().trim();
      const splitCsv = (v) => norm(v).split(",").map(s => s.trim()).filter(Boolean);

      // 年収表記「300万以上」などから数値だけを抽出
      const extractAnnual = (v) => {
        if (!v) return 0;
        const m = v.toString().match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      };

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
        annualRaw: norm(r["年収目安"]),
        annual: extractAnnual(r["年収目安"]),
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
  // 🔹 検索処理（AND/OR対応版）
  // =========================================================
  async search(filters) {
    const rows = await this.load();
    let list = rows.slice();

    // 🔸 キーワード（店名/駅/職種/住所/こだわりを横断検索）
    if (filters.keyword && filters.keyword.trim() !== "") {
      const q = filters.keyword.toLowerCase();
      list = list.filter(r =>
        [r.name, r.station, r.jobLabel, r.city, r.address, ...r.categories, ...r.features]
          .some(t => (t || "").toLowerCase().includes(q))
      );
    }

    // 🔸 勤務地（都道府県・市区町村）— OR
    if (filters.locations && filters.locations.length > 0) {
      list = list.filter(r => {
        return filters.locations.some(sel => {
          const matchPref = (r.prefecture && sel.pref === r.prefecture);
          const matchCity  = (r.city && sel.city && r.city === sel.city);
          if (sel.type === "pref") return matchPref;
          if (sel.type === "city") return matchPref && matchCity;
          return false;
        });
      });
    }

    // 🔸 職種 — OR（カテゴリ配列との一致）
    if (filters.jobCategories && filters.jobCategories.length > 0) {
      list = list.filter(r => r.categories.some(c => filters.jobCategories.includes(c)));
    }

    // 🔸 こだわり条件 — OR
    if (filters.preferences && filters.preferences.length > 0) {
      list = list.filter(r => r.features.some(f => filters.preferences.includes(f)));
    }

    // 🔸 人気条件 — OR（こだわり統合）
    if (filters.popular && filters.popular.length > 0) {
      list = list.filter(r => r.features.some(f => filters.popular.includes(f)));
    }

    // 🔸 年収（「200」「300」等：指定値より上のみ表示）
    if (filters.annualMin && filters.annualMin !== "") {
      const minVal = Number(filters.annualMin);
      list = list.filter(r => {
        const val = r.annual || 0;
        return val > minVal; // ✅ 「以上」→「超」に修正
      });
    }

    // 🔸 雇用形態 — OR（「正社員」「アルバイト」など）
    if (filters.employments && filters.employments.length > 0) {
      list = list.filter(r => {
        const vals = r.employment.split(",").map(s => s.trim());
        return vals.some(v => filters.employments.includes(v));
      });
    }

    return list;
  },

  // =========================================================
  // 🔹 distincts()：UI用データ整形
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
