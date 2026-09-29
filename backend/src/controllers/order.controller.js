const OrderService = require('../services/order.service');
const logger = require('../utils/logger');

class OrderController {
  /**
   * Create a new order
   * POST /api/v1/orders
   */
  async createOrder(req, res, next) {
    try {
      const orderData = {
        ...req.body,
        userId: req.user.id, // From auth middleware
        customer: {
          ...req.body.customer,
          email: req.user.email, // Use authenticated user's email
        },
      };

      const order = await OrderService.createOrder(orderData);
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order by ID
   * GET /api/v1/orders/:id
   */
  async getOrder(req, res, next) {
    try {
      const { id } = req.params;
      const order = await OrderService.getOrderById(id);
      
      // Check if user owns this order or is admin
      if (order.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this order',
        });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order by order number
   * GET /api/v1/orders/number/:orderNumber
   */
  async getOrderByNumber(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const order = await OrderService.getOrderByNumber(orderNumber);
      
      // Check if user owns this order or is admin
      if (order.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this order',
        });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's orders
   * GET /api/v1/orders
   */
  async getUserOrders(req, res, next) {
    try {
      const { page = 1, perPage = 20, sort = '-createdAt' } = req.query;
      
      const orders = await OrderService.getUserOrders(req.user.id, {
        page: parseInt(page),
        perPage: parseInt(perPage),
        sort,
      });

      res.json({
        success: true,
        data: orders,
        meta: {
          page: parseInt(page),
          perPage: parseInt(perPage),
          total: orders.totalItems || orders.items?.length || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all orders (Admin only)
   * GET /api/v1/orders/admin
   */
  async getAllOrders(req, res, next) {
    try {
      // Admin check handled by middleware
      const {
        page = 1,
        perPage = 20,
        sort = '-createdAt',
        status,
        paymentStatus,
        userId,
        fromDate,
        toDate,
      } = req.query;

      // Build filters
      const filters = {};
      if (status) filters.status = status;
      if (paymentStatus) filters.paymentStatus = paymentStatus;
      if (userId) filters.userId = userId;
      
      // Date range filter
      if (fromDate || toDate) {
        filters.createdAt = {};
        if (fromDate) filters.createdAt.gte = new Date(fromDate).toISOString();
        if (toDate) filters.createdAt.lte = new Date(toDate).toISOString();
      }

      const options = {
        page: parseInt(page),
        perPage: parseInt(perPage),
        sort,
      };

      const orders = await OrderService.getOrders(filters, options);

      res.json({
        success: true,
        data: orders,
        meta: {
          page: parseInt(page),
          perPage: parseInt(perPage),
          total: orders.totalItems || orders.items?.length || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update order status
   * PATCH /api/v1/orders/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, note = '' } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
        });
      }

      // Only admin can update status
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can update order status',
        });
      }

      const order = await OrderService.updateOrderStatus(id, status, note);

      res.json({
        success: true,
        message: `Order status updated to ${status}`,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update payment status
   * PATCH /api/v1/orders/:id/payment
   */
  async updatePaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { paymentStatus, paymentDetails = {} } = req.body;

      if (!paymentStatus) {
        return res.status(400).json({
          success: false,
          message: 'Payment status is required',
        });
      }

      // Only admin can update payment status
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can update payment status',
        });
      }

      const order = await OrderService.updatePaymentStatus(id, paymentStatus, paymentDetails);

      res.json({
        success: true,
        message: `Payment status updated to ${paymentStatus}`,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel order
   * POST /api/v1/orders/:id/cancel
   */
  async cancelOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { reason = '' } = req.body;

      const order = await OrderService.cancelOrder(id, reason);

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order statistics (Admin only)
   * GET /api/v1/orders/stats
   */
  async getStatistics(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can view order statistics',
        });
      }

      const stats = await OrderService.getOrderStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order summary for user
   * GET /api/v1/orders/summary
   */
  async getOrderSummary(req, res, next) {
    try {
      // Get recent orders for the user
      const orders = await OrderService.getUserOrders(req.user.id, {
        page: 1,
        perPage: 10,
        sort: '-createdAt',
      });

      const items = orders.items || [];
      const totalOrders = orders.totalItems || 0;
      
      // Calculate totals
      const totalSpent = items.reduce((sum, order) => sum + (order.total || 0), 0);
      const pendingOrders = items.filter(o => 
        o.status === Order.Status.PENDING || o.status === Order.Status.PROCESSING
      ).length;

      res.json({
        success: true,
        data: {
          totalOrders,
          totalSpent,
          pendingOrders,
          recentOrders: items.slice(0, 5),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();