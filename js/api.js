/* api.js - Central API Service for NovaCart */
const API_BASE = 'https://novacart-backend-f61m.onrender.com';

function getToken() {
    return localStorage.getItem('nova_token');
}

async function apiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = {};
    const token = getToken();
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    
    const options = {
        method,
        headers
    };
    
    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        
        if (response.status === 401) {
            // Unauthorized - clear token and redirect to login page
            localStorage.removeItem('nova_token');
            // Avoid redirect loops if we are already on login or register pages
            const currentPath = window.location.pathname;
            if (!currentPath.includes('login.html') && !currentPath.includes('register.html')) {
                window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            }
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            let errorMsg = 'Product was not available.';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errObj = await response.json();
                    errorMsg = errObj.message || errObj.error || errorMsg;
                } else {
                    const text = await response.text();
                    errorMsg = text || errorMsg;
                }
            } catch (e) {
                // Keep default
            }
            throw new Error(errorMsg);
        }
        
        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        // Return raw text (e.g. JWT token from login endpoint)
        return await response.text();
        
    } catch (error) {
        console.error(`API Error on ${method} ${endpoint}:`, error);
        throw error;
    }
}

// Global Image URL Resolver
function getProductImageUrl(imageUrl) {
    const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60';
    if (!imageUrl) return defaultImg;
    
    // Clean up any whitespace or surrounding quotes from raw text responses
    let url = String(imageUrl).trim().replace(/^"|"$/g, '');
    
    if (!url || url === 'null' || url === 'undefined') return defaultImg;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return `${API_BASE}${url}`;
    if (url.startsWith('uploads/')) return `${API_BASE}/${url}`;
    // fallback: assume it's just a filename
    return `${API_BASE}/uploads/${url}`;
}

window.getProductImageUrl = getProductImageUrl;
