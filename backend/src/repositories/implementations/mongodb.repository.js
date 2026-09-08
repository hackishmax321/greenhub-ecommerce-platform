const { ObjectId } = require('mongodb');
const { getMongoDb } = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * MongoDB Repository Implementation
 * Provides CRUD operations for MongoDB collections
 */
class MongoRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this._collection = null;
  }

  // Lazy getter for collection
  get collection() {
    if (!this._collection) {
      try {
        const db = getMongoDb();
        this._collection = db.collection(this.collectionName);
        logger.debug(`MongoDB collection ${this.collectionName} initialized`);
      } catch (error) {
        logger.error(`Failed to get collection ${this.collectionName}:`, error);
        throw new Error(`Database not initialized. Please ensure MongoDB is connected.`);
      }
    }
    return this._collection;
  }

  /**
   * Convert MongoDB _id to id string
   */
  _toDomain(document) {
    if (!document) return null;
    const { _id, ...rest } = document;
    return {
      id: _id.toString(),
      ...rest
    };
  }

  /**
   * Convert domain object to MongoDB document
   * Handle both UUID and existing ObjectId
   */
  _toDocument(data) {
    const { id, _id, ...rest } = data;
    
    // If there's an _id, keep it as is
    if (_id) {
      return { _id, ...rest };
    }
    
    // If there's an id, try to convert it
    if (id) {
      try {
        // Check if it's a valid ObjectId
        if (ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id)) {
          return { _id: new ObjectId(id), ...rest };
        }
        // If it's a UUID (like from pocketbase), store it as a string field
        // and let MongoDB generate its own _id
        return { 
          _id: new ObjectId(), // Generate new ObjectId for MongoDB
          uuid: id, // Store the original UUID as a separate field
          ...rest 
        };
      } catch (error) {
        // If conversion fails, generate a new ObjectId
        return { 
          _id: new ObjectId(),
          uuid: id,
          ...rest 
        };
      }
    }
    
    // No id provided, generate one
    return { _id: new ObjectId(), ...rest };
  }

  /**
   * Find one document by filter
   * Can search by 'id' field as well
   */
  async findOne(filter) {
    try {
      // If filter has 'id', convert to search in both 'id' and 'uuid' fields
      if (filter.id) {
        const idValue = filter.id;
        delete filter.id;
        // Search in both _id, id, and uuid fields
        const result = await this.collection.findOne({
          $or: [
            { _id: ObjectId.isValid(idValue) && /^[0-9a-fA-F]{24}$/.test(idValue) ? new ObjectId(idValue) : null },
            { uuid: idValue },
            { id: idValue }
          ].filter(condition => condition !== null)
        });
        return this._toDomain(result);
      }
      
      const result = await this.collection.findOne(filter);
      return this._toDomain(result);
    } catch (error) {
      logger.error(`MongoDB findOne error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find all documents matching filter
   */
  async find(filter = {}, options = {}) {
    try {
      const { limit = 100, skip = 0, sort = {} } = options;
      const cursor = this.collection
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      const results = await cursor.toArray();
      return results.map(doc => this._toDomain(doc));
    } catch (error) {
      logger.error(`MongoDB find error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find by ID (handles both ObjectId and UUID)
   */
  async findById(id) {
    try {
      let query = {};
      
      // Try to use as ObjectId if valid
      if (ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id)) {
        query = { _id: new ObjectId(id) };
      } else {
        // Search by uuid or id field
        query = { $or: [{ uuid: id }, { id: id }] };
      }
      
      const result = await this.collection.findOne(query);
      return this._toDomain(result);
    } catch (error) {
      logger.error(`MongoDB findById error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new document
   */
  async create(data) {
    try {
      const document = this._toDocument(data);
      
      // Remove any 'id' field if it exists and is not a valid ObjectId
      if (document.id) {
        delete document.id;
      }
      
      const result = await this.collection.insertOne(document);
      
      // Fetch the created document
      const created = await this.collection.findOne({ _id: result.insertedId });
      return this._toDomain(created);
    } catch (error) {
      logger.error(`MongoDB create error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update a document by ID
   */
  async update(id, data) {
    try {
      const { id: _, _id: __, ...updateData } = data;
      
      let query = {};
      if (ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id)) {
        query = { _id: new ObjectId(id) };
      } else {
        query = { $or: [{ uuid: id }, { id: id }] };
      }
      
      // Remove id field from update data if it exists
      delete updateData.id;
      
      // Add updated timestamp if not provided
      if (!updateData.updatedAt) {
        updateData.updatedAt = new Date().toISOString();
      }
      
      const result = await this.collection.findOneAndUpdate(
        query,
        { $set: updateData },
        { 
          returnDocument: 'after',
          upsert: false 
        }
      );
      
      return this._toDomain(result.value);
    } catch (error) {
      logger.error(`MongoDB update error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document by ID
   */
  async delete(id) {
    try {
      let query = {};
      if (ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id)) {
        query = { _id: new ObjectId(id) };
      } else {
        query = { $or: [{ uuid: id }, { id: id }] };
      }
      
      const result = await this.collection.deleteOne(query);
      return result.deletedCount > 0;
    } catch (error) {
      logger.error(`MongoDB delete error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Count documents matching filter
   */
  async count(filter = {}) {
    try {
      return await this.collection.countDocuments(filter);
    } catch (error) {
      logger.error(`MongoDB count error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find one and update
   */
  async findOneAndUpdate(filter, update, options = {}) {
    try {
      const result = await this.collection.findOneAndUpdate(
        filter,
        { $set: update },
        { 
          returnDocument: 'after',
          ...options 
        }
      );
      return this._toDomain(result.value);
    } catch (error) {
      logger.error(`MongoDB findOneAndUpdate error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Bulk insert
   */
  async bulkInsert(documents) {
    try {
      const docs = documents.map(doc => {
        const docData = this._toDocument(doc);
        delete docData.id; // Remove id field
        return docData;
      });
      const result = await this.collection.insertMany(docs);
      return result.insertedCount;
    } catch (error) {
      logger.error(`MongoDB bulkInsert error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create indexes
   */
  async createIndexes(indexes) {
    try {
      for (const index of indexes) {
        await this.collection.createIndex(index.keys, index.options);
      }
      logger.info(`Indexes created for ${this.collectionName}`);
    } catch (error) {
      logger.error(`MongoDB createIndexes error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Search products by text
   */
  async search(searchTerm, options = {}) {
    try {
      const { page = 1, perPage = 20, sort = '-createdAt' } = options;
      
      const searchFilter = {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { sku: { $regex: searchTerm, $options: 'i' } },
          { tags: { $regex: searchTerm, $options: 'i' } },
        ]
      };

      const results = await this.find(searchFilter, { limit: perPage, skip: (page - 1) * perPage, sort });
      const total = await this.count(searchFilter);

      return {
        items: results,
        totalItems: total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      };
    } catch (error) {
      logger.error(`MongoDB search error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find products by category
   */
  async findByCategory(category, options = {}) {
    try {
      const { page = 1, perPage = 20, sort = '-createdAt' } = options;
      
      const results = await this.find(
        { category }, 
        { limit: perPage, skip: (page - 1) * perPage, sort }
      );
      const total = await this.count({ category });

      return {
        items: results,
        totalItems: total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      };
    } catch (error) {
      logger.error(`MongoDB findByCategory error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get featured products
   */
  async getFeatured(limit = 10) {
    try {
      return await this.find(
        { isFeatured: true, status: 'published' },
        { limit, sort: { createdAt: -1 } }
      );
    } catch (error) {
      logger.error(`MongoDB getFeatured error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update product stock
   */
  async updateStock(productId, quantity, operation = 'decrement') {
    try {
      const product = await this.findById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      let newStock;
      if (operation === 'decrement') {
        if (product.stockQuantity < quantity) {
          throw new Error(`Insufficient stock. Available: ${product.stockQuantity}`);
        }
        newStock = product.stockQuantity - quantity;
      } else if (operation === 'increment') {
        newStock = product.stockQuantity + quantity;
      } else {
        newStock = quantity;
      }

      const updateData = {
        stockQuantity: newStock,
        isInStock: newStock > 0,
        updatedAt: new Date().toISOString(),
      };

      const updated = await this.update(productId, updateData);
      return updated;
    } catch (error) {
      logger.error(`MongoDB updateStock error on ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  async findBySku(sku) {
    try {
      return await this.findOne({ sku });
    } catch (error) {
      logger.error(`MongoDB findBySku error on ${this.collectionName}:`, error);
      throw error;
    }
  }
}

module.exports = MongoRepository;