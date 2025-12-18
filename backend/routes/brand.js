// routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path')

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, '..', '/uploads/brand'))
        },
        filename: function (req, file, cb) {
            cb(null, file.originalname)
        }
    })
})

const {
    createBrand,
    getAdminBrands,
    getAdminBrand,
    updateBrand,
    deleteBrand,
    toggleBrandActive,
    getActiveBrands
} = require('../controllers/brandController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/authenticate');

//admin
router.route('/admin/brand/new').post(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    upload.single('image'), createBrand);

router.route('/admin/brands').get(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    getAdminBrands);

router.route('/admin/brand/:id').get(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    getAdminBrand);

router.route('/admin/brand/:id').put(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    upload.single('image'), updateBrand);

router.route('/admin/brand/:id').delete(
    // isAuthenticatedUser, authorizeRoles('admin'),
    deleteBrand);

router.route('/admin/brand/status/:brandId').put(
    // isAuthenticatedUser, authorizeRoles('admin'),
    toggleBrandActive);

router.route('/admin/active/brands').get(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    getActiveBrands);
router.route('/active/brands').get(
    // isAuthenticatedUser, authorizeRoles('admin'), 
    getActiveBrands);
// router.route('/admin/active/categories').get(
//     //   isAuthenticatedUser, authorizeRoles('admin'), 
//     getActiveCategories);
// router.route('/admin/subbrand/new/:brandId').post(
//     isAuthenticatedUser, authorizeRoles('admin'), 
//     upload.single('image'), createSubbrand);

// router.route('/admin/subcategories').get(
//     isAuthenticatedUser, authorizeRoles('admin'), 
//     getAdminSubCategories);
// router.route('/admin/subbrand/:brandId/:subbrandId').get(
//     isAuthenticatedUser, authorizeRoles('admin'), 
//     getAdminSubbrand);

// router.route('/admin/subbrand/:brandId/:subbrandId').put(
//     isAuthenticatedUser, authorizeRoles('admin'), 
//     upload.single('image'), updateSubbrand);

// router.route('/admin/subbrand/:brandId/:subbrandId').delete(
//     isAuthenticatedUser, authorizeRoles('admin'), 
//     deleteSubbrand);

// router.route('/admin/active/subcategories/:brandId').get(
//     //   isAuthenticatedUser, authorizeRoles('admin'), 
//     getActiveSubCategories);

// router.route('/admin/subbrand/status/:brandId/:subbrandId').put(
//     isAuthenticatedUser, authorizeRoles('admin'),
//     toggleSubbrandActive);

// router.route('/admin/maincategories').get(
//     isAuthenticatedUser, authorizeRoles('admin'),
//     getHomeMaincategories);


// //user
// router.route('/categories/active').get(
//     getActiveCategoriesWithSubcategories);

// router.route('/maincategories/active').get(
//     getActiveMaincategories);
module.exports = router; 