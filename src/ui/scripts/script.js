const API_BASE_URL = "https://localhost:7019";

// Map API Role IDs to your UI Role Strings
const ROLE_MAP = {
    0: 'admin',
    1: 'backend',
    2: 'client'
};

let currentRole = null;
let currentUser = null;
let products = [];
let cart = [];
let orders = [];

switchTab('auth');
initHome();

async function handleAuth(event, action) {
    event.preventDefault();
    
    const isLogin = action === 'login';
    const username = document.getElementById(`${action}-username`).value;
    const password = document.getElementById(`${action}-password`).value;
    const endpoint = isLogin ? '/users/authenticate' : '/users/add';

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            
            if (isLogin) {
                // Successful Login
                showToast(data.message || "Authentication successful");
                currentUser = data.username;
                currentRole = ROLE_MAP[data.roleId];
                
                // Show navigation header
                document.getElementById('main-header').style.display = 'flex';
                
                // Configure UI & Redirect based on role
                applyRoleUI();
                if (currentRole === 'client') {
                    initHome(); // Load products
                    switchTab('home');
                } else {
                    switchTab('orders'); // Admins/Backend go straight to orders
                }
            } else {
                // Successful Registration
                showToast("Registration successful! Please login.");
                toggleAuthMode('login'); // Switch back to login panel
            }
        } else {
            showToast(isLogin ? "Invalid credentials." : "Error creating account.");
        }
    } catch (error) {
        console.error("Auth error:", error);
        showToast("Network error: Cannot reach authentication server.");
    }
}

function toggleAuthMode(mode) {
    if (mode === 'login') {
        document.getElementById('login-panel').style.display = 'block';
        document.getElementById('register-panel').style.display = 'none';
    } else {
        document.getElementById('login-panel').style.display = 'none';
        document.getElementById('register-panel').style.display = 'block';
    }
}

function logout() {
    currentRole = null;
    currentUser = null;
    document.getElementById('main-header').style.display = 'none';
    
    // Clear forms
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    switchTab('auth');
    showToast("Logged out successfully.");
}

function applyRoleUI() {
    const tabHome = document.getElementById('tab-home');
    const tabCart = document.getElementById('tab-cart');
    
    if (currentRole === 'admin' || currentRole === 'backend') {
        tabHome.style.display = 'none';
        tabCart.style.display = 'none';
    } else {
        tabHome.style.display = 'block';
        tabCart.style.display = 'flex';
    }
    
    if (document.getElementById('view-orders').classList.contains('active')) {
        renderOrders();
    }
}

async function initHome() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = "<p>Loading products...</p>";

    try {
        // Triggering the API call to get the JSON result[cite: 1]
        const response = await fetch(`${API_BASE_URL}/products`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        products = await response.json(); // Update the products variable with API data[cite: 1]
        
        if (products.length === 0) {
            grid.innerHTML = "<p>No products available at the moment.</p>";
            return;
        }

        renderProductGrid();
    } catch (error) {
        console.error("Failed to fetch products:", error);
        grid.innerHTML = "<p style='color: var(--danger);'>Error loading products. Please ensure the API is running at https://localhost:7019</p>";
    }
}

function renderProductGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-image" style="font-size: 40px; display:flex; justify-content:center; align-items:center;">
                ${p.icon || '📦'} 
            </div>
            <div class="product-title">${p.name}</div>
            <div class="product-price">$${p.price.toFixed(2)}</div>
            <button class="btn-primary" onclick="addToCart(${p.id})">Add to Cart</button>
        </div>
    `).join('');
}

function simulateRoleLogin(role) {
    currentRole = role;
    applyRoleUI();
    // Redirect staff away from the shopping front-end
    if (currentRole !== 'client') switchTab('orders');
    else switchTab('home');
}

function applyRoleUI() {
    const tabHome = document.getElementById('tab-home');
    const tabCart = document.getElementById('tab-cart');
    
    if (currentRole === 'admin' || currentRole === 'backend') {
        tabHome.style.display = 'none';
        tabCart.style.display = 'none';
    } else {
        tabHome.style.display = 'block';
        tabCart.style.display = 'flex';
    }

    if (document.getElementById('view-orders').classList.contains('active')) {
        renderOrders();
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const activeTabButton = document.getElementById(`tab-${tabId}`);
    if (activeTabButton) activeTabButton.classList.add('active');

    document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active'));
    document.getElementById(`view-${tabId}`).classList.add('active');

    if (tabId === 'cart') renderCart();
    if (tabId === 'orders') renderOrders(); 
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

async function renderOrders() {
    const container = document.getElementById('orders-container');
    container.innerHTML = "<p>Fetching orders...</p>";

    try {
        // Fetch details from localhost API based on role authorization
        const response = await fetch(`${API_BASE_URL}/orders`, {
            headers: { 'Authorization': `Bearer ROLE_${currentRole}` } // Example Auth header
        });
        if (!response.ok) throw new Error("API Offline");
        orders = await response.json();
    } catch (error) {
        console.warn("API Offline: Using mock order data.");
    }

    if (orders.length === 0) {
        container.innerHTML = "<p>No recent orders found.</p>";
        return;
    }

    container.innerHTML = orders.map(order => {
        let actionControls = '';

        // Render controls dynamically based on the current role
        if (currentRole === 'client') {
            actionControls = `
                <button class="btn-info" onclick="trackOrder('${order.id}')">Track</button>
                ${order.status === 'processing' ? `<button class="btn-danger" id="cancel-btn-${order.id}" onclick="cancelOrder('${order.id}')">Cancel</button>` : ''}
            `;
        } else if (currentRole === 'admin') {
            actionControls = `
                <select class="admin-status-select" onchange="updateOrderStatus('${order.id}', this.value)">
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            `;
        } else if (currentRole === 'backend') {
            actionControls = `<span style="color: var(--text-muted); font-size: 12px; border: 1px dashed var(--border); padding: 5px;">Read Only View</span>`;
        }

        return `
            <div class="order-item" id="order-box-${order.id}">
                <div>
                    <h3 style="margin: 0 0 8px 0; color: var(--primary);">
                        ${order.id} 
                        <span class="status ${order.status}" id="status-${order.id}">${order.status.toUpperCase()}</span>
                    </h3>
                    <p style="margin: 0; color: var(--text-muted); font-size: 14px;">
                        Placed: ${order.date}   Total: <strong style="color:var(--text-main);">$${order.total.toFixed(2)}</strong>
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 14px;">${order.items.join(', ')}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; min-width: 120px;">
                    ${actionControls}
                </div>
            </div>
        `;
    }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) throw new Error("API Offline");
        showToast(`Order ${orderId} updated to ${newStatus}`);
    } catch (error) {
        // Fallback for UI testing without API
        showToast(`Mock: Order ${orderId} updated to ${newStatus}`);
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if(orderIndex > -1) orders[orderIndex].status = newStatus;
    }
    
    // Visually update the status badge
    const statusBadge = document.getElementById(`status-${orderId}`);
    if (statusBadge) {
        statusBadge.className = `status ${newStatus}`;
        statusBadge.innerText = newStatus.toUpperCase();
    }
}