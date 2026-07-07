/* product-detail.js - Single product details page logic */

let currentProduct = null;
let selectedQuantity = 1;

document.addEventListener('DOMContentLoaded', () => {
    initProductDetail();
});

async function initProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        window.location.href = 'products.html';
        return;
    }
    
    await loadProduct(productId);
}

async function loadProduct(id) {
    const container = document.getElementById('product-detail-container');
    
    try {
        const product = await apiRequest(`/api/products/${id}`, 'GET');
        currentProduct = product;
        
        const imgUrl = getProductImageUrl(product.imageUrl);
        console.log('[ProductDetail] imageUrl from API:', product.imageUrl);
        console.log('[ProductDetail] resolved imgUrl:', imgUrl);
        
        // Stock status
        const isOutOfStock = product.stock <= 0;
        const stockBadge = isOutOfStock 
            ? '<span class="badge bg-danger">Sold Out</span>' 
            : `<span class="badge bg-success">In Stock (${product.stock} units available)</span>`;
            
        container.innerHTML = `
            <div class="col-lg-6">
                <div class="detail-img-card glass-panel">
                    <img 
                        src="${imgUrl}" 
                        alt="${product.name}" 
                        id="zoom-product-img"
                        onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60'; this.style.opacity='0.5';"
                        style="transition: opacity 0.3s;"
                    >
                </div>
            </div>
            
            <div class="col-lg-6">
                <div class="mb-2">
                    <span class="text-gradient-purple text-uppercase fw-bold small">${product.categoryName || 'Exclusive'}</span>
                </div>
                <h1 class="product-title-large text-white">${product.name}</h1>
                <div class="mb-4">${stockBadge}</div>
                
                <h2 class="product-detail-price">Rs. ${product.price.toFixed(2)}</h2>
                
                <p class="text-secondary mb-4" style="font-size: 16px;">${product.description || 'No description provided for this premium masterpiece. Designed with modern elements for full utility.'}</p>
                
                ${!isOutOfStock ? `
                    <div class="d-flex flex-wrap align-items-center gap-4 mt-4">
                        <div class="qty-input-wrap">
                            <button class="qty-btn" onclick="updateDetailQty(-1)"><i class="bi bi-dash"></i></button>
                            <input type="text" class="qty-input" id="detail-qty-input" value="1" readonly>
                            <button class="qty-btn" onclick="updateDetailQty(1)"><i class="bi bi-plus"></i></button>
                        </div>
                        
                        <button class="glow-btn px-5 py-3" onclick="addProductToCart()">
                            <i class="bi bi-cart-plus me-2"></i> Add To Cart Collection
                        </button>
                    </div>
                ` : `
                    <div class="alert alert-secondary py-3 text-center glass-panel w-75">
                        <i class="bi bi-bell me-2"></i> Notice: Out of Stock
                    </div>
                `}
            </div>
        `;
        
        // Load related items
        fetchRelatedProducts(product);
        
    } catch (e) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-danger w-50 mx-auto">Error loading product information. Ensure product ID is valid.</div>
                <a href="products.html" class="glow-btn mt-3">Back to Catalog</a>
            </div>
        `;
    }
}

function updateDetailQty(change) {
    const input = document.getElementById('detail-qty-input');
    if (!input || !currentProduct) return;
    
    let newQty = selectedQuantity + change;
    
    // Limits checks
    if (newQty < 1) newQty = 1;
    if (newQty > currentProduct.stock) {
        newQty = currentProduct.stock;
        showToast('Max available stock reached', 'warning');
    }
    
    selectedQuantity = newQty;
    input.value = newQty;
}

async function addProductToCart() {
    if (!isLoggedIn()) {
        showToast('Please login to purchase items', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    if (isAdmin()) {
        showToast('Admins cannot purchase products', 'warning');
        return;
    }
    
    try {
        const body = {
            productId: currentProduct.id,
            quantity: selectedQuantity
        };
        
        await apiRequest('/api/cart', 'POST', body);
        showToast(`Successfully added ${selectedQuantity} item(s) to cart!`, 'success');
        updateCartBadgeCount();
        
    } catch (e) {
        showToast(e.message || 'Failed to add items to cart. Ensure stock is available.', 'error');
    }
}

// Fetch related items from category
async function fetchRelatedProducts(product) {
    const grid = document.getElementById('detail-related-products');
    if (!grid) return;
    
    try {
        // Query products
        const products = await apiRequest('/api/products', 'GET');
        
        // Filter by same category and exclude current product
        const related = products.filter(p => p.categoryName === product.categoryName && p.id !== product.id).slice(0, 4);
        
        if (related.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-muted small">
                    No related masterpieces found in category ${product.categoryName}.
                </div>
            `;
            return;
        }
        
        let html = '';
        related.forEach(prod => {
            const imgUrl = getProductImageUrl(prod.imageUrl);
            
            html += `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="card-elite glass-panel h-100">
                        <div class="card-img-wrap" onclick="window.location.href='product-detail.html?id=${prod.id}'" style="cursor: pointer;">
                            <img src="${imgUrl}" alt="${prod.name}">
                            <div class="card-img-overlay-details">
                                <span class="glow-btn-outline btn-sm w-100 text-center">View Details</span>
                            </div>
                        </div>
                        <div class="card-body-elite">
                            <h4 class="card-title-elite mb-2" onclick="window.location.href='product-detail.html?id=${prod.id}'" style="cursor: pointer;">${prod.name}</h4>
                            <span class="card-price-elite">Rs. ${prod.price.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;

    } catch (e) {
        grid.innerHTML = '<div class="col-12 text-muted">Error loading related products.</div>';
    }
}

// Bind to window scope for inline HTML handlers
window.updateDetailQty = updateDetailQty;
window.addProductToCart = addProductToCart;
