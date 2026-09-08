const RepositoryFactory = require('../repositories/factory');
const Product = require('../models/product.model');
const logger = require('../utils/logger');

class ProductService {
  constructor() {
    this.productRepository = RepositoryFactory.getRepository('products');
  }

  /**
   * Create a new product
   */
  async createProduct(productData) {
    try {
      // Validate product data
      const { error, value } = Product.validate(productData);
      if (error) {
        throw new Error(`Validation failed: ${error.message}`);
      }

      // Create product instance (without generating UUID)
      const product = new Product(value);
      
      // Save to database - MongoDB will generate its own _id
      const savedProduct = await this.productRepository.create(product);
      
      logger.info(`Product created: ${savedProduct.name} (${savedProduct.id})`);
      return savedProduct;
    } catch (error) {
      logger.error('Product creation failed:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id) {
    try {
      const product = await this.productRepository.findById(id);
      if (!product) {
        throw new Error(`Product with ID ${id} not found`);
      }
      return product;
    } catch (error) {
      logger.error(`Get product ${id} failed:`, error);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku) {
    try {
      const product = await this.productRepository.findBySku(sku);
      if (!product) {
        throw new Error(`Product with SKU ${sku} not found`);
      }
      return product;
    } catch (error) {
      logger.error(`Get product by SKU ${sku} failed:`, error);
      throw error;
    }
  }

  /**
   * Get all products with filtering and pagination
   */
  async getProducts(filters = {}, options = {}) {
    try {
      const { page = 1, perPage = 20, sort = '-createdAt', search } = options;
      
      // Build filter
      const filter = { ...filters };
      
      // If search query, use search method
      if (search) {
        return await this.productRepository.search(search, {
          page,
          perPage,
          sort,
        });
      }

      // Otherwise, use find with filters
      const results = await this.productRepository.find(filter, {
        limit: perPage,
        skip: (page - 1) * perPage,
        sort: this._buildSortObject(sort),
      });
      const total = await this.productRepository.count(filter);

      return {
        items: results,
        totalItems: total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      };
    } catch (error) {
      logger.error('Get products failed:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category, options = {}) {
    try {
      return await this.productRepository.findByCategory(category, options);
    } catch (error) {
      logger.error(`Get products by category ${category} failed:`, error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(id, updateData) {
    try {
      // Check if product exists
      const existing = await this.productRepository.findById(id);
      if (!existing) {
        throw new Error(`Product with ID ${id} not found`);
      }

      // Validate update data (partial validation)
      const { error } = Product.validate({ ...existing, ...updateData });
      if (error) {
        throw new Error(`Validation failed: ${error.message}`);
      }

      // Update product
      const updated = await this.productRepository.update(id, {
        ...updateData,
        updatedAt: new Date().toISOString(),
      });

      logger.info(`Product updated: ${updated.name} (${id})`);
      return updated;
    } catch (error) {
      logger.error(`Update product ${id} failed:`, error);
      throw error;
    }
  }

  /**
   * Delete product (soft delete by changing status to archived)
   */
  async deleteProduct(id, hardDelete = false) {
    try {
      const product = await this.productRepository.findById(id);
      if (!product) {
        throw new Error(`Product with ID ${id} not found`);
      }

      if (hardDelete) {
        await this.productRepository.delete(id);
        logger.info(`Product hard deleted: ${id}`);
        return { success: true, message: 'Product permanently deleted' };
      } else {
        // Soft delete - archive
        const archived = await this.productRepository.update(id, {
          status: 'archived',
          updatedAt: new Date().toISOString(),
        });
        logger.info(`Product archived: ${id}`);
        return archived;
      }
    } catch (error) {
      logger.error(`Delete product ${id} failed:`, error);
      throw error;
    }
  }

  /**
   * Update product stock
   */
  async updateStock(productId, quantity, operation = 'decrement') {
    try {
      const updated = await this.productRepository.updateStock(
        productId,
        quantity,
        operation
      );
      
      logger.info(`Stock updated for product ${productId}: ${operation} ${quantity}`);
      return updated;
    } catch (error) {
      logger.error(`Stock update failed for ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 10) {
    try {
      return await this.productRepository.getFeatured(limit);
    } catch (error) {
      logger.error('Get featured products failed:', error);
      throw error;
    }
  }

  /**
   * Bulk create products
   */
  async bulkCreateProducts(productsData) {
    try {
      const products = [];
      const errors = [];

      for (const data of productsData) {
        try {
          const { error, value } = Product.validate(data);
          if (error) {
            errors.push({
              data,
              error: error.message,
            });
            continue;
          }

          const product = new Product(value);
          products.push(product);
        } catch (error) {
          errors.push({
            data,
            error: error.message,
          });
        }
      }

      // Bulk insert if there are products
      let inserted = [];
      if (products.length > 0) {
        inserted = await this.productRepository.bulkInsert(products);
      }

      return {
        success: inserted,
        failed: errors,
        total: productsData.length,
        succeeded: products.length,
        failedCount: errors.length,
      };
    } catch (error) {
      logger.error('Bulk create products failed:', error);
      throw error;
    }
  }

  /**
   * Build sort object from sort string
   */
  _buildSortObject(sort) {
    if (typeof sort === 'string') {
      const sortObj = {};
      const fields = sort.split(',');
      for (const field of fields) {
        if (field.startsWith('-')) {
          sortObj[field.substring(1)] = -1;
        } else {
          sortObj[field] = 1;
        }
      }
      return sortObj;
    }
    return sort || { createdAt: -1 };
  }
}

module.exports = new ProductService();