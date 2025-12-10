const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');

// ======================================================
// POST /api/admin/users → Crear usuarios
// ======================================================
exports.createUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            sex,
            address,
            role,
            run,
            fechaNacimiento
        } = req.body;

        if (!name || !email || !password || !run || !fechaNacimiento) {
            return res.status(400).json({ message: "Faltan campos obligatorios" });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name,
            email,
            password: hash,
            phone,
            sex,
            address,
            role,
            run,
            fechaNacimiento
        });

        res.status(201).json({ message: "Usuario creado", user: newUser });

    } catch (error) {
        console.error("Error al crear usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// ======================================================
// GET /api/admin/analytics/sales
// ======================================================
exports.getSalesReport = async (req, res) => {
    try {
        const { period = "month", type = "ventas" } = req.query;

        const orders = await Order.find();
        const products = await Product.find();

        const hasOrders = orders.length > 0;

        // ================================
        // 1️⃣ Ventas Totales (Monto)
        // ================================
        if (type === "ventas") {
            let buckets = {};

            if (hasOrders) {
                orders.forEach(o => {
                    const date = new Date(o.createdAt);
                    let key = "";

                    if (period === "day") key = `${date.getHours()}:00`;
                    else if (period === "week") {
                        const days = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
                        key = days[date.getDay()];
                    }
                    else if (period === "month") key = `Semana ${Math.ceil(date.getDate() / 7)}`;
                    else if (period === "year") {
                        const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
                        key = months[date.getMonth()];
                    }

                    buckets[key] = (buckets[key] || 0) + o.totalAmount;
                });
            } else {
                // Sin órdenes → random
                if (period === "day") buckets = {"00:00":0,"03:00":0,"06:00":0,"09:00":0,"12:00":0,"15:00":0,"18:00":0,"21:00":0};
                else if (period === "week") buckets = {"Lun":0,"Mar":0,"Mié":0,"Jue":0,"Vie":0,"Sáb":0,"Dom":0};
                else if (period === "month") buckets = {"Semana 1":0,"Semana 2":0,"Semana 3":0,"Semana 4":0};
                else if (period === "year") buckets = {"Ene":0,"Feb":0,"Mar":0,"Abr":0,"May":0,"Jun":0,"Jul":0,"Ago":0,"Sep":0,"Oct":0,"Nov":0,"Dic":0};

                for (let key in buckets) {
                    buckets[key] = randomBetween(10_000_000, 25_000_000);
                }
            }

            return res.json({
                title: "Total de Ventas",
                labels: Object.keys(buckets),
                values: Object.values(buckets)
            });
        }

        // ================================
        // 2️⃣ Ventas por Producto
        // ================================
        if (type === "producto") {
            if (!products.length) {
                return res.json({
                    title: "Top Productos",
                    labels: ["Producto A", "Producto B", "Producto C"],
                    values: [100, 80, 60]
                });
            }

            const productSales = {};

            if (hasOrders) {
                orders.forEach(order => {
                    order.items.forEach(item => {
                        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
                    });
                });
            } else {
                products.slice(0,5).forEach(p => {
                    productSales[p.name] = randomBetween(50, 400);
                });
            }

            return res.json({
                title: "Ventas por Producto",
                labels: Object.keys(productSales),
                values: Object.values(productSales)
            });
        }

        // ================================
        // 3️⃣ Ventas por Tipo / Categoría
        // ================================
        if (type === "tipo") {
            if (!products.length) {
                return res.json({
                    title: "Ventas por Categoría",
                    labels: ["Frutas","Verduras","Lácteos"],
                    values: [5_000_000, 3_000_000, 2_000_000]
                });
            }

            const categorySales = {};
            products.forEach(p => {
                categorySales[p.category] = (categorySales[p.category] || 0) + randomBetween(3_000_000, 18_000_000);
            });

            return res.json({
                title: "Ventas por Categoría",
                labels: Object.keys(categorySales),
                values: Object.values(categorySales)
            });
        }

    } catch (error) {
        console.error("Error en getSalesReport:", error);
        res.status(500).json({ message: "Error al generar reporte" });
    }
};

// =========================================================
const randomBetween = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
