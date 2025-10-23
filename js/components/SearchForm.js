// SearchFormコンポーネント
class SearchForm {
    constructor(container, options = {}) {
        this.container = container;
        this.filters = {
            prefecture: "全て",
            city: "全て",
            area: "全て",
            category_main: "全て",
            category_detail: "全て",
            keyword: "",
            can_reserve_online: false,
            has_coupon: false,
            can_view_menu: false,
            can_wait_online: false,
            can_contact_online: false,
            has_points: false
        };
        this.onSearch = options.onSearch || (() => {});
        this.allAccounts = [];
        this.showFilters = false;
        
        this.init();
    }
    
    async init() {
        this.allAccounts = await DataService.getAllAccounts();
        this.render();
        this.bindEvents();
    }
    
    render() {
        const availableDetailCategories = this.getAvailableDetailCategories();
        const availableCities = this.getAvailableCities();
        const availableAreas = this.getAvailableAreas();
        
        this.container.innerHTML = `
            <div class="border-2 border-orange-200 shadow-2xl bg-white rounded-2xl overflow-hidden">
                <div class="p-6 md:p-8">
                    <div class="space-y-6">
                        <div class="text-center mb-6">
                            <h2 class="text-gray-900 mb-2 text-sm font-black md:text-3xl">
                                初回割引、ポイント還元、限定クーポン…<br>
                                友だちだけの特典がいっぱい
                            </h2>
                            <p class="text-gray-600 font-medium">エリアとサービスから検索できます</p>
                        </div>

                        <!-- 主要都市クイックアクセス -->
                        <div class="bg-gradient-to-r from-orange-100 to-yellow-100 p-4 rounded-xl">
                            <p class="text-sm font-bold text-gray-700 mb-3 text-center">カテゴリーから探す</p>
                            <div class="flex flex-wrap justify-center gap-2">
                                ${MAIN_CATEGORIES.filter(cat => cat !== "全て").map(category => `
                                    <button class="category-btn bg-white hover:bg-orange-500 hover:text-white border-2 border-orange-300 font-bold transition-all px-4 py-2 rounded-lg" 
                                            data-category="${category}">
                                        ${category}
                                    </button>
                                `).join('')}
                            </div>
                        </div>


                        <!-- 地域とサービスを左右に分割 -->
                        <div class="search-grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                            <!-- 左半分：地域選択 -->
                            <div class="space-y-4">
                                <div class="space-y-2">
                                    <label class="text-sm font-bold text-gray-700">都道府県</label>
                                    <select id="prefecture-select" class="custom-select w-full bg-white border-2 border-gray-300 h-12 text-base font-medium rounded-lg px-4">
                                        ${PREFECTURES.map(pref => `
                                            <option value="${pref}" ${pref === this.filters.prefecture ? 'selected' : ''}>${pref}</option>
                                        `).join('')}
                                    </select>
                                </div>

                                <div class="space-y-2">
                                    <label class="text-sm font-bold text-gray-700">市区町村</label>
                                    <select id="city-select" class="custom-select w-full bg-white border-2 border-gray-300 h-12 text-base font-medium rounded-lg px-4" 
                                            ${!this.filters.prefecture || this.filters.prefecture === '全て' ? 'disabled' : ''}>
                                        ${availableCities.map(city => `
                                            <option value="${city}" ${city === this.filters.city ? 'selected' : ''}>${city}</option>
                                        `).join('')}
                                    </select>
                                </div>

                                <div class="space-y-2">
                                    <label class="text-sm font-bold text-gray-700">エリア</label>
                                    <select id="area-select" class="custom-select w-full bg-white border-2 border-gray-300 h-12 text-base font-medium rounded-lg px-4" 
                                            ${!this.filters.city || this.filters.city === '全て' ? 'disabled' : ''}>
                                        ${availableAreas.map(area => `
                                            <option value="${area}" ${area === this.filters.area ? 'selected' : ''}>${area}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>

                            <!-- 右半分：サービスカテゴリー選択 -->
                            <div class="space-y-4">
                                <div class="space-y-2">
                                    <label class="text-sm font-bold text-gray-700">サービスカテゴリー</label>
                                    <select id="category-main-select" class="custom-select w-full bg-white border-2 border-gray-300 h-12 text-base font-medium rounded-lg px-4">
                                        ${MAIN_CATEGORIES.map(category => `
                                            <option value="${category}" ${category === this.filters.category_main ? 'selected' : ''}>${category}</option>
                                        `).join('')}
                                    </select>
                                </div>

                                <div class="space-y-2">
                                    <label class="text-sm font-bold text-gray-700">詳細カテゴリー</label>
                                    <select id="category-detail-select" class="custom-select w-full bg-white border-2 border-gray-300 h-12 text-base font-medium rounded-lg px-4" 
                                            ${!this.filters.category_main || this.filters.category_main === '全て' ? 'disabled' : ''}>
                                        ${availableDetailCategories.map(category => `
                                            <option value="${category}" ${category === this.filters.category_detail ? 'selected' : ''}>${category}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- キーワード検索 -->
                        <div class="space-y-2">
                            <label class="text-sm font-bold text-gray-700">🔍 キーワード検索</label>
                            <input type="text" id="keyword-input" placeholder="アカウント名やキーワードで検索" 
                                   value="${this.filters.keyword}"
                                   class="w-full bg-white border-2 border-gray-300 h-12 text-base px-4 rounded-lg">
                        </div>

                        <!-- フィルター展開ボタン -->
                        <button id="toggle-filters" 
                                class="w-full border-2 border-gray-300 hover:bg-gray-50 font-bold h-12 bg-white rounded-lg
                                    flex items-center justify-center gap-2">
                            <i data-lucide="sliders-horizontal" class="w-5 h-5"></i>
                            ${this.showFilters ? 'こだわり条件を閉じる' : 'こだわり条件で絞り込む'}
                        </button>

                        <!-- こだわり条件 -->
                        <div id="filters-content" class="${this.showFilters ? '' : 'hidden'} bg-orange-50 p-4 rounded-lg space-y-3 border-2 border-orange-200">
                            <p class="font-bold text-gray-800 mb-3">こだわり条件</p>
                            
                            <div class="flex items-center space-x-3">
                                <input type="checkbox" id="can_reserve" class="custom-checkbox w-5 h-5" ${this.filters.can_reserve_online ? 'checked' : ''}>
                                <label for="can_reserve" class="text-base font-medium cursor-pointer">📅 LINEから予約可能</label>
                            </div>

                            <div class="flex items-center space-x-3">
                                <input type="checkbox" id="has_coupon" class="custom-checkbox w-5 h-5" ${this.filters.has_coupon ? 'checked' : ''}>
                                <label for="has_coupon" class="text-base font-medium cursor-pointer">🎁 クーポン・特典あり</label>
                            </div>

                            <div class="flex items-center space-x-3">
                                <input type="checkbox" id="can_view_menu" class="custom-checkbox w-5 h-5" ${this.filters.can_view_menu ? 'checked' : ''}>
                                <label for="can_view_menu" class="text-base font-medium cursor-pointer">📋 LINEでメニュー確認可能</label>
                            </div>

                            <div class="flex items-center space-x-3">
                                <input type="checkbox" id="can_wait" class="custom-checkbox w-5 h-5" ${this.filters.can_wait_online ? 'checked' : ''}>
                                <label for="can_wait" class="text-base font-medium cursor-pointer">⏱️ LINEで順番待ち登録可能</label>
                            </div>

                            <div class="flex items-center space-x-3">
                                <input type="checkbox" id="can_contact" class="custom-checkbox w-5 h-5" ${this.filters.can_contact_online ? 'checked' : ''}>
                                <label for="can_contact" class="text-base font-medium cursor-pointer">💬 LINEでお問い合わせ可能</label>
                            </div>

                            <div class="flex items-center space-x-3">
                                <input type="checkbox" id="has_points" class="custom-checkbox w-5 h-5" ${this.filters.has_points ? 'checked' : ''}>
                                <label for="has_points" class="text-base font-medium cursor-pointer">⭐ LINEでポイントがたまる</label>
                            </div>
                        </div>

                        <!-- 検索ボタン -->
                        <button id="search-btn" 
                            class="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 
                                text-white font-black py-7 text-xl shadow-xl rounded-xl transition-all transform hover:scale-105
                                flex items-center justify-center gap-2">
                            <i data-lucide="search" class="w-6 h-6"></i>
                            <span>この条件で検索する</span>
                        </button>

                    </div>
                </div>
            </div>
        `;
        
        // Lucideアイコンを更新
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    bindEvents() {
        // カテゴリボタンを押したら選択 + 検索 + スクロール
        this.container.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.filters.category_main = category;
                this.filters.category_detail = "全て"; // 詳細はリセット
                this.render(); // ボタン押下後UIを更新
                this.bindEvents(); // 再バインド
                this.onSearch(this.filters); // 検索実行

                // 検索結果欄までスクロール
                const resultsSection = document.getElementById('search-results');
                if (resultsSection) {
                    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
});


        // 主要都市ボタン
        this.container.querySelectorAll('.major-city-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prefecture = e.target.dataset.prefecture;
                this.handlePrefectureChange(prefecture, true); // 第二引数で検索フラグ
            });
        });
        
