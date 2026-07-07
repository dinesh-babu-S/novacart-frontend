/* app.js - Shared UI Elements, Global Header, Cart Drawer & Toast System */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Render Header Navbar
    renderNavbar();
    
    // 2. Setup Sticky Navbar effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar-elite');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });

    // 3. Create Cart Drawer and Overlay in DOM
    createCartDrawerMarkup();

    // 4. Initialize Cart Drawer Actions if user is Customer
    if (isLoggedIn() && isCustomer()) {
        updateCartBadgeCount();
        setupCartDrawerEvents();
    } else {
        // Hide cart button or redirect guests to login when they click cart
        const cartBtn = document.getElementById('cart-drawer-trigger');
        if (cartBtn) {
            cartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!isLoggedIn()) {
                    showToast('Please login to access your cart', 'warning');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                } else if (isAdmin()) {
                    showToast('Admin accounts do not have shopping carts', 'warning');
                }
            });
        }
    }
}

// Toast notification function
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container-elite');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container-elite';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-elite toast-${type}`;
    
    let iconClass = 'bi-check-circle-fill';
    if (type === 'error') iconClass = 'bi-exclamation-triangle-fill';
    if (type === 'warning') iconClass = 'bi-exclamation-circle-fill';
    
    toast.innerHTML = `
        <i class="bi ${iconClass} toast-icon"></i>
        <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Fade out and remove toast after 3 seconds
    setTimeout(() => {
        toast.style.transition = 'all 0.5s ease-in-out';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}

// Render dynamic premium navbar
function renderNavbar() {
    const headerContainer = document.getElementById('header-navbar');
    if (!headerContainer) return;
    
    const activeUser = getLoggedInUser();
    const isLogged = isLoggedIn();
    const userIsAdmin = isAdmin();
    const userIsCustomer = isCustomer();
    
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    
    let navLinksHtml = '';
    
    if (isLogged && userIsAdmin) {
        // Admins only need the Dashboard link, no Home or Catalog
        navLinksHtml = `
            <li class="nav-item">
                <a class="nav-link nav-link-elite ${currentFile === 'admin.html' ? 'active' : ''}" href="admin.html">Dashboard</a>
            </li>
        `;
    } else {
        // Customers and Guest users see Home and Catalog
        navLinksHtml = `
            <li class="nav-item">
                <a class="nav-link nav-link-elite ${currentFile === 'index.html' || currentFile === '' ? 'active' : ''}" href="index.html">Home</a>
            </li>
            <li class="nav-item">
                <a class="nav-link nav-link-elite ${currentFile === 'products.html' ? 'active' : ''}" href="products.html">Catalog</a>
            </li>
        `;
        
        if (isLogged && userIsCustomer) {
            navLinksHtml += `
                <li class="nav-item">
                    <a class="nav-link nav-link-elite ${currentFile === 'orders.html' ? 'active' : ''}" href="orders.html">My Orders</a>
                </li>
            `;
        }
    }
    
    let authSectionHtml = '';
    if (isLogged) {
        authSectionHtml = `
            <div class="dropdown">
                <button class="glow-btn-outline dropdown-toggle d-flex align-items-center gap-2" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-person-circle"></i>
                    <span>${activeUser.username}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end dropdown-menu-dark glass-panel mt-2" aria-labelledby="userMenuButton" style="border: 1px solid rgba(255,255,255,0.08); background: rgba(13, 13, 24, 0.95);">
                    <li class="px-3 py-2 text-muted small border-bottom border-secondary mb-1">
                        Role: <strong>${activeUser.role}</strong>
                    </li>
                    <li><hr class="dropdown-divider border-secondary"></li>
                    <li>
                        <a class="dropdown-item text-danger d-flex align-items-center gap-2" href="#" onclick="logout(); return false;">
                            <i class="bi bi-box-arrow-right"></i> Logout
                        </a>
                    </li>
                </ul>
            </div>
        `;
    } else {
        authSectionHtml = `
            <a href="login.html" class="glow-btn">Login</a>
        `;
    }
    
    // Render Cart Icon only if not Admin
    const showCartIcon = !isLogged || !userIsAdmin;
    const cartButtonHtml = showCartIcon ? `
        <button class="position-relative bg-transparent border-0 text-white p-2 me-3" id="cart-drawer-trigger">
            <i class="bi bi-bag-dash" style="font-size: 22px;"></i>
            <span class="badge-cart d-none" id="cart-badge-count">0</span>
        </button>
    ` : '';
    
    headerContainer.innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark navbar-elite fixed-top">
            <div class="container">
                <a class="navbar-brand navbar-brand-elite" href="index.html">
                    <i class="bi bi-hexagon-fill"></i> NovaCart
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent" aria-controls="navbarContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarContent">
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0 gap-1">
                        ${navLinksHtml}
                    </ul>
                    <div class="d-flex align-items-center">
                        ${cartButtonHtml}
                        ${authSectionHtml}
                    </div>
                </div>
            </div>
        </nav>
    `;
}

// Generate the markup for the slide-out cart drawer
function createCartDrawerMarkup() {
    // Check if drawer already exists
    if (document.getElementById('cart-side-drawer')) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'cart-overlay';
    overlay.id = 'cart-side-overlay';
    
    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.id = 'cart-side-drawer';
    drawer.innerHTML = `
        <div class="cart-drawer-header">
            <h5 class="m-0"><i class="bi bi-bag-dash text-gradient-purple me-2"></i>Shopping Cart</h5>
            <button class="bg-transparent border-0 text-white" id="cart-drawer-close" style="font-size: 24px;">
                <i class="bi bi-x"></i>
            </button>
        </div>
        <div class="cart-drawer-body" id="cart-drawer-items-list">
            <!-- Items loaded dynamically -->
        </div>
        <div class="cart-drawer-footer">
            <div class="d-flex justify-content-between mb-4">
                <span class="text-secondary">Subtotal</span>
                <span class="h5 text-gradient-gold m-0" id="cart-drawer-subtotal">Rs. 0.00</span>
            </div>
            <button class="glow-btn w-100 py-3" id="cart-drawer-checkout-btn">Proceed to Checkout</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
}

// Setup opening, closing, and updating cart drawer list
function setupCartDrawerEvents() {
    const trigger = document.getElementById('cart-drawer-trigger');
    const closeBtn = document.getElementById('cart-drawer-close');
    const overlay = document.getElementById('cart-side-overlay');
    const drawer = document.getElementById('cart-side-drawer');
    const checkoutBtn = document.getElementById('cart-drawer-checkout-btn');
    
    if (trigger && drawer && overlay && closeBtn) {
        trigger.addEventListener('click', () => {
            drawer.classList.add('open');
            overlay.classList.add('open');
            loadCartItems();
        });
        
        const closeCart = () => {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
        };
        
        closeBtn.addEventListener('click', closeCart);
        overlay.addEventListener('click', closeCart);
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            try {
                checkoutBtn.disabled = true;
                checkoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Placing Order...';
                
                await apiRequest('/api/orders/checkout', 'POST');
                
                showToast('Order placed successfully!', 'success');
                updateCartBadgeCount();
                
                // Clear the drawer UI
                document.getElementById('cart-side-drawer').classList.remove('open');
                document.getElementById('cart-side-overlay').classList.remove('open');
                
                setTimeout(() => {
                    window.location.href = 'orders.html';
                }, 1000);
                
            } catch (error) {
                showToast('Failed to checkout. Ensure cart has items and stock is available.', 'error');
                checkoutBtn.disabled = false;
                checkoutBtn.innerHTML = 'Proceed to Checkout';
            }
        });
    }
}

