const API_BASE_URL = "https://localhost:7019";
//const API_BASE_URL = "https://7fxmddn4-7019.inc1.devtunnels.ms";

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
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let paginationFilters = {
    userId: null,      // For client role
    statusId: null     // For admin role
};

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
                showToast(data.message || "Authentication successful");
                currentUser = data.username;
                currentRole = ROLE_MAP[data.roleId];
                const loggedInUserId = data.id || data.userId;
                
                document.getElementById('main-header').style.display = 'flex';
                applyRoleUI();
                
                // ROUTING LOGIC
                if (currentRole === 'client') {
                    paginationFilters.userId = loggedInUserId;
                    paginationFilters.statusId = null;
                    
                    await initHome(); // Must load products first
                    await loadClientCart(loggedInUserId); // Fills the cart with Status 1
                    
                    currentPage = 1;
                    await renderOrders(1);
                    switchTab('home'); 
                } 
                else if (currentRole === 'admin' || currentRole === 'backend') {
                    paginationFilters.userId = null;
                    paginationFilters.statusId = 2; // Default to Processing (2) instead of Cart (1)
                    
                    currentPage = 1;
                    await renderOrders(1);
                    switchTab('orders'); 
                }
            } else {
                showToast("Registration successful! Please login.");
                toggleAuthMode('login'); 
            }
        } else {
            showToast(isLogin ? "Invalid credentials." : "Error creating account.");
        }
    } catch (error) {
        console.error("Auth error:", error);
        showToast("Network error.");
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
    
    // 1. Reset data in memory
    paginationFilters = { userId: null, statusId: null };
    orders = [];
    cart = [];

    document.getElementById('main-header').style.display = 'none';

    // 2. Clear login forms
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';

    // 3. Clear UI containers (prevents next user from seeing old HTML)
    document.getElementById('orders-container').innerHTML = '';
    document.getElementById('cart-items-container').innerHTML = '';
    document.getElementById('cart-count').innerText = '0';
    document.getElementById('cart-total').innerText = '0.00';

    switchTab('auth');
    showToast("Logged out successfully.");
}

