const express = require('express');
const router = express.Router();
const productController = require('../../controllers/product.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const adminMiddleware = require('../../middlewares/admin.middleware');

// Public routes
router.get('/featured', productController.getFeaturedProducts);
router.get('/category/:category', productController.getProductsByCategory);
router.get('/sku/:sku', productController.getProductBySku);
router.get('/:id', productController.getProduct);
router.get('/', productController.getProducts);

// Admin only routes
router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/bulk', productController.bulkCreateProducts);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.patch('/:id/stock', productController.updateStock);
router.delete('/:id', productController.deleteProduct);

module.exports = router;