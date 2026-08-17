const app = require('./src/app');
const environment = require('./src/config/environment');
const logger = require('./src/utils/logger');

// Import DB initialization (if needed)
const initializeDatabase = require('./src/config/database');

const PORT = environment.port;
const HOST = environment.host;

// Graceful shutdown handling
let server;

const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info(`Connected to database: ${environment.database.type}`);

    // Start HTTP server
    server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running in ${environment.nodeEnv} mode`);
      logger.info(`📍 http://${HOST}:${PORT}`);
      logger.info(`📊 Health check: http://${HOST}:${PORT}/health`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // In production, you might want to gracefully shutdown
  if (environment.nodeEnv === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  if (environment.nodeEnv === 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Received shutdown signal, closing server...');
  if (server) {
    server.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();