const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const xss = require('xss');
const hpp = require('hpp');

const environment = require('./config/environment');
const errorHandler = require('./middlewares/error.middleware');
const authMiddleware = require('./middlewares/auth.middleware');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/v1/auth.route');
const productRoutes = require('./routes/v1/auth.route');
const orderRoutes = require('./routes/v1/auth.route');

const app = express();

// ============ Security Middleware ============
// Helmet sets various HTTP headers for security
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: environment.cors.origin,
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: environment.rateLimit.windowMs,
  max: environment.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// ============ Logging ============
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// ============ Body Parsers ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============ XSS Protection ============
app.use((req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
});

// ============ Health Check ============
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: environment.nodeEnv,
    database: environment.database.type,
  });
});

// ============ API Routes ============
const apiPrefix = '/api/v1';

// Public routes
app.use(`${apiPrefix}/auth`, authRoutes);

// Protected routes (require authentication)
app.use(`${apiPrefix}/products`, authMiddleware, productRoutes);
app.use(`${apiPrefix}/orders`, authMiddleware, orderRoutes);

// ============ 404 Handler ============
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ============ Global Error Handler ============
app.use(errorHandler);

module.exports = app;