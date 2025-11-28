// CONFIGURACIÓN GLOBAL
const API_BASE_URL = 'http://localhost:3000/api'; 
let currentCartItems = []; // Estado global del carrito para mantener la UI sincronizada

// FUNCIONES HELPER GLOBALES 

/**
 * Retorna el token JWT o null.
 */
function getAuthToken() { return localStorage.getItem('userToken'); }

/**
 * Retorna el rol del usuario o null.
 */
function getUserRole() { return localStorage.getItem('userRole'); }

/**
 * Crea headers con el Content-Type y el token JWT para rutas protegidas.
 */
function createAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

/**
 * Formatea precio a CLP.
 */
function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) return '$0';
    return price.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    });
}
window.formatPrice = formatPrice;

/**
 * Muestra un modal de estado (éxito o error).
 */
function showModal(message, type) {
    const modalId = type === 'successModal' ? 'statusModal' : 'errorModal';
    const modalElement = document.getElementById(modalId);
    if (!modalElement || typeof bootstrap === 'undefined' || !bootstrap.Modal) {
        console.warn(`Modal ${modalId} no encontrado o Bootstrap no inicializado.`);
        return;
    }
    modalElement.querySelector('.modal-title').textContent = type === 'successModal' ? 'Operación Exitosa' : '¡Algo Salió Mal!';
    modalElement.querySelector('.modal-body').innerHTML = message;

    const modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
}
window.showModal = showModal;

function goBackToList() { window.location.href = 'admin_gestion_productos.html'; }
window.goBackToList = goBackToList;

function getParamFromUrl(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
function goToCatalog() { window.location.href = 'catalogo.html'; }


// 1. LÓGICA DE AUTENTICACIÓN

function setupLogoutButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.addEventListener('click', () => {
            localStorage.clear(); 
            window.location.href = 'index.html';
        });
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('input-email').value;
    const password = document.getElementById('input-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role: 'client' }) 
        });

        const result = await response.json();
        if (response.ok) {
            showModal(`Usuario "${email}" registrado. Por favor, inicia sesión.`, 'successModal');
            setTimeout(() => window.location.href = 'login.html', 1500);
        } else {
            throw new Error(result.message || 'Error desconocido al registrar.');
        }
    } catch (error) {
        showModal(`Error de Registro: ${error.message}`, 'errorModal');
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('input-email').value;
    const password = document.getElementById('input-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Credenciales inválidas.');
        }

        // Guardar credenciales de sesión JWT
        localStorage.setItem('userToken', result.token);
        localStorage.setItem('userRole', result.role);
        localStorage.setItem('userEmail', result.email);
        
        showModal("Inicio de sesión exitoso. Redirigiendo...", 'successModal');

        if (result.role === 'admin') {
            setTimeout(() => window.location.href = 'admin_dashboard.html', 1500);
        } else {
            setTimeout(() => window.location.href = 'catalogo.html', 1500);
        }

    } catch (error) {
        showModal(`Error de Inicio de Sesión: ${error.message}`, 'errorModal');
    }
}

function loadUserProfile() {
    // Carga la info del usuario desde localStorage (información real del JWT)
    const email = localStorage.getItem('userEmail') || 'N/A';
    const role = getUserRole() || 'Invitado';

    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    const userRoleElement = document.getElementById('user-role');
    
    if (userNameElement) {
        userNameElement.textContent = role === 'admin' ? "Administrador" : "Cliente";
        userEmailElement.textContent = `Email: ${email}`; 
        userRoleElement.textContent = `Rol: ${role.toUpperCase()}`;
    }
}


// 2. LÓGICA DE PRODUCTOS Y CATÁLOGO

/**
 * Obtiene la lista de productos de la API REST (pública o con filtros).
 */
async function fetchProducts(filters = {}) {
    try {
        const query = new URLSearchParams(filters).toString();
        const url = `${API_BASE_URL}/products?${query}`;
        const response = await fetch(url); 
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error al obtener productos de la API:", error);
        throw new Error("No se pudo conectar al servidor de productos."); 
    }
}

/**
 * Dibuja las tarjetas de productos para el catálogo del cliente.
 */