// Load cart items from API
async function loadCartItems() {
    const container = document.getElementById('cart-drawer-items-list');
    const subtotalText = document.getElementById('cart-drawer-subtotal');
    const checkoutBtn = document.getElementById('cart-drawer-checkout-btn');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="d-flex justify-content-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
        </div>
    `;
    
    try {
        const cartItems = await apiRequest('/api/cart', 'GET');
        
        if (!cartItems || cartItems.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-cart-x style="font-size: 40px; display: block;" class="mb-3 text-secondary"></i>
                    <p class="mb-0">Your cart is empty</p>
                </div>
            `;
            subtotalText.innerText = 'Rs. 0.00';
            if (checkoutBtn) checkoutBtn.disabled = true;
            return;
        }
        
        let subtotalSum = 0;
        let html = '';
        
        cartItems.forEach(item => {
            subtotalSum += item.subtotal;
            html += `
                <div class="cart-item-ui">
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.productName}</div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="cart-item-price">Rs. ${item.price.toFixed(2)}</span>
                            <div class="d-flex align-items-center gap-2">
                                <span class="small text-secondary">Qty:</span>
                                <span class="fw-bold">${item.quantity}</span>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <span class="small text-muted">Subtotal: Rs. ${item.subtotal.toFixed(2)}</span>
                            <button class="bg-transparent border-0 text-danger p-0 small" onclick="deleteCartItem(${item.cartItemId})">
                                <i class="bi bi-trash me-1"></i> Remove
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        subtotalText.innerText = `Rs. ${subtotalSum.toFixed(2)}`;
        if (checkoutBtn) checkoutBtn.disabled = false;
        
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger py-2">Error loading cart items</div>`;
    }
}

// Delete item helper
async function deleteCartItem(cartItemId) {
    try {
        await apiRequest(`/api/cart/${cartItemId}`, 'DELETE');
        showToast('Item removed from cart', 'success');
        updateCartBadgeCount();
        loadCartItems();
    } catch (e) {
        showToast('Failed to remove item', 'error');
    }
}

// Update the floating cart count badge
async function updateCartBadgeCount() {
    const badge = document.getElementById('cart-badge-count');
    if (!badge) return;
    
    try {
        const cartItems = await apiRequest('/api/cart', 'GET');
        const count = cartItems ? cartItems.length : 0;
        
        if (count > 0) {
            badge.innerText = count;
            badge.classList.remove('d-none');
            
            // Add bounce animation
            badge.classList.add('bounce');
            setTimeout(() => {
                badge.classList.remove('bounce');
            }, 300);
        } else {
            badge.classList.add('d-none');
        }
    } catch (error) {
        console.error('Error fetching cart item count:', error);
    }
}
