// models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customer: {
    fullName: String,
    email: String,
    phone: String,
    fullAddress: String,
  },
  products: [
    {
      name: String,
      brand: String,
      color: String,
      size: String,
      price: Number,
      quantity: Number,
      subtotal: Number,
    }
  ],
  totalPrice: Number,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
