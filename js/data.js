// ==========================
// data.js（修正版）
// ==========================

// ▼ GoogleスプレッドシートのCSV URL
// ※ file:// では CORS エラーになるので、必ず http://localhost などサーバー経由で開いてください。
const SPREADSHEET_JSON_URL =
  "https://docs.google.com/spreadsheets/d/1cfMnjPEunT8veH0JJxC-kAAi_koGyNPutP5gLaeTMT8/gviz/tq?tqx=out:csv";

// ▼ 全国市区町村データ（信頼性が高くCORS対応しているGitHub公開データ）
const MUNICIPAL_JSON =
  "https://raw.githubusercontent.com/geolonia/japanese-addresses/master/data/ja.json";

const DataService = {
  _cache: null,
  _cities: null,

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
      categories: split(r["職種カテゴリ（カンマ区切り）"] || r["職種カテゴリ"]),
      jobLabel: norm(r["職種表示文"]),
      employment: norm(r["雇用形態"]),
      wage: toInt(r["時給"]),
      annual: toInt(r["年収目安"]),
      timeShort: norm(r["勤務時間概要"]),
      timeDetail: norm(r["勤務時間詳細"]),
      payDetail: norm(r["給与詳細"]),
      placeDetail: norm(r["勤務地詳細"]),
      externalUrl: norm(r["外部URL"]),
      lineId: norm(r["LINE_ID"]),
      image: norm(r["画像URL（カンマ区切り）"] || r["画像URL"]),
      features: split(r["こだわり（カンマ区切り）"] || r["こだわり"]),
    }));

    this._cache = rows;
    return rows;
  },

  // ====== 全国市区町村データを取得 ======
  async loadCities() {
    if (this._cities) return this._cities;

    const res = await fetch(MUNICIPAL_JSON);
    const json = await res.json();

    const byPref = {};
    json.forEach((x) => {
      const pref = x.prefecture;
      const city = x.city;
      if (!byPref[pref]) byPref[pref] = [];
      if (city && !byPref[pref].includes(city)) byPref[pref].push(city);
    });
    Object.keys(byPref).forEach((p) => byPref[p].sort());
    this._cities = byPref;

    return byPref;
  },

  // ====== 検索（AND＋OR複合対応） ======
  async search(filters) {
    const rows = await this.load();
    let list = rows.slice();

    // キーワード検索（部分一致）
    if (filters.keyword) {
      const q = filters.keyword.toLowerCase();
      list = list.filter((r) =>
        [r.name, r.station, r.jobLabel, r.city, r.address, ...r.categories, ...r.features].some((t) =>
          (t || "").toLowerCase().includes(q)
        )
      );
    }

    // 勤務地（都道府県・市区町村をOR検索）
    if (filters.locations?.length) {
      list = list.filter((r) => {
        return filters.locations.some((sel) => {
          if (sel.type === "pref") return r.prefecture === sel.pref;
          return r.prefecture === sel.pref && r.city === sel.city;
        });
      });
    }

    // 職種カテゴリ（OR）
    if (filters.jobCategories?.length) {
      list = list.filter((r) => r.categories.some((c) => filters.jobCategories.includes(c)));
    }

    // こだわり条件（OR）
    if (filters.preferences?.length) {
      list = list.filter((r) => r.features.some((f) => filters.preferences.includes(f)));
    }

    // 人気条件（OR）
    if (filters.popular?.length) {
      list = list.filter((r) => r.features.some((f) => filters.popular.includes(f)));
    }

    // 年収下限
    if (filters.annualMin) {
      list = list.filter((r) => r.annual && r.annual >= Number(filters.annualMin));
    }

    // 雇用形態（OR）
    if (filters.employments?.length) {
      list = list.filter((r) => {
        const vals = r.employment.split(",").map((s) => s.trim());
        return vals.some((v) => filters.employments.includes(v));
      });
    }

    return list;
  },

  // ====== 選択肢データを生成 ======
  async distincts() {
    const rows = await this.load();
    const jobCategories = [...new Set(rows.flatMap((r) => r.categories))].sort();
    const preferences = [...new Set(rows.flatMap((r) => r.features))].sort();

    const POPULAR = [
      "高収入",
      "未経験OK",
      "日払いOK",
      "駅近",
      "交通費全額",
      "残業なし",
      "シフト自由",
      "深夜手当",
      "無料送迎",
    ];
    const ANNUALS = ["200", "300", "400", "500", "600", "700", "800", "900", "1000"];
    const EMPLOYMENTS = ["正社員", "派遣社員", "業務委託", "契約社員", "アルバイト"];

    // 地域ブロック
    const REGION_PREFS = {
      "北海道・東北": ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
      "関東": ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"],
      "中部": ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"],
      "近畿": ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"],
      "中国": ["鳥取県", "島根県", "岡山県", "広島県", "山口県"],
      "四国": ["徳島県", "香川県", "愛媛県", "高知県"],
      "九州・沖縄": ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"],
    };

    const citiesByPref = await this.loadCities();

    // こだわり条件の分類
    const PREFERENCE_GROUPS = {
      人気条件: ["高収入", "未経験OK", "日払いOK", "シフト自由", "駅近", "交通費全額"],
      求める人材: ["主婦(夫)歓迎", "フリーター歓迎", "学歴不問", "ブランクOK", "シニア応援"],
      職場環境: ["残業なし", "服装自由", "髪色自由", "ネイルOK", "車通勤OK"],
      "勤務地・アクセス": ["駅近", "無料送迎", "バイク通勤OK", "自転車OK"],
      "勤務時間・休日": ["週1〜OK", "週2・3〜OK", "土日祝休み", "平日のみOK", "夜勤"],
      給与: ["高収入", "昇給あり", "前払いOK"],
      "待遇・福利厚生": ["社会保険あり", "交通費全額", "社割あり", "社員登用あり"],
      仕事の特徴: ["単純作業", "体を動かす", "接客あり", "デスクワーク"],
      "募集・選考の特徴": ["即日勤務OK", "面接時マスクOK", "履歴書不要"],
      その他: [],
    };

    const allKnown = new Set(Object.values(PREFERENCE_GROUPS).flat());
    preferences.forEach((p) => {
      if (!allKnown.has(p)) PREFERENCE_GROUPS["その他"].push(p);
    });

    return {
      REGION_PREFS,
      citiesByPref,
      jobCategories,
      preferences,
      POPULAR,
      ANNUALS,
      EMPLOYMENTS,
      PREFERENCE_GROUPS,
    };
  },
};
