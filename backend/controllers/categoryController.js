const mongoose = require('mongoose');
const Category = require('../models/categoryModel');
const Subcategory = require('../models/Subcategory')
const slugify = require('slugify');
const catchAsyncError = require('../middlewares/catchAsyncError')
const fs = require("fs").promises;
const path = require("path");

exports.createCategory = catchAsyncError(async (req, res) => {
  try {
    const { name, title, description = '', isActive, sortOrder } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }

    const slug = slugify(name.trim(), { lower: true, strict: true });

    // Check for duplicate slug
    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: "Category name already exists." });
    }

    const BASE_URL = process.env.NODE_ENV === "production"
      ? process.env.BACKEND_URL
      : `${req.protocol}://${req.get("host")}`;

    const image = req.file ? `${BASE_URL}/uploads/category/${req.file.filename}` : '';

    const seo = {
      metaTitle: req.body.metaTitle?.trim() || '',
      metaDescription: req.body.metaDescription?.trim() || '',
      metaKeywords: req.body.metaKeywords?.trim() || '',
      canonicalUrl: req.body.canonicalUrl?.trim() || '',
    };

    const category = await Category.create({
      name: name.trim(),
      title: title?.trim() || name.trim(),
      description: description.trim(),
      slug,
      image,
      isActive: isActive ?? true,
      sortOrder: Number(sortOrder) || 0,
      seo
    });

    res.status(201).json({ success: true, category, message: "Category created successfully" });

  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ success: false, message: "Server error while creating category", error: error.message });
  }
});

exports.getAdminCategories = catchAsyncError(async (req, res) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1 });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching categories" });
  }
});

exports.getAdminCategory = catchAsyncError(async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid category ID" });

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    res.status(200).json({ success: true, category });
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching category" });
  }
});

exports.updateCategory = catchAsyncError(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const { name, title, description, isActive, sortOrder } = req.body;

    const slug = name ? slugify(name.trim(), { lower: true, strict: true }) : category.slug;

    const BASE_URL =
      process.env.NODE_ENV === "production"
        ? process.env.BACKEND_URL
        : `${req.protocol}://${req.get("host")}`;

    if (req.file) {
      if (category.image) {
        const oldImagePath = path.join(__dirname, "..", "uploads", "category", path.basename(category.image));
        try {
          await fs.unlink(oldImagePath);
          console.log("✅ Old category image deleted successfully");
        } catch (err) {
          console.warn("⚠️ Failed to delete old category image:", err.message);
        }
      }

      category.image = `${BASE_URL}/uploads/category/${req.file.filename}`;
    }

    category.seo = {
      metaTitle: req.body.metaTitle?.trim() || category.seo?.metaTitle || "",
      metaDescription: req.body.metaDescription?.trim() || category.seo?.metaDescription || "",
      metaKeywords: req.body.metaKeywords?.trim() || category.seo?.metaKeywords || "",
      canonicalUrl: req.body.canonicalUrl?.trim() || category.seo?.canonicalUrl || "",
    };

    category.name = name?.trim() || category.name;
    category.title = title?.trim() || category.title;
    category.description = description?.trim() || category.description;
    category.slug = slug;
    category.isActive = isActive ?? category.isActive;
    category.sortOrder = sortOrder ?? category.sortOrder;

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("❌ Error updating category:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating category",
      error: error.message,
    });
  }
});

exports.deleteCategory = catchAsyncError(async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    // Delete image safely
    if (category.image) {
      const imagePath = path.join(__dirname, "..", "uploads", "category", path.basename(category.image));
      try { await fs.unlink(imagePath); }
      catch (err) { console.warn("⚠️ Failed to delete category image:", err.message); }
    }

    await category.deleteOne();
    res.status(200).json({ success: true, message: "Category deleted successfully" });

  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ success: false, message: "Server error while deleting category" });
  }
});

exports.toggleCategoryActive = catchAsyncError(async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    category.isActive = !category.isActive;
    await category.save();

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" is now ${category.isActive ? "active" : "inactive"}`,
      category
    });
  } catch (error) {
    console.error("Toggle category active error:", error);
    res.status(500).json({ success: false, message: "Server error while toggling category status" });
  }
});