function renderCatalogue(products) {
    const container = document.getElementById('product-catalogue-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted lead">No hay productos disponibles.</p></div>';
        return;
    }

    products.forEach(product => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3 mb-4';

        col.innerHTML = `
            <div class="card h-100 product-card shadow-sm">
                <!-- ... Card HTML (Imágenes, títulos, precios) ... -->
                <div style="height: 150px; background-color: #f0f0f0; border-radius: 0.375rem 0.375rem 0 0;">
                    <img src="${product.imgUrl || 'https://placehold.co/150x150/4CAF50/FFFFFF?text=IMAGEN'}" 
                        alt="${product.name}" 
                        class="w-100 h-100 object-fit-cover rounded-top"
                        onerror="this.onerror=null; this.src='https://placehold.co/150x150/F0F0F0/4CAF50?text=SIN+IMG';"
                    />
                </div>
                
                <div class="card-body p-3">
                    <h5 class="card-title fw-bold text-truncate mb-1">${product.name}</h5>
                    <p class="card-text text-success fw-bold">${formatPrice(product.price)}</p>
                    <p class="card-text text-muted mb-3">${(product.desc || product.description || '').substring(0, 50)}...</p> 
                </div>
                
                <div class="card-footer text-center p-2 border-0 bg-white">
                    <button class="btn btn-sm btn-ecomarket-primary w-100" onclick="addToCart('${product._id}')" ${product.stock === 0 ? 'disabled' : ''}>
                        <i class="bi bi-cart-plus me-2"></i> ${product.stock > 0 ? 'Añadir al Carrito' : 'Agotado'}
                    </button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}
window.renderCatalogue = renderCatalogue;

function loadCatalogue(filters = {}) {
    fetchProducts(filters) 
        .then(products => renderCatalogue(products))
        .catch(error => showModal(`Error al cargar el catálogo: ${error.message}`, 'errorModal'));
}

// Configura el formulario de filtros (Promociones/Catálogo)
function handleFilterSubmit(e, isPromotion = false) { 
    e.preventDefault();
    const category = document.getElementById('category-filter').value;
    // La misma ruta de API maneja el catálogo y las promociones, solo filtramos por categoría.
    loadCatalogue({ category: category });
}


// 3. LÓGICA DE CARRITO

/**
 * Actualiza el contador de la bolsa de compras.
 */
function updateCartCounter(count) {
    const badge = document.getElementById('cart-counter');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('d-none', count === 0);
    }
}

/**
 * Añade un producto al carrito llamando a la API.
 */
async function addToCart(productId) {
    if (!getAuthToken()) {
        showModal('Debes iniciar sesión para añadir productos al carrito.', 'errorModal');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/add`, {
            method: 'POST',
            headers: createAuthHeaders(),
            body: JSON.stringify({ productId, quantity: 1 })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Error al añadir producto.');
        }

        // Si es exitoso, recarga el carrito para actualizar el contador.
        await loadCart(false); 
        showModal('Producto añadido al carrito.', 'successModal');

    } catch (error) {
        showModal(`Error al añadir producto: ${error.message}`, 'errorModal');
    }
}
window.addToCart = addToCart;

/**
 * Carga el carrito del usuario desde la API.
 * @param {boolean} render - Si es true, renderiza la vista del carrito.
 */
