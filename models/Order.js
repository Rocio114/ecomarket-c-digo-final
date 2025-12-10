const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    orderId: { type: Number, unique: true }, // número incremental único

    clientId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },

    clientEmail: { type: String, required: true },

    items: [
        {
            productId: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: "Product",
                required: true
            },
            name: { type: String, required: true },
            quantity: { type: Number, required: true },
            unitPrice: { type: Number, required: true }
        }
    ],

    totalAmount: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Anulado'],
        default: 'Pendiente'
    },

    cancellationReason: { type: String, default: null }

}, { timestamps: true }); // crea createdAt + updatedAt automáticamente

module.exports = mongoose.model('Order', OrderSchema);
