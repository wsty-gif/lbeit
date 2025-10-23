const SPREADSHEET_JSON_URL =
  "https://docs.google.com/spreadsheets/d/1cfMnjPEunT8veH0JJxC-kAAi_koGyNPutP5gLaeTMT8/gviz/tq?tqx=out:csv";

const DataService = {
  _cache: null,

  async load() {
    if (this._cache) return this._cache;
    const res = await fetch(SPREADSHEET_JSON_URL, { cache: "no-store" });
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data.map((r) => ({
      id: String(r["id"] || "").trim(),
      name: (r["店舗名"] || "").trim(),
      prefecture: (r["都道府県"] || "").trim(),
      city: (r["市区町村"] || "").trim(),
      address: (r["住所"] || "").trim(),
      station: (r["最寄駅"] || "").trim(),
      categories: String(r["職種カテゴリ（カンマ区切り）"] || "").split(",").map(s => s.trim()).filter(Boolean),
      jobLabel: (r["職種表示文"] || "").trim(),
      employment: (r["雇用形態"] || "").trim(),
      wage: parseInt(r["時給"] || "0", 10) || 0,
      timeShort: (r["勤務時間概要"] || "").trim(),
      timeDetail: (r["勤務時間詳細"] || "").trim(),
      payDetail: (r["給与詳細"] || "").trim(),
      placeDetail: (r["勤務地詳細"] || "").trim(),
      externalUrl: (r["外部URL"] || "").trim(), // ← 新規追加！
      lineId: (r["LINE_ID"] || "").trim(),
      image: (r["画像URL"] || "").trim(),
    }));
    this._cache = rows;
    return rows;
  },

  async search(filters) {
    const rows = await this.load();
    let list = rows.slice();

    if (filters.prefecture && filters.prefecture !== "全て")
      list = list.filter((r) => r.prefecture.includes(filters.prefecture));
    if (filters.minWage)
      list = list.filter((r) => r.wage >= Number(filters.minWage));
    if (filters.keyword)
      list = list.filter((r) =>
        [r.name, r.city, r.station, r.jobLabel, ...r.categories].some((t) =>
          (t || "").includes(filters.keyword)
        )
      );
    if (filters.category && filters.category !== "全て")
      list = list.filter((r) => r.categories.includes(filters.category));

    return list;
  },

  async distincts() {
    const rows = await this.load();
    const categories = [...new Set(rows.flatMap((r) => r.categories))].sort();
    const keywords = [...new Set([
      ...rows.map(r => r.name),
      ...rows.map(r => r.station),
      ...rows.flatMap(r => r.categories),
    ])].filter(Boolean);
    const wages = [900, 1000, 1100, 1200, 1300, 1500, 1700, 2000];
    return { categories, keywords, wages };
  },
};