async function loadCart(render = true) {
    if (!getAuthToken()) {
        if (render) {
            document.getElementById('cart-items-container').innerHTML = '<div class="alert alert-warning">Inicia sesión para ver tu carrito.</div>';
        }
        updateCartCounter(0);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/cart`, {
            method: 'GET',
            headers: createAuthHeaders()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Error al cargar el carrito.');
        }

        currentCartItems = data.items;
        updateCartCounter(data.items.length);

        if (render) {
            renderCart(data.items, data.totalPrice);
        }

    } catch (error) {
        console.error('Error al cargar carrito:', error);
        if (render) showModal(`Error al cargar el carrito: ${error.message}`, 'errorModal');
    }
}

/**
 * Renderiza la lista de ítems en la página del carrito.
 */
function renderCart(items, totalPrice) {
    const container = document.getElementById('cart-items-container');
    const totalElement = document.getElementById('cart-total');
    if (!container || !totalElement) return;

    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<div class="alert alert-info text-center">Tu carrito está vacío.</div>';
        totalElement.textContent = formatPrice(0);
        return;
    }

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-group-item d-flex align-items-center justify-content-between mb-3 shadow-sm rounded-3';
        
        // Contenido del ítem del carrito
        itemDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${item.imgUrl || 'https://placehold.co/60x60/f0f0f0/333?text=IMG'}" alt="${item.name}" class="rounded me-3" style="width:60px; height:60px; object-fit: cover;">
                <div class="flex-grow-1">
                    <h6 class="mb-0 fw-bold">${item.name}</h6>
                    <p class="mb-0 text-muted">${formatPrice(item.price)} x ${item.quantity}</p>
                    <p class="mb-0 fw-bold text-success">${formatPrice(item.price * item.quantity)}</p>
                </div>
            </div>
            <div class="d-flex align-items-center">
                <input type="number" class="form-control form-control-sm me-2 text-center" style="width: 70px;" 
                    value="${item.quantity}" min="1" max="100" 
                    onchange="updateCartItemQuantity('${item.productId}', this.value)">
                <button class="btn btn-sm btn-outline-danger" onclick="updateCartItemQuantity('${item.productId}', 0)">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(itemDiv);
    });

    totalElement.textContent = formatPrice(totalPrice);
}

/**
 * Actualiza la cantidad de un ítem en el carrito o lo elimina (cantidad 0).
 */
async function updateCartItemQuantity(productId, newQuantity) {
    const quantity = parseInt(newQuantity);

    if (isNaN(quantity) || quantity < 0) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/update`, {
            method: 'PUT',
            headers: createAuthHeaders(),
            body: JSON.stringify({ productId, quantity })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Error al actualizar el carrito.');
        }

        // Recarga y renderiza el carrito
        await loadCart(true); 
        showModal(quantity === 0 ? 'Producto eliminado del carrito.' : 'Cantidad actualizada.', 'successModal');

    } catch (error) {
        showModal(`Error: ${error.message}`, 'errorModal');
    }
}
window.updateCartItemQuantity = updateCartItemQuantity;



// 4. LÓGICA DE PEDIDOS Y CHECKOUT

/**
 * Procesa el checkout moviendo el carrito a un pedido.
 */
async function handleCheckout() {
    if (currentCartItems.length === 0) {
        showModal('Tu carrito está vacío.', 'errorModal');
        return;
    }

    // SIMULACIÓN DE PAGO EXTERNO
    const paymentSuccess = Math.random() > 0.1; // 90% de éxito

    if (!paymentSuccess) {
        showModal('El pago fue rechazado por el banco. Intenta de nuevo.', 'errorModal');
        return;
    }
    // FIN SIMULACIÓN DE PAGO EXTERNO

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: createAuthHeaders()
            // El body no es necesario, el servidor usa el carrito del usuario.
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error desconocido al crear el pedido.');
        }

        // Éxito: vacía el carrito y redirige.
        currentCartItems = [];
        updateCartCounter(0);
        window.location.href = `post_pago.html?status=${result.status}&orderId=${result.orderId}`;

    } catch (error) {
        showModal(`Error de Checkout: ${error.message}`, 'errorModal');
    }
}
window.handleCheckout = handleCheckout;

/**
 * Carga los pedidos del cliente autenticado.
 */
async function loadOrders() {
    if (!getAuthToken()) {
        document.getElementById('orders-container').innerHTML = '<div class="alert alert-warning">Inicia sesión para ver tu historial de pedidos.</div>';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/user`, {
            method: 'GET',
            headers: createAuthHeaders()
        });
        
        const orders = await response.json();
        if (!response.ok) {
            throw new Error(orders.message || 'Error al cargar los pedidos.');
        }

        renderClientOrders(orders);

    } catch (error) {
        showModal(`Error al cargar tus pedidos: ${error.message}`, 'errorModal');
    }
}

/**
 * Dibuja el historial de pedidos del cliente.
 */
function renderClientOrders(orders) {
    const container = document.getElementById('orders-container');
    if (!container) return;

    container.innerHTML = '';
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="alert alert-info text-center">Aún no tienes pedidos. ¡Empieza a comprar!</div>';
        return;
    }

    orders.forEach(order => {
        const statusClass = order.status === 'Delivered' ? 'bg-success' : order.status === 'Cancelled' ? 'bg-danger' : 'bg-warning';
        const orderDiv = document.createElement('div');
        orderDiv.className = 'card shadow-sm mb-4';

        orderDiv.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Pedido #${order._id.substring(0, 8)}</h5>
                <span class="badge ${statusClass} text-white">${order.status}</span>
            </div>
            <div class="card-body">
                <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Total:</strong> ${formatPrice(order.totalAmount)}</p>
                <h6>Detalles:</h6>
                <ul class="list-group list-group-flush">
                    ${order.items.map(item => `<li class="list-group-item">${item.name} (${item.quantity} x ${formatPrice(item.price)})</li>`).join('')}
                </ul>
            </div>
            <div class="card-footer text-end">
                <button class="btn btn-sm btn-outline-danger" 
                    onclick="openCancelOrderModal('${order._id}')" 
                    ${order.status !== 'Pending' ? 'disabled' : ''}>
                    Anular Pedido
                </button>
            </div>
        `;
        container.appendChild(orderDiv);
    });
}
window.renderClientOrders = renderClientOrders;

