const mongoose = require('mongoose');

// SEO schema
const seoSchema = new mongoose.Schema({
  metaTitle: { type: String },
  metaDescription: { type: String },
  metaKeywords: { type: String },
  canonicalUrl: { type: String }
}, { _id: false });

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  title: { type: String },
  description: { type: String },
  image: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  seo: seoSchema
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);
