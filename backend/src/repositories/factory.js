const environment = require('../config/environment');
const PocketBaseRepository = require('./implementations/pocketbase.repository');

// Import other DB implementations when needed
// const MongoRepository = require('./implementations/mongodb.repository');
// const PostgresRepository = require('./implementations/postgres.repository');

/**
 * Repository Factory - Returns the appropriate repository based on DB_TYPE
 */
class RepositoryFactory {
  static getRepository(collectionName) {
    const dbType = environment.database.type;
    
    switch (dbType) {
      case 'pocketbase':
        return new PocketBaseRepository(collectionName);
      
      // Add other DB types here
      // case 'mongodb':
      //   return new MongoRepository(collectionName);
      // case 'postgres':
      //   return new PostgresRepository(collectionName);
      // case 'mysql':
      //   return new MysqlRepository(collectionName);
      
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }
}

module.exports = RepositoryFactory;