/**
 * Abre el modal para confirmar la anulación del pedido.
 */
function openCancelOrderModal(orderId) {
    document.getElementById('confirm-cancel-button').dataset.orderId = orderId;
    const modalElement = document.getElementById('anularModal');
    if (modalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        const modalInstance = new bootstrap.Modal(modalElement);
        modalInstance.show();
    }
}
window.openCancelOrderModal = openCancelOrderModal;

/**
 * Envía la solicitud de anulación (cambio de estado a 'Cancelled').
 */
async function handleCancelOrder() {
    const orderId = document.getElementById('confirm-cancel-button').dataset.orderId;
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: createAuthHeaders(),
            body: JSON.stringify({ status: 'Cancelled' })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Error al anular el pedido.');
        }

        // Cierra el modal y recarga los pedidos
        bootstrap.Modal.getInstance(document.getElementById('anularModal')).hide();
        await loadOrders(); 
        showModal('Tu pedido ha sido anulado con éxito.', 'successModal');

    } catch (error) {
        showModal(`Error de Anulación: ${error.message}`, 'errorModal');
    }
}
window.handleCancelOrder = handleCancelOrder;



// 5. LÓGICA DE ADMINISTRACIÓN (CON JWT)

/**
 * Verifica el rol de administrador y redirige si no lo tiene.
 */
function checkAdminAccess() {
    if (getUserRole() !== 'admin') {
        showModal('Acceso denegado. Se requieren permisos de Administrador.', 'errorModal');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return false;
    }
    return true;
}

// Lógica de Producto (CRUD) 

function goToEditProduct(productId) {
    window.location.href = `admin_editar_producto.html?id=${productId}`;
}
window.goToEditProduct = goToEditProduct; 

function goToCreateProduct() {
    window.location.href = 'admin_crear_producto.html';
}
window.goToCreateProduct = goToCreateProduct; 

// Funciones de Gestión de Productos (CRUD Admin)

async function fetchAdminProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`); 
        if (!response.ok) { throw new Error(`Error HTTP: ${response.status}`); }
        return await response.json();
    } catch (error) {
        throw new Error("No se pudo conectar al servidor de productos."); 
    }
}

function renderAdminProducts(products) {
    const container = document.getElementById('product-list-container');
    if (!container) return;
    container.innerHTML = ''; 
    if (products.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted lead">No hay productos registrados.</p></div>';
        return;
    }

    products.forEach(product => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3 mb-4';
        const stockColor = product.stock > 10 ? 'text-success' : product.stock > 0 ? 'text-warning' : 'text-danger';

        col.innerHTML = `
            <div class="card h-100 product-card shadow-sm">
                <div style="height: 100px; background-color: #f0f0f0;">
                    <img src="${product.imgUrl || 'https://placehold.co/100x100/4CAF50/FFFFFF?text=IMAGEN'}" 
                        alt="${product.name}" 
                        class="w-100 h-100 object-fit-cover rounded-top"
                        onerror="this.onerror=null; this.src='https://placehold.co/100x100/F0F0F0/4CAF50?text=SIN+IMG';"
                    />
                </div>
                <div class="card-body p-3">
                    <h6 class="card-title fw-bold text-truncate mb-1">${product.name}</h6>
                    <ul class="product-info list-unstyled mt-2">
                        <li><span class="fw-bold">Precio:</span> ${formatPrice(product.price)}</li>
                        <li><span class="fw-bold ${stockColor}">Stock:</span> ${product.stock} unid.</li>
                    </ul>
                </div>
                <div class="card-footer text-center p-2 border-0 bg-white">
                    <button class="btn btn-sm btn-ecomarket-secondary w-100" onclick="goToEditProduct('${product._id}')">
                        <i class="bi bi-pencil-square me-2"></i> Editar
                    </button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

