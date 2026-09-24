// models/productModel.js
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, enum: ['بار گرم', 'بار سرد'], required: true },
    imageUrl: { type: String, default: '/images/default.png' },
    rating: { type: Number, default: 0 },
    maxOrderPerUser: { type: Number, default: 5 },
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);