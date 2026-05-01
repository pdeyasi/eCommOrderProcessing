const API_BASE_URL = "http://localhost:9000/api";

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

// --- Navigation & UI Logic ---
function switchTab(tabId) {
    // 1. Update Navigation Buttons visually
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    // Handle logo click gracefully
    const activeTabButton = document.getElementById(`tab-${tabId}`);
    if (activeTabButton) activeTabButton.classList.add('active');

    // 2. Hide all views, show targeted view
    document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active'));
    document.getElementById(`view-${tabId}`).classList.add('active');

    // 3. Render specific view data
    if(tabId === 'cart') renderCart();
    if(tabId === 'orders') renderOrders();
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
            <div class="product-image">${p.icon}</div>
            <div class="product-title">${p.name}</div>
            <div class="product-price">$${p.price.toFixed(2)}</div>
            <button class="btn-primary" onclick="addToCart(${p.id})">Add to Cart</button>
        </div>
    `).join('');
}

// --- Cart Logic ---
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    cart.push(product);
    document.getElementById('cart-count').innerText = cart.length;
    showToast(`Added ${product.name} to cart`);
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (cart.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 20px;">Your cart is empty.</p>';
        document.getElementById('cart-total').innerText = '0.00';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        total += item.price;
        return `
            <div class="cart-item">
                <div style="display:flex; align-items:center; gap: 10px;">
                    <span style="font-size:24px;">${item.icon}</span>
                    <strong>${item.name}</strong>
                </div>
                <div>
                    <span style="font-weight:600; color:var(--primary);">$${item.price.toFixed(2)}</span>
                    <button class="btn-outline" style="margin-left: 15px;" onclick="removeFromCart(${index})">Remove</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('cart-total').innerText = total.toFixed(2);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    document.getElementById('cart-count').innerText = cart.length;
    renderCart(); // Re-render the cart UI
}

// --- Order API Logic ---
async function placeOrder(event) {
    event.preventDefault();
    if (cart.length === 0) return showToast("Please add items to your cart first.");

    const payload = {
        name: document.getElementById('name').value,
        address: document.getElementById('address').value,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price, 0)
    };

    showToast("Processing order securely...");

    try {
        // Attempt local API call
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error("API Offline");
    } catch (error) {
        // Fallback Mock Behavior
        const newOrder = {
            id: "ORD-" + Math.floor(1000 + Math.random() * 9000),
            date: new Date().toISOString().split('T')[0],
            total: payload.total,
            status: "processing",
            items: cart.map(i => i.name)
        };
        
        orders.unshift(newOrder); 
        cart = []; // Empty cart
        
        document.getElementById('cart-count').innerText = 0;
        document.getElementById('shipping-form').reset();
        
        showToast(`Order Confirmed! ID: ${newOrder.id}`);
        switchTab('orders'); 
    }
}

function renderOrders() {
    const container = document.getElementById('orders-container');
    if(orders.length === 0) {
        container.innerHTML = "<p>No recent orders found.</p>";
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-item" id="order-box-${order.id}">
            <div>
                <h3 style="margin: 0 0 8px 0; color: var(--primary);">
                    ${order.id} 
                    <span class="status ${order.status}" id="status-${order.id}">${order.status.toUpperCase()}</span>
                </h3>
                <p style="margin: 0; color: var(--text-muted); font-size: 14px;">
                    Placed: ${order.date} • Total: <strong style="color:var(--text-main);">$${order.total.toFixed(2)}</strong>
                </p>
                <p style="margin: 8px 0 0 0; font-size: 14px;">${order.items.join(', ')}</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; min-width: 100px;">
                <button class="btn-info" onclick="trackOrder('${order.id}')">Track</button>
                ${order.status === 'processing' ? `<button class="btn-danger" id="cancel-btn-${order.id}" onclick="cancelOrder('${order.id}')">Cancel</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function trackOrder(orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/track`);
        if (!response.ok) throw new Error("API Offline");
    } catch (error) {
        const order = orders.find(o => o.id === orderId);
        const location = order.status === 'shipped' ? 'In Transit - Out for Delivery' : 'Preparing dispatch at fulfillment center';
        showToast(`Tracking ${orderId}: ${location}`);
    }
}

async function cancelOrder(orderId) {
    if(!confirm(`Are you certain you want to cancel order ${orderId}?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, { method: 'POST' });
        if (!response.ok) throw new Error("API Offline");
    } catch (error) {
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if(orderIndex > -1) {
            orders[orderIndex].status = 'cancelled';
            
            const statusBadge = document.getElementById(`status-${orderId}`);
            statusBadge.className = 'status cancelled';
            statusBadge.innerText = 'CANCELLED';
            
            document.getElementById(`cancel-btn-${orderId}`).remove();
            showToast(`Order ${orderId} cancelled successfully.`);
        }
    }
}

// Initialize
initHome();