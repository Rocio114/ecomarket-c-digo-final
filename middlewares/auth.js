const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No se envió token (header Authorization requerido)" });
    }

    // Esperamos formato: "Bearer token"
    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
        return res.status(401).json({ message: "Formato de token inválido (usar: Bearer <token>)" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();

    } catch (err) {
        console.error("❌ Error verificando JWT:", err.message);
        return res.status(401).json({ message: "Token inválido o expirado" });
    }
};
