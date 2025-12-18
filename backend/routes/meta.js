const express = require('express');
const { createMeta, updateMeta, getMetaById, getMetaBySlug, getAllMeta, toggleMetaStatus, deleteMeta } = require('../controllers/metaController');
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/authenticate')

router.route('/meta').get(
     getMetaBySlug);
router.route('/admin/meta').post(
    // isAuthenticatedUser, upload.none(), authorizeRoles('admin'), 
    createMeta);
router.route('/admin/meta/:id').put(
    // isAuthenticatedUser, upload.none(), authorizeRoles('admin'), 
    updateMeta);
router.route('/admin/meta').get(
    // isAuthenticatedUser, upload.none(), authorizeRoles('admin'), 
    getAllMeta);
router.route('/admin/meta/:id').get(
    // isAuthenticatedUser, authorizeRoles('admin'),
    getMetaById);
router.route('/admin/meta-toggle/:id').put(
    // isAuthenticatedUser, authorizeRoles('admin'),
    toggleMetaStatus);

router.route('/admin/meta/:id').delete(
    // isAuthenticatedUser, authorizeRoles('admin'),
    deleteMeta);

module.exports = router;
