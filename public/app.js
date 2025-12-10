// ===============================================
// CONFIGURACIÓN GLOBAL
// ===============================================
const API_BASE_URL = 'http://localhost:3000/api';
const SHIPPING_COST = 3500;
const LS_TOKEN_KEY = 'ecomarket_jwt_token';
const LS_CART_KEY = 'ecomarket_cart';
const LS_PROFILE_KEY = 'ecomarket_profile';
const LS_PRODUCT_ID_KEY = 'ecomarket_product_id';

// ===============================================
// UTILIDADES
// ===============================================
function showModal(message, title = 'Mensaje') {
    const modalEl = document.getElementById('messageModal');
    const modalMessage = document.getElementById('modalMessageText');
    const modalTitle = document.getElementById('messageModalTitle');

    if (!modalEl || !modalMessage || !modalTitle) {
        console.warn("showModal: el modal no está en el DOM");
        alert(`${title}\n\n${message}`); // fallback simple
        return;
    }

    modalMessage.textContent = message;
    modalTitle.textContent = title;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function formatCurrency(amount) {
    if (typeof amount !== 'number') return '$ 0';
    return amount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function navigateTo(url) { window.location.href = url; }
function getToken() { return localStorage.getItem(LS_TOKEN_KEY); }
function setToken(token) { localStorage.setItem(LS_TOKEN_KEY, token); }
function clearToken() { localStorage.removeItem(LS_TOKEN_KEY); }

function decodeToken() {
    const token = getToken();
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
    } catch(e) { console.error("Error al decodificar token:", e); return null; }
}

function checkAuthAndRedirect(requiredRole = 'any') {
    const token = getToken();
    const payload = decodeToken();
    const path = window.location.pathname;

    if (path.includes('login.html') || path.includes('registro.html')) {
        if (token && payload) navigateTo(payload.role === 'admin' ? 'admin_dashboard.html' : 'catalogo.html');
        return;
    }

    if (!token || !payload) {
        clearToken();
        showModal('Debes iniciar sesión.', 'Acceso Denegado');
        setTimeout(() => navigateTo('login.html'), 1500);
        return;
    }

    if (requiredRole !== 'any' && payload.role !== requiredRole) {
        showModal('No tienes permisos para esta sección.', 'Acceso Denegado');
        setTimeout(() => navigateTo(payload.role === 'admin' ? 'admin_dashboard.html' : 'catalogo.html'), 1500);
    }

    const nameElements = document.querySelectorAll('.user-display-name');
    nameElements.forEach(el => el.textContent = payload.name || payload.email);
}

function logout() {
    clearToken();
    localStorage.removeItem(LS_CART_KEY);
    localStorage.removeItem(LS_PROFILE_KEY);
    localStorage.removeItem(LS_PRODUCT_ID_KEY);
    navigateTo('login.html');
}

// ===============================================
// FUNCION GENÉRICA PARA LLAMADAS A LA API
// ===============================================
async function callApi(endpoint, options = {}) {
    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    const fetchOptions = {
        method: options.method || "GET",
        headers,
    };

    if (options.body) {
        fetchOptions.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

        // primero chequeo status 401
        if (response.status === 401) {
            clearToken();
            showModal("Sesión expirada. Inicia sesión nuevamente.", "Autenticación");
            setTimeout(() => navigateTo("login.html"), 1500);
            return Promise.reject(new Error("Sesión expirada"));
        }

        // parseo seguro
        let data;
        const text = await response.text();
        try { data = JSON.parse(text); } 
        catch { data = text; }

        if (!response.ok) {
            throw new Error(data.message || `Error en la API (${response.status})`);
        }

        return data;

    } catch (error) {
        console.error("Error en callApi:", error);
        showModal(error.message || "Error desconocido en la API", "Error");
        throw error;
    }
}

// ===============================================
// LOGIN
// ===============================================
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    if (!form.checkValidity()) { 
        showModal("Completa los campos correctamente.", "Error de Login"); 
        return; 
    }

    const email = form['input-email'].value.trim();
    const password = form['input-password'].value;

    console.log("Intentando login con:", { email, password }); // <--- DEBUG

    try {
        const data = await callApi('/auth/login', { method:'POST', body:{email,password} });
        console.log("Respuesta API login:", data); // <--- DEBUG
        setToken(data.token);
        const payload = decodeToken();
        showModal(`¡Bienvenido, ${payload.name || payload.email}!`, 'Login Exitoso');
        setTimeout(() => navigateTo(payload.role==='admin'?'admin_dashboard.html':'perfil.html'), 1000);
    } catch(error) { 
        console.error("Error en handleLogin:", error);
        showModal(error.message || "Error desconocido", "Error Login"); 
    }
}


// ===============================================
// REGISTRO
// ===============================================
async function handleRegistration(event) {
    event.preventDefault();
    const form = event.target;
    if (!form.checkValidity()) { showModal("Completa los campos correctamente.", "Error de Registro"); return; }

    const userData = {
        name: form['input-name'].value,
        email: form['input-email'].value,
        phone: form['input-phone'].value,
        sex: form['input-sex'].value,
        password: form['password'].value,
        address: form['input-address'].value,
        run: form['run'].value,
        fechaNacimiento: form['fechaNacimiento'].value,
        role: 'client'
    };

    try {
        await callApi('/auth/register', { method:'POST', body:userData });
        showModal('Registro exitoso. Inicia sesión ahora.', 'Registro Completo');
        form.reset();
        setTimeout(()=>navigateTo('login.html'), 1500);
    } catch(error) { showModal(error.message || "Error desconocido", "Error Registro"); }
}

// ===============================================
// REGISTRAR LISTENERS DE FORMULARIOS
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.id === 'login-page') {
        document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    }
    if (document.body.id === 'registro-page') {
        document.getElementById('register-form')?.addEventListener('submit', handleRegistration);
    }
});

