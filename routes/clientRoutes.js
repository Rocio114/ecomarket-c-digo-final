const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');

const {
    getProfile,
    updateProfile
} = require('../controllers/clientController');

// ===========================
// PERFIL DEL CLIENTE
// ===========================
router.get('/profile', auth, getProfile);

// ===========================
// ACTUALIZAR PERFIL
// ===========================
router.put('/profile', auth, updateProfile);

module.exports = router;