        // 都道府県選択
        const prefectureSelect = this.container.querySelector('#prefecture-select');
        prefectureSelect.addEventListener('change', (e) => {
            this.handlePrefectureChange(e.target.value);
        });
        
        // 市区町村選択
        const citySelect = this.container.querySelector('#city-select');
        citySelect.addEventListener('change', (e) => {
            this.handleCityChange(e.target.value);
        });
        
        // エリア選択
        const areaSelect = this.container.querySelector('#area-select');
        areaSelect.addEventListener('change', (e) => {
            this.filters.area = e.target.value;
        });
        
        // メインカテゴリ選択
        const categoryMainSelect = this.container.querySelector('#category-main-select');
        categoryMainSelect.addEventListener('change', (e) => {
            this.handleMainCategoryChange(e.target.value);
        });
        
        // 詳細カテゴリ選択
        const categoryDetailSelect = this.container.querySelector('#category-detail-select');
        categoryDetailSelect.addEventListener('change', (e) => {
            this.filters.category_detail = e.target.value;
        });
        
        // キーワード入力
        const keywordInput = this.container.querySelector('#keyword-input');
        keywordInput.addEventListener('input', (e) => {
            this.filters.keyword = e.target.value;
        });
        
        // フィルター展開
        const toggleFiltersBtn = this.container.querySelector('#toggle-filters');
        toggleFiltersBtn.addEventListener('click', () => {
            this.showFilters = !this.showFilters;
            this.render();
            this.bindEvents();
        });
        
