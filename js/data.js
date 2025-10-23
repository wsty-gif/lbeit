const SPREADSHEET_JSON_URL = "https://script.google.com/macros/s/AKfycby15NdqO6Neav2bV3KgFifdvs-_zMkWIPPofKgBeGj_rLG2djnj-8txvc78-NHw2IsX/exec";

const PREFECTURES = [
  "全て",
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

const MAIN_CATEGORIES = [
    "全て",
    "飲食",
    "美容",
    "アパレル",
    "医療・健康",
    "その他"
];

const DETAIL_CATEGORIES = {
  "飲食": ["全て", "ラーメン", "寿司", "焼肉", "居酒屋", "カフェ", "バー", "イタリアン", "フレンチ", "中華料理", "ファストフード", "スイーツ・ケーキ", "パン屋", "定食・食堂", "和食・割烹", "韓国料理", "カレー", "弁当・惣菜", "ビュッフェレストラン"],
  "美容": ["全て", "美容室・ヘアサロン", "理容室・バーバー", "ネイルサロン", "まつげサロン", "エステサロン", "脱毛サロン", "リラクゼーション", "スパ・マッサージ", "メイクアップ", "ブライダルサロン"],
  "アパレル": ["全て", "レディース", "メンズ", "キッズ・ベビー", "セレクトショップ", "アウトドア・カジュアル", "古着", "アクセサリー", "靴・シューズ", "バッグ", "スポーツウェア", "制服・作業服"],
  "医療・健康": ["全て", "歯科", "整体・整骨院", "薬局", "クリニック", "フィットネス", "ヨガ", "その他医療・健康"],
  "その他": ["全て", "不動産", "士業（税理士・行政書士）", "教育・学習塾", "保育園・幼稚園", "習い事・カルチャー教室", "温泉", "自動車販売・整備", "建設・リフォーム", "クリーニング・家事代行", "IT・デザイン", "エンタメ・イベント", "ペット関連", "公共・自治体サービス"]
};


const DataService = {
    _accountsCache: [],

    async loadAccounts() {
        if (this._accountsCache.length > 0) return this._accountsCache;
        try {
            const res = await fetch(SPREADSHEET_JSON_URL, { mode: "cors" });
            const json = await res.json();
            this._accountsCache = json.rows;
            console.log("✅ JSON取得成功", this._accountsCache);
            return this._accountsCache;
        } catch (e) {
            console.error("❌ JSON取得失敗", e);
            return [];
        }
    },

    async getAllAccounts() {
        return await this.loadAccounts();
    },

    async getAccountById(id) {
        const accounts = await this.loadAccounts();
        return accounts.find(acc => String(acc.id).trim() === String(id).trim());
    },

    async searchAccounts(filters) {
        const accounts = await this.loadAccounts();
        let results = [...accounts];

        if (filters.prefecture && filters.prefecture !== "全て") results = results.filter(acc => acc.prefecture === filters.prefecture);
        if (filters.city && filters.city !== "全て") results = results.filter(acc => acc.city === filters.city);
        if (filters.area && filters.area !== "全て") results = results.filter(acc => acc.area === filters.area);
        if (filters.category_main && filters.category_main !== "全て") results = results.filter(acc => acc.service_category_main === filters.category_main);
        if (filters.category_detail && filters.category_detail !== "全て") results = results.filter(acc => acc.service_category_detail === filters.category_detail);
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            results = results.filter(acc =>
                (acc.account_name && acc.account_name.toLowerCase().includes(keyword)) ||
                (acc.description && acc.description.toLowerCase().includes(keyword))
            );
        }

        if (filters.can_reserve_online) results = results.filter(acc => acc.can_reserve_online);
        if (filters.has_coupon) results = results.filter(acc => acc.has_coupon);
        if (filters.can_view_menu) results = results.filter(acc => acc.can_view_menu);
        if (filters.can_wait_online) results = results.filter(acc => acc.can_wait_online);
        if (filters.can_contact_online) results = results.filter(acc => acc.can_contact_online);
        if (filters.has_points) results = results.filter(acc => acc.has_points);

        return results;
    }
};
