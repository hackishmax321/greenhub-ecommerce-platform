const ProductService = require('../services/product.service');
const logger = require('../utils/logger');

class ProductController {
  /**
   * Create a new product
   * POST /api/v1/products
   */
  async createProduct(req, res, next) {
    try {
      const productData = req.body;
      const product = await ProductService.createProduct(productData);
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by ID
   * GET /api/v1/products/:id
   */
  async getProduct(req, res, next) {
    try {
      const { id } = req.params;
      const product = await ProductService.getProductById(id);
      
      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by SKU
   * GET /api/v1/products/sku/:sku
   */
  async getProductBySku(req, res, next) {
    try {
      const { sku } = req.params;
      const product = await ProductService.getProductBySku(sku);
      
      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all products with filtering
   * GET /api/v1/products
   */
  async getProducts(req, res, next) {
    try {
      const {
        page = 1,
        perPage = 20,
        sort = '-createdAt',
        search,
        category,
        status,
        minPrice,
        maxPrice,
        isFeatured,
        inStock,
      } = req.query;

      // Build filters
      const filters = {};
      if (category) filters.category = category;
      if (status) filters.status = status;
      if (isFeatured !== undefined) filters.isFeatured = isFeatured === 'true';
      if (inStock !== undefined) filters.isInStock = inStock === 'true';
      
      // Price range filter
      if (minPrice || maxPrice) {
        filters.price = {};
        if (minPrice) filters.price.gte = parseFloat(minPrice);
        if (maxPrice) filters.price.lte = parseFloat(maxPrice);
      }

      const options = {
        page: parseInt(page),
        perPage: parseInt(perPage),
        sort,
        search: search || undefined,
      };

      const products = await ProductService.getProducts(filters, options);
      
      res.json({
        success: true,
        data: products,
        meta: {
          page: parseInt(page),
          perPage: parseInt(perPage),
          total: products.totalItems || products.items?.length || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get products by category
   * GET /api/v1/products/category/:category
   */
  async getProductsByCategory(req, res, next) {
    try {
      const { category } = req.params;
      const { page = 1, perPage = 20 } = req.query;
      
      const products = await ProductService.getProductsByCategory(category, {
        page: parseInt(page),
        perPage: parseInt(perPage),
      });
      
      res.json({
        success: true,
        data: products,
        meta: {
          category,
          page: parseInt(page),
          perPage: parseInt(perPage),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get featured products
   * GET /api/v1/products/featured
   */
  async getFeaturedProducts(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const products = await ProductService.getFeaturedProducts(parseInt(limit));
      
      res.json({
        success: true,
        data: products,
        meta: {
          limit: parseInt(limit),
          total: products.items?.length || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product
   * PUT /api/v1/products/:id
   */
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const product = await ProductService.updateProduct(id, updateData);
      
      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product
   * DELETE /api/v1/products/:id
   */
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { hardDelete = false } = req.query;
      
      const result = await ProductService.deleteProduct(id, hardDelete === 'true');
      
      res.json({
        success: true,
        message: hardDelete === 'true' ? 'Product permanently deleted' : 'Product archived',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product stock
   * PATCH /api/v1/products/:id/stock
   */
  async updateStock(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity, operation = 'decrement' } = req.body;
      
      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid quantity is required',
        });
      }

      const product = await ProductService.updateStock(id, quantity, operation);
      
      res.json({
        success: true,
        message: 'Stock updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk create products
   * POST /api/v1/products/bulk
   */
  async bulkCreateProducts(req, res, next) {
    try {
      const { products } = req.body;
      
      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Products array is required',
        });
      }

      const result = await ProductService.bulkCreateProducts(products);
      
      res.status(201).json({
        success: true,
        message: 'Bulk product creation completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();