        // チェックボックス
        const checkboxes = {
            'can_reserve': 'can_reserve_online',
            'has_coupon': 'has_coupon',
            'can_view_menu': 'can_view_menu',
            'can_wait': 'can_wait_online',
            'can_contact': 'can_contact_online',
            'has_points': 'has_points'
        };
        
        Object.entries(checkboxes).forEach(([id, filterKey]) => {
            const checkbox = this.container.querySelector(`#${id}`);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.filters[filterKey] = e.target.checked;
                });
            }
        });
        
        // 検索ボタン
        const searchBtn = this.container.querySelector('#search-btn');
        searchBtn.addEventListener('click', () => {
            this.onSearch(this.filters);
        });
    }
    
    handlePrefectureChange(value, doSearch = false) {
        this.filters.prefecture = value;
        this.filters.city = "全て";
        this.filters.area = "全て";
        this.render();
        this.bindEvents();

        if (doSearch) {
            this.onSearch(this.filters); // 都道府県変更と同時に検索
        }
    }

    
    handleCityChange(value) {
        this.filters.city = value;
        this.filters.area = "全て";
        this.render();
        this.bindEvents();
    }
    
    handleMainCategoryChange(value) {
        this.filters.category_main = value;
        this.filters.category_detail = "全て";
        this.render();
        this.bindEvents();
    }
    
    getAvailableDetailCategories() {
        if (!this.filters.category_main || this.filters.category_main === "全て") {
            return ["全て"];
        }
        return ["全て", ...(DETAIL_CATEGORIES[this.filters.category_main] || [])];
    }
    
    getAvailableCities() {
        if (!this.filters.prefecture || this.filters.prefecture === "全て") {
            const cities = new Set();
            this.allAccounts.forEach(account => {
                if (account.city) cities.add(account.city);
            });
            return ["全て", ...Array.from(cities).sort()];
        }
        
        const cities = new Set();
        this.allAccounts
            .filter(account => account.prefecture === this.filters.prefecture)
            .forEach(account => {
                if (account.city) cities.add(account.city);
            });
        return ["全て", ...Array.from(cities).sort()];
    }
    
    getAvailableAreas() {
        if (!this.filters.city || this.filters.city === "全て") {
            const areas = new Set();
            this.allAccounts
                .filter(account => {
                    if (this.filters.prefecture && this.filters.prefecture !== "全て") {
                        return account.prefecture === this.filters.prefecture && account.area;
                    }
                    return account.area;
                })
                .forEach(account => {
                    if (account.area) areas.add(account.area);
                });
            return ["全て", ...Array.from(areas).sort()];
        }
        
        const areas = new Set();
        this.allAccounts
            .filter(account => account.city === this.filters.city)
            .forEach(account => {
                if (account.area) areas.add(account.area);
            });
        return ["全て", ...Array.from(areas).sort()];
    }
}