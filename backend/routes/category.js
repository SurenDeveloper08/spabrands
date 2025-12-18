// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path')

const uploadCategory = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, '..', '/uploads/category'))
        },
        filename: function (req, file, cb) {
            cb(null, file.originalname)
        }
    })
})

const uploadSubCategory = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, '..', '/uploads/subcategory'))
        },
        filename: function (req, file, cb) {
            cb(null, file.originalname)
        }
    })
})

const {
    createCategory,
    getAdminCategories,
    getAdminCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,
    getActiveCategories,
    createSubcategory,
    getAdminSubcategories,
    getAdminSubcategory,
    updateSubcategory,
    deleteSubcategory,
    toggleSubcategoryActive,
    getActiveSubcategoriesByCategory,
    getAllCategories,
    getSubcategoriesByCategory,
    getUserCategories,
    getTopHomeSubcategories,
    getActiveMenuCategories
} = require('../controllers/categoryController');

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/authenticate');

//admin
router.route('/admin/category/new').post(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    uploadCategory.single('image'), createCategory);

router.route('/admin/categories').get(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    getAdminCategories);

router.route('/admin/category/:id').get(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    getAdminCategory);

router.route('/admin/category/:id').put(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    uploadCategory.single('image'), updateCategory);

router.route('/admin/category/:id').delete(
    // isAuthenticatedUser, authorizeRoles('admin'),
    deleteCategory);

router.route('/admin/category/status/:id').put(
    // isAuthenticatedUser, authorizeRoles('admin'),
    toggleCategoryActive);

router.route('/admin/active/categories').get(
    //   isAuthenticatedUser, authorizeRoles('admin'), 
    getActiveCategories);

router.route('/admin/subcategory/new').post(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    uploadSubCategory.single('image'), createSubcategory);

router.route('/admin/subcategories').get(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    getAdminSubcategories);

router.route('/admin/subcategory/:id').get(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    getAdminSubcategory);

router.route('/admin/subcategory/:id').put(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    uploadSubCategory.single('image'), updateSubcategory);

router.route('/admin/subcategory/:id').delete(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    deleteSubcategory);

router.route('/admin/subcategory/status/:id').put(
    // isAuthenticatedUser, authorizeRoles('admin'),
    toggleSubcategoryActive);

router.route('/admin/active/subcategories/:categoryId').get(
    //   isAuthenticatedUser, authorizeRoles('admin'), 
    getActiveSubcategoriesByCategory);

router.route('/maincategories/active').get(
    getTopHomeSubcategories);

// router.route('/admin/maincategories').get(
//     isAuthenticatedUser, authorizeRoles('admin'),
//     getHomeMaincategories);


// //user
router.route('/categories/active').get(
    getUserCategories);

router.route('/categories').get(
    getActiveMenuCategories);

// router.route('/maincategories/active').get(
//     getActiveMaincategories);

module.exports = router; 