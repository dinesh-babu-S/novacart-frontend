/* cart.js - Dedicated Cart page control */

document.addEventListener('DOMContentLoaded', () => {
    // Force route protection
    if (!isLoggedIn() || !isCustomer()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadCartPage();
    setupCartPageEvents();
});

async function loadCartPage() {
    const card = document.getElementById('cart-page-items-card');
    const subtotalText = document.getElementById('cart-page-subtotal');
    const totalText = document.getElementById('cart-page-total');
    const checkoutBtn = document.getElementById('cart-page-checkout-btn');
    
    if (!card) return;
    
    try {
        const cartItems = await apiRequest('/api/cart', 'GET');
        
        if (!cartItems || cartItems.length === 0) {
            card.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-cart-x text-secondary" style="font-size: 50px; display: block;"></i>
                    <p class="h5 text-white mt-3 mb-1">Your cart is currently empty</p>
                    <p class="small mb-4">Add premium pieces from our catalog collection first.</p>
                    <a href="products.html" class="glow-btn">Browse Collection</a>
                </div>
            `;
            if (subtotalText) subtotalText.innerText = 'Rs. 0.00';
            if (totalText) totalText.innerText = 'Rs. 0.00';
            if (checkoutBtn) checkoutBtn.disabled = true;
            return;
        }
        
        let sum = 0;
        let html = '';
        
        cartItems.forEach(item => {
            sum += item.subtotal;
            html += `
                <div class="d-flex flex-wrap flex-md-nowrap align-items-center gap-4 py-3 mb-3 border-bottom border-secondary">
                    <div class="flex-grow-1">
                        <h4 class="h6 text-white mb-1">${item.productName}</h4>
                        <div class="text-secondary small">Unit Price: Rs. ${item.price.toFixed(2)}</div>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <span class="text-muted small">Quantity:</span>
                        <span class="fw-bold text-white px-2 py-1 rounded" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">${item.quantity}</span>
                    </div>
                    <div class="text-end" style="min-width: 100px;">
                        <div class="fw-semibold text-gradient-gold">Rs. ${item.subtotal.toFixed(2)}</div>
                    </div>
                    <div>
                        <button class="btn btn-outline-danger btn-sm border-0" onclick="deleteCartPageItem(${item.cartItemId})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        card.innerHTML = html;
        if (subtotalText) subtotalText.innerText = `Rs. ${sum.toFixed(2)}`;
        if (totalText) totalText.innerText = `Rs. ${sum.toFixed(2)}`;
        if (checkoutBtn) checkoutBtn.disabled = false;
        
    } catch (e) {
        card.innerHTML = '<div class="alert alert-danger">Error loading cart catalog. Please reload.</div>';
    }
}

async function deleteCartPageItem(cartItemId) {
    try {
        await apiRequest(`/api/cart/${cartItemId}`, 'DELETE');
        showToast('Item deleted from cart', 'success');
        updateCartBadgeCount();
        loadCartPage();
    } catch (e) {
        showToast('Failed to delete item', 'error');
    }
}

function setupCartPageEvents() {
    const checkoutBtn = document.getElementById('cart-page-checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            try {
                checkoutBtn.disabled = true;
                checkoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Authorizing...';
                
                await apiRequest('/api/orders/checkout', 'POST');
                showToast('Order authorized and placed!', 'success');
                updateCartBadgeCount();
                
                setTimeout(() => {
                    window.location.href = 'orders.html';
                }, 1500);
                
            } catch (e) {
                showToast('Failed to checkout. Ensure products are in stock.', 'error');
                checkoutBtn.disabled = false;
                checkoutBtn.innerHTML = 'Authorize Vault Purchase';
            }
        });
    }
}

// Bind to window scope for inline HTML event handlers
window.deleteCartPageItem = deleteCartPageItem;
