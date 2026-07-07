/* orders.js - Order tracking and history */

document.addEventListener('DOMContentLoaded', () => {
    // Force route protection
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    loadOrders();

    const refreshBtn = document.getElementById('refresh-orders-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadOrders();
        });
    }
});

async function loadOrders() {
    const list = document.getElementById('orders-history-list');
    if (!list) return;

    list.innerHTML = `
        <div class="skeleton mb-3" style="height: 110px; width: 100%; border-radius: 12px;"></div>
        <div class="skeleton mb-3" style="height: 110px; width: 100%; border-radius: 12px;"></div>
        <div class="skeleton mb-3" style="height: 110px; width: 100%; border-radius: 12px;"></div>
    `;

    try {
        const orders = await apiRequest('/api/orders/my-orders', 'GET');

        if (!orders || orders.length === 0) {
            list.innerHTML = `
                <div class="text-center py-5 glass-panel" style="border-radius: 16px;">
                    <i class="bi bi-bag-x" style="font-size: 48px; color: var(--text-muted); display: block; margin-bottom: 16px;"></i>
                    <p class="mb-1 text-white fw-bold fs-5">No orders placed yet</p>
                    <p class="small text-secondary mb-4">Your orders will appear here after checkout.</p>
                    <a href="products.html" class="glow-btn px-4">Browse Catalog</a>
                </div>
            `;
            return;
        }

        // Sort orders by date descending (newest first)
        orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

        let html = '';

        orders.forEach((order, index) => {
            const dateStr = new Date(order.orderDate).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            // Status badge config
            const statusConfig = {
                'PENDING':   { cls: 'status-pending',   icon: 'bi-clock',            label: 'Pending' },
                'CONFIRMED': { cls: 'status-confirmed', icon: 'bi-check-circle',     label: 'Confirmed' },
                'SHIPPED':   { cls: 'status-shipped',   icon: 'bi-truck',            label: 'Shipped' },
                'DELIVERED': { cls: 'status-delivered', icon: 'bi-bag-check',        label: 'Delivered' },
                'CANCELLED': { cls: 'status-cancelled', icon: 'bi-x-circle',         label: 'Cancelled' }
            };
            const sc = statusConfig[order.status] || { cls: 'status-pending', icon: 'bi-question-circle', label: order.status };

            // Cancel button
            const canCancel = order.status === 'PENDING';
            const cancelButtonHtml = canCancel
                ? `<button class="btn btn-outline-danger btn-sm px-3 py-1 d-flex align-items-center gap-1" 
                       id="cancel-btn-${order.orderId}"
                       onclick="cancelOrder(event, ${order.orderId})" 
                       style="font-size: 12px; border-radius: 8px;">
                       <i class="bi bi-x-circle"></i> Cancel
                   </button>`
                : '';

            // Build items rows
            let itemsRowsHtml = '';
            order.items.forEach(item => {
                itemsRowsHtml += `
                    <tr>
                        <td class="text-white ps-0">
                            <div class="fw-semibold" style="font-size: 13px;">${item.productName}</div>
                        </td>
                        <td class="text-center">
                            <span style="color: var(--text-secondary); font-size: 13px;">Rs. ${item.price.toFixed(2)}</span>
                        </td>
                        <td class="text-center">
                            <span class="badge bg-dark border border-secondary" style="font-size: 12px;">${item.quantity}</span>
                        </td>
                        <td class="text-end pe-0">
                            <span class="fw-semibold text-gradient-gold" style="font-size: 13px;">Rs. ${item.subtotal.toFixed(2)}</span>
                        </td>
                    </tr>
                `;
            });

            html += `
                <div class="order-card glass-panel" id="order-card-${order.orderId}" style="animation-delay: ${index * 0.06}s;">
                    <!-- Header: Click to expand -->
                    <div class="order-header-ui d-flex flex-wrap align-items-center gap-3"
                         onclick="toggleOrderDetails(${order.orderId})">
                        
                        <!-- Order ID -->
                        <div style="min-width: 110px;">
                            <div class="text-secondary" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">Order</div>
                            <div class="fw-bold text-white" style="font-size: 15px;">#NC-${order.orderId}</div>
                        </div>
                        
                        <!-- Date -->
                        <div style="min-width: 160px;">
                            <div class="text-secondary" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">Placed On</div>
                            <div class="text-white" style="font-size: 13px;">${dateStr}</div>
                        </div>
                        
                        <!-- Items count -->
                        <div style="min-width: 80px;">
                            <div class="text-secondary" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">Items</div>
                            <div class="text-white" style="font-size: 13px;">${order.items.length} product${order.items.length > 1 ? 's' : ''}</div>
                        </div>
                        
                        <!-- Total -->
                        <div style="min-width: 120px;">
                            <div class="text-secondary" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">Total</div>
                            <div class="fw-bold text-gradient-gold" style="font-size: 16px;">Rs. ${order.totalAmount.toFixed(2)}</div>
                        </div>
                        
                        <!-- Status + Cancel -->
                        <div class="d-flex align-items-center gap-3 ms-auto">
                            <span class="badge-status ${sc.cls}">
                                <i class="bi ${sc.icon}"></i>
                                ${sc.label}
                            </span>
                            ${cancelButtonHtml}
                            <i class="bi bi-chevron-down text-secondary order-chevron" id="chevron-${order.orderId}" 
                               style="transition: transform 0.3s ease; font-size: 14px;"></i>
                        </div>
                    </div>
                    
                    <!-- Collapsible body -->
                    <div class="order-body-ui" id="order-details-${order.orderId}" style="display: none;">
                        
                        <!-- Section title -->
                        <div class="d-flex align-items-center gap-2 mb-3">
                            <i class="bi bi-receipt text-gradient-purple" style="font-size: 16px;"></i>
                            <span class="text-secondary fw-semibold" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Ordered Items</span>
                        </div>
                        
                        <!-- Items table -->
                        <div class="table-responsive" style="border-radius: 10px; overflow: hidden; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
                            <table class="table table-order-details m-0">
                                <thead>
                                    <tr>
                                        <th class="ps-3">Product</th>
                                        <th class="text-center">Unit Price</th>
                                        <th class="text-center">Qty</th>
                                        <th class="text-end pe-3">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsRowsHtml}
                                </tbody>
                                <tfoot>
                                    <tr class="order-subtotal-row">
                                        <td colspan="3" class="text-end ps-3">
                                            <span class="text-secondary fw-semibold" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">Grand Total</span>
                                        </td>
                                        <td class="text-end pe-3">
                                            <span class="fw-bold text-gradient-gold" style="font-size: 16px;">Rs. ${order.totalAmount.toFixed(2)}</span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        
                        <!-- Status info row -->
                        <div class="d-flex align-items-center gap-2 mt-3 pt-3" style="border-top: 1px solid rgba(255,255,255,0.04);">
                            <span class="badge-status ${sc.cls}">
                                <i class="bi ${sc.icon}"></i> ${sc.label}
                            </span>
                            <span class="text-secondary small ms-2">
                                ${getStatusMessage(order.status)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;

    } catch (e) {
        list.innerHTML = '<div class="alert alert-danger glass-panel">Failed to retrieve orders. Please ensure the backend server is running.</div>';
    }
}

// Toggle expand/collapse for order details
function toggleOrderDetails(orderId) {
    const body = document.getElementById(`order-details-${orderId}`);
    const chevron = document.getElementById(`chevron-${orderId}`);
    if (!body) return;

    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if (chevron) {
        chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    }
}

// Status descriptions
function getStatusMessage(status) {
    const messages = {
        'PENDING':   'Your order is awaiting confirmation.',
        'CONFIRMED': 'Your order has been confirmed and is being prepared.',
        'SHIPPED':   'Your order is on its way!',
        'DELIVERED': 'Your order has been delivered successfully.',
        'CANCELLED': 'This order was cancelled.'
    };
    return messages[status] || '';
}

async function cancelOrder(event, orderId) {
    // Stop propagation to prevent card toggle
    event.stopPropagation();
    event.preventDefault();

    if (!confirm('Are you sure you want to cancel this order?')) return;

    const cancelBtn = document.getElementById(`cancel-btn-${orderId}`);
    if (cancelBtn) {
        cancelBtn.disabled = true;
        cancelBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    }

    try {
        await apiRequest(`/api/orders/${orderId}/cancel`, 'PUT');
        showToast('Order cancelled successfully!', 'success');
        // Reload orders list to reflect new status
        setTimeout(() => loadOrders(), 500);
    } catch (e) {
        showToast('Failed to cancel order. It may already be shipped or cancelled.', 'error');
        if (cancelBtn) {
            cancelBtn.disabled = false;
            cancelBtn.innerHTML = '<i class="bi bi-x-circle"></i> Cancel';
        }
    }
}

// Bind to window scope for inline HTML handlers
window.cancelOrder = cancelOrder;
window.toggleOrderDetails = toggleOrderDetails;
