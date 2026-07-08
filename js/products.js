/* products.js - Products listing, searching, sorting and pagination */

// Catalog state
let state = {
    currentPage: 0,
    pageSize: 6,
    currentCategory: null,
    currentSearch: '',
    sortBy: 'id',
    direction: 'asc',
    // Cache for client-side paginated queries (searched/category-filtered)
    cachedProducts: null
};

document.addEventListener('DOMContentLoaded', () => {
    initCatalog();
});

async function initCatalog() {
    // Read URL params
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    const searchParam = urlParams.get('search');
    
    if (categoryParam) state.currentCategory = parseInt(categoryParam);
    if (searchParam) state.currentSearch = searchParam;
    
    // Bind search input value
    const searchInput = document.getElementById('catalog-search');
    if (searchInput && state.currentSearch) {
        searchInput.value = state.currentSearch;
    }
    
    // Wire up events
    setupEvents();
    
    // Load categories filter panel
    await loadFilterCategories();
    
    // Load products
    fetchProducts();
}

function setupEvents() {
    // Search input event (Debounced)
    const searchInput = document.getElementById('catalog-search');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.currentSearch = e.target.value.trim();
                state.currentPage = 0; // reset to first page
                state.cachedProducts = null; // invalidate cache
                fetchProducts();
            }, 500);
        });
    }
    
    // Sort dropdown event
    const sortSelect = document.getElementById('catalog-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const [field, dir] = e.target.value.split('-');
            state.sortBy = field;
            state.direction = dir;
            state.currentPage = 0;
            state.cachedProducts = null;
            fetchProducts();
        });
    }
}

// Fetch categories from backend and list them in the sidebar
async function loadFilterCategories() {
    const list = document.getElementById('catalog-categories-list');
    if (!list) return;
    
    try {
        const categories = await apiRequest('/api/categories', 'GET');
        
        let html = `
            <a href="#" class="filter-category-link ${state.currentCategory === null ? 'active' : ''}" data-id="all">
                <span>All Collections</span>
                <i class="bi bi-chevron-right small"></i>
            </a>
        `;
        
        categories.forEach(cat => {
            html += `
                <a href="#" class="filter-category-link ${state.currentCategory === cat.id ? 'active' : ''}" data-id="${cat.id}">
                    <span>${cat.name}</span>
                    <i class="bi bi-chevron-right small"></i>
                </a>
            `;
        });
        
        list.innerHTML = html;
        
        // Add click events to links
        const links = list.querySelectorAll('.filter-category-link');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Clear active states
                links.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                const catId = link.getAttribute('data-id');
                state.currentCategory = (catId === 'all') ? null : parseInt(catId);
                state.currentPage = 0;
                state.cachedProducts = null;
                
                // Update URL parameter silently without reloading page
                const url = new URL(window.location);
                if (state.currentCategory) {
                    url.searchParams.set('category', state.currentCategory);
                } else {
                    url.searchParams.delete('category');
                }
                window.history.pushState({}, '', url);
                
                fetchProducts();
            });
        });
        
    } catch (e) {
        list.innerHTML = '<div class="alert alert-danger py-2">Categories load failure</div>';
    }
}

// Fetch products based on state filters
async function fetchProducts() {
    const grid = document.getElementById('catalog-products-grid');
    if (!grid) return;
    
    // Render skeleton state
    renderSkeletons();
    
    try {
        // Core routing check:
        // Use backend paginated API only when no custom filter/search is applied
        if (!state.currentCategory && !state.currentSearch) {
            const pageData = await apiRequest(
                `/api/products/page?page=${state.currentPage}&size=${state.pageSize}&sortBy=${state.sortBy}&direction=${state.direction}`,
                'GET'
            );
            renderProductsGrid(pageData.content);
            renderPagination(pageData.totalPages, pageData.totalElements);
            updateFilterSidebarButton();
        } else {
            // If search or category is active, fetch complete set and handle pagination client-side
            if (!state.cachedProducts) {
                let rawList = [];
                if (state.currentSearch) {
                    rawList = await apiRequest(`/api/products/search?keyword=${encodeURIComponent(state.currentSearch)}`, 'GET');
                } else if (state.currentCategory) {
                    rawList = await apiRequest(`/api/products/category/${state.currentCategory}`, 'GET');
                }
                
                // Keep cache
                state.cachedProducts = rawList;
            }
            
            // Client-side sort
            let processedList = [...state.cachedProducts];
            processedList.sort((a, b) => {
                let comparison = 0;
                if (state.sortBy === 'price') {
                    comparison = a.price - b.price;
                } else if (state.sortBy === 'name') {
                    comparison = a.name.localeCompare(b.name);
                } else {
                    // Default to ID
                    comparison = a.id - b.id;
                }
                return state.direction === 'asc' ? comparison : -comparison;
            });
            
            // Client-side paginator
            const totalElements = processedList.length;
            const totalPages = Math.ceil(totalElements / state.pageSize);
            const startIndex = state.currentPage * state.pageSize;
            const paginatedItems = processedList.slice(startIndex, startIndex + state.pageSize);
            
            renderProductsGrid(paginatedItems);
            renderPagination(totalPages, totalElements);
            updateFilterSidebarButton();
        }
        
    } catch (error) {
        console.error('Error fetching catalog:', error);
        grid.innerHTML = '<div class="col-12 alert alert-danger">Error loading products. Ensure backend is running.</div>';
    }
}

