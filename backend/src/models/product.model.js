const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

/**
 * Product Model (DTO - Data Transfer Object)
 * Represents a product in the e-commerce system
 */
class Product {
  constructor(data) {
    // MongoDB will generate _id, but we'll keep a reference
    this.id = data.id || data._id || new ObjectId().toString();
    this.sku = data.sku || this.generateSKU(data.name);
    this.name = data.name;
    this.description = data.description || '';
    this.price = parseFloat(data.price) || 0;
    this.compareAtPrice = data.compareAtPrice ? parseFloat(data.compareAtPrice) : null;
    this.costPerItem = data.costPerItem ? parseFloat(data.costPerItem) : null;
    this.category = data.category || 'uncategorized';
    this.subcategory = data.subcategory || '';
    this.brand = data.brand || '';
    this.tags = data.tags || [];
    this.images = data.images || [];
    this.variants = data.variants || [];
    
    // Inventory
    this.stockQuantity = parseInt(data.stockQuantity) || 0;
    this.lowStockThreshold = parseInt(data.lowStockThreshold) || 5;
    this.isInStock = data.isInStock !== undefined ? data.isInStock : this.stockQuantity > 0;
    
    // Shipping
    this.weight = data.weight ? parseFloat(data.weight) : null;
    this.dimensions = data.dimensions || {
      length: null,
      width: null,
      height: null,
    };
    
    // Status
    this.status = data.status || 'draft'; // 'draft' | 'published' | 'archived'
    this.isFeatured = data.isFeatured || false;
    this.isDigital = data.isDigital || false;
    
    // SEO
    this.seo = data.seo || {
      title: '',
      description: '',
      keywords: [],
    };
    
    // Timestamps
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.publishedAt = data.publishedAt || null;
    
    // Ratings
    this.rating = data.rating || {
      average: 0,
      count: 0,
    };
    
    // Metadata
    this.metadata = data.metadata || {};
    
    // Store original UUID if coming from migration
    this.originalId = data.originalId || null;
  }

  /**
   * Generate SKU from product name
   */
  generateSKU(name) {
    if (!name) return `SKU-${uuidv4().slice(0, 8).toUpperCase()}`;
    const prefix = name
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${random}`;
  }

  /**
   * Check if product is available for purchase
   */
  isAvailable() {
    return (
      this.status === 'published' &&
      this.isInStock &&
      this.stockQuantity > 0
    );
  }

  /**
   * Calculate discount percentage
   */
  getDiscountPercentage() {
    if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }

  /**
   * Get price with currency formatting
   */
  getFormattedPrice(currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(this.price);
  }

  /**
   * Convert to JSON (remove sensitive/internal data)
   */
  toJSON() {
    return {
      id: this.id,
      sku: this.sku,
      name: this.name,
      description: this.description,
      price: this.price,
      compareAtPrice: this.compareAtPrice,
      discountPercentage: this.getDiscountPercentage(),
      category: this.category,
      subcategory: this.subcategory,
      brand: this.brand,
      tags: this.tags,
      images: this.images,
      variants: this.variants.map(v => ({
        id: v.id,
        name: v.name,
        price: v.price,
        stock: v.stock,
        attributes: v.attributes,
      })),
      stockQuantity: this.stockQuantity,
      isInStock: this.isInStock,
      isAvailable: this.isAvailable(),
      weight: this.weight,
      dimensions: this.dimensions,
      status: this.status,
      isFeatured: this.isFeatured,
      isDigital: this.isDigital,
      seo: this.seo,
      rating: this.rating,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      publishedAt: this.publishedAt,
    };
  }

  /**
   * Validation schema using Joi
   */
  static validate(data) {
    const Joi = require('joi');
    
    const schema = Joi.object({
      id: Joi.string(),
      sku: Joi.string(),
      name: Joi.string().required().min(3).max(200),
      description: Joi.string().max(5000),
      price: Joi.number().positive().required(),
      compareAtPrice: Joi.number().positive().greater(Joi.ref('price')),
      costPerItem: Joi.number().positive(),
      category: Joi.string().required(),
      subcategory: Joi.string(),
      brand: Joi.string(),
      tags: Joi.array().items(Joi.string()),
      images: Joi.array().items(
        Joi.object({
          url: Joi.string().uri().required(),
          alt: Joi.string(),
          isPrimary: Joi.boolean(),
        })
      ),
      variants: Joi.array().items(
        Joi.object({
          id: Joi.string(),
          name: Joi.string().required(),
          price: Joi.number().positive(),
          stock: Joi.number().integer().min(0),
          attributes: Joi.object().pattern(Joi.string(), Joi.string()),
        })
      ),
      stockQuantity: Joi.number().integer().min(0).default(0),
      lowStockThreshold: Joi.number().integer().min(0).default(5),
      weight: Joi.number().positive(),
      dimensions: Joi.object({
        length: Joi.number().positive(),
        width: Joi.number().positive(),
        height: Joi.number().positive(),
      }),
      status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
      isFeatured: Joi.boolean().default(false),
      isDigital: Joi.boolean().default(false),
      seo: Joi.object({
        title: Joi.string().max(60),
        description: Joi.string().max(160),
        keywords: Joi.array().items(Joi.string()),
      }),
      metadata: Joi.object(),
      originalId: Joi.string(),
    });

    return schema.validate(data, { abortEarly: false });
  }
}

module.exports = Product;