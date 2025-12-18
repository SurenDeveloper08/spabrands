const Product = require('../models/productModel');
const Brand = require('../models/Brand');
const Category = require('../models/categoryModel');
const SubCategory = require('../models/Subcategory');
const ErrorHandler = require('../utils/errorHandler')
const catchAsyncError = require('../middlewares/catchAsyncError')
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');
const resizeImages = require('../utils/resizeImages');
const { convertProductPrices } = require('../utils/convertProductPrices');
const { loginUser } = require('./authController');

// Helper to safely parse JSON
const safeParse = (data) => {
    try {
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
        return null;
    }
};

// Helper to group files by fieldname
const groupFiles = (files) => {
    const grouped = {};
    (files || []).forEach(file => {
        if (!grouped[file.fieldname]) grouped[file.fieldname] = [];
        grouped[file.fieldname].push(file);
    });
    return grouped;
};

const deleteFile = (filePath) => {
    if (!filePath) return;
    const fullPath = path.join(__dirname, "..", "uploads", filePath);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
};

//admin
exports.create1Product = catchAsyncError(async (req, res, next) => {

    const BASE_URL = process.env.NODE_ENV === "production"
        ? process.env.BACKEND_URL
        : `${req.protocol}://${req.get("host")}`;

    const allFiles = [
        ...(req.files?.image || []),
        ...(req.files?.images || []),
    ];

    const filePaths = allFiles.map(file => file.path);
    const resizedFilenames = await resizeImages(filePaths, true);

    allFiles.forEach((file, i) => {
        file.filename = resizedFilenames[i].resizedFilename;
        file.longFilename = resizedFilenames[i].longFilename;
    });

    let allImages = [];
    let mainImage = '';

    if (req.files?.image?.length > 0) {
        const file = req.files.image[0];
        mainImage = `${BASE_URL}/uploads/product/${file.filename}`;
    }

    const galleryFiles = req.files?.images || [];
    galleryFiles.forEach(file => {
        allImages.push({
            image: `${BASE_URL}/uploads/product/${file.filename}`,
            longImage: `${BASE_URL}/uploads/product/${file.longFilename}`,
        });
    });

    // 🔸 Category & (Optional) Subcategory
    const categorySlug = JSON.parse(req.body.category || "{}");
    const subCategorySlug = req.body.subCategory ? JSON.parse(req.body.subCategory) : null;

    const validCategory = await Category.findOne({ slug: categorySlug });
    if (!validCategory) {
        return res.status(400).json({ success: false, message: 'Category not found' });
    }

    let validSubCategory = null;

    if (subCategorySlug) {
        const subExists = validCategory.subcategories.some(
            sub => sub.slug === subCategorySlug
        );

        if (!subExists) {
            return res.status(400).json({
                success: false,
                message: `Subcategory "${subCategorySlug}" not found in selected category "${validCategory.name}".`
            });
        }
        validSubCategory = subCategorySlug;
    }
    //  Set back in body
    req.body.category = validCategory.slug;
    req.body.subCategory = validSubCategory?.slug || null;

    //  Number fields
    ['stock', 'price', 'oldPrice', 'deliveryDays'].forEach(field => {
        if (req.body[field] !== undefined && req.body[field] !== "") {
            req.body[field] = Number(req.body[field]);
        } else {
            req.body[field] = undefined;
        }
    });

    const safeParse = (data) => {
        try {
            return typeof data === 'string' ? JSON.parse(data) : data;
        } catch {
            return null;
        }
    };

    const productName = safeParse(req.body?.productName);
    const slug = slugify(productName ? productName.trim() : "product-name", { lower: true, strict: true });

    const existingProduct = await Product.findOne({ slug });
    if (existingProduct) {
        return res.status(400).json({
            success: false,
            message: `Product with the name "${productName}" already exists.`,
        });
    }

    const description = safeParse(req.body?.description);
    const features = safeParse(req.body.features);
    const whyChoose = safeParse(req.body.whyChoose);
    const instructions = safeParse(req.body.instructions);
    const specifications = safeParse(req.body.specifications || '[]');

    const seo = {
        metaTitle: req.body.seo?.metaTitle || '',
        metaDescription: req.body.seo?.metaDescription || '',
        metaKeywords: req.body.seo?.metaKeywords || '',
        canonicalUrl: req.body.seo?.canonicalUrl || ''
    };

    const productData = {
        productName,
        slug,
        brand: req.body.brand,
        category: req.body.category,
        subCategory: req.body.subCategory, // could be null
        overview: req.body.overview,
        stock: req.body.stock,
        deliveryDays: req.body.deliveryDays,
        price: req.body.price,
        oldPrice: req.body.oldPrice,
        description,
        features,
        whyChoose,
        instructions,
        specifications,
        image: mainImage || allImages[0]?.image || '',
        images: allImages,
        sellGlobally: req.body.sellGlobally === 'false' ? false : true,
        restrictedCountries: safeParse(req.body.restrictedCountries || '[]'),
        allowedCountries: safeParse(req.body.allowedCountries || '[]'),
        seo
    };

    const product = await Product.create(productData);

    res.status(201).json({
        success: true,
        product,
    });
});