// Show skeleton shimmers while loading
function renderSkeletons() {
    const grid = document.getElementById('catalog-products-grid');
    let html = '';
    for (let i = 0; i < state.pageSize; i++) {
        html += `
            <div class="col-6 col-md-4">
                <div class="skeleton-card skeleton"></div>
            </div>
        `;
    }
    grid.innerHTML = html;
}

// Render product card array
function renderProductsGrid(products) {
    const grid = document.getElementById('catalog-products-grid');
    
    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                <i class="bi bi-search" style="font-size: 44px; display: block;" class="mb-3"></i>
                <p class="mb-0 mt-3 h5 text-white">No matches found in vault</p>
                <p class="small">Try refining your search keyword or selecting a different collection.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    products.forEach(prod => {
        const imgUrl = getProductImageUrl(prod.imageUrl);
        
        html += `
            <div class="col-6 col-md-4">
                <div class="card-elite glass-panel h-100">
                    <div class="card-img-wrap" onclick="window.location.href='product-detail.html?id=${prod.id}'" style="cursor: pointer;">
                        <img src="${imgUrl}" alt="${prod.name}">
                        <div class="card-img-overlay-details">
                            <span class="glow-btn-outline btn-sm w-100 text-center">View Details</span>
                        </div>
                    </div>
                    <div class="card-body-elite">
                        <div class="card-category">${prod.categoryName || 'General'}</div>
                        <h3 class="card-title-elite" title="${prod.name}" onclick="window.location.href='product-detail.html?id=${prod.id}'" style="cursor: pointer;">${prod.name}</h3>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span class="card-price-elite">Rs. ${prod.price.toFixed(2)}</span>
                            <button class="glow-btn btn-sm px-2 py-1" onclick="quickCatalogAddToCart(event, ${prod.id})">
                                <i class="bi bi-cart-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

// Render dynamic pagination links
function renderPagination(totalPages, totalElements) {
    const list = document.getElementById('catalog-pagination');
    const itemCountText = document.getElementById('catalog-item-count');
    
    if (!list) return;
    
    // Update count labels
    if (itemCountText) {
        itemCountText.innerHTML = `Showing <strong>${totalElements}</strong> premium vault products`;
    }
    
    if (totalPages <= 1) {
        list.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous Page
    html += `
        <li class="page-item ${state.currentPage === 0 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(event, ${state.currentPage - 1})"><i class="bi bi-chevron-left"></i></a>
        </li>
    `;
    
    // Page Numbers
    for (let i = 0; i < totalPages; i++) {
        html += `
            <li class="page-item ${state.currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(event, ${i})">${i + 1}</a>
            </li>
        `;
    }
    
    // Next Page
    html += `
        <li class="page-item ${state.currentPage === totalPages - 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(event, ${state.currentPage + 1})"><i class="bi bi-chevron-right"></i></a>
        </li>
    `;
    
    list.innerHTML = html;
}

function changePage(event, pageNum) {
    event.preventDefault();
    if (pageNum < 0) return;
    state.currentPage = pageNum;
    fetchProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateFilterSidebarButton() {
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
        if (state.currentCategory || state.currentSearch) {
            clearBtn.classList.remove('d-none');
            // Bind action
            clearBtn.onclick = () => {
                state.currentCategory = null;
                state.currentSearch = '';
                state.currentPage = 0;
                state.cachedProducts = null;
                
                const searchInput = document.getElementById('catalog-search');
                if (searchInput) searchInput.value = '';
                
                // Clear active categories styling
                const links = document.querySelectorAll('.filter-category-link');
                links.forEach(l => {
                    if (l.getAttribute('data-id') === 'all') l.classList.add('active');
                    else l.classList.remove('active');
                });
                
                // Clear URL parameters
                const url = new URL(window.location);
                url.searchParams.delete('category');
                url.searchParams.delete('search');
                window.history.pushState({}, '', url);
                
                fetchProducts();
            };
        } else {
            clearBtn.classList.add('d-none');
        }
    }
}

// Handle cart injection
async function quickCatalogAddToCart(event, productId) {
    event.stopPropagation();
    
    if (!isLoggedIn()) {
        showToast('Please login to purchase products', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    if (isAdmin()) {
        showToast('Admin accounts cannot purchase items', 'warning');
        return;
    }
    
    try {
        const body = {
            productId: productId,
            quantity: 1
        };
        
        await apiRequest('/api/cart', 'POST', body);
        showToast('Added to cart successfully!', 'success');
        updateCartBadgeCount();
        
    } catch (e) {
        showToast(e.message || 'Failed to add product. Check stock availability.', 'error');
    }
}

// Bind to window scope for inline HTML handlers
window.quickCatalogAddToCart = quickCatalogAddToCart;
window.changePage = changePage;
