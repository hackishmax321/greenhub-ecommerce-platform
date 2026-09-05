// src/repositories/implementations/mongodb.repository.js
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
   */
  _toDocument(data) {
    const { id, ...rest } = data;
    if (id) {
      return {
        _id: new ObjectId(id),
        ...rest
      };
    }
    return rest;
  }

  /**
   * Find one document by filter
   */
  async findOne(filter) {
    try {
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
   * Find by ID
   */
  async findById(id) {
    try {
      const result = await this.collection.findOne({ _id: new ObjectId(id) });
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
      // Remove _id if it exists and is invalid
      if (document._id && !ObjectId.isValid(document._id)) {
        delete document._id;
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
      const { id: _, ...updateData } = this._toDocument(data);
      
      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
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
      const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
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
      const docs = documents.map(doc => this._toDocument(doc));
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
}

module.exports = MongoRepository;