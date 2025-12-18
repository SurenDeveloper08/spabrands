const mongoose = require('mongoose');
const Brand = require('../models/Brand');
const slugify = require('slugify');
const ErrorHandler = require('../utils/errorHandler')
const catchAsyncError = require('../middlewares/catchAsyncError')
const APIFeatures = require('../utils/apiFeatures');
const path = require("path");
const fs = require("fs");

// Create Brand
exports.createBrand = catchAsyncError(async (req, res, next) => {
    const { name, title, description = '', isActive, sortOrder } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: "Brand name is required.",
        });
    }

    const slug = slugify(name.trim(), { lower: true, strict: true });

    // Check if brand already exists
    const existingBrand = await Brand.findOne({ slug });
    if (existingBrand) {
        return res.status(400).json({
            success: false,
            message: "Brand name already exists. Please choose a different name.",
        });
    }

    const BASE_URL = process.env.NODE_ENV === "production"
        ? process.env.BACKEND_URL
        : `${req.protocol}://${req.get("host")}`;

    const image = req.file ? `${BASE_URL}/uploads/brand/${req.file.filename}` : '';

    const seo = {
        metaTitle: req.body.metaTitle?.trim() || '',
        metaDescription: req.body.metaDescription?.trim() || '',
        metaKeywords: req.body.metaKeywords?.trim() || '',
        canonicalUrl: req.body.canonicalUrl?.trim() || '',
    };

    const brandData = {
        name: name.trim(),
        title: title?.trim() || name.trim(),
        description: description.trim(),
        slug,
        image,
        isActive: isActive ?? true,
        sortOrder: Number(sortOrder) || 0,
        seo,
    };

    const brand = await Brand.create(brandData);

    res.status(201).json({
        success: true,
        brand,
        message: "Brand created successfully",
    });
});

exports.getAdminBrands = catchAsyncError(async (req, res) => {
    try {
        const brands = await Brand.find().sort({ sortOrder: 1 });

        res.status(200).json({
            success: true,
            brands
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

exports.getAdminBrand = catchAsyncError(async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid brand ID format',
            });
        }

        // Fetch brand
        const brand = await Brand.findById(id).lean();

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found',
            });
        }

        // Success
        res.status(200).json({
            success: true,
            data: brand,
        });

    } catch (error) {
        console.error('Error fetching brand:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching brand',
        });
    }
});

exports.updateBrand = catchAsyncError(async (req, res) => {
    try {
        const brandId = req.params.id;
        const { name, title, description, isActive, sortOrder } = req.body;

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }

        // Delete old image if new one is uploaded
        if (req.file && brand.image) {
            const oldImagePath = path.join(__dirname, "..", "uploads", "brand", path.basename(brand.image));
            fs.unlink(oldImagePath, (err) => {
                if (err) console.warn("⚠️ Failed to delete old brand image:", err.message);
            });
        }

        // Prepare updated data
        const updatedData = {
            name: name ?? brand.name,
            slug: name ? slugify(name.trim(), { lower: true, strict: true }) : brand.slug, // update slug if name changes
            title: title ?? brand.title,
            description: description ?? brand.description,
            isActive: isActive ?? brand.isActive,
            sortOrder: sortOrder ?? brand.sortOrder,
        };

        if (req.file) {
            updatedData.image = `${req.protocol}://${req.get("host")}/uploads/brand/${req.file.filename}`;
        }

        const updatedBrand = await Brand.findByIdAndUpdate(brandId, updatedData, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            success: true,
            message: "Brand updated successfully",
            brand: updatedBrand,
        });
    } catch (error) {
        console.error("Error updating brand:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while updating brand",
        });
    }
});

exports.deleteBrand = catchAsyncError(async (req, res) => {
    try {
        const brandId = req.params.id;

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: "Brand not found",
            });
        }

        if (brand.image) {
            const imagePath = path.join(__dirname, "..", "uploads", "brand", path.basename(brand.image));
            fs.unlink(imagePath, (err) => {
                if (err) console.warn("⚠️ Failed to delete old brand image:", err.message);
            });
        }

        await Brand.findByIdAndDelete(brandId);

        return res.status(200).json({
            success: true,
            message: "Brand deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting brand:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while deleting brand",
        });
    }
});

exports.toggleBrandActive = catchAsyncError(async (req, res) => {
    try {
        const { brandId } = req.params;

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }

        brand.isActive = !brand.isActive;
        await brand.save();

        return res.status(200).json({
            success: true,
            message: `Brand "${brand.name}" is now ${brand.isActive ? 'active' : 'inactive'}`,
            brand
        });

    } catch (error) {
        console.error("Toggle brand active error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

exports.getActiveBrands = catchAsyncError(async (req, res) => {
    try {
       const brands = await Brand.find({ isActive: true }).sort({ order: 1 });

        res.status(200).json({
            success: true,
            brands,
        });
    } catch (error) {
        console.error("Get active brands error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});
