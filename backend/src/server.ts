import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { initializeDatabase } from './config/db';
import { initBillingCron } from './services/billing.cron';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await initializeDatabase();
    console.log('[DATABASE] SQLite WAL mode and optimizations applied.');

    initBillingCron();

    const server = app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Brightloop API Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
      console.log(`======================================================\n`);
    });

    const gracefulShutdown = () => {
      console.log('\nReceived termination signal. Shutting down gracefully...');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

bootstrap();
