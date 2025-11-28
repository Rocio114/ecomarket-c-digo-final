const mongoose = require('mongoose');

// Definición del esquema para un Producto
const ProductSchema = new mongoose.Schema({
    // El id se genera automáticamente por MongoDB (_id)

    name: {
        type: String,
        required: [true, 'El nombre del producto es obligatorio.'],
        trim: true, // Elimina espacios en blanco al inicio y final
        unique: true // Asegura que no haya productos con el mismo nombre
    },
    description: {
        type: String,
        required: false,
        default: 'Producto de alta calidad.'
    },
    price: {
        type: Number,
        required: [true, 'El precio es obligatorio.'],
        min: [0, 'El precio no puede ser negativo.']
    },
    stock: {
        type: Number,
        required: [true, 'El stock es obligatorio.'],
        default: 0,
        min: [0, 'El stock no puede ser negativo.']
    },
    category: {
        type: String,
        required: [true, 'La categoría es obligatoria.'],
        enum: ['Frutas', 'Verduras', 'Panadería', 'Lácteos', 'Otros'],
        default: 'Otros'
    },
    imgUrl: {
        type: String,
        required: [true, 'La URL de la imagen es obligatoria.'],
    },
    // Timestamp para registrar cuándo fue creado/actualizado
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Exporta el modelo para usarlo en las rutas
const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;