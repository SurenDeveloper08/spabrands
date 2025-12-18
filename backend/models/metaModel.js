const mongoose = require("mongoose");

const metaSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    title: { type: String, required: true },
    metaDescription: { type: String, required: true },
    keywords: String,
    canonicalUrl: String,
    robots: { type: String, default: "index, follow" },
    headingTitle: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meta", metaSchema);
