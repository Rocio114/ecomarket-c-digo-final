const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');

const {
    register,
    login,
} = require('../controllers/authController');

// ===============================
// AUTENTICACIÓN
// ===============================

// Registro
router.post('/register', register);

// Login
router.post('/login', login);

module.exports = router;