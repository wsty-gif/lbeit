const SPREADSHEET_JSON_URL =
  "https://docs.google.com/spreadsheets/d/1cfMnjPEunT8veH0JJxC-kAAi_koGyNPutP5gLaeTMT8/gviz/tq?tqx=out:csv";

const DataService = {
  async load() {
    const res = await fetch(SPREADSHEET_JSON_URL);
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    const norm = (v) => (v || "").toString().trim();
    const rows = parsed.data.map(r => ({
      id: norm(r["id"]),
      name: norm(r["店舗名"]),
      prefecture: norm(r["都道府県"]),
      city: norm(r["市区町村"]),
      station: norm(r["最寄駅"]),
      categories: norm(r["職種カテゴリ"]).split(",").map(s => s.trim()),
      wage: parseInt(norm(r["時給"]) || 0),
      lineId: norm(r["LINE_ID"]),
      image: norm(r["画像URL"]),
    }));
    return rows;
  },

  async search(filters) {
    const rows = await this.load();
    let list = rows;

    if (filters.keyword)
      list = list.filter(r =>
        [r.name, r.city, r.station, ...(r.categories || [])]
          .some(v => v && v.includes(filters.keyword))
      );

    if (filters.prefecture)
      list = list.filter(r => r.prefecture === filters.prefecture);
    if (filters.city)
      list = list.filter(r => r.city === filters.city);

    return list;
  }
};

// 全国の都道府県と市区町村リスト
const PREF_CITY_DATA = [
  { pref: "北海道", cities: ["札幌市","旭川市","函館市","小樽市","帯広市","釧路市","北見市"] },
  { pref: "青森県", cities: ["青森市","弘前市","八戸市","五所川原市","十和田市","むつ市"] },
  { pref: "岩手県", cities: ["盛岡市","花巻市","北上市","一関市","奥州市"] },
  { pref: "宮城県", cities: ["仙台市","石巻市","塩竈市","大崎市","登米市","名取市"] },
  { pref: "東京都", cities: ["千代田区","中央区","港区","新宿区","渋谷区","世田谷区","八王子市","立川市","町田市"] },
  { pref: "大阪府", cities: ["大阪市","堺市","東大阪市","枚方市","豊中市","吹田市"] },
  { pref: "兵庫県", cities: ["神戸市","姫路市","尼崎市","明石市","伊丹市","西宮市","加古川市"] },
  { pref: "福岡県", cities: ["福岡市","北九州市","久留米市","大牟田市"] },
  { pref: "沖縄県", cities: ["那覇市","沖縄市","宜野湾市","浦添市","糸満市","豊見城市"] },
];
