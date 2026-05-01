const API_BASE_URL = "http://localhost:9000/api";
let currentRole = 'client'; // Initial role

// --- Data State --- 
const products = [
    { id: 101, name: "Sony WH-1000XM5 Headphones", price: 348.00, icon: "🎧" },
    { id: 102, name: "Apple Watch Ultra 2", price: 799.00, icon: "⌚" },
    { id: 103, name: "JBL Flip 6 Portable Speaker", price: 99.95, icon: "🔊" },
    { id: 104, name: "Logitech MX Master 3S Mouse", price: 99.99, icon: "🖱️" },
    { id: 105, name: "Samsung 32\" 4K UHD Monitor", price: 349.00, icon: "🖥️" },
    { id: 106, name: "Keychron K2 Mechanical Keyboard", price: 89.00, icon: "⌨️" },
    { id: 107, name: "GoPro HERO12 Black", price: 399.00, icon: "📷" },
    { id: 108, name: "Anker 737 Power Bank", price: 149.99, icon: "🔋" }
];
let cart = [];
let orders = [
    { id: "ORD-9821", date: "2023-10-25", total: 799.00, status: "shipped", items: ["Apple Watch Ultra 2"] }
];

// --- Role Management Logic ---
async function fetchUserSession() {
    // Fetches the role from your localhost API on load
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`);
        if (response.ok) {
            const data = await response.json();
            currentRole = data.role; // e.g., 'client', 'admin', 'backend'
            document.getElementById('role-sim').value = currentRole;
        }
    } catch (e) {
        console.warn("API Offline: Using mock role context.");
    }
    applyRoleUI();
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

// --- Navigation & UI Logic --- 
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

// --- Home / Product Logic --- 
function initHome() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-image" style="font-size: 40px; display:flex; justify-content:center; align-items:center;">${p.icon}</div>
            <div class="product-title">${p.name}</div>
            <div class="product-price">$${p.price.toFixed(2)}</div>
            <button class="btn-primary" onclick="addToCart(${p.id})">Add to Cart</button>
        </div>
    `).join('');
}

// [Keep your existing cart logic functions here: addToCart, renderCart, removeFromCart, placeOrder]

// --- Order & API Logic --- 
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
        // Edited by localhost api
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

// [Keep trackOrder and cancelOrder here unchanged]

// Initialize
initHome();
fetchUserSession();