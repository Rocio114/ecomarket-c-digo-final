const Product = require('../models/Product');

// ======================================================
// GET /api/products
// ======================================================
exports.getProducts = async (req, res) => {
    try {
        let { page = 1, limit = 12, category, search, sort, promotion } = req.query;

        const query = {};
        let categoryMap = {
            fruits: "Frutas",
            vegetables: "Verduras",
            nuts: "Frutos Secos"
        };

        if (category && category !== 'all') {
            query.category = categoryMap[category] || category;
        }
        if (search) query.name = { $regex: search, $options: "i" };
        if (promotion === "true") query.discount = { $gt: 0 }; // productos en promoción

        const total = await Product.countDocuments(query);

        const sortOptions = {};
        if (sort === "price_asc") sortOptions.price = 1;
        if (sort === "price_desc") sortOptions.price = -1;

        const products = await Product.find(query)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const formatted = products.map(p => ({
            _id: p._id,
            name: p.name,
            desc: p.desc,
            price: p.price,
            discount: p.discount,
            precioConDescuento: p.price * (1 - p.discount / 100),
            stock: p.stock,
            category: p.category,
            imgUrl: p.image || null
        }));

        res.json({
            products: formatted,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error("Error en getProducts:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// ======================================================
// GET /api/products/:id
// ======================================================
exports.getProductById = async (req, res) => {
    try {
        const p = await Product.findById(req.params.id);
        if (!p) return res.status(404).json({ message: "Producto no encontrado" });

        res.json({
            _id: p._id,
            name: p.name,
            desc: p.desc,
            price: p.price,
            discount: p.discount,
            precioConDescuento: p.price * (1 - p.discount / 100),
            stock: p.stock,
            category: p.category,
            imgUrl: p.image || null
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Error interno" });
    }
};

// ======================================================
// POST /api/admin/products
// ======================================================
exports.createProduct = async (req, res) => {
    try {
        const { name, desc, price, discount, stock, category } = req.body;

        // Validaciones básicas
        if (!name || !desc || !price || discount === undefined || discount < 0 || discount > 99 || !stock || !category) {
            return res.status(400).json({ message: "Todos los campos son obligatorios y descuento debe ser 0-99" });
        }

        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        const newProduct = new Product({
            name,
            desc,
            price: Number(price),
            discount: Number(discount),
            stock: Number(stock),
            category,
            image: imagePath
        });

        await newProduct.save();

        res.json({
            message: 'Producto creado correctamente',
            product: newProduct
        });

    } catch (err) {
        console.error("Error en createProduct:", err);
        res.status(500).json({ error: 'Error al crear producto' });
    }
};

// ======================================================
// PUT /api/admin/products/:id
// ======================================================
exports.updateProduct = async (req, res) => {
    try {
        const { name, desc, price, discount, stock, category } = req.body;

        if (!name || !desc || !price || discount === undefined || discount < 0 || discount > 99 || !stock || !category) {
            return res.status(400).json({ message: "Todos los campos son obligatorios y descuento debe ser 0-99" });
        }

        const updateData = {
            name,
            desc,
            price: Number(price),
            discount: Number(discount),
            stock: Number(stock),
            category
        };

        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        }

        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        res.json({ message: 'Producto actualizado', product: updated });

    } catch (err) {
        console.error("Error en updateProduct:", err);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
};

// ======================================================
// DELETE /api/admin/products/:id
// ======================================================
exports.deleteProduct = async (req, res) => {
    try {
        const prod = await Product.findByIdAndDelete(req.params.id);

        if (!prod) return res.status(404).json({ message: "Producto no encontrado" });

        res.json({ message: "Producto eliminado" });

    } catch (error) {
        console.error("Error en deleteProduct:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};