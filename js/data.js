const SPREADSHEET_JSON_URL =
  "https://script.google.com/macros/s/AKfycbyhGCkWKh7Ih2JbO5tkKFjCYxqUXEnFOMkJS8cLkykT_p7sM934zuR6l-rVbw5u9Z5_Og/exec";

// 全国市区町村（GitHub公開JSON）
const MUNICIPAL_JSON =
  "https://raw.githubusercontent.com/OtterSou/japan-municipalities/main/data/municipalities.json";

const DataService = {
  _cache: null,
  _cities: null,

  async load() {
    if (this._cache) return this._cache;
    const res = await fetch(SPREADSHEET_JSON_URL, { cache: "no-store" });
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    const norm = (v) => (v || "").toString().trim();
    const splitCsv = (v) => norm(v).split(",").map(s => s.trim()).filter(Boolean);

    const rows = parsed.data.map((r) => ({
      id: norm(r["id"]),
      name: norm(r["店舗名"]),
      prefecture: norm(r["都道府県"]),
      city: norm(r["市区町村"]),
      address: norm(r["住所"]),
      station: norm(r["最寄駅"]),
      categories: splitCsv(r["職種カテゴリ（カンマ区切り）"] || r["職種カテゴリ"]),
      jobLabel: norm(r["職種表示文"]),
      employment: norm(r["雇用形態"]),
      wage: parseInt(norm(r["時給"]) || "0", 10) || 0,
      annual: parseInt(norm(r["年収目安"]) || "0", 10) || 0, // 万円
      timeShort: norm(r["勤務時間概要"]),
      timeDetail: norm(r["勤務時間詳細"]),
      payDetail: norm(r["給与詳細"]),
      placeDetail: norm(r["勤務地詳細"]),
      externalUrl: norm(r["外部URL"]),
      image: norm(r["画像URL（カンマ区切り）"] || r["画像URL"]),
      features: splitCsv(r["こだわり（カンマ区切り）"] || r["こだわり"])
    }));

    this._cache = rows;
    return rows;
  },

  async loadCities() {
    if (this._cities) return this._cities;
    const res = await fetch(MUNICIPAL_JSON);
    const json = await res.json();
    const citiesByPref = {};
    json.forEach((x) => {
      const pref = x.prefecture_kanji;
      const city = x.city_kanji;
      if (!citiesByPref[pref]) citiesByPref[pref] = [];
      if (!citiesByPref[pref].includes(city)) citiesByPref[pref].push(city);
    });
    Object.keys(citiesByPref).forEach((p) => citiesByPref[p].sort());
    this._cities = citiesByPref;
    return citiesByPref;
  },

  // 検索：複数チェックは OR、項目間は AND
  async search(filters) {
    const rows = await this.load();
    let list = rows.slice();

    const include = (text, q) => (text || "").toLowerCase().includes(q.toLowerCase());

    // キーワード
    if (filters.keyword) {
      const q = filters.keyword;
      list = list.filter((r) =>
        [r.name, r.station, r.jobLabel, r.city, r.address, ...r.categories, ...r.features]
          .some((t) => include(t, q))
      );
    }

    // 勤務地（pref or city）= OR
    if (filters.locations?.length) {
      list = list.filter((r) => {
        return filters.locations.some((sel) => {
          if (sel.type === "pref") return r.prefecture === sel.pref;
          return r.prefecture === sel.pref && r.city === sel.city;
        });
      });
    }

    // 職種 OR
    if (filters.jobCategories?.length)
      list = list.filter((r) => r.categories.some((c) => filters.jobCategories.includes(c)));

    // こだわり OR
    if (filters.preferences?.length)
      list = list.filter((r) => r.features.some((f) => filters.preferences.includes(f)));

    // 人気の条件 OR（preferencesと同様に扱う）
    if (filters.popular?.length)
      list = list.filter((r) => r.features.some((f) => filters.popular.includes(f)));

    // 年収（万円）
    if (filters.annualMin)
      list = list.filter((r) => r.annual && r.annual >= Number(filters.annualMin));

    // 雇用形態 OR
    if (filters.employments?.length)
      list = list.filter((r) => {
        const vals = r.employment.split(",").map(s => s.trim());
        return vals.some(v => filters.employments.includes(v));
      });

    return list;
  },

  async distincts() {
    const rows = await this.load();
    const jobCategories = [...new Set(rows.flatMap((r) => r.categories))].sort();
    const preferences  = [...new Set(rows.flatMap((r) => r.features))].sort();

    const POPULAR = ["高収入","未経験OK","日払いOK","駅近","交通費全額","残業なし","シフト自由","深夜手当","無料送迎"];
    const ANNUALS = ["200","300","400","500","600","700","800","900","1000"];
    const EMPLOYMENTS = ["正社員","派遣社員","業務委託","契約社員","アルバイト"];

    const REGION_PREFS = {
      "北海道・東北": ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県"],
      "関東": ["茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県"],
      "中部": ["新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県"],
      "近畿": ["三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県"],
      "中国": ["鳥取県","島根県","岡山県","広島県","山口県"],
      "四国": ["徳島県","香川県","愛媛県","高知県"],
      "九州・沖縄": ["福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"]
    };

    const citiesByPref = await this.loadCities();

    return { REGION_PREFS, citiesByPref, jobCategories, preferences, POPULAR, ANNUALS, EMPLOYMENTS };
  },
};