async function initHome() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = "<p>Loading products...</p>";

    try {
        // Triggering the API call to get the JSON result
        const response = await fetch(`${API_BASE_URL}/products`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        products = await response.json(); // Update the products variable with API data
        
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

async function renderOrders(pageNumber = 1) {
    const container = document.getElementById('orders-container');
    container.innerHTML = "<p>Fetching orders...</p>";
    
    try {
        let apiUrl = '';

        if (currentRole === 'client') {
            apiUrl = `${API_BASE_URL}/orders/user/${paginationFilters.userId}?pageNumber=${pageNumber}&pageSize=${pageSize}`;
        } else if (currentRole === 'admin' || currentRole === 'backend') {
            const statusIdToFetch = paginationFilters.statusId || 2; // Default to 2 (Processing)
            
            if (paginationFilters.userId) {
                apiUrl = `${API_BASE_URL}/orders/user/${paginationFilters.userId}?pageNumber=${pageNumber}&pageSize=${pageSize}`;
            } else {
                apiUrl = `${API_BASE_URL}/orders/status/${statusIdToFetch}?pageNumber=${pageNumber}&pageSize=${pageSize}`;
            }

            const statusDropdown = document.getElementById('filter-status-id');
            if (statusDropdown) statusDropdown.value = statusIdToFetch;
        }

        const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ROLE_${currentRole}` } });
        if (!response.ok) throw new Error("API Offline");

        const result = await response.json();
        orders = result.data || result; 
        
        if (result.pageNumber) {
            currentPage = result.pageNumber;
            totalPages = result.totalPages;
            pageSize = result.pageSize;
        }
    } catch (error) {
        console.warn("Order fetch failed:", error);
        orders = [];
    }

    // --- CRITICAL FIX: Hide Status 1 (Cart Items) from the Order View ---
    let displayOrders = orders;
    if (currentRole === 'client') {
        displayOrders = orders.filter(order => order.statusId > 1);
    }

    if (!displayOrders || displayOrders.length === 0) {
        container.innerHTML = "<p>No orders found.</p>";
        renderPaginationControls();
        return;
    }

    container.innerHTML = displayOrders.map(order => {
        let actionControls = '';
        
        if (currentRole === 'client') {
            actionControls = `
                <button class="btn-info" onclick="trackOrder('${order.id}')">Track</button>
                ${order.statusId === 2 ? `<button class="btn-danger" onclick="cancelOrder('${order.id}')">Cancel</button>` : ''}
            `;
        } else if (currentRole === 'admin' || currentRole === 'backend') {
            // Notice how options now start at 2
            actionControls = `
                <select class="admin-status-select" onchange="updateOrderStatus('${order.id}', this.value)">
                    <option value="2" ${order.statusId === 2 ? 'selected' : ''}>Processing</option>
                    <option value="3" ${order.statusId === 3 ? 'selected' : ''}>Shipped</option>
                    <option value="4" ${order.statusId === 4 ? 'selected' : ''}>Delivered</option>
                    <option value="5" ${order.statusId === 5 ? 'selected' : ''}>Cancelled</option>
                </select>
            `;
        }

        return `
            <div class="order-item" id="order-box-${order.id}">
                <div>
                    <h3 style="margin: 0 0 8px 0; color: var(--primary);">
                        Order #${order.id} 
                        <span class="status" id="status-${order.id}">Status ID: ${order.statusId}</span>
                    </h3>
                    <p style="margin: 0; color: var(--text-muted); font-size: 14px;">
                        Placed: ${order.orderedOn || order.addedOn || 'N/A'} | Product ID: ${order.productId}
                    </p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; min-width: 120px;">
                    ${actionControls}
                </div>
            </div>
        `;
    }).join('');

    renderPaginationControls();
}

function renderPaginationControls() {
    const container = document.getElementById('orders-container');
    let paginationHTML = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">
            ${currentPage > 1 ? `<button class="btn-primary" onclick="renderOrders(${currentPage - 1})">← Previous</button>` : ''}
            
            <span style="font-weight: bold; padding: 0 15px;">
                Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong>
            </span>
            
            ${currentPage < totalPages ? `<button class="btn-primary" onclick="renderOrders(${currentPage + 1})">Next →</button>` : ''}
        </div>
    `;
    
    container.innerHTML += paginationHTML;
}

function getCurrentUserId() {
    return paginationFilters.userId;
}

function setStatusFilter(statusId) {
    paginationFilters.statusId = statusId;
    currentPage = 1;
    renderOrders(1);
}

async function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const orderDate = new Date().toISOString();

    const orderPayload = {
        userId: paginationFilters.userId,
        productId: productId,
        statusId: 1,
        lastUpdatedByUserId: paginationFilters.userId,
        lastUpdatedOn: orderDate,
        addedOn: orderDate,
        orderedFor: currentUser,
        deliveryAddress: "" // Will be updated during checkout
    };

    try {
        const response = await fetch(`${API_BASE_URL}/orders/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        if (response.ok) {
            const savedOrder = await response.json();
            // Store the DB Order ID in the local cart object for later removal
            cart.push({ ...product, dbOrderId: savedOrder.order.id });
            document.getElementById('cart-count').innerText = cart.length;
            showToast(`Added ${product.name} to cart and saved to DB`);
        }
    } catch (error) {
        console.error("Failed to sync cart to DB:", error);
        showToast("Error saving to cart.");
    }
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

async function removeFromCart(index) {
    const itemToRemove = cart[index];
    
    try {
        // Trigger API to delete the record from the DB
        const response = await fetch(`${API_BASE_URL}/orders/${itemToRemove.dbOrderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ROLE_${currentRole}` }
        });

        if (response.ok) {
            cart.splice(index, 1);
            document.getElementById('cart-count').innerText = cart.length;
            renderCart();
            showToast("Item removed from cart and database.");
        } else {
            showToast("Failed to remove item from database.");
        }
    } catch (error) {
        console.error("Delete error:", error);
        showToast("Network error while removing item.");
    }
}

async function placeOrder(event) {
    event.preventDefault();

    if (cart.length === 0) {
        showToast("Your cart is empty!");
        return;
    }

    const name = document.getElementById('name').value;
    const address = document.getElementById('address').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const submitBtn = document.getElementById('order-submit-btn');

    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";

    const orderDate = new Date().toISOString();
    let successCount = 0;

    // Iterate through each item in the cart to trigger the API individually
    for (const item of cart) {
        const orderPayload = {
			userId: paginationFilters.userId,
            productId: item.id,
            statusId: (paymentMethod === "COD") ? 2 : 3,
            lastUpdatedByUserId: paginationFilters.userId,
			paymentMode: (paymentMethod === "COD") ? 0 : 1,
            lastUpdatedOn: orderDate,
            orderedFor: name,
            deliveryAddress: `${address} (Payment: ${paymentMethod})`
        };

        try {
            const response = await fetch(`${API_BASE_URL}/orders/${item.dbOrderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });

            if (response.ok) {
                successCount++;
            }
        } catch (error) {
            console.error("Order failed for product:", item.id, error);
        }
    }

    if (successCount === cart.length) {
        showToast(`Successfully placed ${successCount} orders via ${paymentMethod}!`);
        cart = []; // Clear cart
        document.getElementById('cart-count').innerText = '0';
        document.getElementById('shipping-form').reset();
        switchTab('orders'); // Redirect to order history
    } else {
        showToast(`Order partially failed. ${successCount}/${cart.length} items placed.`);
    }

    submitBtn.disabled = false;
    submitBtn.innerText = "Confirm & Place Order";
}

function applyRoleUI() {
    const tabHome = document.getElementById('tab-home');
    const tabCart = document.getElementById('tab-cart');
    const adminFilters = document.getElementById('admin-filters'); // New filter UI

    if (currentRole === 'admin' || currentRole === 'backend') {
        tabHome.style.display = 'none';
        tabCart.style.display = 'none';
        if (adminFilters) adminFilters.style.display = 'flex'; // Show filters
    } else {
        tabHome.style.display = 'block';
        tabCart.style.display = 'flex';
        if (adminFilters) adminFilters.style.display = 'none'; // Hide filters for clients
    }

    if (document.getElementById('view-orders').classList.contains('active')) {
        renderOrders();
    }
}

function applyAdminFilters() {
    const userId = document.getElementById('filter-user-id').value;
    const statusId = document.getElementById('filter-status-id').value;

    paginationFilters.userId = userId ? parseInt(userId) : null;
    paginationFilters.statusId = statusId ? parseInt(statusId) : null;

    currentPage = 1;
    renderOrders(1);
}

function clearAdminFilters() {
    document.getElementById('filter-user-id').value = '';
    document.getElementById('filter-status-id').value = '';

    paginationFilters.userId = null;
    paginationFilters.statusId = null;

    currentPage = 1;
    renderOrders(1);
}

async function loadClientCart(userId) {
    try {
        // Fetch user's items
        const response = await fetch(`${API_BASE_URL}/orders/user/${userId}?pageNumber=1&pageSize=100`, {
            headers: { 'Authorization': `Bearer ROLE_${currentRole}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const allUserItems = result.data || result;
            
            // 1. Filter out only Status 1 items for the Cart
            const cartRecords = allUserItems.filter(order => order.statusId === 1);
            
            // 2. Map the DB records to visual product data
            cart = cartRecords.map(record => {
                const productInfo = products.find(p => p.id === record.productId) || {};
                return {
                    id: productInfo.id || record.productId,
                    name: productInfo.name || `Product #${record.productId}`,
                    price: productInfo.price || 0,
                    icon: productInfo.icon || '📦',
                    dbOrderId: record.id // Keep this so we can delete it from DB if removed
                };
            });
            
            // Update UI badge
            document.getElementById('cart-count').innerText = cart.length;
        }
    } catch (error) {
        console.error("Failed to load cart from DB:", error);
    }
}