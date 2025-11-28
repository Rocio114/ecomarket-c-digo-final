const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Importamos el middleware CORS
const jwt = require('jsonwebtoken');

// Configuración de la Aplicación
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = 'mongodb+srv://Rocio:bcd23456@dbecomarket.agkm8ny.mongodb.net/ecomarket?retryWrites=true&w=majority';
const JWT_SECRET = 'ecomarket-secret-key-123'; // Clave secreta para JWT

// Middleware para parsear JSON
app.use(express.json());

// Configuración CORS

app.use(cors()); 

// Conexión a MongoDB Atlas
mongoose.connect(MONGO_URI)
    .then(() => console.log('Conexión exitosa a MongoDB Atlas.'))
    .catch(err => {
        console.error('Error de conexión a la base de datos:', err);
        process.exit(1); // Salir si la conexión falla
    });

// Modelos
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    desc: { type: String },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    category: { type: String, required: true },
    imgUrl: { type: String }
});
const Product = mongoose.model('Product', ProductSchema);

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['client', 'admin'], default: 'client' }
});
const User = mongoose.model('User', UserSchema);

const CartItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    price: Number,
    quantity: { type: Number, required: true, default: 1 },
    imgUrl: String
});

const CartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [CartItemSchema]
});
const Cart = mongoose.model('Cart', CartSchema);

const OrderItemSchema = new mongoose.Schema({
    name: String,
    price: Number,
    quantity: Number,
    productId: mongoose.Schema.Types.ObjectId
});

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);


// Middleware de Autenticación (JWT)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Espera formato "Bearer TOKEN"

    if (token == null) return res.sendStatus(401); // No autorizado

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Token no válido/expirado
        req.user = user; // user contiene { id, email, role }
        next();
    });
};

// ENDPOINTS DE AUTENTICACIÓN

app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    }
    try {
        const newUser = new User({ email, password });
        await newUser.save();
        res.status(201).json({ message: 'Usuario registrado exitosamente. Por favor, inicia sesión.' });
    } catch (error) {
        if (error.code === 11000) { // Error de clave duplicada (email)
            return res.status(409).json({ message: 'Este email ya está registrado.' });
        }
        res.status(500).json({ message: 'Error en el servidor al registrar el usuario.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    }
    
    try {
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Generar JWT
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' } // El token expira en 24 horas
        );

        res.json({ 
            token, 
            userId: user._id,
            email: user.email,
            role: user.role,
            message: 'Inicio de sesión exitoso.'
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor al iniciar sesión.' });
    }
});

// ENDPOINTS DE PRODUCTOS

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener productos.' });
    }
});


// ENDPOINTS DE CARRITO

// Obtener el carrito del usuario
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            cart = await Cart.create({ userId: req.user.id, items: [] });
        }
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el carrito.' });
    }
});

// Añadir producto al carrito
app.post('/api/cart/add', authenticateToken, async (req, res) => {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);
    
    if (!product) return res.status(404).json({ message: 'Producto no encontrado.' });
    if (product.stock < quantity) return res.status(400).json({ message: `Solo hay ${product.stock} unidades en stock.` });

    try {
        let cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) cart = new Cart({ userId: req.user.id, items: [] });

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex > -1) {
            const newQuantity = cart.items[itemIndex].quantity + quantity;
            if (product.stock < newQuantity) {
                return res.status(400).json({ message: `No se puede añadir más. Stock máximo: ${product.stock}.` });
            }
            cart.items[itemIndex].quantity = newQuantity;
        } else {
            cart.items.push({ 
                productId, 
                quantity, 
                name: product.name,
                price: product.price,
                imgUrl: product.imgUrl
            });
        }

        await cart.save();
        res.json({ message: 'Producto añadido al carrito.', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error al añadir producto al carrito.' });
    }
});

// Actualizar cantidad o eliminar
app.put('/api/cart/update', authenticateToken, async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        let cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) return res.status(404).json({ message: 'Carrito no encontrado.' });

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) return res.status(404).json({ message: 'Producto no está en el carrito.' });

        if (quantity <= 0) {
            // Eliminar item si la cantidad es 0 o menos
            cart.items.splice(itemIndex, 1);
        } else {
            const product = await Product.findById(productId);
            if (!product) return res.status(404).json({ message: 'Producto no encontrado.' });
            
            if (product.stock < quantity) {
                return res.status(400).json({ message: `Solo hay ${product.stock} unidades en stock.` });
            }
            cart.items[itemIndex].quantity = quantity;
        }
        
        await cart.save();
        res.json({ message: 'Carrito actualizado.', cart });

    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el carrito.' });
    }
});