exports.getActiveCategories = catchAsyncError(async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select("name slug _id")
      .sort({ sortOrder: 1 });

    if (!categories.length) {
      return res.status(404).json({
        success: false,
        message: "No active categories found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Active categories fetched successfully",
      categories,
    });
  } catch (error) {
    console.error("❌ Error fetching active categories:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching active categories",
      error: error.message,
    });
  }
});

//sub category
exports.createSubcategory = catchAsyncError(async (req, res) => {
  try {
    const { name, category, title, description = "", isActive, sortOrder } = req.body;

    if (!name?.trim() || !category) {
      return res.status(400).json({
        success: false,
        message: "Name and category are required.",
      });
    }

    // Validate category
    const parentCategory = await Category.findOne({ slug: category })
    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: "Parent category not found.",
      });
    }

    const slug = slugify(name.trim(), { lower: true, strict: true });

    // Prevent duplicate subcategory under same category
    const existing = await Subcategory.findOne({ slug, category });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Subcategory with this name already exists in this category.",
      });
    }

    const BASE_URL =
      process.env.NODE_ENV === "production"
        ? process.env.BACKEND_URL
        : `${req.protocol}://${req.get("host")}`;

    const image = req.file
      ? `${BASE_URL}/uploads/subcategory/${req.file.filename}`
      : "";

    const seo = {
      metaTitle: req.body.metaTitle?.trim() || "",
      metaDescription: req.body.metaDescription?.trim() || "",
      metaKeywords: req.body.metaKeywords?.trim() || "",
      canonicalUrl: req.body.canonicalUrl?.trim() || "",
    };

    const subcategory = await Subcategory.create({
      name: name.trim(),
      slug,
      category,
      title: title?.trim() || name.trim(),
      description: description.trim(),
      image,
      isActive: isActive ?? true,
      sortOrder: Number(sortOrder) || 0,
      seo,
    });

    res.status(201).json({
      success: true,
      message: "Subcategory created successfully",
      subcategory,
    });
  } catch (error) {
    console.error("❌ Error creating subcategory:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating subcategory",
    });
  }
});

exports.getAdminSubcategories = catchAsyncError(async (req, res) => {
  try {
    const subcategories = await Subcategory.find()
      .populate("category", "name _id slug")
      .sort({ sortOrder: 1 });

    res.status(200).json({
      success: true,
      data: subcategories,
    });
  } catch (error) {
    console.error("❌ Error fetching subcategories:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching subcategories",
    });
  }
});

exports.getAdminSubcategory = catchAsyncError(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID",
      });
    }

    const subcategory = await Subcategory.findById(id).populate("category", "name _id");
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    res.status(200).json({
      success: true,
      data: subcategory,
    });
  } catch (error) {
    console.error("❌ Error fetching subcategory:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching subcategory",
    });
  }
});

exports.updateSubcategory = catchAsyncError(async (req, res) => {
  try {
    const { id } = req.params;
    const { name, title, description, isActive, sortOrder, category } = req.body;
  
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID",
      });
    }

    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    if (!category) {
      return res.status(400).json({ success: false, message: "category is required" });
    }

    let slug = subcategory.slug;
    if (name && name.trim() !== subcategory.name) {
      slug = slugify(name.trim(), { lower: true, strict: true });
      const duplicate = await Subcategory.findOne({ slug, category: category || subcategory.category });
      if (duplicate && duplicate._id.toString() !== id) {
        return res.status(400).json({
          success: false,
          message: "Subcategory name already exists in this category",
        });
      }
    }

    const BASE_URL =
      process.env.NODE_ENV === "production"
        ? process.env.BACKEND_URL
        : `${req.protocol}://${req.get("host")}`;

    if (req.file) {
      if (subcategory.image) {
        const oldImagePath = path.join(
          __dirname,
          "..",
          "uploads",
          "subcategory",
          path.basename(subcategory.image)
        );
        try {
          await fs.unlink(oldImagePath);
          console.log("✅ Old subcategory image deleted");
        } catch (err) {
          console.warn("⚠️ Failed to delete old subcategory image:", err.message);
        }
      }
      subcategory.image = `${BASE_URL}/uploads/subcategory/${req.file.filename}`;
    }

    subcategory.name = name?.trim() || subcategory.name;
    subcategory.title = title?.trim() || subcategory.title;
    subcategory.description = description?.trim() || subcategory.description;
    subcategory.slug = slug;
    subcategory.category = category || subcategory.category;
    subcategory.isActive = isActive ?? subcategory.isActive;
    subcategory.sortOrder = sortOrder ?? subcategory.sortOrder;

    subcategory.seo = {
      metaTitle: req.body.metaTitle?.trim() || subcategory.seo?.metaTitle || "",
      metaDescription: req.body.metaDescription?.trim() || subcategory.seo?.metaDescription || "",
      metaKeywords: req.body.metaKeywords?.trim() || subcategory.seo?.metaKeywords || "",
      canonicalUrl: req.body.canonicalUrl?.trim() || subcategory.seo?.canonicalUrl || "",
    };

    await subcategory.save();

    res.status(200).json({
      success: true,
      message: "Subcategory updated successfully",
      subcategory,
    });
  } catch (error) {
    console.error("❌ Error updating subcategory:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating subcategory",
    });
  }
});

