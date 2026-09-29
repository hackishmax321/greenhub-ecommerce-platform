const { MongoClient } = require('mongodb');
const environment = require('./environment');
const logger = require('../utils/logger');

let client = null;
let db = null;

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
        logger.info('PocketBase repository ready (lazy connection)');
        break;
      
      case 'mongodb':
        // MongoDB initialization
        const mongoUri = environment.database.mongodb.uri;
        const options = environment.database.mongodb.options;
        
        client = new MongoClient(mongoUri, options);
        await client.connect();
        
        db = client.db();
        logger.info('MongoDB connected successfully');
        
        // Test the connection
        await db.command({ ping: 1 });
        logger.info('MongoDB ping successful');
        
        // Store client and db in global for reuse
        global.mongoClient = client;
        global.mongoDb = db;
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

// Helper functions to get client and db
const getMongoClient = () => {
  if (!client) {
    throw new Error('MongoDB client not initialized');
  }
  return client;
};

const getMongoDb = () => {
  if (!db) {
    throw new Error('MongoDB database not initialized');
  }
  return db;
};

// Close database connection
const closeDatabase = async () => {
  if (client) {
    await client.close();
    logger.info('MongoDB connection closed');
  }
};

module.exports = {
  initializeDatabase,
  getMongoClient,
  getMongoDb,
  closeDatabase
};