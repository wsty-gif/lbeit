// AccountCardコンポーネント
class AccountCard {
    constructor(account, options = {}) {
        this.account = account;
        this.index = options.index || 0;
        this.isFavorite = options.isFavorite || false;
        this.onToggleFavorite = options.onToggleFavorite || (() => {});
        this.onAccountClick = options.onAccountClick || (() => {});
    }
    
    render() {
        const categoryClass = this.getCategoryClass(this.account.service_category_detail || this.account.service_category_main);
        
        return `
            <div class="account-card fade-in h-full hover:shadow-2xl transition-all duration-300 border-2 border-gray-200 bg-white overflow-hidden group cursor-pointer rounded-2xl" 
                 style="animation-delay: ${this.index * 0.1}s"
                 data-account-id="${this.account.id}">
                
                <div class="h-3 bg-gradient-to-r from-orange-400 to-red-400"></div>
                
                ${this.account.image_url ? `
                    <div class="relative w-full h-48 overflow-hidden bg-gray-100">
                        <img src="${this.account.image_url}" 
                            alt="${this.account.account_name}"
                            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onerror="this.style.display='none'; 
                                    const fallback = document.createElement('div');
                                    fallback.className='flex items-center justify-center h-full bg-gradient-to-br from-orange-100 to-yellow-100';
                                    fallback.innerHTML='<div class=&quot;text-6xl&quot;>🏪</div>';
                                    this.parentElement.appendChild(fallback);">

                        ${this.account.is_recommended ? `
                            <div class="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1.5 rounded-full shadow-lg font-black text-xs animate-pulse">
                                ⭐ 今月のイチ押し！
                            </div>
                        ` : ''}

                        <!-- ✅ 修正版：背景固定・ハートだけ色変化 -->
                        <button class="favorite-btn absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all shadow-lg bg-white/90 hover:scale-110" data-account-id="${this.account.id}">
                        ${this.isFavorite
                            ? '<i data-lucide="heart" class="w-5 h-5 text-red-500 fill-current"></i>'
                            : '<i data-lucide="heart" class="w-5 h-5 text-gray-400"></i>'
                        }
                        </button>

                    </div>
                ` : ''}

                <div class="p-4 space-y-3">
                    <!-- 店舗名 -->
                    <div class="flex items-center gap-2">
                        <h3 class="text-xl font-black text-gray-900 line-clamp-1">
                            ${this.account.account_name}
                        </h3>
                        ${this.account.is_verified ? `
                            <i data-lucide="check-circle" class="w-5 h-5 text-green-600 flex-shrink-0"></i>
                        ` : ''}
                    </div>

                    <!-- カテゴリーバッジ -->
                    <div class="flex flex-wrap gap-1.5">
                        ${this.account.service_category_detail ? `
                            <span class="badge ${categoryClass} border text-xs font-medium px-2 py-1 rounded-full">
                                ${this.account.service_category_detail}
                            </span>
                        ` : ''}
                        ${this.account.prefecture ? `
                            <span class="border border-gray-300 text-gray-600 text-xs px-2 py-1 rounded-full flex items-center">
                                <i data-lucide="map-pin" class="w-2.5 h-2.5 mr-0.5"></i>
                                ${this.account.prefecture}${this.account.city ? ` ${this.account.city}` : ''}
                            </span>
                        ` : ''}
                    </div>

                    <!-- 店舗紹介文 -->
                    <p class="text-xs text-gray-600 leading-relaxed line-clamp-2">
                        ${this.account.description || ''}
                    </p>

                    <!-- LINE追加特典 -->
                    ${this.account.line_benefits ? `
                        <div class="bg-gradient-to-r from-yellow-400 to-orange-400 p-3 rounded-lg shadow-md -mx-1">
                            <div class="flex items-start gap-2">
                                <i data-lucide="gift" class="w-6 h-6 text-white flex-shrink-0 mt-0.5"></i>
                                <div>
                                    <p class="font-black text-white text-base mb-0.5">🎁 LINE追加特典</p>
                                    <p class="text-white text-sm font-bold">${this.account.line_benefits}</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- LINEでできること -->
                    ${this.account.line_features && this.account.line_features.length > 0 ? `
                        <div class="bg-green-50 rounded-lg p-2 border border-green-200">
                            <p class="text-xs font-bold text-green-900 mb-1">✨ LINEでできること</p>
                            <div class="space-y-0.5">
                                ${this.account.line_features.slice(0, 2).map(feature => `
                                    <div class="flex items-start gap-1">
                                        <i data-lucide="check" class="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5"></i>
                                        <span class="text-xs text-green-800 font-medium line-clamp-1">${feature}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- 友だち追加ボタン -->
                    <button class="line-add-btn w-full bg-green-500 hover:bg-green-600 text-white font-black py-5 text-base shadow-lg rounded-xl transition-all transform hover:scale-105"
                            data-line-id="${this.account.line_id}">
                        <svg class="w-5 h-5 mr-2 inline" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.630.63H17.61v1.125h1.755c.349 0 .630.283.630.630 0 .344-.281.629-.630.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                        </svg>
                        ${this.account.line_benefits ? '友だち追加して特典をGET！' : '友だち追加'}
                    </button>
                </div>
            </div>
        `;
    }
    
    getCategoryClass(category) {
        const categoryColors = {
            "飲食": "badge-飲食",
            "美容": "badge-美容",
            "小売": "badge-小売",
            "医療・健康": "badge-医療・健康",
            "教育": "badge-教育",
            "不動産": "badge-不動産",
            "士業・コンサル": "badge-士業・コンサル",
            "エンタメ": "badge-エンタメ",
            "自治体・公共": "badge-自治体・公共",
            "その他": "badge-その他",
            "ラーメン": "badge-ラーメン",
            "寿司": "badge-寿司",
            "焼肉": "badge-焼肉",
            "イタリアン": "badge-イタリアン",
            "フレンチ": "badge-フレンチ",
            "中華料理": "badge-中華料理",
            "カフェ": "badge-カフェ",
            "居酒屋": "badge-居酒屋",
            "バー": "badge-バー",
            "ファストフード": "badge-ファストフード"
        };
        return categoryColors[category] || "badge-その他";
    }
    
    bindEvents(element) {
        // お気に入りボタン
        const favoriteBtn = element.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onToggleFavorite(this.account.id);
            });
        }

        // LINE追加ボタン
        const lineAddBtn = element.querySelector('.line-add-btn');
        if (lineAddBtn) {
            lineAddBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(`https://line.me/R/ti/p/@${this.account.line_id}`, '_blank');
            });
        }

        // カード全体のクリック
        element.addEventListener('click', () => {
            this.onAccountClick(this.account.id);
        });
    }
}
