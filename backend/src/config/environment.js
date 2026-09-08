// src/config/environment.js
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const environment = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  host: process.env.HOST || 'localhost',
  
  database: {
    type: process.env.DB_TYPE || 'mongodb',
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb+srv://hackishmax321_db_user:Ton6UuhUtTy4HBhv@cluster0.qs3sqnq.mongodb.net/?appName=Cluster0',
      options: {
        // REMOVE these deprecated options:
        // useNewUrlParser: true,      // ❌ REMOVE - no longer needed
        // useUnifiedTopology: true,   // ❌ REMOVE - no longer needed
        
        // Keep only these valid options
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 45000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
        // For Atlas, you might want to add:
        tls: true,
        tlsAllowInvalidCertificates: false,
      }
    },
    pocketbase: {
      url: process.env.POCKETBASE_URL || 'http://localhost:8090',
      email: process.env.POCKETBASE_EMAIL,
      password: process.env.POCKETBASE_PASSWORD,
    },
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required variables
if (!environment.jwt.secret) {
  throw new Error('JWT_SECRET is required in .env file');
}

module.exports = environment;