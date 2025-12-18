const mongoose = require("mongoose");
const slugify = require('slugify');

// Specification sub-schema
const specificationSchema = new mongoose.Schema({
    key: { type: String },
    value: { type: String },
});

// SEO sub-schema
const seoSchema = new mongoose.Schema({
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: { type: String },
    canonicalUrl: { type: String },
});

const variantSchema = new mongoose.Schema({
    color: { type: String },
    images: [
        {
            image: String,
            longImage: String
        }
    ],
    size: { type: String },
    price: { type: Number },
    stock: { type: Number }
});


const productSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    slug: { type: String, unique: true, index: true },

    // Storing slugs instead of ObjectIds
    brand: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: { type: String, required: true },
    description: [{ type: String }],

    specifications: [specificationSchema],

    stock: { type: Number },
    deliveryDays: { type: Number },
    price: { type: Number },
    oldPrice: { type: Number },

    mainImage: { type: String },
    gallery: [
        {
            image: { type: String },
            longImage: { type: String }
        }
    ],
    variants: [variantSchema],
    longImages: [{ type: String }],

    sellGlobally: { type: Boolean, default: true },
    restrictedCountries: [{ type: String }],
    allowedCountries: [{ type: String }],
    isActive: { type: Boolean, default: true },

    seo: seoSchema,

}, { timestamps: true });

// Auto-generate unique slug based on productName
productSchema.pre('validate', async function (next) {
    if (!this.isModified('productName')) return next();

    if (this.productName) {
        let baseSlug = slugify(this.productName, { lower: true, strict: true });
        let slug = baseSlug;
        let counter = 1;

        while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        this.slug = slug;
    }
    next();
});

module.exports = mongoose.model("Product", productSchema);
