// メインアプリケーション
class LineAccountSearchApp {
    constructor() {
        this.currentPage = 'search';
        this.searchForm = null;
        this.searchResults = null;
        this.favorites = null;
        this.detail = null;
        this.hasSearched = false;
        
        this.init();
    }
    
    init() {
        this.bindNavigationEvents();
        this.initializeComponents();
        this.showLoading();
        
        // 初期化完了後にメインコンテンツを表示
        setTimeout(() => {
            this.hideLoading();
            this.showPage('search');
        }, 1000);
    }
    
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
    }
    
    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
    }
    
    bindNavigationEvents() {
        const navSearch = document.getElementById('nav-search');
        const navFavorites = document.getElementById('nav-favorites');
        
        navSearch.addEventListener('click', () => {
            this.showPage('search');
        });
        
        navFavorites.addEventListener('click', () => {
            this.showPage('favorites');
        });
        
        // モーダルの外側クリックで閉じる
        const detailModal = document.getElementById('detail-modal');
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                this.closeDetail();
            }
        });
        
        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDetail();
            }
        });
    }
    
    initializeComponents() {
        // SearchForm
        const searchFormContainer = document.getElementById('search-form');
        this.searchForm = new SearchForm(searchFormContainer, {
            onSearch: this.handleSearch.bind(this)
        });
        
        // SearchResults
        const searchResultsContainer = document.getElementById('search-results');
        this.searchResults = new SearchResults(searchResultsContainer, {
            onToggleFavorite: this.handleToggleFavorite.bind(this),
            onAccountClick: this.handleAccountClick.bind(this)
        });
        
        // Favorites
        const favoritesContainer = document.getElementById('favorites-page');
        this.favorites = new Favorites(favoritesContainer, {
            onToggleFavorite: this.handleToggleFavorite.bind(this),
            onAccountClick: this.handleAccountClick.bind(this),
            onBackToSearch: () => this.showPage('search')
        });
        
        // Detail
        const detailContainer = document.getElementById('detail-content');
        this.detail = new Detail(detailContainer, {
            onClose: this.closeDetail.bind(this)
        });
    }
    
    showPage(page) {
        // ナビゲーションの更新
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (page === 'search') {
            document.getElementById('nav-search').classList.add('active');
            document.getElementById('search-form').classList.remove('hidden');
            document.getElementById('search-results').classList.remove('hidden');
            document.getElementById('favorites-page').classList.add('hidden');
        } else if (page === 'favorites') {
            document.getElementById('nav-favorites').classList.add('active');
            document.getElementById('search-form').classList.add('hidden');
            document.getElementById('search-results').classList.add('hidden');
            document.getElementById('favorites-page').classList.remove('hidden');
            this.favorites.show();
        }
        
        this.currentPage = page;
    }
    
    async handleSearch(filters) {
        try {
            // ローディング状態にする
            this.searchResults.setAccounts([], true, true);
            
            // 検索実行
            const results = await DataService.searchAccounts(filters);
            
            // 結果を表示
            this.searchResults.setAccounts(results, false, true);
            this.hasSearched = true;
            
            // 検索ページに移動（お気に入りページにいた場合）
            if (this.currentPage !== 'search') {
                this.showPage('search');
            }
            
        } catch (error) {
            console.error('Search failed:', error);
            this.searchResults.setAccounts([], false, true);
        }
    }
    
handleToggleFavorite(accountId, source = "search") {
    const id = String(accountId);

    // LocalStorageの最新状態
    const stored = JSON.parse(localStorage.getItem('line_account_favorites') || '[]').map(String);
    const isFavorite = stored.includes(id);

    // ✅ 検索画面からの操作のみトグル処理を行う
    if (source === "search") {
        const updated = isFavorite
            ? stored.filter(fav => fav !== id)
            : [...stored, id];
        localStorage.setItem('line_account_favorites', JSON.stringify(updated));
    }

    // ✅ お気に入り画面や同期通知の場合はトグルせず再描画のみ
    const refreshed = JSON.parse(localStorage.getItem('line_account_favorites') || '[]').map(String);

    if (this.searchResults && typeof this.searchResults.applyFavoriteState === 'function') {
        this.searchResults.applyFavoriteState(id, refreshed.includes(id));
    }

    if (this.currentPage === 'favorites' && this.favorites) {
        this.favorites.favorites = refreshed;
        this.favorites.render();
    }
}





    
    handleAccountClick(accountId) {
        this.showDetail(accountId);
    }
    
    async showDetail(accountId) {
        const modal = document.getElementById('detail-modal');
        modal.classList.remove('hidden');
        modal.classList.add('modal-enter');
        
        // スクロールを一時的に無効化
        document.body.style.overflow = 'hidden';
        
        await this.detail.show(accountId);
    }
    
    closeDetail() {
        const modal = document.getElementById('detail-modal');
        modal.classList.add('hidden');
        modal.classList.remove('modal-enter');
        
        // スクロールを再有効化
        document.body.style.overflow = '';
    }
}

// アプリケーション開始
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LineAccountSearchApp();
});

// サービスワーカー登録（PWA対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}