// ===============================================
// CATALOGO / PROMOCIONES (CLIENTE)
// ===============================================

// Estado
let currentPage = 1;
const productsPerPage = 9;

// -----------------------------------------------
// APLICAR FILTROS (cliente)
// -----------------------------------------------
function applyFilters(isPromo = false, page = 1) {
    currentPage = page;

    let category = document.getElementById('selected-category')?.value || 'all';
    let search   = document.getElementById('searchText')?.value || '';
    let sort     = 'default'; // catálogo cliente NO usa sort por ahora

    fetchProducts(page, productsPerPage, category, search, sort, isPromo);
}

// -----------------------------------------------
// FETCH de productos (cliente)
// -----------------------------------------------
async function fetchProducts(page, limit, category, search, sort, isPromo) {

    const containerId = 'product-list-container';
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
        </div>`;

    const categoryQuery = category !== 'all' ? `&category=${category}` : '';
    const searchQuery   = search ? `&search=${search}` : '';
    const promoQuery    = isPromo ? `&promotion=true` : '';

    try {
        const data = await callApi(
            `/products?page=${page}&limit=${limit}${categoryQuery}${searchQuery}${promoQuery}`
        );

        renderProductsCliente(
            data.products,
            containerId
        );

        setupPagination(
            data.totalPages,
            data.page,
            (newPage) => applyFilters(isPromo, newPage)
        );

    } catch (err) {
        container.innerHTML = `
            <div class="col-12 text-center text-danger py-5">
                Error al cargar productos
            </div>`;
    }
}

// ===============================================
// CONFIGURACIÓN DE FILTROS (Catálogo / Promociones)
// ===============================================

function setupFilters(isPromo = false) {
    const filterForm = document.getElementById('filter-form');
    const categoryDropdownItems = document.querySelectorAll('.dropdown-item[data-category]');
    const categoryInput = document.getElementById('selected-category');
    const categoryBtn = document.getElementById('category-dropdown-btn');

    // Manejar selección de categoría
    categoryDropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const category = item.getAttribute('data-category');
            if (!categoryInput || !categoryBtn) return;
            categoryInput.value = category;
            categoryBtn.textContent = item.textContent;
        });
    });

    // Manejar envío del formulario
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFilters(isPromo, 1);
        });
    }

    // Botón tipo "button" (en promociones)
    const applyBtn = filterForm?.querySelector('button[type="button"]');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            applyFilters(isPromo, 1);
        });
    }
}

// -----------------------------------------------
// Inicialización del catálogo
// -----------------------------------------------
function setupCatalogPage() {
    setupFilters(false); // No es promo
    applyFilters(false, 1);
}

// -----------------------------------------------
// Inicialización de promociones
// -----------------------------------------------
function setupPromocionesPage() {
    setupFilters(true); // Es promo
    applyFilters(true, 1);
}

// -----------------------------------------------
// RENDER productos CATÁLOGO / PROMOCIONES
// -----------------------------------------------
function renderProductsCliente(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-4">
                <p class="text-muted">No hay productos disponibles.</p>
            </div>`;
        return;
    }

    container.innerHTML = ''; // limpiar contenido previo

    products.forEach(product => {
        const img = product.imgUrl?.startsWith('http')
            ? product.imgUrl
            : `${API_BASE_URL.replace('/api', '')}${product.imgUrl}`;

        const finalPrice = product.discount 
            ? (product.price * (1 - product.discount / 100)).toFixed(2) 
            : product.price.toFixed(2);

        // Crear la tarjeta del producto
        const cardCol = document.createElement('div');
        cardCol.className = 'col-md-3 col-sm-6 mb-4';

        cardCol.innerHTML = `
            <div class="card h-100 shadow-sm">
                <img src="${img}" class="card-img-top" style="height:180px; object-fit:cover;">
                <div class="card-body">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="card-text">${product.desc}</p>
                    <p class="fw-bold">$${finalPrice}</p>
                </div>
                <div class="card-footer text-center"></div>
            </div>`;

        // Crear botón dinámicamente
        const button = document.createElement('button');
        button.className = 'btn btn-primary btn-sm';
        button.textContent = 'Agregar';
        button.addEventListener('click', () => {
            addToCart(product._id, product.name, finalPrice, product.imgUrl, 1);
        });

        // Agregar botón al footer de la tarjeta
        cardCol.querySelector('.card-footer').appendChild(button);

        // Agregar tarjeta al contenedor
        container.appendChild(cardCol);
    });
}

// -----------------------------------------------
// Paginación (cliente)
// -----------------------------------------------
function setupPagination(totalPages, currentPage, callback) {
    const menu = document.getElementById('pagination-menu');
    if (!menu) return;

    menu.innerHTML = '';
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;

        const a = document.createElement('a');
        a.href = '#';
        a.className = 'page-link';
        a.textContent = i;

        a.addEventListener('click', (e) => {
            e.preventDefault();
            callback(i); // ✅ Mantiene el contexto correcto
        });

        li.appendChild(a);
        menu.appendChild(li);
    }
}

// -----------------------------------------------
// Detectar página actual
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

    if (document.body.id === 'catalogue-page') {
        setupCatalogPage();
    }

    if (document.body.id === 'promotions-page') {
        setupPromocionesPage();
    }
});

// ===============================================
// CARRITO
// ===============================================
function getCart() {
    try {
        return JSON.parse(localStorage.getItem(LS_CART_KEY)) || [];
    } catch (e) {
        console.error("Error al obtener carrito:", e);
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(LS_CART_KEY, JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('#cart-counter, #offcanvas-cart-counter').forEach(el => {
        el.textContent = totalItems;
        if (totalItems > 0) el.classList.remove('d-none');
        else el.classList.add('d-none');
    });

    // Solo calcular totales si estamos en la página de carrito
    if (document.getElementById('subtotal-products')) {
        calculateTotals();
    }
}

function addToCart(productId, name, price, imgUrl, quantity = 1) {
    let cart = getCart();
    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ productId, name, price, imgUrl, quantity });
    }

    saveCart(cart);
    showModal(`${name} ha sido agregado al carrito. Cantidad: ${quantity}.`, 'Producto Agregado');
}

