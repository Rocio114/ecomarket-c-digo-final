const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================
// REGISTRO (solo cliente)
// ==========================
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone, sex, address, run, fechaNacimiento, role } = req.body;


        if (!name || !email || !password) {
            return res.status(400).json({ message: "Nombre, email y contraseña son obligatorios" });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }

        const hash = bcrypt.hashSync(password, 10);

        await User.create({
            name,
            email: email.toLowerCase(),
            password: hash,
            phone: phone,
            sex: sex,
            address: address,
            run: run,
            fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
            role: "client" // NO PERMITIR crear admins
        });

        res.json({ message: "Usuario registrado correctamente" });

    } catch (error) {
        console.error("Error en register:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// ==========================
// LOGIN
// ==========================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        const ok = bcrypt.compareSync(password, user.password);
        if (!ok) return res.status(400).json({ message: "Contraseña incorrecta" });

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                sex: user.sex,
                address: user.address,
                run: user.run,
                fechaNacimiento: user.fechaNacimiento,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};
