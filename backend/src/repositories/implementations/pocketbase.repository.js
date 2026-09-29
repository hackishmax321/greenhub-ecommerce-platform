const PocketBase = require('pocketbase').default;
const { v4: uuidv4 } = require('uuid');
const IRepository = require('../interfaces/repository.interface');
const environment = require('../../config/environment');

class PocketBaseRepository extends IRepository {
  constructor(collectionName) {
    super();
    this.collectionName = collectionName;
    this.client = new PocketBase(environment.database.pocketbase.url);
    
    // Authenticate once for admin operations
    this.authenticate();
  }

  async authenticate() {
    try {
      const { email, password } = environment.database.pocketbase;
      console.log(email,password)
      if (email && password) {
        await this.client.admins.authWithPassword(email, password);
        console.log(`[PocketBase] Authenticated for collection: ${this.collectionName}`);
      }
    } catch (error) {
      console.error('[PocketBase] Auth failed:', error.message);
      // In development, we can continue without auth if using public collections
      if (environment.nodeEnv === 'production') {
        throw error;
      }
    }
  }

  async create(data) {
    try {
      console.log(data)
      console.log('Creating record in collection:', this.collectionName);
      console.log('Data being sent:', JSON.stringify(data, null, 2));
      console.log(data)
      const record = await this.client.collection(this.collectionName).create(data);
      // console.log('Record created successfully:', record.id);
      return record;
    } catch (error) {
      // Log detailed error information
      console.error('PocketBase create failed:', {
        message: error.message,
        status: error.status,
        data: error.data,
        collection: this.collectionName,
        requestData: data
      });
      
      // Throw a more informative error
      throw new Error(`PocketBase create failed: ${error.message} - ${error.data?.message || ''}`);
    }
  }

  async findById(id) {
    try {
      const record = await this.client.collection(this.collectionName).getOne(id);
      return record;
    } catch (error) {
      if (error.status === 404) return null;
      throw new Error(`PocketBase findById failed: ${error.message}`);
    }
  }

  async findAll(filter = {}) {
    try {
      // Build PocketBase filter string
      const filterString = this.buildFilterString(filter);
      const records = await this.client.collection(this.collectionName).getList(
        filter.page || 1,
        filter.perPage || 50,
        {
          filter: filterString,
          sort: filter.sort || '-created',
          expand: filter.expand || '',
        }
      );
      return records;
    } catch (error) {
      throw new Error(`PocketBase findAll failed: ${error.message}`);
    }
  }

  async update(id, data) {
    try {
      const record = await this.client.collection(this.collectionName).update(id, {
        ...data,
        updated: new Date().toISOString(),
      });
      return record;
    } catch (error) {
      throw new Error(`PocketBase update failed: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      await this.client.collection(this.collectionName).delete(id);
      return true;
    } catch (error) {
      throw new Error(`PocketBase delete failed: ${error.message}`);
    }
  }

  async findOne(filter) {
    try {
      const result = await this.client.collection(this.collectionName).getList(1, 1, {
        filter: this.buildFilterString(filter),
      });
      return result.items[0] || null;
    } catch (error) {
      throw new Error(`PocketBase findOne failed: ${error.message}`);
    }
  }

  // Helper to convert filter object to PocketBase filter string
  buildFilterString(filter) {
  if (!filter || Object.keys(filter).length === 0) return '';
  
  const conditions = [];
  for (const [key, value] of Object.entries(filter)) {
    if (key === 'page' || key === 'perPage' || key === 'sort' || key === 'expand') continue;
    
    if (typeof value === 'string') {
      // Handle email and other string fields properly
      conditions.push(`${key} = "${value}"`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      conditions.push(`${key} = ${value}`);
    } else if (Array.isArray(value)) {
      const values = value.map(v => `"${v}"`).join(',');
      conditions.push(`${key} in (${values})`);
    }
  }
  // Use '&&' for PocketBase
  return conditions.join(' && ');
}

  async search(query, options = {}) {
    try {
      const { page = 1, perPage = 20, sort = '-created' } = options;
      
      // Build search filter
      let filter = '';
      if (query) {
        const searchTerms = query
          .split(' ')
          .filter(term => term.length > 0)
          .map(term => `(name ~ "${term}" || description ~ "${term}" || tags ~ "${term}")`)
          .join(' && ');
        filter = searchTerms;
      }

      const records = await this.client.collection(this.collectionName).getList(page, perPage, {
        filter: filter,
        sort: sort,
        expand: options.expand || '',
      });

      return records;
    } catch (error) {
      throw new Error(`PocketBase search failed: ${error.message}`);
    }
  }

  /**
   * Get products by category
   */
  async findByCategory(category, options = {}) {
    try {
      const { page = 1, perPage = 20 } = options;
      const filter = `category = "${category}"`;
      
      const records = await this.client.collection(this.collectionName).getList(page, perPage, {
        filter: filter,
        sort: '-created',
      });

      return records;
    } catch (error) {
      throw new Error(`PocketBase findByCategory failed: ${error.message}`);
    }
  }

  /**
   * Update stock quantity
   */
  async updateStock(productId, quantity, operation = 'decrement') {
    try {
      const product = await this.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      let newQuantity;
      if (operation === 'decrement') {
        newQuantity = product.stockQuantity - quantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient stock');
        }
      } else {
        newQuantity = product.stockQuantity + quantity;
      }

      const updated = await this.update(productId, {
        stockQuantity: newQuantity,
        isInStock: newQuantity > 0,
      });

      return updated;
    } catch (error) {
      throw new Error(`Stock update failed: ${error.message}`);
    }
  }

  /**
   * Get featured products
   */
  async getFeatured(limit = 10) {
    try {
      const records = await this.client.collection(this.collectionName).getList(1, limit, {
        filter: 'isFeatured = true && status = "published"',
        sort: '-created',
      });
      return records;
    } catch (error) {
      throw new Error(`Failed to get featured products: ${error.message}`);
    }
  }

}

module.exports = PocketBaseRepository;