exports.deleteSubcategory = catchAsyncError(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID",
      });
    }

    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    if (subcategory.image) {
      const oldImagePath = path.join(
        __dirname,
        "..",
        "uploads",
        "subcategory",
        path.basename(subcategory.image)
      );
      try {
        await fs.unlink(oldImagePath);
        console.log("✅ Deleted subcategory image");
      } catch (err) {
        console.warn("⚠️ Failed to delete image:", err.message);
      }
    }

    await Subcategory.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting subcategory:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting subcategory",
    });
  }
});

exports.toggleSubcategoryActive = catchAsyncError(async (req, res) => {
  try {
    const { id } = req.params;
    const subcategory = await Subcategory.findById(id);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    subcategory.isActive = !subcategory.isActive;
    await subcategory.save();

    res.status(200).json({
      success: true,
      message: `Subcategory "${subcategory.name}" is now ${subcategory.isActive ? "active" : "inactive"}`,
      subcategory,
    });
  } catch (error) {
    console.error("❌ Error toggling subcategory:", error);
    res.status(500).json({
      success: false,
      message: "Server error while toggling subcategory active state",
    });
  }
});

exports.getActiveSubcategoriesByCategory = catchAsyncError(async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "category is required",
      });
    }

    const subcategories = await Subcategory.find({
      category: categoryId,
      isActive: true,
    })
      .select("name slug _id")
      .sort({ sortOrder: 1 });

    res.status(200).json({
      success: true,
      data: subcategories,
    });

  } catch (error) {
    console.error("❌ Error fetching subcategories by category:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching subcategories",
    });
  }
});

exports.getAllCategories = catchAsyncError(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  res.status(200).json({
    success: true,
    categories,
  });
});

exports.getSubcategoriesByCategory = catchAsyncError(async (req, res) => {
  const { categoryId } = req.params;

  const subcategories = await Subcategory.find({ category: categoryId, isActive: true }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    subcategories,
  });
});

exports.getTopHomeSubcategories = catchAsyncError(async (req, res) => {
  try {
    const subcategories = await Subcategory.find({ isActive: true })
      .populate("category", "name _id slug")
      .sort({ sortOrder: 1 }); // ascending

    res.status(200).json({
      success: true,
      data: subcategories,
    });
  } catch (error) {
    console.error("❌ Error fetching subcategories:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching subcategories",
    });
  }
});

exports.getUserCategories = catchAsyncError(async (req, res) => {

  const categories = await Category.find({ isActive: true })
    .sort({ sortOrder: 1 });

  res.status(200).json({
    success: true,
    categories,
  });
});

exports.getActiveMenuCategories = async (req, res) => {
  try {
    // Fetch active categories
    const categories = await Category.find({ isActive: true })
      .select("name slug image")
      .lean();

    // Fetch active subcategories
    const subCategories = await Subcategory.find({ isActive: true })
      .select("name slug category image")
      .lean();

    // Group subcategories under their parent categories
    const formatted = categories.map(cat => ({
      name: cat.name,
      slug: cat.slug,
      image: cat.image,
      subcategories: subCategories
        .filter(sub => sub.category === cat.slug)
        .map(sub => ({
          name: sub.name,
          slug: sub.slug,
          image: sub.image
        }))
    }));

    res.json({
      success: true,
      count: formatted.length,
      categories: formatted
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
