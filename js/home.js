
/* home.js - Homepage specific scripts */

document.addEventListener('DOMContentLoaded', () => {
    // Admins do not need the homepage - redirect to Dashboard
    if (isLoggedIn() && isAdmin()) {
        window.location.href = 'admin.html';
        return;
    }
    
    loadHomeData();
    setupHomeSearch();
});

function setupHomeSearch() {
    const searchForm = document.getElementById('home-search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const keyword = document.getElementById('home-search-input').value.trim();
            if (keyword) {
                window.location.href = `products.html?search=${encodeURIComponent(keyword)}`;
            }
        });
    }
}

async function loadHomeData() {
    await Promise.all([
        fetchHomeCategories(),
        fetchHomeProducts()
    ]);
}

// Fetch and render categories in horizontal scroll list
async function fetchHomeCategories() {
    const container = document.getElementById('home-categories-list');
    if (!container) return;
    
    try {
        const categories = await apiRequest('/api/categories', 'GET');
        
        if (!categories || categories.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 w-100 text-muted">
                    <p class="mb-0">No categories found. Access Admin dashboard to register categories.</p>
                </div>
            `;
            return;
        }
        
        // Render category cards
        let html = '';
        categories.forEach(cat => {
            // Pick an icon based on category name
            let iconClass = 'bi-tags';
            const nameLower = cat.name.toLowerCase();
            if (nameLower.includes('phone') || nameLower.includes('mobile')) iconClass = 'bi-phone';
            else if (nameLower.includes('laptop') || nameLower.includes('computer')) iconClass = 'bi-laptop';
            else if (nameLower.includes('watch') || nameLower.includes('wear')) iconClass = 'bi-watch';
            else if (nameLower.includes('audio') || nameLower.includes('headphone')) iconClass = 'bi-headphones';
            else if (nameLower.includes('shoe') || nameLower.includes('apparel')) iconClass = 'bi-person-workspace';
            else if (nameLower.includes('accessory')) iconClass = 'bi-smartwatch';
            
            html += `
                <div class="category-pill-card glass-panel" onclick="window.location.href='products.html?category=${cat.id}'">
                    <i class="bi ${iconClass} category-pill-icon"></i>
                    <span class="fw-semibold text-white">${cat.name}</span>
                </div>
            `;
        });
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        container.innerHTML = `
            <div class="alert alert-danger py-2 w-100">Error loading categories. Make sure backend is running.</div>
        `;
    }
}

// Fetch and render top trending products (Limit to 8)
async function fetchHomeProducts() {
    const grid = document.getElementById('home-products-grid');
    if (!grid) return;
    
    try {
        const products = await apiRequest('/api/products', 'GET');
        
        if (!products || products.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="bi bi-boxes style="font-size: 40px; display: block;" class="mb-3"></i>
                    <p class="mb-0">No products available in the vault yet. Register products as an Admin.</p>
                </div>
            `;
            return;
        }
        
        // Take first 8 products for trending
        const trending = products.slice(0, 8);
        let html = '';
        
        trending.forEach(prod => {
            const imgUrl = getProductImageUrl(prod.imageUrl);
            
            // Generate single card layout
            html += `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="card-elite glass-panel h-100">
                        <div class="card-img-wrap" onclick="window.location.href='product-detail.html?id=${prod.id}'" style="cursor: pointer;">
                            <img src="${imgUrl}" alt="${prod.name}" loading="lazy">
                            <div class="card-img-overlay-details">
                                <span class="glow-btn-outline btn-sm w-100 text-center">View Details</span>
                            </div>
                        </div>
                        <div class="card-body-elite">
                            <div class="card-category">${prod.categoryName || 'General'}</div>
                            <h3 class="card-title-elite" title="${prod.name}" onclick="window.location.href='product-detail.html?id=${prod.id}'" style="cursor: pointer;">${prod.name}</h3>
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <span class="card-price-elite">Rs. ${prod.price.toFixed(2)}</span>
                                <button class="glow-btn btn-sm px-2 py-1" onclick="quickAddToCart(event, ${prod.id})">
                                    <i class="bi bi-cart-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
        
    } catch (error) {
        console.error('Error fetching trending products:', error);
        grid.innerHTML = `
            <div class="col-12 alert alert-danger py-2">Error loading products. Check database connectivity.</div>
        `;
    }
}

// Quick action to add directly to cart
async function quickAddToCart(event, productId) {
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
        
        // Update navigation badge count
        updateCartBadgeCount();
        
    } catch (e) {
        showToast(e.message || 'Failed to add product. Check stock availability.', 'error');
    }
}

// Bind to window scope for inline HTML handlers
window.quickAddToCart = quickAddToCart;