function initAdminProductsPage() {
    if (!checkAdminAccess()) return;
    fetchAdminProducts()
        .then(products => renderAdminProducts(products))
        .catch(error => showModal(`Error al cargar productos: ${error.message}`, 'errorModal'));
}

async function handleEditProductSubmit(e) {
    if (!checkAdminAccess()) return;
    const form = e.currentTarget;
    e.preventDefault();
    e.stopPropagation();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }
    const productId = document.getElementById('product-id').value; 
    const productData = { /* ... */ }; // Recolectar datos del formulario
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, { method: 'PUT', headers: createAuthHeaders(), body: JSON.stringify(productData) });
        const result = await response.json(); 
        if (!response.ok) { throw new Error(result.message || 'Error al actualizar el producto.'); }
        showModal(`Producto actualizado con éxito.`, 'successModal');
        setTimeout(goBackToList, 1500); 
    } catch (error) { showModal(`Error de Edición: ${error.message}`, 'errorModal'); }
}

async function deleteProduct() {
    if (!checkAdminAccess()) return;
    const productId = document.getElementById('product-id').value; 
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, { method: 'DELETE', headers: createAuthHeaders() });
        const result = await response.json();
        if (response.ok) {
            showModal(`Producto eliminado con éxito.`, 'successModal');
            setTimeout(goBackToList, 1500);
        } else {
            showModal(`Error al eliminar el producto: ${result.message}`, 'errorModal');
        }
    } catch (error) { showModal('Error de conexión con el servidor.', 'errorModal'); } 
}
window.deleteProduct = deleteProduct; 

function loadProductData(product) { /* ... Lógica para cargar datos en el formulario ... */ }

function initAdminEditProductPage() {
    if (!checkAdminAccess()) return;
    const editProductForm = document.getElementById('edit-product-form');
    if (editProductForm) {
        editProductForm.addEventListener('submit', handleEditProductSubmit);
        const productId = getParamFromUrl('id'); 
        if (productId) {
            fetch(`${API_BASE_URL}/products/${productId}`)
                .then(response => response.ok ? response.json() : Promise.reject(new Error('Producto no encontrado')))
                .then(product => loadProductData(product))
                .catch(error => showModal(`Error al cargar datos: ${error.message}`, 'errorModal'));
        } else { showModal('No se proporcionó ID de producto.', 'errorModal'); }
    }
}


// Lógica de Dashboard

async function initAdminDashboardListeners() {
    if (!checkAdminAccess()) return;

    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
            method: 'GET',
            headers: createAuthHeaders()
        });
        
        const stats = await response.json();

        if (!response.ok) {
            throw new Error(stats.message || 'Error al obtener estadísticas.');
        }

        // 1. Mostrar Estadísticas
        document.getElementById('stat-products').textContent = stats.productCount;
        document.getElementById('stat-orders').textContent = stats.orderCount;
        document.getElementById('stat-sales').textContent = formatPrice(stats.totalSales);
        
        // 2. Renderizar Últimos Pedidos
        renderRecentOrders(stats.recentOrders);

    } catch (error) {
        showModal(`Error al cargar Dashboard: ${error.message}`, 'errorModal');
    }
}

function renderRecentOrders(orders) {
    const container = document.getElementById('recent-orders-container');
    if (!container) return;

    container.innerHTML = '';
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order._id.substring(0, 8)}</td>
            <td>${order.userId.email}</td>
            <td>${formatPrice(order.totalAmount)}</td>
            <td><span class="badge ${order.status === 'Delivered' ? 'bg-success' : 'bg-warning'}">${order.status}</span></td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
        `;
        container.appendChild(row);
    });
}

// Lógica de Pedidos Admin

async function initAdminOrdersPage() {
    if (!checkAdminAccess()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/orders/admin`, {
            method: 'GET',
            headers: createAuthHeaders()
        });
        
        const orders = await response.json();
        if (!response.ok) {
            throw new Error(orders.message || 'Error al cargar los pedidos de administración.');
        }

        renderAdminOrders(orders);

    } catch (error) {
        showModal(`Error al cargar Pedidos Admin: ${error.message}`, 'errorModal');
    }
}

