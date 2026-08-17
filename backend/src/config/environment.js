const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const environment = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  host: process.env.HOST || 'localhost',
  
  database: {
    type: process.env.DB_TYPE || 'pocketbase',
    pocketbase: {
      url: process.env.POCKETBASE_URL || 'http://localhost:8090',
      email: process.env.POCKETBASE_EMAIL,
      password: process.env.POCKETBASE_PASSWORD,
    },
    // Extend for other DBs here
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