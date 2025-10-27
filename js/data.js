// ==========================
// data.js（オフライン対応版）
// ==========================

// ▼ スプレッドシートCSV
const SPREADSHEET_JSON_URL =
  "https://docs.google.com/spreadsheets/d/1cfMnjPEunT8veH0JJxC-kAAi_koGyNPutP5gLaeTMT8/gviz/tq?tqx=out:csv";

const DataService = {
  _cache: null,

  // ====== スプレッドシートから求人情報を読み込み ======
  async load() {
    if (this._cache) return this._cache;

    const res = await fetch(SPREADSHEET_JSON_URL, { cache: "no-store" });
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    const norm = (v) => (v || "").toString().trim();
    const split = (v) =>
      norm(v)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const toInt = (v) => parseInt(norm(v) || "0", 10) || 0;

    const rows = parsed.data.map((r) => ({
      id: norm(r["id"]),
      name: norm(r["店舗名"]),
      prefecture: norm(r["都道府県"]),
      city: norm(r["市区町村"]),
      address: norm(r["住所"]),
      station: norm(r["最寄駅"]),
      categories: split(r["職種カテゴリ"]),
      employment: norm(r["雇用形態"]),
      wage: toInt(r["時給"]),
      features: split(r["こだわり"]),
      lineId: norm(r["LINE_ID"]),
      image: norm(r["画像URL"]),
      externalUrl: norm(r["外部URL"])
    }));

    this._cache = rows;
    return rows;
  },

  // ====== 市区町村データをローカルから読み込み ======
  async loadCities() {
    // PREF_CITY_DATA は prefCities.js で定義
    return PREF_CITY_DATA;
  },

  // ====== 検索 ======
  async search(filters) {
    const rows = await this.load();
    let list = rows.slice();

    if (filters.keyword) {
      const q = filters.keyword.toLowerCase();
      list = list.filter((r) =>
        [r.name, r.station, r.city, r.address, ...r.categories, ...r.features].some((t) =>
          (t || "").toLowerCase().includes(q)
        )
      );
    }

    if (filters.prefecture)
      list = list.filter((r) => r.prefecture === filters.prefecture);
    if (filters.city)
      list = list.filter((r) => r.city === filters.city);

    return list;
  },

  // ====== 検索条件生成 ======
  async distincts() {
    const rows = await this.load();
    const jobCategories = [...new Set(rows.flatMap((r) => r.categories))].sort();
    const preferences = [...new Set(rows.flatMap((r) => r.features))].sort();

    const POPULAR = ["高収入", "未経験OK", "日払いOK", "駅近", "交通費全額", "残業なし", "シフト自由"];
    const EMPLOYMENTS = ["正社員", "派遣社員", "業務委託", "契約社員", "アルバイト"];
    const ANNUALS = ["200", "300", "400", "500", "600", "700", "800", "900", "1000"];

    const REGION_PREFS = {
      "北海道・東北": ["北海道", "青森県", "岩手県", "宮城県"],
      "関東": ["東京都", "神奈川県"],
      "中部": ["愛知県"],
      "近畿": ["大阪府", "兵庫県"],
      "九州・沖縄": ["福岡県", "沖縄県"]
    };

    const citiesByPref = await this.loadCities();

    return {
      REGION_PREFS,
      citiesByPref,
      jobCategories,
      preferences,
      POPULAR,
      EMPLOYMENTS,
      ANNUALS
    };
  }
};