function changeQuantity(productId, delta) {
    let cart = getCart();
    const itemIndex = cart.findIndex(item => item.productId === productId);

    if (itemIndex > -1) {
        cart[itemIndex].quantity += delta;
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        saveCart(cart);
        if (document.body.id === 'cart-page') renderCart();
    }
}

function removeItemFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.productId !== productId);
    saveCart(cart);
    if (document.body.id === 'cart-page') renderCart();
}

// ===============================================
// RENDER DEL CARRITO
// ===============================================
function setupCartPage() {
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-list'); // 🔹 corregido desde 'cart-items-container'
    const emptyMessage = document.getElementById('empty-cart-message');
    const cart = getCart();

    container.innerHTML = '';
    if (cart.length === 0) {
        emptyMessage.classList.remove('d-none');
        document.querySelector('.col-lg-4')?.classList.add('d-none');
    } else {
        emptyMessage.classList.add('d-none');
        document.querySelector('.col-lg-4')?.classList.remove('d-none');

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            const itemHtml = `
                <div class="product-item d-flex align-items-center mb-3">
                    <img src="${item.imgUrl}" alt="${item.name}" class="rounded me-3" style="width:70px;height:70px;object-fit:cover;" onerror="this.onerror=null;this.src='https://placehold.co/70x70/CCCCCC/333333?text=NO+IMG';">
                    <div class="flex-grow-1">
                        <h6 class="mb-1 fw-bold">${item.name}</h6>
                        <p class="mb-0 text-muted" style="font-size:0.9rem;">Precio unitario: ${formatCurrency(item.price)}</p>
                    </div>
                    <div class="d-flex align-items-center me-3 quantity-control">
                        <button class="btn btn-sm btn-outline-secondary" onclick="changeQuantity('${item.productId}', -1)">-</button>
                        <input type="text" class="form-control form-control-sm mx-1 text-center" value="${item.quantity}" readonly>
                        <button class="btn btn-sm btn-outline-secondary" onclick="changeQuantity('${item.productId}', 1)">+</button>
                    </div>
                    <div class="text-end me-3">
                        <span class="fw-bold fs-6">${formatCurrency(itemTotal)}</span>
                    </div>
                    <button class="btn btn-outline-danger btn-sm" onclick="removeItemFromCart('${item.productId}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            container.innerHTML += itemHtml;
        });
    }

    calculateTotals();
}

function calculateTotals() {
    const cart = getCart();
    const subtotalProducts = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = subtotalProducts > 0 ? SHIPPING_COST : 0;
    const totalPrice = subtotalProducts + shippingCost;

    const subtotalEl = document.getElementById('subtotal-products');
    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotalProducts);
    const shippingElem = document.getElementById('shipping-cost');
    if (shippingElem) shippingElem.textContent = formatCurrency(shippingCost);
    const totalElem = document.getElementById('total-price');
    if (totalElem) totalElem.textContent = formatCurrency(totalPrice);

    const payButton = document.getElementById('pay-button');
    if (payButton) payButton.disabled = subtotalProducts === 0;
}

async function goToPayment() {
    const cart = getCart();
    if (cart.length === 0) {
        showModal('Tu carrito está vacío. Agrega productos para pagar.', 'Carrito Vacío');
        return;
    }
    processPayment();
}

async function processPayment() {
    const cart = getCart();
    const subtotalProducts = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = subtotalProducts > 0 ? SHIPPING_COST : 0;
    const totalPrice = subtotalProducts + shippingCost;

    const orderData = {
        items: cart.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price
        })),
        totalAmount: totalPrice,
        shippingCost
    };

    try {
        const response = await callApi('/orders', { method: 'POST', body: orderData });
        const orderId = response.orderId;

        localStorage.removeItem(LS_CART_KEY);
        updateCartUI();
        navigateTo(`post_pago.html?status=success&orderId=${orderId}`);
    } catch (error) {
        console.error("Fallo al procesar pago:", error);
        navigateTo(`post_pago.html?status=failure`);
    }
}

// ===============================================
// 🔹 Inicialización al cargar cualquier página
// ===============================================
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI(); // actualiza contador al iniciar
    if (document.body.id === 'cart-page') setupCartPage(); // renderiza carrito al cargar la página
});

// ===============================================
// PERFIL DEL CLIENTE
// ===============================================

let isEditMode = false;

// Cargar datos del perfil

async function fetchClientProfile() {
    try {
        const profile = await callApi('/client/profile');
        localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(profile));

        document.getElementById('run').value = profile.run || '';
        document.getElementById('nombre').value = profile.name || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('telefono').value = profile.phone || '';
        document.getElementById('direccion').value = profile.address || '';
        document.getElementById('fechaNacimiento').value = profile.fechaNacimiento?.split('T')[0] || '';
        document.getElementById('sexo').value = profile.sex || '';

    } catch (error) {
        console.error("Error al cargar perfil:", error);
        showModal("No se pudo cargar el perfil");
    }
}

// Toggle modo edición

function toggleEditMode(enable) {
    isEditMode = enable;
    const profileForm = document.getElementById('profile-form');
    const confirmButtons = document.getElementById('confirm-buttons');
    const navButtons = document.getElementById('navigation-buttons');

    const inputs = profileForm.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.readOnly = !enable;
        input.disabled = !enable && input.id === 'sexo';
        if (enable) {
            input.classList.add('bg-white');
            input.classList.remove('form-control-plaintext');
        } else {
            input.classList.remove('bg-white');
            input.classList.add('form-control-plaintext');
        }
    });

    confirmButtons.classList.toggle('d-none', !enable);
    navButtons.classList.toggle('d-none', enable);
}

// Guardar cambios de perfil

async function handleProfileUpdate(event) {
    event.preventDefault();
    const profileForm = event.target;

    const updatedData = {
        name: profileForm['nombre'].value,
        phone: profileForm['telefono'].value,
        sex: profileForm['sexo'].value,
        address: profileForm['direccion'].value
    };

    try {
        const result = await callApi('/client/profile', { method: 'PUT', body: updatedData });
        showModal(result.message || "Perfil actualizado correctamente");
        toggleEditMode(false);
        fetchClientProfile(); // recargar datos
    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        showModal("Error al actualizar perfil");
    }
}

// Logout

function logout() {
    clearToken();
    navigateTo('login.html');
}

// Navegación

function goToOrders() { navigateTo('mis_pedidos.html'); }
function goToCatalog() { navigateTo('catalogo.html'); }
function goToOffers() { navigateTo('promociones.html'); }


// Setup de la página

function setupProfilePage() {
    const profileForm = document.getElementById('profile-form');

    // Botones
    document.getElementById('logout-button').addEventListener('click', logout);
    profileForm.addEventListener('submit', handleProfileUpdate);

    // Botón editar
    document.getElementById('edit-button').addEventListener('click', () => toggleEditMode(true));

    // Botón cancelar edición
    document.querySelector('#confirm-buttons .btn-outline-secondary')?.addEventListener('click', () => toggleEditMode(false));

    // Cargar datos
    fetchClientProfile();
}

// Listener DOMContentLoaded

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.id === 'profile-page') {
        setupProfilePage();
    }
});

// MIS PEDIDOS

let currentOrderIdToCancel = null;

function setupMisPedidosPage() {
    fetchClientOrders();

    const confirmBtn = document.getElementById('confirmAnulationBtn');
    confirmBtn?.addEventListener('click', attemptAnulation);
}

async function fetchClientOrders() {
    const container = document.getElementById('orders-list');
    const noOrdersMessage = document.getElementById('no-orders-message');
    if (!container) return;

    container.innerHTML = `<div class="col-12 text-center py-5">
        <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div>
        <p class="mt-2 text-muted">Cargando mis pedidos...</p>
    </div>`;
    if (noOrdersMessage) noOrdersMessage.classList.add('d-none');

    try {
        const response = await callApi('/orders/client');
        const orders = response.orders || [];
        renderClientOrders(orders.reverse());
    } catch (error) {
        console.error("Error al cargar pedidos:", error);
        container.innerHTML = `<div class="col-12 text-center text-danger py-5">
            <i class="bi bi-x-octagon fs-1"></i>
            <p class="fs-4 mt-2">Error al cargar los pedidos. Inténtalo más tarde.</p>
        </div>`;
    }
}

function renderClientOrders(orders) {
    const container = document.getElementById('orders-list');
    const noOrdersMessage = document.getElementById('no-orders-message');
    if (!container) return;

    container.innerHTML = '';

    if (!orders || orders.length === 0) {
        if (noOrdersMessage) noOrdersMessage.classList.remove('d-none');
        return;
    }
    if (noOrdersMessage) noOrdersMessage.classList.add('d-none');

    orders.forEach(order => {
        // Estado real para la lógica, transformado solo visualmente para el cliente
        const statusData = getStatusDisplay(order.status, true); // forClient = true

        // Solo permitir anulación si el pedido real está Pendiente
        const canCancel = order.status === 'Pendiente';

        const itemsList = order.items.map(item =>
            `<li class="list-group-item d-flex justify-content-between align-items-center">
                ${item.name} <span class="badge bg-secondary rounded-pill">${item.quantity} unid.</span>
            </li>`
        ).join('');

        const orderDate = new Date(order.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

        container.innerHTML += `
            <div class="col-12 col-lg-6 mb-4">
                <div class="card order-card shadow-sm h-100" style="border-left-color: ${statusData.color} !important;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title fw-bold text-primary">Pedido N° ${order.orderId}</h5>
                            <span class="status-badge text-white ${statusData.badgeClass}">${statusData.label}</span>
                        </div>
                        <p class="card-subtitle mb-2 text-muted" style="font-size:0.9rem;">
                            Fecha: ${orderDate} | Total: <span class="fw-bold text-danger">${formatCurrency(order.totalAmount)}</span>
                        </p>
                        <h6 class="mt-3">Productos:</h6>
                        <ul class="list-group list-group-flush" style="max-height:150px;overflow-y:auto;">
                            ${itemsList}
                        </ul>
                        <div class="mt-3 text-end">
                            ${canCancel ? 
                                `<button class="btn btn-sm btn-outline-danger" onclick="showAnularModal('${order.orderId}')">
                                    <i class="bi bi-x-circle me-1"></i> Anular Pedido
                                </button>` : 
                                `<button class="btn btn-sm btn-outline-secondary" disabled>Anulación no permitida</button>`}
                        </div>
                        ${order.status === 'Anulado' && order.cancellationReason ? 
                            `<div class="alert alert-danger mt-3 py-2 px-3 mb-0" style="font-size:0.85rem;">
                                **Motivo Anulación:** ${order.cancellationReason}
                            </div>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
}

function showAnularModal(orderId) {
    currentOrderIdToCancel = orderId;
    document.getElementById('modal-order-id').textContent = orderId;
    document.getElementById('motivo-anulacion').value = '';
    const alertBox = document.getElementById('anular-alert');
    alertBox.classList.add('d-none');
    alertBox.textContent = '';

    const modal = new bootstrap.Modal(document.getElementById('anularModal'));
    modal.show();
}

async function attemptAnulation() {
    const orderId = currentOrderIdToCancel;
    const reason = document.getElementById('motivo-anulacion').value.trim();
    const alertBox = document.getElementById('anular-alert');

    if (!orderId || !reason) {
        alertBox.className = 'alert alert-danger mt-3';
        alertBox.textContent = 'Por favor, ingresa el motivo de la anulación.';
        alertBox.classList.remove('d-none');
        return;
    }

    try {
        await callApi(`/orders/${orderId}/cancel`, { method: 'PUT', body: { reason } });

        // Mostrar mensaje de éxito dentro del modal
        alertBox.className = 'alert alert-success mt-3';
        alertBox.textContent = `Pedido N° ${orderId} anulado correctamente.`;

        // Actualizar lista de pedidos
        fetchClientOrders();

        // Cambiar botón OK para cerrar el modal
        const confirmBtn = document.getElementById('confirmAnulationBtn');
        confirmBtn.textContent = 'Cerrar';
        confirmBtn.classList.remove('btn-danger');
        confirmBtn.classList.add('btn-primary');

        // Cambiar el listener para que solo cierre el modal
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        document.getElementById('confirmAnulationBtn').addEventListener('click', () => {
            bootstrap.Modal.getInstance(document.getElementById('anularModal'))?.hide();

            // Restaurar botón a su estado original
            const btn = document.getElementById('confirmAnulationBtn');
            btn.textContent = 'OK';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-danger');
            btn.replaceWith(btn.cloneNode(true));
            document.getElementById('confirmAnulationBtn').addEventListener('click', attemptAnulation);
        });

    } catch (error) {
        alertBox.className = 'alert alert-danger mt-3';
        alertBox.textContent = error.message || `No se pudo anular el Pedido N° ${orderId}.`;
        alertBox.classList.remove('d-none');
    }
}

function showResultModal(message, title, type) {
    const modalElement = document.getElementById('resultModal');
    const titleElement = document.getElementById('result-message-title');
    const messageElement = document.getElementById('result-message');
    const headerElement = modalElement.querySelector('.modal-header');

    messageElement.textContent = message;
    titleElement.textContent = title;

    headerElement.className = 'modal-header';
    headerElement.classList.add(type === 'success' ? 'bg-success' : 'bg-danger', 'text-white');

    new bootstrap.Modal(modalElement).show();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.id === 'orders-page') {
        setupMisPedidosPage();
    }
});


// ===============================================
// FUNCIONES DE ESTADO DE PEDIDOS
// ===============================================
function getStatusDisplay(status, forClient = false) {
    let label = status;
    if (forClient && status === 'Pendiente') label = 'Preparando';

    switch (status) {
        case 'Pendiente': return { color: '#ffc107', badgeClass: 'bg-warning text-dark', label };
        case 'Preparando': return { color: '#0dcaf0', badgeClass: 'bg-info text-dark', label };
        case 'Enviado': return { color: '#0d6efd', badgeClass: 'bg-primary', label };
        case 'Entregado': return { color: '#198754', badgeClass: 'bg-success', label };
        case 'Anulado': return { color: '#dc3545', badgeClass: 'bg-danger', label };
        default: return { color: '#6c757d', badgeClass: 'bg-secondary', label };
    }
}


// ======================================================
// ADMINISTRADOR: PRODUCTOs
// ======================================================
async function handleAdminCreateProduct(event) {
    event.preventDefault();
    const form = event.target;

    // Campos
    const name = form['input-name']?.value.trim();
    const desc = form['input-description']?.value.trim();
    const stockStr = form['input-stock']?.value.trim();
    const category = form['input-category']?.value.trim();
    const priceStr = form['input-price']?.value.trim();
    const discountStr = form['input-discount']?.value.trim();
    const imageFile = form['input-image']?.files[0];

    // Validar campos obligatorios
    if (!name || !desc || !priceStr || !discountStr || !stockStr || !category) {
        return showModal("Todos los campos son obligatorios.", "Error");
    }

    // Convertir a números
    const price = parseInt(priceStr);
    const discount = parseInt(discountStr);
    const stock = parseInt(stockStr);

    if (isNaN(price) || price <= 0) return showModal("Ingresa un precio válido.", "Error");
    if (isNaN(discount) || discount < 0 || discount > 99) return showModal("Descuento inválido (0-99).", "Error");
    if (isNaN(stock) || stock < 0) return showModal("Ingresa un stock válido.", "Error");

    // Construir FormData
    const formData = new FormData();
    formData.append('name', name);
    formData.append('desc', desc);
    formData.append('price', price);
    formData.append('discount', discount);
    formData.append('stock', stock);
    formData.append('category', category);
    if (imageFile) formData.append('image', imageFile);

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Error al crear producto");

        showModal('Producto creado correctamente.', 'Éxito');
        form.reset();
    } catch (error) {
        console.error("Error al crear producto:", error);
        showModal("Error al crear producto: " + error.message, "Error");
    }
}

// Registrar listener al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-product-form');
    if (form) form.addEventListener('submit', handleAdminCreateProduct);
});

/**
 * Inicializa la página de productos de admin.
 */
function setupAdminProductsPage() {
    fetchProductsAdmin(1);
}

/**
 * Obtiene productos para el admin con paginación.
 */
async function fetchProductsAdmin(page) {
    const containerId = 'admin-product-list';
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<div class="text-center py-5">
        <div class="spinner-border text-primary"></div>
    </div>`;

    try {
        const data = await callApi(`/products?page=${page}&limit=10`);

        const adminProducts = data.products || data.adminProducts || [];
        renderProductsAdmin(adminProducts, containerId);

        setupPagination(
            data.totalPages,
            data.page,
            fetchProductsAdmin
        );

    } catch (err) {
        container.innerHTML = `<div class="text-danger text-center py-4">
            Error al cargar productos de admin
        </div>`;
    }
}

function renderProductsAdmin(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-4">
                <p class="text-muted">No hay productos.</p>
            </div>`;
        return;
    }

    let html = '';

    products.forEach(product => {
        const img = product.imgUrl?.startsWith('http')
            ? product.imgUrl
            : `${API_BASE_URL.replace('/api', '')}${product.imgUrl}`;

        const finalPrice = product.discount
            ? (product.price * (1 - product.discount / 100)).toFixed(2)
            : product.price.toFixed(2);

        html += `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="card h-100 shadow-sm">
                    <img src="${img}" class="card-img-top" style="height:180px; object-fit:cover;">
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text">${product.desc}</p>
                        <p class="fw-bold">$${finalPrice}</p>
                        <p class="text-muted">Stock: ${product.stock}</p>
                        <p class="badge bg-primary">${product.category}</p>
                    </div>
                    <div class="card-footer d-flex justify-content-center"">
                        <button class="btn btn-warning btn-sm" onclick="navigateToAdminEditProduct('${product._id}')">
                            Editar
                        </button>
                    </div>
                </div>
            </div>`;
    });

    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.id;

    if (page === 'admin-products-page') {
        // Esta es la llamada que te falta para que se muestren los productos
        fetchProductsAdmin(1);
    }

    if (page === 'products-page') {
        fetchProducts(1);
    }
});

/**
 * Guarda el ID del producto y redirige a la página de edición.
 */
function navigateToAdminEditProduct(productId) {
    localStorage.setItem(LS_PRODUCT_ID_KEY, productId);
    navigateTo('admin_editar_producto.html');
}

/**
 * Inicializa la página de edición de producto.
 */
function setupAdminEditProductPage() {
    const productId = localStorage.getItem(LS_PRODUCT_ID_KEY);
    if (!productId) {
        showModal('No se ha seleccionado un producto.', 'Error');
        setTimeout(() => navigateTo('admin_productos.html'), 1500);
        return;
    }

    fetchProductDetails(productId);
    document.getElementById('edit-product-form')?.addEventListener('submit', handleProductUpdate);
}

/**
 * Trae los detalles de un producto y llena el formulario.
 */

async function fetchProductDetails(productId) {
    try {
        let response = await callApi(`/products/${productId}`);

        // Por si el backend devuelve { product: {...} }
        const product = response.product || response;

        if (!product) {
            throw new Error("Producto no encontrado");
        }

        document.getElementById('input-name').value = product.name ?? '';

        document.getElementById('input-description').value = product.desc ?? '';

        document.getElementById('input-price').value =
            Number(product.price ?? 0).toFixed(2);

        document.getElementById('input-discount').value =
            Number(product.discount ?? 0).toFixed(2);

        document.getElementById('input-stock').value = product.stock ?? 0;

        document.getElementById('input-category').value = product.category ?? '';

        const imgPreview = document.getElementById('current-image-preview');

        imgPreview.src = product.imgUrl
            ? (product.imgUrl.startsWith('http')
                ? product.imgUrl
                : `${API_BASE_URL.replace('/api', '')}${product.imgUrl}`)
            : 'https://placehold.co/100x100/CCCCCC/333333?text=NO+IMG';

    } catch (error) {
        console.error("Error al cargar detalles del producto:", error);
        showModal(error.message || 'Error al cargar producto.', 'Error');
    }
}

/**
 * Actualiza un producto desde el formulario.
 */
async function handleProductUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const productId = localStorage.getItem(LS_PRODUCT_ID_KEY);
    if (!productId) return;

    const price = parseInt(form['input-price']?.value);
    const discount = parseInt(form['input-discount']?.value);
    const stock = parseInt(form['input-stock']?.value);
    const name = form['input-name']?.value.trim();
    const desc = form['input-description']?.value.trim();
    const category = form['input-category']?.value.trim();
    const imageFile = form['input-image']?.files[0];

    if (!name || !desc || isNaN(price) || isNaN(discount) || isNaN(stock) || !category) {
        return showModal("Todos los campos son obligatorios.", "Error");
    }

    if (discount < 0 || discount > 99) return showModal("Descuento inválido (0-99).", "Error");

    const formData = new FormData();
    formData.append('name', name);
    formData.append('desc', desc);
    formData.append('price', price);
    formData.append('discount', discount);
    formData.append('stock', stock);
    formData.append('category', category);
    if (imageFile) formData.append('image', imageFile);

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });

        if (!response.ok) throw new Error("Error al actualizar producto");
        showModal('Producto actualizado con éxito.', 'Actualización Exitosa');
        fetchProductDetails(productId);

    } catch (error) {
        console.error("Fallo al actualizar producto:", error);
        showModal("Error al actualizar producto: " + error.message, "Error");
    }
}

/**
 * Elimina un producto.
 */
function deleteProduct() {
    const productId = localStorage.getItem(LS_PRODUCT_ID_KEY);
    if (!productId) {
        showModal('No hay ID de producto para eliminar.', 'Error');
        return;
    }

    if (!confirm('¿Confirmas la eliminación de este producto?')) return;

    callApi(`/products/${productId}`, { method: 'DELETE' })
        .then(() => {
            showModal('Producto eliminado con éxito.', 'Eliminación Exitosa');
            localStorage.removeItem(LS_PRODUCT_ID_KEY);
            setTimeout(() => navigateTo('admin_productos.html'), 1500);
        })
        .catch(error => console.error("Fallo al eliminar producto:", error));
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.id === 'admin-edit-product-page') {
        setupAdminEditProductPage();
    }
});

// ===============================================
// ADMINISTRADOR: PEDIDOS
// ===============================================
let currentOrderIdToEdit = null;

// Inicializar página de admin pedidos
function setupAdminPedidosPage() {
    fetchAdminOrders();
    fillStatusSelect();
}

// Traer pedidos del backend
async function fetchAdminOrders() {
    const container = document.getElementById('orders-list-admin');
    const noOrdersMessage = document.getElementById('no-orders-message');
    if (!container) return;

    container.innerHTML = `<div class="col-12 text-center py-5">
        <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div>
        <p class="mt-2 text-muted">Cargando pedidos...</p>
    </div>`;
    noOrdersMessage.classList.add('d-none');

    try {
        const response = await callApi('/orders/admin'); // callApi ya agrega /api
        const orders = response.orders || [];
        renderAdminOrders(orders.reverse());
    } catch (error) {
        console.error("Error al cargar pedidos:", error);
        container.innerHTML = `<div class="col-12 text-center text-danger py-5">
            <i class="bi bi-x-octagon fs-1"></i>
            <p class="fs-4 mt-2">Error al cargar pedidos.</p>
        </div>`;
    }
}

// Renderiza las tarjetas de pedidos
function renderAdminOrders(orders) {
    const container = document.getElementById('orders-list-admin');
    const noOrdersMessage = document.getElementById('no-orders-message');
    container.innerHTML = '';

    if (!orders.length) {
        noOrdersMessage.classList.remove('d-none');
        return;
    }
    noOrdersMessage.classList.add('d-none');

    let html = '';
    orders.forEach(order => {
        const statusData = getStatusDisplay(order.status);
        const orderDate = new Date(order.createdAt).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' });
        const canEdit = !['Entregado', 'Anulado'].includes(order.status);
        const itemsList = order.items.map(item => `<span class="badge bg-secondary me-1">${item.name} x ${item.quantity}</span>`).join('');

        html += `
        <div class="col-12 mb-3">
            <div class="card order-card shadow-sm" style="border-left:5px solid ${statusData.color} !important;">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <h6 class="mb-0 fw-bold text-primary">N° ${order.orderId}</h6>
                            <p class="mb-0 text-muted" style="font-size:0.85rem;">Cliente: ${order.clientEmail}</p>
                        </div>
                        <div class="col-md-4">
                            <p class="mb-0" style="font-size:0.9rem;">
                                <strong>Fecha:</strong> ${orderDate}<br>
                                <strong>Total:</strong> <span class="fw-bold text-danger">${formatCurrency(order.totalAmount)}</span>
                            </p>
                        </div>
                        <div class="col-md-3 text-center">
                            <span class="status-badge text-white ${statusData.badgeClass}">${order.status}</span>
                        </div>
                        <div class="col-md-2 text-end">
                            ${canEdit ?
                                `<button class="btn btn-sm btn-ecomarket-secondary" onclick="showEditStatusModal('${order.orderId}','${order.status}')">
                                    <i class="bi bi-pencil-fill"></i> Editar
                                </button>` :
                                `<button class="btn btn-sm btn-outline-secondary" disabled>Finalizado</button>`}
                        </div>
                    </div>
                    <div class="mt-2 pt-2 border-top">
                        <p class="mb-0" style="font-size:0.8rem;"><strong>Productos:</strong> ${itemsList || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
}

// Abrir modal para editar estado
function showEditStatusModal(orderId, currentStatus) {
    currentOrderIdToEdit = orderId;
    document.getElementById('modal-order-id').textContent = orderId;
    document.getElementById('current-status').textContent = currentStatus;
    document.getElementById('new-status-select').value = currentStatus;

    new bootstrap.Modal(document.getElementById('editStatusModal')).show();
}

// Completa el select de estados válidos para admin
function fillStatusSelect() {
    const select = document.getElementById('new-status-select');
    if (!select) return;

    // Solo estados que admin puede asignar
    const statuses = ['Pendiente','Preparando','Enviado','Entregado'];
    select.innerHTML = statuses.map(s => `<option value="${s}">${s}</option>`).join('');
}

// Actualizar estado del pedido
async function updateOrderStatus() {
    const orderId = currentOrderIdToEdit;
    const newStatus = document.getElementById('new-status-select').value;
    if (!orderId || !newStatus) {
        showModal('Error: faltan datos.', 'Error');
        return;
    }

    bootstrap.Modal.getInstance(document.getElementById('editStatusModal'))?.hide();

    try {
        await callApi(`/orders/admin/${orderId}/status`, { method:'PUT', body:{ status:newStatus }});
        showModal(`Estado del Pedido N° ${orderId} actualizado a "${newStatus}".`, 'Actualización Exitosa');
        fetchAdminOrders();
    } catch(error) {
        console.error("Error al actualizar estado:", error);
        showModal(error.message || 'No se pudo actualizar el estado del pedido.', 'Error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.id === 'admin-orders-page') setupAdminPedidosPage();
});

// ===============================================
// ADMINISTRADOR: DASHBOARD DE VENTAS
// ===============================================

let salesChart = null; // Instancia global de Chart.js

function handleAdminLogout() {
    clearToken();
    navigateTo('login.html');
}

/**
 * Inicializa la página del Dashboard.
 */
function setupAdminDashboardPage() {
    document.getElementById('periodFilter')?.addEventListener('change', fetchSalesDataAndRender);
    document.getElementById('typeFilter')?.addEventListener('change', fetchSalesDataAndRender);
    document.getElementById('admin-logout-button')?.addEventListener('click', handleAdminLogout);
    fetchSalesDataAndRender(); // Datos iniciales

}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.id === 'admin-page') {
        setupAdminDashboardPage();
    }
});

/**
 * Recoge filtros y llama a la API para actualizar el gráfico.
 */
function fetchSalesDataAndRender() {
    const period = document.getElementById('periodFilter')?.value || 'month';
    const type = document.getElementById('typeFilter')?.value || 'ventas';

    document.getElementById('chart-loading')?.classList.remove('d-none');
    document.getElementById('sales-chart')?.classList.add('d-none');

    fetchSalesData(period, type);
}

/**
 * Llama a la API para obtener datos de ventas.
 */
async function fetchSalesData(period, type) {
    try {
        const data = await callApi(`/admin/analytics/sales?period=${period}&type=${type}`);

        document.getElementById('chart-loading')?.classList.add('d-none');
        document.getElementById('sales-chart')?.classList.remove('d-none');

        renderSalesChart(data, type);
    } catch (error) {
        console.error("Error al obtener datos del dashboard:", error);
        const chartLoading = document.getElementById('chart-loading');
        if (chartLoading) {
            chartLoading.innerHTML = `<div class="alert alert-danger">Error al cargar estadísticas: ${error.message}</div>`;
            chartLoading.classList.remove('d-none');
        }
    }
}

/**
 * Renderiza o actualiza el gráfico de ventas.
 */
function renderSalesChart(data, type) {
    const ctx = document.getElementById('sales-chart').getContext('2d');
    if (salesChart) salesChart.destroy();

    const chartType = type === 'ventas' ? 'line' : 'bar';
    const labelText = type === 'producto' ? 'Unidades Vendidas' : 'Monto de Ventas (CLP)';
    const tooltipCallback = type === 'producto'
        ? tooltipItem => `${tooltipItem.label}: ${tooltipItem.formattedValue} unidades`
        : tooltipItem => `${tooltipItem.label}: ${formatCurrency(tooltipItem.raw)}`;

    salesChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: data.labels,
            datasets: [{
                label: labelText,
                data: data.values,
                backgroundColor: chartType === 'bar'
                    ? ['#4CAF50','#FF9800','#F44336','#03A9F4','#9C27B0']
                    : 'rgba(76,175,80,0.65)',
                borderColor: '#4CAF50',
                borderWidth: chartType === 'line' ? 3 : 1,
                fill: chartType === 'line',
                tension: chartType === 'line' ? 0.3 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display:true, text:data.title, font:{size:18, weight:'bold'}, color:'#333' },
                legend: { display: chartType === 'line' },
                tooltip: { callbacks: { label: tooltipCallback } }
            },
            scales: {
                y: {
                    beginAtZero:true,
                    ticks: {
                        callback: function(value) {
                            return type === 'producto' ? value : formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// ======================================================
// ADMINISTRADOR: CREAR USUARIO/CLIENTE
// ======================================================
async function handleAdminCreateAccount(event) {
    event.preventDefault();

    const form = document.getElementById("admin-create-account-form");
    const data = {
        name: form['input-name'].value,
        email: form['input-email'].value,
        run: form['input-run'].value,
        sex: form['input-sex'].value,
        phone: form['input-phone'].value,
        fechaNacimiento: form['input-fechaNacimiento'].value,
        password: form['input-password'].value,
        role: form['input-role'].value,
        address: form['input-address'].value
    };

    try {
        const json = await callApi('/admin/users', {
            method: 'POST',
            body: data
        });

        // Éxito real
        alert("Usuario creado correctamente.");
        form.reset();

    } catch (error) {
        console.error("Error al crear usuario:", error);
        // callApi ya muestra modal con error
    }
}

// Listener para la página de crear cuenta
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("admin-create-account-form")
        ?.addEventListener("submit", handleAdminCreateAccount);
});

// Función para regresar al dashboard
function goBackToDashboard() {
    navigateTo('admin_dashboard.html');
}

// ===============================================
// FUNCIONES DE NAVEGACIÓN GENERAL
// ===============================================

function goToCatalog() { navigateTo('catalogo.html'); }
function goToOffers() { navigateTo('promociones.html'); }
function goToCart() { navigateTo('carrito.html'); }
function goToProfile() { navigateTo('perfil.html'); }
function goToOrders() { navigateTo('mis_pedidos.html'); }
function goBackToDashboard() { navigateTo('admin_dashboard.html'); }
function goBack() {
    window.history.back();
}
function goBackToProfile() {
    navigateTo('perfil.html'); // ajusta según tu archivo real
}
function goToCreateProduct() {
    navigateTo('admin_crear_producto.html');
}


// ===============================================
// EXPORTACIÓN GLOBAL DE FUNCIONES
// ===============================================

window.navigateTo = navigateTo;
window.goToCatalog = goToCatalog;
window.goToOffers = goToOffers;
window.goToCart = goToCart;
window.goToProfile = goToProfile;
window.goToOrders = goToOrders;
window.goBackToDashboard = goBackToDashboard;

window.logout = logout;
window.addToCart = addToCart;
window.changeQuantity = changeQuantity;
window.removeItemFromCart = removeItemFromCart;
window.goToPayment = goToPayment;
window.toggleEditMode = toggleEditMode;
window.showAnularModal = showAnularModal;
window.attemptAnulation = attemptAnulation;
window.applyFilters = applyFilters;
window.fetchProductsAdmin = fetchProductsAdmin;
window.navigateToAdminEditProduct = navigateToAdminEditProduct;
window.deleteProduct = deleteProduct;
window.showEditStatusModal = showEditStatusModal;
window.updateOrderStatus = updateOrderStatus;
window.fetchSalesDataAndRender = fetchSalesDataAndRender;
window.setupCatalogPage = setupCatalogPage;
window.setupPromocionesPage = setupPromocionesPage;
window.setupCartPage = setupCartPage;
window.setupProfilePage = setupProfilePage;
window.setupMisPedidosPage = setupMisPedidosPage;
window.setupAdminDashboardPage = setupAdminDashboardPage;
window.setupAdminProductsPage = setupAdminProductsPage;
window.setupAdminEditProductPage = setupAdminEditProductPage;
window.setupAdminPedidosPage = setupAdminPedidosPage;