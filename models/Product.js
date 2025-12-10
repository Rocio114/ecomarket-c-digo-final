const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    desc: { type: String, required: true },
    price: { type: Number, required: true },       // precio final
    discount: { type: Number, required: true },   // 0-99
    stock: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true }
});

module.exports = mongoose.model('Product', ProductSchema);
