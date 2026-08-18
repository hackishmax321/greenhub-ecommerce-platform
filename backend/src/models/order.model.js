const { v4: uuidv4 } = require('uuid');

/**
 * Order Status Enum
 */
const OrderStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  FAILED: 'failed',
};

/**
 * Payment Status Enum
 */
const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
};

/**
 * Order Model (DTO)
 */
class Order {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.orderNumber = data.orderNumber || this.generateOrderNumber();
    
    // Customer information
    this.userId = data.userId;
    this.customer = data.customer || {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
    };
    
    // Addresses
    this.shippingAddress = data.shippingAddress || {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    };
    this.billingAddress = data.billingAddress || data.shippingAddress || {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    };
    
    // Items
    this.items = data.items || [];
    this.totalItems = this.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    // Pricing
    this.subtotal = data.subtotal || this.calculateSubtotal();
    this.discount = data.discount || 0;
    this.tax = data.tax || 0;
    this.shippingCost = data.shippingCost || 0;
    this.total = data.total || this.calculateTotal();
    
    // Payment
    this.paymentMethod = data.paymentMethod || 'credit_card';
    this.paymentStatus = data.paymentStatus || PaymentStatus.PENDING;
    this.paymentId = data.paymentId || null;
    this.paymentDetails = data.paymentDetails || {};
    
    // Status
    this.status = data.status || OrderStatus.PENDING;
    this.statusHistory = data.statusHistory || [
      {
        status: OrderStatus.PENDING,
        timestamp: new Date().toISOString(),
        note: 'Order created',
      },
    ];
    
    // Shipping
    this.shippingMethod = data.shippingMethod || 'standard';
    this.trackingNumber = data.trackingNumber || null;
    this.trackingUrl = data.trackingUrl || null;
    this.estimatedDelivery = data.estimatedDelivery || null;
    this.actualDelivery = data.actualDelivery || null;
    
    // Notes
    this.customerNote = data.customerNote || '';
    this.adminNote = data.adminNote || '';
    
    // Timestamps
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.completedAt = data.completedAt || null;
    this.cancelledAt = data.cancelledAt || null;
    
    // Metadata
    this.metadata = data.metadata || {};
  }

  /**
   * Generate unique order number
   */
  generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Calculate subtotal from items
   */
  calculateSubtotal() {
    return this.items.reduce((sum, item) => {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      return sum + (price * quantity);
    }, 0);
  }

  /**
   * Calculate total including tax, shipping, and discount
   */
  calculateTotal() {
    return this.subtotal - this.discount + this.tax + this.shippingCost;
  }

  /**
   * Update order status with history tracking
   */
  updateStatus(newStatus, note = '') {
    this.status = newStatus;
    this.statusHistory.push({
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: note || `Status changed to ${newStatus}`,
    });
    this.updatedAt = new Date().toISOString();

    // Set completion timestamps
    if (newStatus === OrderStatus.DELIVERED) {
      this.completedAt = new Date().toISOString();
    }
    if (newStatus === OrderStatus.CANCELLED) {
      this.cancelledAt = new Date().toISOString();
    }
  }

  /**
   * Check if order can be cancelled
   */
  canCancel() {
    return [
      OrderStatus.PENDING,
      OrderStatus.PROCESSING,
    ].includes(this.status);
  }

  /**
   * Check if order can be refunded
   */
  canRefund() {
    return this.status === OrderStatus.DELIVERED && 
           this.paymentStatus === PaymentStatus.PAID;
  }

  /**
   * Check if order is complete
   */
  isComplete() {
    return [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.REFUNDED,
    ].includes(this.status);
  }

  /**
   * Get order summary
   */
  getSummary() {
    return {
      orderNumber: this.orderNumber,
      total: this.total,
      status: this.status,
      paymentStatus: this.paymentStatus,
      totalItems: this.totalItems,
      createdAt: this.createdAt,
    };
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      userId: this.userId,
      customer: this.customer,
      shippingAddress: this.shippingAddress,
      billingAddress: this.billingAddress,
      items: this.items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        image: item.image || null,
        options: item.options || {},
      })),
      totalItems: this.totalItems,
      subtotal: this.subtotal,
      discount: this.discount,
      tax: this.tax,
      shippingCost: this.shippingCost,
      total: this.total,
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      paymentId: this.paymentId,
      status: this.status,
      statusHistory: this.statusHistory,
      shippingMethod: this.shippingMethod,
      trackingNumber: this.trackingNumber,
      trackingUrl: this.trackingUrl,
      estimatedDelivery: this.estimatedDelivery,
      actualDelivery: this.actualDelivery,
      customerNote: this.customerNote,
      adminNote: this.adminNote,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
      cancelledAt: this.cancelledAt,
    };
  }

  /**
   * Validation schema
   */
  static validate(data) {
    const Joi = require('joi');
    
    const itemSchema = Joi.object({
      productId: Joi.string().required(),
      name: Joi.string().required(),
      sku: Joi.string(),
      price: Joi.number().positive().required(),
      quantity: Joi.number().integer().min(1).required(),
      image: Joi.string().uri(),
      options: Joi.object(),
    });

    const addressSchema = Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      postalCode: Joi.string().required(),
      country: Joi.string().required(),
    });

    const customerSchema = Joi.object({
      email: Joi.string().email().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      phone: Joi.string().pattern(/^[0-9+\-\s()]+$/),
    });

    const schema = Joi.object({
      userId: Joi.string().required(),
      customer: customerSchema.required(),
      shippingAddress: addressSchema.required(),
      billingAddress: addressSchema,
      items: Joi.array().items(itemSchema).min(1).required(),
      discount: Joi.number().min(0).default(0),
      tax: Joi.number().min(0).default(0),
      shippingCost: Joi.number().min(0).default(0),
      paymentMethod: Joi.string().valid('credit_card', 'paypal', 'stripe', 'bank_transfer').default('credit_card'),
      shippingMethod: Joi.string().valid('standard', 'express', 'overnight').default('standard'),
      customerNote: Joi.string().max(500),
      metadata: Joi.object(),
    });

    return schema.validate(data, { abortEarly: false });
  }
}

// Export enums for use in controllers
Order.Status = OrderStatus;
Order.PaymentStatus = PaymentStatus;

module.exports = Order;