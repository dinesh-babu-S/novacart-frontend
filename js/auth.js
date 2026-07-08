/* auth.js - Authentication & Authorization Utilities for NovaCart */

function getDecodedToken() {
    const token = localStorage.getItem('nova_token');
    if (!token) return null;
    
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
}

function isLoggedIn() {
    const tokenPayload = getDecodedToken();
    if (!tokenPayload) return false;
    
    // Check expiration (exp is in seconds)
    const currentTime = Math.floor(Date.now() / 1000);
    if (tokenPayload.exp < currentTime) {
        logout();
        return false;
    }
    
    return true;
}

function getLoggedInUser() {
    const tokenPayload = getDecodedToken();
    if (!tokenPayload) return null;
    return {
        id: tokenPayload.id,
        username: tokenPayload.username || 'User',
        email: tokenPayload.sub,
        role: tokenPayload.role // 'ADMIN' or 'CUSTOMER'
    };
}

function getUserRole() {
    const user = getLoggedInUser();
    return user ? user.role : null;
}

function isAdmin() {
    return getUserRole() === 'ADMIN';
}

function isCustomer() {
    return getUserRole() === 'CUSTOMER';
}

function logout() {
    localStorage.removeItem('nova_token');
    window.location.href = 'index.html';
}

// Guard routes based on access roles
function runRouteGuards() {
    const currentPath = window.location.pathname.toLowerCase();
    
    if (currentPath.includes('admin.html')) {
        if (!isLoggedIn() || !isAdmin()) {
            window.location.href = 'index.html';
        }
    } else if (currentPath.includes('orders.html')) {
        if (!isLoggedIn()) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }
    } else if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
        if (isLoggedIn()) {
            window.location.href = 'index.html';
        }
    }
}

// Execute route guards immediately when script is imported
runRouteGuards();
