const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({

    name: { type: String, required: true },

    email: { 
        type: String, 
        unique: true, 
        required: true,
        lowercase: true,
        trim: true
    },

    password: { type: String, required: true },

    phone: { type: String, required: true },

    sex: { type: String, required: true },

    address: { type: String, required: true },

    run: { type: String, required: true },

    fechaNacimiento: { type: Date, required: true },

    role: { 
        type: String, 
        enum: ['client', 'admin'], 
        default: 'client'
    }

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
