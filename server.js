// =============================== 
//        IMPORTS Y SETUP
// ===============================
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

// ===============================
//        INICIALIZAR APP
// ===============================
const app = express();
app.use(cors()); // permite todo por ahora

// Conectar a MongoDB
connectDB();

// ===============================
//        MIDDLEWARES
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir imágenes subidas
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir archivos estáticos de la carpeta frontend
app.use(express.static(path.join(__dirname, 'public')));

// ===============================
//        RUTAS
// ===============================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/client', require('./routes/clientRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Catch-all SOLO para rutas que NO empiecen con /api
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===============================
//   MANEJO GLOBAL DE ERRORES
// ===============================
app.use((err, req, res, next) => {
    console.error('ERROR GLOBAL:', err);
    res.status(500).json({
        error: err.message || 'Error interno en el servidor'
    });
});

// ===============================
//   MANEJO DE CRASHES DE NODE
// ===============================
process.on('unhandledRejection', (reason) => {
    console.error('⚠ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

// ===============================
//        INICIAR SERVIDOR
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor funcionando en puerto ${PORT}`));