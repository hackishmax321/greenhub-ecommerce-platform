
const environment = require('../config/environment');
const logger = require('../utils/logger');

// Import implementations
const PocketBaseRepository = require('./implementations/pocketbase.repository');
const MongoRepository = require('./implementations/mongodb.repository');

// Cache repository instances
const repositoryCache = new Map();

/**
 * Repository Factory - Returns the appropriate repository based on DB_TYPE
 */
class RepositoryFactory {
  static getRepository(collectionName) {
    const dbType = environment.database.type;
    
    // Check cache first
    const cacheKey = `${dbType}:${collectionName}`;
    if (repositoryCache.has(cacheKey)) {
      return repositoryCache.get(cacheKey);
    }
    
    let repository;
    
    switch (dbType) {
      case 'pocketbase':
        repository = new PocketBaseRepository(collectionName);
        break;
      
      case 'mongodb':
        // Lazy initialize MongoDB - will connect when first used
        try {
          const { getMongoDb } = require('../config/database');
          // Check if MongoDB is initialized
          try {
            getMongoDb(); // This will throw if not initialized
          } catch (error) {
            // If not initialized, we'll initialize it on first use
            logger.warn(`MongoDB not initialized yet, will initialize on first use for ${collectionName}`);
          }
          repository = new MongoRepository(collectionName);
        } catch (error) {
          logger.error(`Failed to create MongoDB repository for ${collectionName}:`, error);
          throw new Error(`Database not initialized. Please ensure MongoDB is connected.`);
        }
        break;
      
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
    
    // Cache the repository
    repositoryCache.set(cacheKey, repository);
    return repository;
  }
  
  // Clear cache (useful for testing)
  static clearCache() {
    repositoryCache.clear();
  }
}

module.exports = RepositoryFactory;