function renderAdminOrders(orders) {
    const container = document.getElementById('admin-orders-table-body');
    if (!container) return;

    container.innerHTML = '';
    orders.forEach(order => {
        const row = document.createElement('tr');
        const statusClass = order.status === 'Delivered' ? 'bg-success' : order.status === 'Cancelled' ? 'bg-danger' : 'bg-warning';
        
        row.innerHTML = `
            <td>#${order._id.substring(0, 8)}</td>
            <td>${order.userId.email}</td>
            <td>${formatPrice(order.totalAmount)}</td>
            <td><span class="badge ${statusClass} text-white">${order.status}</span></td>
            <td>${new Date(order.createdAt).toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="openEditStatusModal('${order._id}', '${order.status}')">
                    Cambiar Estado
                </button>
            </td>
        `;
        container.appendChild(row);
    });
}

function openEditStatusModal(orderId, currentStatus) {
    const modalElement = document.getElementById('statusEditModal');
    document.getElementById('edit-order-id').value = orderId;
    document.getElementById('select-status').value = currentStatus;
    
    if (modalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        new bootstrap.Modal(modalElement).show();
    }
}
window.openEditStatusModal = openEditStatusModal;

async function updateOrderStatus() {
    const orderId = document.getElementById('edit-order-id').value;
    const status = document.getElementById('select-status').value;

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: createAuthHeaders(),
            body: JSON.stringify({ status })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Error al actualizar el estado.');
        }

        bootstrap.Modal.getInstance(document.getElementById('statusEditModal')).hide();
        await initAdminOrdersPage(); // Recargar la lista de pedidos
        showModal('Estado del pedido actualizado.', 'successModal');
        
    } catch (error) {
        showModal(`Error al actualizar estado: ${error.message}`, 'errorModal');
    }
}
window.updateOrderStatus = updateOrderStatus;



// --- FUNCIÓN PRINCIPAL DE INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;
    
    // Configuración de botones de Logout
    if (pageId.includes('-page') || pageId.includes('admin-')) {
        setupLogoutButton('logout-button');
    }

    // Lógica principal basada en la página
    if (pageId === 'register-page') { 
        document.getElementById('register-form')?.addEventListener('submit', handleRegisterSubmit); 
    }
    if (pageId === 'login-page') { 
        document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit); 
    }
    if (pageId === 'profile-page') { loadUserProfile(); }

    if (pageId === 'catalogue-page' || pageId === 'promotions-page') { 
        loadCatalogue(); 
        const filterForm = document.getElementById('filter-form');
        if (filterForm) { filterForm.addEventListener('submit', handleFilterSubmit); }
    }
    
    if (pageId === 'cart-page') {
        loadCart(true); // Renderiza la vista del carrito
        document.getElementById('checkout-button')?.addEventListener('click', handleCheckout);
    }
    
    if (pageId === 'orders-page') { loadOrders(); }
    
    if (pageId === 'post-pago-page') {
        // Lógica de Post Pago (muestra modal basado en URL, no interactúa con API)
        const status = getParamFromUrl('status');
        const orderId = getParamFromUrl('orderId');
        
        const modalTitle = document.getElementById('statusModalLabel');
        const modalBody = document.getElementById('statusModalBody');

        if (status === 'success') {
            modalTitle.textContent = '¡Pago Exitoso!';
            modalBody.innerHTML = `<p class="lead">Tu pedido N° <strong>${orderId}</strong> ha sido confirmado y será procesado pronto.</p>`;
        } else {
            modalTitle.textContent = 'Error en el Pago';
            modalBody.innerHTML = `<p class="lead">Lo sentimos, hubo un problema al procesar tu pago.</p>`;
            const okButton = document.querySelector('#statusModal .btn-primary');
            if(okButton) okButton.classList.replace('btn-primary', 'btn-danger');
        }
        
        const modalElement = document.getElementById('statusModal');
        if (modalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            new bootstrap.Modal(modalElement).show();
        }
        document.querySelector('#statusModal .btn-primary, #statusModal .btn-danger')?.addEventListener('click', goToCatalog);
    }

    // Lógica de Administración
    if (pageId === 'admin-page') { initAdminDashboardListeners(); }
    if (pageId === 'admin-products-page') { initAdminProductsPage(); }
    if (pageId === 'admin-create-product-page') { /* initAdminCreateProductPage() */ }
    if (pageId === 'admin-edit-product-page') { initAdminEditProductPage(); }
    if (pageId === 'admin-orders-page') { initAdminOrdersPage(); }
});