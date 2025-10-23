// SearchResultsコンポーネント
class SearchResults {
    constructor(container, options = {}) {
        this.container = container;
        this.accounts = [];
        this.isLoading = false;
        this.isEmpty = false;
        this.onAccountClick = options.onAccountClick || (() => {});
        this.onToggleFavorite = options.onToggleFavorite || (() => {});
    }

    show(accounts) {
        this.accounts = accounts;
        this.isEmpty = accounts.length === 0;
        this.isLoading = false;
        this.render();
        this.bindEvents();
    }

    showLoading() {
        this.isLoading = true;
        this.render();
    }

    render() {
        if (this.isLoading) {
            this.container.innerHTML = `
                <div class="text-center py-16">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p class="text-gray-600">検索中...</p>
                </div>`;
            return;
        }

        if (this.isEmpty) {
            this.container.innerHTML = `
                <div class="text-center py-16 bg-white rounded-lg shadow-md">
                    <div class="text-6xl mb-4">🔍</div>
                    <h3 class="text-xl font-bold text-gray-900 mb-2">検索結果が見つかりませんでした</h3>
                    <p class="text-gray-600">条件を変更して再度検索してください</p>
                </div>`;
            return;
        }

        this.container.innerHTML = `
            <div class="mb-4">
                <p class="text-gray-600">
                    <span class="font-bold text-lg text-green-600">${this.accounts.length}</span> 件のアカウントが見つかりました
                </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${this.accounts.map(account => this.renderAccountCard(account)).join('')}
            </div>`;

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    renderAccountCard(account) {
        const favorites = JSON.parse(localStorage.getItem('line_account_favorites') || '[]');
        const isFavorite = favorites.includes(String(account.id));

        return `
            <div class="account-card bg-white rounded-lg shadow-md overflow-hidden cursor-pointer fade-in flex flex-col" data-account-id="${account.id}">
                <div class="relative">
                    <img src="${account.image_url}" alt="${account.account_name}" class="w-full h-48 object-cover">
                        <button 
                        class="favorite-btn absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all shadow-lg bg-white/90 text-gray-600 hover:bg-white hover:scale-110" 
                        data-account-id="${account.id}">
                        <i data-lucide="heart" 
                            class="w-5 h-5 transition-colors ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}">
                        </i>
                        </button>
                </div>
                <div class="p-4 flex flex-col flex-grow">
                    <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2">${account.account_name}</h3>
                    <div class="flex flex-wrap gap-2 mb-3">
                        <span class="category-badge badge-${account.service_category_main} px-3 py-1 rounded-full text-sm font-medium">
                            ${account.service_category_main}
                        </span>
                        ${account.service_category_detail ? `
                            <span class="category-badge badge-${account.service_category_detail} px-3 py-1 rounded-full text-sm font-medium">
                                ${account.service_category_detail}
                            </span>` : ''}
                    </div>
                    <p class="text-gray-600 text-sm mb-3 line-clamp-2">${account.description || ''}</p>
                    <div class="mt-auto">
                        <div class="flex items-center text-orange-600 font-medium mb-3">
                            <i data-lucide="gift" class="w-4 h-4 mr-1"></i>
                            <span class="text-sm">${account.line_benefits || ''}</span>
                        </div>
                        <div class="text-center flex justify-center gap-3">
                            ${account.line_id ? `
                                <a href="https://line.me/R/ti/p/@${account.line_id}" target="_blank" rel="noopener noreferrer" class="inline-block">
                                    <img id="line_add" src="https://scdn.line-apps.com/n/line_add_friends/btn/ja.png"
                                        alt="友だち追加" class="inline-block w-[160px] h-auto mx-auto">
                                </a>` : ''}

                            ${account.instagram_url ? `
                                <a href="${account.instagram_url}" target="_blank" rel="noopener noreferrer" class="insta_btn2">
                                    <i class="fab fa-instagram"></i> <span>Instagram</span>
                                </a>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }

    bindEvents() {
        const cards = this.container.querySelectorAll('.account-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.favorite-btn') || e.target.closest('a')) return;
                this.onAccountClick(String(card.dataset.accountId));
            });
        });

        // const favoriteBtns = this.container.querySelectorAll('.favorite-btn');
        // favoriteBtns.forEach(btn => {
        //     btn.addEventListener('click', (e) => {
        //         e.stopPropagation();
        //         const accountId = parseInt(btn.dataset.accountId);
        //         const favorites = JSON.parse(localStorage.getItem('line_account_favorites') || '[]');
        //         const isFav = favorites.includes(accountId);

        //         // トグル
        //         let newFavorites;
        //         if (isFav) {
        //             newFavorites = favorites.filter(id => id !== accountId);
        //         } else {
        //             newFavorites = [...favorites, accountId];
        //         }
        //         localStorage.setItem('line_account_favorites', JSON.stringify(newFavorites));

        //         // SVGカラー切り替え
        //         const svg = btn.querySelector('svg');
        //         if (svg) {
        //             svg.setAttribute('fill', isFav ? 'none' : 'red');
        //             svg.setAttribute('stroke', isFav ? 'gray' : 'red');
        //         }

        //         this.onToggleFavorite(accountId);
        //     });
        // });
        // お気に入りボタンのクリックイベント
        // お気に入りボタンのクリックイベント
        const favoriteBtns = this.container.querySelectorAll('.favorite-btn');
        favoriteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const accountId = String(btn.dataset.accountId); // 文字列に統一
                this.onToggleFavorite(accountId, "search");
            });
        });


    }

    setAccounts(accounts) {
        this.accounts = accounts;
        this.isEmpty = accounts.length === 0;
        this.isLoading = false;
        this.render();
        this.bindEvents();
    }

    clear() {
        this.accounts = [];
        this.isEmpty = false;
        this.isLoading = false;
        this.container.innerHTML = '';
    }

    updateFavorites(favorites) {
        // ローカルストレージ更新済みの favorites 配列が渡ってくる前提
        const favoriteBtns = this.container.querySelectorAll('.favorite-btn');

        favoriteBtns.forEach(btn => {
            const accountId = String(btn.dataset.accountId);
            const isFav = favorites.includes(accountId);
            const svg = btn.querySelector('svg');
            if (svg) {
                svg.setAttribute('fill', isFav ? 'red' : 'none');
                svg.setAttribute('stroke', isFav ? 'red' : 'gray');
            }
        });
    }

    // クリック後に見た目だけ切り替える（i→svg 変換後でも確実に動作）
    applyFavoriteState(accountId, isFavorite) {
        const btn = this.container.querySelector(`.favorite-btn[data-account-id="${accountId}"]`);
        if (!btn) return;

        // Lucide は <i> を <svg> に置き換えるので両方を拾う
        const icon =
            btn.querySelector('svg[data-lucide="heart"]') ||
            btn.querySelector('svg.lucide-heart') ||
            btn.querySelector('i[data-lucide="heart"]');

        if (!icon) return;

        // 見た目のクラスを統一的に更新（色は class、塗りつぶしは属性で制御）
        if (isFavorite) {
            icon.classList.add('text-red-500');
            icon.classList.remove('text-gray-400');
            // Lucide の heart はデフォルト fill="none" なので、塗りつぶしを有効化
            icon.setAttribute('fill', 'currentColor');
            icon.setAttribute('stroke', 'currentColor');
            icon.classList.add('fill-current'); // 互換維持（i のままでも効く）
        } else {
            icon.classList.remove('text-red-500', 'fill-current');
            icon.classList.add('text-gray-400');
            icon.setAttribute('fill', 'none');
            icon.setAttribute('stroke', 'currentColor');
        }
    }

}