exports.createProduct = async (req, res) => {
    try {
        const BASE_URL = process.env.NODE_ENV === "production"
            ? process.env.BACKEND_URL
            : `${req.protocol}://${req.get("host")}`;

        // Group uploaded files
        const filesGrouped = groupFiles(req.files);

        // All uploaded files for resizing
        const allFiles = req.files || [];
        const resizedFiles = await resizeImages(allFiles.map(f => f.path), true);

        // Attach resized filenames
        allFiles.forEach((file, i) => {
            file.filename = resizedFiles[i].resizedFilename;
            file.longFilename = resizedFiles[i].longFilename;
        });

        // MAIN IMAGE
        let mainImage = "";
        if (filesGrouped["mainImage"]?.length) {
            const file = filesGrouped["mainImage"][0];
            mainImage = `${BASE_URL}/uploads/product/${file.filename}`;
        }

        // GALLERY IMAGES
        const gallery = (filesGrouped["gallery"] || []).map(file => ({
            image: `${BASE_URL}/uploads/product/${file.filename}`,
            longImage: `${BASE_URL}/uploads/product/${file.longFilename}`
        }));

        // VALIDATE BRAND, CATEGORY, SUBCATEGORY
        const brand = await Brand.findOne({ slug: req.body.brand });
        if (!brand) return res.status(400).json({ success: false, message: "Brand not found" });

        const category = await Category.findOne({ slug: req.body.category });
        if (!category) return res.status(400).json({ success: false, message: "Category not found" });


        let subcategory = null;
        if (req.body.subCategory) {
            subcategory = await SubCategory.findOne({ slug: req.body.subCategory });
            if (!subcategory) return res.status(400).json({ success: false, message: "Subcategory not found" });
            if (subcategory.category !== category.slug) {
                return res.status(400).json({ success: false, message: "Subcategory does not belong to category" });
            }
        }

        // NUMERIC FIELDS
        ["price", "oldPrice", "stock", "deliveryDays"].forEach(field => {
            req.body[field] = req.body[field] !== undefined && req.body[field] !== ""
                ? Number(req.body[field])
                : undefined;
        });

        // PRODUCT NAME + SLUG
        const productName = req.body.productName;
        if (!productName) return res.status(400).json({ success: false, message: "Product name is required" });

        const slug = slugify(productName, { lower: true, strict: true });
        const existing = await Product.findOne({ slug });
        if (existing) return res.status(400).json({ success: false, message: "Product with this name already exists" });
        // PARSE JSON FIELDS
        const description = safeParse(req.body.description) || [];
        const specifications = safeParse(req.body.specifications) || [];
        const faq = safeParse(req.body.faq) || [];
        const seo = safeParse(req.body.seo) || {};
        let variants = [];
        if (req.body.variants) {
            const parsed = JSON.parse(req.body.variants);
            // If parsed is an array, use it; if object, wrap in array
            variants = Array.isArray(parsed) ? parsed : [parsed];
        }

        const finalVariants = variants.map((variant, i) => {
            const varFiles = filesGrouped[`variants_${i}_images`] || [];
            const imagesArr = varFiles.map(file => ({
                image: `${BASE_URL}/uploads/product/${file.filename}`,
                longImage: `${BASE_URL}/uploads/product/${file.longFilename}`
            }));

            return {
                ...variant,
                images: imagesArr
            };
        });

        // FINAL PRODUCT DOCUMENT
        const productData = {
            productName,
            slug,
            brand: brand.slug,
            category: category.slug,
            subCategory: subcategory?.slug || null,
            overview: req.body.overview || "",
            price: req.body.price,
            oldPrice: req.body.oldPrice,
            stock: req.body.stock,
            deliveryDays: req.body.deliveryDays,
            description,
            specifications,
            faq,
            seo,
            mainImage,
            gallery,
            variants: finalVariants,
            sellGlobally: req.body.sellGlobally !== "false",
            restrictedCountries: safeParse(req.body.restrictedCountries) || [],
            allowedCountries: safeParse(req.body.allowedCountries) || [],
        };

        const product = await Product.create(productData);

        return res.status(201).json({ success: true, product });

    } catch (err) {
        console.error("Error creating product:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Custom Validators (example)
async function validateCategoryAndSubCategory(categorySlug, subCategorySlug) {
    const foundCategory = await Category.findOne({ slug: categorySlug });
    if (!foundCategory) return { validCategory: null, validSubCategory: null };

    const foundSub = foundCategory.subcategories.find(
        (sub) => sub.slug === subCategorySlug
    );
    return { validCategory: foundCategory, validSubCategory: foundSub };
}

//admin
exports.getAdminProducts = catchAsyncError(async (req, res, next) => {
    try {
        const data = await Product.find();
        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No products found"
            });
        }

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);
        next(error); // Pass the error to global error handler
    }
});

