const RepositoryFactory = require('../repositories/factory');
const Order = require('../models/order.model');
const ProductService = require('./product.service');
const logger = require('../utils/logger');

class OrderService {
  constructor() {
    this.orderRepository = RepositoryFactory.getRepository('orders');
  }

  /**
   * Create a new order
   */
  async createOrder(orderData) {
    try {
      // Validate order data
      const { error, value } = Order.validate(orderData);
      if (error) {
        throw new Error(`Validation failed: ${error.message}`);
      }

      // Verify stock availability for each item
      for (const item of value.items) {
        const product = await ProductService.getProductById(item.productId);
        if (!product.isAvailable()) {
          throw new Error(`Product ${item.name} is not available`);
        }
        if (product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.name}. Available: ${product.stockQuantity}`);
        }
      }

      // Calculate pricing
      const subtotal = value.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const total = subtotal - (value.discount || 0) + (value.tax || 0) + (value.shippingCost || 0);

      // Create order instance
      const order = new Order({
        ...value,
        subtotal,
        total,
        status: Order.Status.PENDING,
        paymentStatus: Order.PaymentStatus.PENDING,
      });

      // Save order
      const savedOrder = await this.orderRepository.create(order);

      // Deduct stock for each item
      for (const item of value.items) {
        await ProductService.updateStock(item.productId, item.quantity, 'decrement');
      }

      logger.info(`Order created: ${savedOrder.orderNumber} (${savedOrder.id})`);
      return savedOrder;
    } catch (error) {
      logger.error('Order creation failed:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(id) {
    try {
      const order = await this.orderRepository.findById(id);
      if (!order) {
        throw new Error(`Order with ID ${id} not found`);
      }
      return order;
    } catch (error) {
      logger.error(`Get order ${id} failed:`, error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber) {
    try {
      const order = await this.orderRepository.findOne({ orderNumber });
      if (!order) {
        throw new Error(`Order ${orderNumber} not found`);
      }
      return order;
    } catch (error) {
      logger.error(`Get order by number ${orderNumber} failed:`, error);
      throw error;
    }
  }

  /**
   * Get all orders for a user
   */
  async getUserOrders(userId, options = {}) {
    try {
      const { page = 1, perPage = 20, sort = '-createdAt' } = options;
      
      const orders = await this.orderRepository.findAll({
        userId,
        page,
        perPage,
        sort,
      });

      return orders;
    } catch (error) {
      logger.error(`Get orders for user ${userId} failed:`, error);
      throw error;
    }
  }

  /**
   * Get all orders with filtering
   */
  async getOrders(filters = {}, options = {}) {
    try {
      const { page = 1, perPage = 20, sort = '-createdAt' } = options;
      
      const orders = await this.orderRepository.findAll({
        ...filters,
        page,
        perPage,
        sort,
      });

      return orders;
    } catch (error) {
      logger.error('Get orders failed:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(id, newStatus, note = '') {
    try {
      const order = await this.orderRepository.findById(id);
      if (!order) {
        throw new Error(`Order with ID ${id} not found`);
      }

      // Validate status transition
      this.validateStatusTransition(order.status, newStatus);

      // Update status
      order.updateStatus(newStatus, note);
      
      const updated = await this.orderRepository.update(id, order);

      // If order is cancelled, restore stock
      if (newStatus === Order.Status.CANCELLED) {
        for (const item of order.items) {
          await ProductService.updateStock(item.productId, item.quantity, 'increment');
        }
        logger.info(`Stock restored for cancelled order ${order.orderNumber}`);
      }

      logger.info(`Order ${order.orderNumber} status updated to ${newStatus}`);
      return updated;
    } catch (error) {
      logger.error(`Update order status ${id} failed:`, error);
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(id, paymentStatus, paymentDetails = {}) {
    try {
      const order = await this.orderRepository.findById(id);
      if (!order) {
        throw new Error(`Order with ID ${id} not found`);
      }

      const updated = await this.orderRepository.update(id, {
        paymentStatus,
        paymentDetails: { ...order.paymentDetails, ...paymentDetails },
        updatedAt: new Date().toISOString(),
      });

      // If payment is successful, update order status to processing
      if (paymentStatus === Order.PaymentStatus.PAID) {
        await this.updateOrderStatus(id, Order.Status.PROCESSING, 'Payment confirmed');
      }

      logger.info(`Payment status updated for order ${order.orderNumber}: ${paymentStatus}`);
      return updated;
    } catch (error) {
      logger.error(`Update payment status ${id} failed:`, error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(id, reason = '') {
    try {
      const order = await this.orderRepository.findById(id);
      if (!order) {
        throw new Error(`Order with ID ${id} not found`);
      }

      if (!order.canCancel()) {
        throw new Error(`Order ${order.orderNumber} cannot be cancelled in current status: ${order.status}`);
      }

      return await this.updateOrderStatus(id, Order.Status.CANCELLED, reason);
    } catch (error) {
      logger.error(`Cancel order ${id} failed:`, error);
      throw error;
    }
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = {
      [Order.Status.PENDING]: [Order.Status.PROCESSING, Order.Status.CANCELLED],
      [Order.Status.PROCESSING]: [Order.Status.SHIPPED, Order.Status.CANCELLED],
      [Order.Status.SHIPPED]: [Order.Status.DELIVERED],
      [Order.Status.DELIVERED]: [Order.Status.REFUNDED],
      [Order.Status.CANCELLED]: [],
      [Order.Status.REFUNDED]: [],
      [Order.Status.FAILED]: [Order.Status.PENDING],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics() {
    try {
      // This would typically use aggregation queries
      // For PocketBase, we'll fetch and calculate
      const orders = await this.orderRepository.findAll({ perPage: 1000 });
      const items = orders.items || [];

      const totalOrders = items.length;
      const totalRevenue = items.reduce((sum, order) => sum + (order.total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const statusCounts = items.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        statusCounts,
      };
    } catch (error) {
      logger.error('Get order statistics failed:', error);
      throw error;
    }
  }
}

module.exports = new OrderService();