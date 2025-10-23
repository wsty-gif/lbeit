// Favoritesコンポーネント
class Favorites {
    constructor(container, options = {}) {
        this.container = container;
        this.favorites = [];           // ← ここを真実として扱う（renderでLSを再読込しない）
        this.accounts = [];
        this.isLoading = false;

        // 親(App)へのコールバックは保持するが、ここからは呼ばない（復活防止）
        this.onToggleFavorite = options.onToggleFavorite || null;
        this.onAccountClick   = options.onAccountClick   || (() => {});
        this.onBackToSearch   = options.onBackToSearch   || (() => {});

        // イベント委譲（再描画してもハンドラが消えない）
        this._onClick = this._onClick.bind(this);
        this.container.addEventListener('click', this._onClick);

        this._loadFavoritesFromLS();
    }

    _loadFavoritesFromLS() {
        try {
            this.favorites = JSON.parse(localStorage.getItem('line_account_favorites') || '[]').map(String);
        } catch {
            this.favorites = [];
        }
    }

    async show() {
        this.isLoading = true;
        this.render();

        try {
            this.accounts = await DataService.getAllAccounts();
            // 表示直前に一度だけLSを読み込んで this.favorites を初期化
            this._loadFavoritesFromLS();

            this.isLoading = false;
            this.render(); // この後は render 内でLS再読込しない
        } catch (err) {
            console.error('Failed to load accounts:', err);
            this.isLoading = false;
            this.render();
        }
    }

    render() {
        // 🚫 ここで LS を再読込しない（復活の原因）。常に this.favorites を真実とする
        const favoriteAccounts = this.accounts.filter(acc => this.favorites.includes(String(acc.id)));

        this.container.innerHTML = `
            <div class="space-y-8">
                <!-- ヘッダー -->
                <div>
                    <button class="back-to-search mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        検索に戻る
                    </button>
                    <div class="flex items-center gap-3">
                        <i data-lucide="heart" class="w-8 h-8 text-red-500 fill-current"></i>
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900">お気に入り</h1>
                            <p class="text-gray-600 mt-1">
                                保存したLINE公式アカウント (${favoriteAccounts.length}件)
                            </p>
                        </div>
                    </div>
                </div>

                <!-- コンテンツ -->
                ${this.isLoading ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${Array(6).fill(0).map(() => `<div class="h-96 bg-gray-100 rounded-lg animate-pulse"></div>`).join('')}
                    </div>
                ` : favoriteAccounts.length === 0 ? `
                    <div class="text-center py-16">
                        <i data-lucide="heart" class="w-20 h-20 mx-auto mb-4 text-gray-300"></i>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">お気に入りがまだありません</h3>
                        <p class="text-gray-500">検索結果から♡マークを押すとここに表示されます。</p>
                    </div>
                ` : `
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${favoriteAccounts.map((account, i) => {
                            const card = new AccountCard(account, {
                                index: i,
                                isFavorite: true, // 確認画面なので常に true で描画
                                // ここへは渡さない： onToggleFavorite は内部で処理するため
                                onAccountClick: this.onAccountClick
                            });
                            return card.render();
                        }).join('')}
                    </div>
                `}
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // クリックの一括ハンドラ（イベント委譲）
    _onClick(e) {
        // 戻る
        if (e.target.closest('.back-to-search')) {
            this.onBackToSearch();
            return;
        }

        // お気に入りトグル
        const favBtn = e.target.closest('.favorite-btn');
        if (favBtn) {
            e.stopPropagation();
            const id = String(favBtn.dataset.accountId);
            this._toggleFavorite(id);
            return;
        }

        // カード本体クリック → 詳細へ
        const card = e.target.closest('.account-card');
        if (card && card.dataset.accountId) {
            this.onAccountClick(card.dataset.accountId);
        }
    }

    _toggleFavorite(id) {
        // 常に最新のLSから開始
        let stored = [];
        try {
            stored = JSON.parse(localStorage.getItem('line_account_favorites') || '[]').map(String);
        } catch {
            stored = [];
        }

        const isFavorite = stored.includes(id);
        const updated = isFavorite ? stored.filter(f => f !== id)
                                   : [...stored, id];

        // LS とクラス状態を更新（同期）
        localStorage.setItem('line_account_favorites', JSON.stringify(updated));
        this.favorites = updated;

        // DOM から該当カードを即時削除（1回で消える）
        if (isFavorite) {
            const card = this.container.querySelector(`.account-card[data-account-id="${id}"]`);
            if (card) card.remove();
        }

        // すべて消えたら空表示へ
        if (this.container.querySelectorAll('.account-card').length === 0) {
            this.render();
        }

        // 🔇 親(app.js)へは通知しない（ここからの再トグルで復活するのを防止）
        // 必要なら戻って検索画面を開いた時点で、その画面側は LS を基に表示が揃います
    }
}