//admin
exports.getAdminProduct = catchAsyncError(async (req, res, next) => {
    const { productId } = req.params;
    const data = await Product.findOne({ slug: productId });

    if (!data) {
        return next(new ErrorHandler('Product not found', 400));
    }

    res.status(201).json({
        success: true,
        data
    })
})

//admin
exports.updateProduct = async (req, res) => {
    try {
       
        const { productId } = req.params;
        const product = await Product.findOne({ slug: productId });
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const BASE_URL = process.env.NODE_ENV === "production"
            ? process.env.BACKEND_URL
            : `${req.protocol}://${req.get("host")}`;

        // Group files by field
        const filesGrouped = groupFiles(req.files || []);

        // Resize all uploaded files
        const resizedFiles = await resizeImages(req.files.map(f => f.path), true);
        req.files.forEach((f, i) => {
            f.filename = resizedFiles[i].resizedFilename;
            f.longFilename = resizedFiles[i].longFilename;
        });

        // -----------------------------
        // MAIN IMAGE
        // -----------------------------
        if (filesGrouped["mainImage"]?.length > 0) {
            const f = filesGrouped["mainImage"][0];
            // Delete old main image if exists
            if (product.mainImage) deleteFile(product.mainImage);
            product.mainImage = `${BASE_URL}/uploads/product/${f.filename}`;
        }

        // -----------------------------
        // GALLERY
        // -----------------------------
        const removedGallery = JSON.parse(req.body.removedGalleryImages || "[]");

        // Keep only images not removed
        let gallery = product.gallery.filter(img => !removedGallery.includes(img.image));

        // Delete removed images from storage
        product.gallery.forEach(img => {
            if (removedGallery.includes(img.image)) deleteFile(img.image);
        });

        // Add new uploaded gallery images
        (filesGrouped["gallery"] || []).forEach(f => {
            gallery.push({
                image: `${BASE_URL}/uploads/product/${f.filename}`,
                longImage: `${BASE_URL}/uploads/product/${f.longFilename}`
            });
        });

        product.gallery = gallery;

        // -----------------------------
        // VARIANTS
        // -----------------------------
        const parsedVariants = JSON.parse(req.body.variants || "[]");
        let variants = [];

        parsedVariants.forEach((variant, i) => {
            // Removed images for this variant
            const removedVariantImages = JSON.parse(req.body[`removedVariantImages_${i}`] || "[]");

            // Keep existing images not removed
            let images = [];
            if (product.variants[i]?.images) {
                images = product.variants[i].images.filter(img => !removedVariantImages.includes(img.image));
                // Delete removed images from storage
                product.variants[i].images.forEach(img => {
                    if (removedVariantImages.includes(img.image)) deleteFile(img.image);
                });
            }

            // Add new uploaded images
            const newVariantFiles = filesGrouped[`variants_${i}_images`] || [];
            newVariantFiles.forEach(f => {
                images.push({
                    image: `${BASE_URL}/uploads/product/${f.filename}`,
                    longImage: `${BASE_URL}/uploads/product/${f.longFilename}`
                });
            });

            variants.push({
                ...variant,
                images
            });
        });

        product.variants = variants;

        // -----------------------------
        // Update other base fields
        // -----------------------------
        product.productName = req.body.productName || product.productName;
        product.brand = req.body.brand || product.brand;
        product.category = req.body.category || product.category;
        product.subCategory = req.body.subCategory || product.subCategory;
        product.price = Number(req.body.price) || product.price;
        product.stock = Number(req.body.stock) || product.stock;
        product.deliveryDays = Number(req.body.deliveryDays) || product.deliveryDays;
        product.description = JSON.parse(req.body.description || "[]");
        product.specifications = JSON.parse(req.body.specifications || "[]");
        product.faq = JSON.parse(req.body.faq || "[]");
        product.seo = JSON.parse(req.body.seo || "{}");

        // Save updated product
        await product.save();

        res.json({ success: true, product });

    } catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

//admin
exports.deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        // Find product by slug
        const product = await Product.findOne({ slug: productId });
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        // Delete main image
        if (product.mainImage) deleteFile(product.mainImage);

        // Delete gallery images
        product.gallery.forEach(img => {
            if (img.image) deleteFile(img.image);
            if (img.longImage) deleteFile(img.longImage);
        });

        // Delete variant images
        product.variants.forEach(variant => {
            variant.images.forEach(img => {
                if (img.image) deleteFile(img.image);
                if (img.longImage) deleteFile(img.longImage);
            });
        });

        // Delete longImages array if exists
        if (product.longImages && product.longImages.length > 0) {
            product.longImages.forEach(img => deleteFile(img));
        }

        // Delete product document
        await product.deleteOne();

        res.json({ success: true, message: "Product deleted successfully" });

    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

//admin
exports.toggleProductActive = catchAsyncError(async (req, res) => {
    try {

        const { productId } = req.params;

        const product = await Product.findOne({ slug: productId });

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        product.isActive = !product.isActive;
        await product.save();

        return res.status(200).json({
            success: true,
            message: `product "${product.name}" is now ${product.isActive ? 'active' : 'inactive'}`,
            product
        });

    } catch (error) {
        console.error("Toggle product active error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

//admin
exports.getAdminActiveProducts = catchAsyncError(async (req, res, next) => {
    try {

        const data = await Product.find({ isActive: true });
        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No products found"
            });
        }

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
});

//user
exports.getActiveCategoryProducts = catchAsyncError(async (req, res, next) => {
    try {
        const { category: categorySlug, subcategory: subCategorySlug } = req.query;

        if (!categorySlug && !subCategorySlug) {
            return res.status(400).json({ message: 'Category or Subcategory parameter is required' });
        }

        let categoryDoc;
        let subCategoryDoc;
        let filter = {};

        if (subCategorySlug) {
            // Find the category document that contains this subcategory
            categoryDoc = await Category.findOne({ "subcategories.slug": subCategorySlug }).lean();

            if (!categoryDoc) {
                return res.status(404).json({ message: 'Subcategory not found' });
            }

            // Find the subcategory inside the category document
            subCategoryDoc = categoryDoc.subcategories.find(sc => sc.slug === subCategorySlug);

            if (!subCategoryDoc) {
                return res.status(404).json({ message: 'Subcategory not found inside the category' });
            }

            // Filter products by subCategory slug
            filter.subCategory = subCategorySlug;

        } else if (categorySlug) {
            // Find category by slug
            categoryDoc = await Category.findOne({ slug: categorySlug }).lean();

            if (!categoryDoc) {
                return res.status(404).json({ message: 'Category not found' });
            }

            // Filter products by category slug
            filter.category = categorySlug;
        }

        // Fetch products by filter (category or subcategory slugs)
        const products = await Product.find(filter)
            .select('productName slug category subCategory price image seo')
            .lean();

        // Compose meta info
        let metaInfo = {};
        let category = {};


        if (subCategoryDoc) {
            // If subcategory requested, send subcategory meta + category title and slug

            metaInfo = {
                title: subCategoryDoc.title || subCategoryDoc.name,
                description: subCategoryDoc.description,
                image: subCategoryDoc.image,
                seo: subCategoryDoc.seo,
                category: {
                    title: categoryDoc.name,
                    slug: categoryDoc.slug
                }
            };
        } else if (categoryDoc) {
            // Category meta
            metaInfo = {
                title: categoryDoc.title || categoryDoc.name,
                description: categoryDoc.description,
                image: categoryDoc.image,
                seo: categoryDoc.seo,
            };
        }

        res.json({
            meta: metaInfo,
            products,
        });

    } catch (error) {
        console.error('Error fetching products by category/subcategory:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

//user
exports.getActiveSearchProducts = catchAsyncError(async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });

        // Find products matching the query in productName
        const products = await Product.find({
            productName: { $regex: q, $options: "i" }, // case-insensitive search
            isActive: true
        })
            .limit(20)
            .select("productName brand category subCategory slug mainImage price variants stock")
            .lean();

        // Optionally populate category & subCategory names
        const categorySlugs = [...new Set(products.map(p => p.category))];
        const subCategorySlugs = [...new Set(products.map(p => p.subCategory))];

        const categories = await Category.find({ slug: { $in: categorySlugs } })
            .select("slug name")
            .lean();
        const subCategories = await SubCategory.find({ slug: { $in: subCategorySlugs } })
            .select("slug name")
            .lean();

        const productsWithNames = products.map(p => ({
            ...p,
            categoryName: categories.find(c => c.slug === p.category)?.name || "",
            subCategoryName: subCategories.find(sc => sc.slug === p.subCategory)?.name || ""
        }));

        res.json({
            query: q,
            count: productsWithNames.length,
            data: productsWithNames
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

//user
exports.getFilterProducts = catchAsyncError(async (req, res, next) => {
    try {
        const { q, category, subcategory, brand, sort } = req.query;

        const query = {};

        // SEARCH - only if q exists
        if (q && q.trim() !== "") {
            query.productName = { $regex: q.trim(), $options: "i" };
        }

        // CATEGORY
        if (category && category !== "" && category !== "all") {
            query.category = category;
        }

        // SUBCATEGORY
        if (subcategory && subcategory !== "" && subcategory !== "all") {
            query.subCategory = subcategory;
        }

        // BRAND
        if (brand) {
            const brandArray = Array.isArray(brand) ? brand : brand.split(",");
            query.brand = { $in: brandArray };
        }

        // SORTING
        let sortOption = {};
        switch (sort) {
            case "priceAsc":
                sortOption.price = 1; break;
            case "priceDesc":
                sortOption.price = -1; break;
            case "newest":
            default:
                sortOption.createdAt = -1;
        }

     
        const products = await Product.find(query).sort(sortOption);

        res.json({ count: products.length, data: products });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
})

//user
exports.getActiveRelatedProducts = catchAsyncError(async (req, res, next) => {
    try {
        const { slug: productSlug } = req.query;

        if (!productSlug) {
            return res.status(400).json({ message: 'product slug is required' });
        }

        const product = await Product.findOne({ slug: productSlug }).lean();
        if (!product) return res.status(404).json({ message: "Product not found" });

        // Fetch related products (same category as fallback)
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            isActive: true
        })
            .limit(6)
            .select("productName brand category subCategory slug mainImage price") // select only needed fields
            .lean();

        // Meta information
        const metaInfo = {
            title: `Related products for ${product.productName}`,
            description: `Find products similar to ${product.productName}`,
            count: relatedProducts.length
        };

        res.json({
            meta: metaInfo,
            products: relatedProducts
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

exports.getProduct = catchAsyncError(async (req, res, next) => {
    const { productId } = req.params;
    const data = await Product.findOne({ slug: productId });

    if (!data) {
        return next(new ErrorHandler('Product not found', 400));
    }

    res.status(201).json({
        success: true,
        data
    })
})

exports.getMenuByBrands = catchAsyncError(async (req, res, next) => {
    try {
        const brands = await Brand.find().lean();
        const categories = await Category.find().lean();
        const subcategories = await SubCategory.find().lean();
        const products = await Product.find().lean();

        const menu = brands.map(brand => {
            // Get products for this brand using brand.slug
            const brandProducts = products.filter(p => p.brand === brand.slug);

            if (brandProducts.length === 0) return null; // no products under this brand

            // Find categories that this brand has products in
            const brandCategories = categories
                .filter(cat =>
                    brandProducts.some(p => p.category === cat.slug)
                )
                .map(cat => {
                    // Products inside this category for this brand
                    const categoryProducts = brandProducts.filter(
                        p => p.category === cat.slug
                    );

                    // Find matching subcategories
                    const categorySubcategories = subcategories
                        .filter(sc => sc.category === cat.slug)  // because you store category.slug here
                        .filter(sc =>
                            categoryProducts.some(p => p.subCategory === sc.slug)
                        )
                        .map(sc => ({
                            _id: sc._id,
                            name: sc.name,
                            slug: sc.slug,
                            image: sc.image
                        }));

                    if (categorySubcategories.length === 0) return null;

                    return {
                        _id: cat._id,
                        name: cat.name,
                        slug: cat.slug,
                        image: cat.image,
                        subcategories: categorySubcategories
                    };
                })
                .filter(Boolean);

            if (brandCategories.length === 0) return null;

            return {
                _id: brand._id,
                name: brand.name,
                slug: brand.slug,
                image: brand.image,
                categories: brandCategories
            };
        }).filter(Boolean);

        const category = categories
            .filter(cat =>
                products.some(p => p.category === cat.slug)
            )
            .map(cat => {
                // Products inside this category for this brand
                const categoryProducts = products.filter(
                    p => p.category === cat.slug
                );

                // Find matching subcategories
                const categorySubcategories = subcategories
                    .filter(sc => sc.category === cat.slug)  // because you store category.slug here
                    .filter(sc =>
                        categoryProducts.some(p => p.subCategory === sc.slug)
                    )
                    .map(sc => ({
                        _id: sc._id,
                        name: sc.name,
                        slug: sc.slug,
                        image: sc.image
                    }));

                if (categorySubcategories.length === 0) return null;

                return {
                    _id: cat._id,
                    name: cat.name,
                    slug: cat.slug,
                    image: cat.image,
                    subcategories: categorySubcategories
                };
            })
            .filter(Boolean);

        res.json({ success: true, menu, category });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
})

exports.getSuggestions = catchAsyncError(async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || q.trim() === "") {
            return res.json({ success: true, suggestions: [] });
        }

        const regex = new RegExp(q, "i"); // case-insensitive search

        // Search products only
        const products = await Product.find(
            { productName: regex, isActive: true },
            "productName slug category subCategory brand"
        )
            .limit(10);

        res.json({ success: true, products });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
})

exports.getCartProducts = catchAsyncError(async (req, res, next) => {

    const { cartItems } = req.body;

    if (!cartItems || !cartItems.length) {
        return res.status(200).json({ success: true, data: [], subtotal: 0, total: 0 });
    }

    const slugs = cartItems.map(item => item.slug);

    // Fetch all products in cart
    const products = await Product.find({ slug: { $in: slugs }, isActive: true });

    let subtotal = 0;

    const cartResponse = cartItems.map(cartItem => {
        const product = products.find(p => p.slug === cartItem.slug);
        if (!product) return null;

        let variant = null;
        if (product.variants && product.variants.length) {
            variant = product.variants.find(
                v => v.color === cartItem.color && v.size === cartItem.size
            );
        }

        const price = variant ? variant.price : product.price;
        const stock = variant ? variant.stock : product.stock;
        const qty = Math.min(cartItem.qty || 1, stock);

        subtotal += price * qty;

        return {
            slug: product.slug,
            productName: product.productName,
            brand: product.brand,
            category: product.category,
            subCategory: product.subCategory,
            price,
            stock,
            qty,
            color: variant ? variant.color : null,
            size: variant ? variant.size : null,
            image: variant
                ? variant.images[0]?.image || product.mainImage
                : product.mainImage,
        };
    }).filter(Boolean);

    const shipping = 10; 
    const total = subtotal + shipping;

    res.status(200).json({
        success: true,
        data: cartResponse,
        subtotal,
        total
    });
})


