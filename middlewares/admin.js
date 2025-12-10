module.exports = function (req, res, next) {
    // Verificar que auth.js haya puesto req.user
    if (!req.user) {
        return res.status(401).json({ message: "Autenticación requerida" });
    }

    // Verificar que el usuario tenga rol
    if (!req.user.role) {
        return res.status(403).json({ message: "No autorizado (rol no definido)" });
    }

    // Validar rol
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Acceso denegado: se requiere rol de administrador" });
    }

    next();
};