// ENDPOINTS DE PEDIDOS (Checkout)

// Crear un nuevo pedido (Checkout)
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'El carrito está vacío.' });
        }

        let totalAmount = 0;
        const orderItems = [];

        for (const cartItem of cart.items) {
            const product = await Product.findById(cartItem.productId);
            
            if (!product || product.stock < cartItem.quantity) {
                // Validación estricta de stock
                return res.status(400).json({ message: `Stock insuficiente para ${cartItem.name}.` });
            }

            // Descontar stock
            product.stock -= cartItem.quantity;
            await product.save();

            totalAmount += cartItem.price * cartItem.quantity;
            orderItems.push({
                name: cartItem.name,
                price: cartItem.price,
                quantity: cartItem.quantity,
                productId: cartItem.productId
            });
        }

        // Crear el nuevo pedido
        const newOrder = new Order({
            userId: req.user.id,
            items: orderItems,
            totalAmount: totalAmount,
            status: 'Pending'
        });
        await newOrder.save();

        // Vaciar el carrito después del pedido
        cart.items = [];
        await cart.save();
        
        // Retornar la respuesta al cliente
        res.status(201).json({ message: 'Pedido realizado con éxito.', order: newOrder });

    } catch (error) {
        console.error('Error durante el checkout:', error);
        res.status(500).json({ message: 'Error en el servidor al procesar el pedido.' });
    }
});

// Obtener historial de pedidos del usuario
app.get('/api/orders/user', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los pedidos.' });
    }
});


// Seeder/Inicializador de Productos
app.post('/api/seed-products', async (req, res) => {
    // Solo para desarrollo, para poblar la DB con datos iniciales
    try {
        await Product.deleteMany({}); // Limpia productos existentes
        await User.deleteMany({ email: 'client@ecomarket.com' }); // Limpia usuario de prueba
        await Cart.deleteMany({}); // Limpia carritos

        // Crea un usuario de prueba (contraseña sin hash, solo para este entorno)
        const clientUser = new User({ email: 'client@ecomarket.com', password: 'password123', role: 'client' });
        await clientUser.save();

        const initialProducts = [
            { name: 'Manzana Orgánica', desc: 'Frescas y crujientes manzanas rojas.', price: 1.50, stock: 50, category: 'Frutas', imgUrl: 'https://placehold.co/400x300/F05050/FFFFFF?text=MANZANA' },
            { name: 'Espinaca Fresca', desc: 'Hojas de espinaca cultivadas sin pesticidas.', price: 2.80, stock: 35, category: 'Vegetales', imgUrl: 'https://placehold.co/400x300/4CAF50/FFFFFF?text=ESPINACA' },
            { name: 'Pan Integral Artesanal', desc: 'Hecho con masa madre y granos enteros.', price: 4.99, stock: 20, category: 'Panadería', imgUrl: 'https://placehold.co/400x300/D4A462/FFFFFF?text=PAN+INTEGRAL' },
            { name: 'Leche de Almendras', desc: 'Bebida vegetal sin lactosa, 1 litro.', price: 3.25, stock: 45, category: 'Lácteos', imgUrl: 'https://placehold.co/400x300/ADD8E6/FFFFFF?text=LECHE+ALM' },
        ];
        await Product.insertMany(initialProducts);

        res.json({ message: 'Base de datos inicializada con éxito y usuario de prueba creado.', products: initialProducts, user: clientUser });
    } catch (error) {
        console.error('Error en el seeder:', error);
        res.status(500).json({ message: 'Error al inicializar la base de datos.' });
    }
});


// Inicio del Servidor 
app.listen(PORT, () => {
    console.log(`Servidor de Ecomarket corriendo en http://localhost:${PORT}`);
    console.log("¡EJECUTA /api/seed-products UNA VEZ para inicializar la DB!");
});