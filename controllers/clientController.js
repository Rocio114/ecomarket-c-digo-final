const User = require('../models/User');
const bcrypt = require('bcryptjs');

// =========================================
// GET /api/client/profile
// =========================================
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        res.json(user);

    } catch (error) {
        console.error("Error en getProfile:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// =========================================
// PUT /api/client/profile
// =========================================
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, address, sex, password } = req.body;

        const updateData = {};

        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;
        if (sex) updateData.sex = sex;

        // Cambiar contraseña opcionalmente
        if (password && password.trim() !== "") {
            const salt = bcrypt.genSaltSync(10);
            updateData.password = bcrypt.hashSync(password, salt);
        }

        let updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Eliminar manualmente contraseña para evitar fugas
        updatedUser = updatedUser.toObject();
        delete updatedUser.password;

        res.json({
            message: "Perfil actualizado correctamente",
            user: updatedUser
        });

    } catch (error) {
        console.error("Error en updateProfile:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};
