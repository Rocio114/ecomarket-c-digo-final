const Order = require('../models/Order');
const Product = require('../models/Product');

// ======================================================
// POST /api/orders → Crear pedido
// ======================================================
exports.createOrder = async (req, res) => {
    try {
        const { items, totalAmount, shippingCost } = req.body;

        // Validación básica
        if (!items || items.length === 0) {
            return res.status(400).json({ message: "El pedido no contiene productos" });
        }

        if (totalAmount == null || shippingCost == null) {
            return res.status(400).json({ message: "Datos de pago incompletos" });
        }

        // Validar stock de cada producto
        for (const item of items) {
            const product = await Product.findById(item.productId);

            if (!product) {
                return res.status(404).json({ message: `Producto no encontrado: ${item.productId}` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Stock insuficiente para ${product.name}`
                });
            }
        }

        // Generar orderId incremental
        const last = await Order.findOne().sort({ orderId: -1 });
        const nextOrderId = last ? last.orderId + 1 : 1;

        // Crear pedido
        await Order.create({
            orderId: nextOrderId,
            clientId: req.user.id,
            clientEmail: req.user.email,
            items,
            totalAmount,
            shippingCost
        });

        // Descontar stock
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }

        res.json({
            message: "Pedido creado correctamente",
            orderId: nextOrderId
        });

    } catch (error) {
        console.error("Error en createOrder:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// ======================================================
// GET /api/orders/client → Pedidos del usuario
// ======================================================
exports.getClientOrders = async (req, res) => {
    try {
        const orders = await Order.find({ clientId: req.user.id })
            .sort({ createdAt: -1 });

        res.json({ orders });

    } catch (error) {
        console.error("Error en getClientOrders:", error);
        res.status(500).json({ message: "Error interno" });
    }
};

// ======================================================
// PUT /api/orders/:orderId/cancel → Cancelar pedido
// ======================================================
exports.cancelOrder = async (req, res) => {
    try {
        const { reason } = req.body;
        const orderId = parseInt(req.params.orderId, 10);

        const order = await Order.findOne({ orderId });

        if (!order)
            return res.status(404).json({ message: "Pedido no encontrado" });

        if (order.clientId.toString() !== req.user.id)
            return res.status(403).json({ message: "No autorizado" });

        if (order.status === "Anulado")
            return res.json({ message: "El pedido ya está anulado" });

        if (order.status === "Entregado")
            return res.status(400).json({ message: "No se puede anular un pedido ya entregado" });

        // Restablecer stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: item.quantity }
            });
        }

        order.status = "Anulado";
        order.cancellationReason = reason;
        await order.save();

        res.json({ message: "Pedido anulado correctamente" });

    } catch (error) {
        console.error("Error en cancelOrder:", error);
        res.status(500).json({ message: "Error interno" });
    }
};

// ======================================================
// GET /api/orders/admin → Pedidos para admin
// ======================================================
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });

        res.json({ orders });

    } catch (error) {
        console.error("Error en getAllOrders:", error);
        res.status(500).json({ message: "Error interno" });
    }
};

// ======================================================
// PUT /api/orders/admin/:orderId/status → Cambiar estado
// ======================================================
exports.updateOrderStatus = async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId, 10);
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: "Estado requerido" });
        }

        const order = await Order.findOne({ orderId });

        if (!order)
            return res.status(404).json({ message: "Pedido no encontrado" });

        // Si el admin anula el pedido → devolver stock
        if (status === "Anulado" && order.status !== "Anulado") {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.productId, {
                    $inc: { stock: item.quantity }
                });
            }
        }

        order.status = status;
        await order.save();

        res.json({ message: "Estado actualizado correctamente" });

    } catch (error) {
        console.error("Error en updateOrderStatus:", error);
        res.status(500).json({ message: "Error interno" });
    }
};