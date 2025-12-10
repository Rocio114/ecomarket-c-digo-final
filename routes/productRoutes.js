const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/admin');
const upload = require('../middlewares/upload');

const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

// =======================
//        PUBLIC
// =======================
router.get('/', getProducts);
router.get('/:id', getProductById);

// =======================
//        ADMIN CRUD
// =======================
router.post('/', auth, isAdmin, upload.single('image'), createProduct);
router.put('/:id', auth, isAdmin, upload.single('image'), updateProduct);
router.delete('/:id', auth, isAdmin, deleteProduct);

module.exports = router;
