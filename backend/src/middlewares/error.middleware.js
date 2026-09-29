const logger = require('../utils/logger');
const environment = require('../config/environment');

const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Default error response
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  // Add stack trace in development only
  if (environment.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    response.message = 'Validation failed';
    response.errors = err.errors;
  }

  if (err.name === 'CastError') {
    response.message = 'Invalid data format';
  }

  if (err.code === 11000) {
    response.message = 'Duplicate entry found';
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;