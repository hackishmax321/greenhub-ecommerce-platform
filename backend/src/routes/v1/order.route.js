const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/order.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const adminMiddleware = require('../../middlewares/admin.middleware');

// All order routes require authentication
router.use(authMiddleware);

// User routes
router.get('/summary', orderController.getOrderSummary);
router.get('/number/:orderNumber', orderController.getOrderByNumber);
router.get('/:id', orderController.getOrder);
router.get('/', orderController.getUserOrders);
router.post('/', orderController.createOrder);
router.post('/:id/cancel', orderController.cancelOrder);

// Admin only routes
router.use('/admin', adminMiddleware);
router.get('/admin', orderController.getAllOrders);
router.get('/admin/stats', orderController.getStatistics);
router.patch('/admin/:id/status', orderController.updateStatus);
router.patch('/admin/:id/payment', orderController.updatePaymentStatus);

module.exports = router;