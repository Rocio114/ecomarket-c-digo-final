const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');

const {
    createUser,
    getSalesReport
} = require('../controllers/adminController');

// ===============================
//         ADMIN USERS
// ===============================
router.post('/users', auth, isAdmin, createUser);

// ===============================
//         ADMIN DASHBOARD
// ===============================
router.get('/analytics/sales', auth, isAdmin, getSalesReport);

module.exports = router;
