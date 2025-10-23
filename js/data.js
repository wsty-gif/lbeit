// ✅ スプレッドシートCSV公開URLをここに入れる
const SPREADSHEET_JSON_URL =
  "https://docs.google.com/spreadsheets/d/1cfMnjPEunT8veH0JJxC-kAAi_koGyNPutP5gLaeTMT8/gviz/tq?tqx=out:csv";

const DataService = {
  async loadAccounts() {
    const res = await fetch(SPREADSHEET_JSON_URL);
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true });
    return parsed.data.filter((row) => row["店舗名"]);
  },

  async searchAccounts(filters) {
    const data = await this.loadAccounts();
    let results = data;

    if (filters.prefecture)
      results = results.filter((r) => r["都道府県"]?.includes(filters.prefecture));
    if (filters.category && filters.category !== "全て")
      results = results.filter((r) => r["職種"] === filters.category);
    if (filters.employment && filters.employment !== "全て")
      results = results.filter((r) => r["雇用形態"] === filters.employment);
    if (filters.salary)
      results = results.filter(
        (r) => parseInt(r["時給"]) >= parseInt(filters.salary)
      );
    if (filters.keyword)
      results = results.filter(
        (r) =>
          r["店舗名"]?.includes(filters.keyword) ||
          r["募集内容"]?.includes(filters.keyword)
      );

    return results;
  },
};
