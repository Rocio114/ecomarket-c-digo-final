const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');

const {
    createOrder,
    getClientOrders,
    cancelOrder,
    getAllOrders,
    updateOrderStatus
} = require('../controllers/orderController');

// ========================
// CLIENTE
// ========================
router.post('/', auth, createOrder);
router.get('/client', auth, getClientOrders);
router.put('/:orderId/cancel', auth, cancelOrder);

// ========================
// ADMIN
// ========================
router.get('/admin', auth, admin, getAllOrders);
router.put('/admin/:orderId/status', auth, admin, updateOrderStatus);

module.exports = router;
