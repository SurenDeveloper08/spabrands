const Meta = require('../models/metaModel');
const Brand = require('../models/Brand');
const Category = require('../models/categoryModel');
const SubCategory = require('../models/Subcategory');
const catchAsyncError = require('../middlewares/catchAsyncError');
const ErrorHandler = require('../utils/errorHandler');
const Blog = require('../models/blogModel');

exports.createMeta = async (req, res) => {
  try {

    const {
      slug,
      title,
      metaDescription,
      keywords,
      canonicalUrl,
      headingTitle,
      robots,
      isActive,
    } = req.body;


    /* REQUIRED FIELD CHECK */
    if (!slug || !title || !metaDescription) {
      return res.status(400).json({
        success: false,
        message: "Slug, title and meta description are required",
      });
    }
    const normalizedSlug = slug.toLowerCase().trim();

    const existingMeta = await Meta.findOne({ slug: normalizedSlug });
    if (existingMeta) {
      return res.status(409).json({
        success: false,
        message: "Meta already exists for this page or slug",
      });
    }
    const meta = await Meta.create({
      slug: slug.toLowerCase().trim(),
      title,
      metaDescription,
      keywords,
      canonicalUrl,
      headingTitle,
      robots: robots || "index, follow",
      isActive: isActive ?? true,
    });
    res.status(201).json({
      success: true,
      message: "Meta created successfully",
      meta,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateMeta = async (req, res) => {
  try {

    const meta = await Meta.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, meta });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMetaBySlug = async (req, res) => {
  try {
    const { brand, category, subCategory, slug } = req.query;

    let meta = null;

    // Use .lean() for faster queries
    if (slug) {

      const normalizedSlug = slug.toLowerCase().trim();
      meta = await Meta.findOne({ slug: normalizedSlug, isActive: true }).lean();
    }
    else if (category && subCategory) {

      meta = await SubCategory.findOne(
        { slug: subCategory, category, isActive: true },
        { seo: 1, _id: 0 }
      ).lean();

    }
    else if (category) {

      meta = await Category.findOne(
        { slug: category, isActive: true },
        { seo: 1, _id: 0 }
      ).lean();
    }
    else if (brand) {
      meta = await Brand.findOne(
        { slug: brand, isActive: true },
        { seo: 1, _id: 0 }
      ).lean();
    }
    else {

      return res.status(400).json({ success: false, message: 'Invalid parameters' });
    }
    if (!meta) return res.status(404).json({});

    res.status(200).json({ success: true, meta });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMetaById = async (req, res) => {
  try {
    const id = req.params.id;
    const meta = await Meta.findById(id);

    if (!meta) return res.status(404).json({});

    res.status(200).json({ success: true, meta });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllMeta = async (req, res) => {
  try {
    const metas = await Meta.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, metas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleMetaStatus = async (req, res) => {
  try {

    const meta = await Meta.findById(req.params.id);

    if (!meta) {
      return res.status(404).json({
        success: false,
        message: "Meta not found",
      });
    }

    meta.isActive = !meta.isActive;
    await meta.save();

    res.status(200).json({
      success: true,
      message: `Meta ${meta.isActive ? "Activated" : "Deactivated"} successfully`,
      meta,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteMeta = async (req, res) => {
  try {
    const meta = await Meta.findById(req.params.id);

    if (!meta) {
      return res.status(404).json({
        success: false,
        message: "Meta not found",
      });
    }

    await meta.deleteOne(); // delete the document

    res.status(200).json({
      success: true,
      message: "Meta deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
