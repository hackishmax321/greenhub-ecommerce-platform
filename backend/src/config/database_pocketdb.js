const environment = require('./environment');
const logger = require('../utils/logger');

/**
 * Initialize database connection based on DB_TYPE
 * This is called once at server startup
 */
const initializeDatabase = async () => {
  const dbType = environment.database.type;
  
  try {
    switch (dbType) {
      case 'pocketbase':
        // PocketBase is initialized lazily via the repository
        // No connection pooling needed
        logger.info('PocketBase repository ready (lazy connection)');
        break;
      
      case 'mongodb':
        // Example MongoDB initialization
        // const { MongoClient } = require('mongodb');
        // const client = new MongoClient(environment.database.mongodb.uri);
        // await client.connect();
        // global.mongoClient = client;
        break;
      
      case 'postgres':
      case 'mysql':
        // Example PostgreSQL initialization with Prisma
        // const { PrismaClient } = require('@prisma/client');
        // const prisma = new PrismaClient();
        // await prisma.$connect();
        // global.prisma = prisma;
        break;
      
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
    
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

module.exports = initializeDatabase;