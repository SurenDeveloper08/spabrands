// controllers/sitemapController.js
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Subcategory = require('../models/Subcategory');
const Brand = require('../models/Brand');
const { SitemapStream, streamToPromise } = require("sitemap");
const { Readable } = require("stream");

exports.generateSitemap = async (req, res) => {
  try {

    const BASE_URL = process.env.FRONTEND_URL || "https://spabrands.me";

    const links = [];

    // Home
    links.push({ url: "/", changefreq: "daily", priority: 1.0 });

    // Categories
    const categories = await Category.find({ isActive: true }, "slug updatedAt");
    categories.forEach(cat => {
      links.push({
        url: `/${cat.slug}`,
        changefreq: "weekly",
        priority: 0.8,
        lastmod: cat.updatedAt || cat.createdAt
      });
    });

    // Subcategories
    const subcategories = await Subcategory.find({ isActive: true }, "slug category updatedAt");
    subcategories.forEach(sub => {
      links.push({
        url: `/${sub.category}/${sub.slug}`,
        changefreq: "weekly",
        priority: 0.7,
        lastmod: sub.updatedAt || sub.createdAt
      });
    });

    // Brands
    const brands = await Brand.find({ isActive: true }, "slug updatedAt");
    brands.forEach(brand => {
      links.push({
        url: `/brand/${brand.slug}`,
        changefreq: "weekly",
        priority: 0.7,
        lastmod: brand.updatedAt || brand.createdAt
      });
    });

    // Brand + Category combinations
    const brandCategories = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: { brand: "$brand", category: "$category" } } }
    ]);

    brandCategories.forEach(item => {
      links.push({
        url: `/brand/${item._id.brand}/${item._id.category}`,
        changefreq: "weekly",
        priority: 0.8
      });
    });

    // Brand + Category + SubCategory combinations
    const brandCategorySubs = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: { brand: "$brand", category: "$category", subCategory: "$subCategory" } } }
    ]);

    brandCategorySubs.forEach(item => {
      links.push({
        url: `/brand/${item._id.brand}/${item._id.category}/${item._id.subCategory}`,
        changefreq: "weekly",
        priority: 0.7
      });
    });

    // Products
    const products = await Product.find({ isActive: true }, "slug brand category subCategory updatedAt");
    products.forEach(p => {
      // Category product URL
      links.push({
        url: `/${p.category}/${p.subCategory}/${p.slug}`,
        changefreq: "weekly",
        priority: 0.9,
        lastmod: p.updatedAt || p.createdAt
      });

      // Brand product URL
      links.push({
        url: `/brand/${p.brand}/${p.category}/${p.subCategory}/${p.slug}`,
        changefreq: "weekly",
        priority: 0.9,
        lastmod: p.updatedAt || p.createdAt
      });
    });

    // Generate XML
    const stream = new SitemapStream({ hostname: BASE_URL });
    const xml = await streamToPromise(Readable.from(links).pipe(stream));

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(xml.toString());

  } catch (error) {
    console.error("❌ Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
};

