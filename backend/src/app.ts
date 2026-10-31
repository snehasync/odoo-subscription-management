import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import planRoutes from './routes/plan.routes';
import taxRoutes from './routes/tax.routes';
import discountRoutes from './routes/discount.routes';
import templateRoutes from './routes/template.routes';
import customerRoutes from './routes/customer.routes';
import subscriptionRoutes from './routes/subscription.routes';
import invoiceRoutes from './routes/invoice.routes';
import paymentRoutes from './routes/payment.routes';
import reportRoutes from './routes/report.routes';
import portalRoutes from './routes/portal.routes';

export const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server) or localhost
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Brightloop Subscription Engine',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/portal', portalRoutes);

// Catch-all 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
});

// Global central error handler
app.use(errorHandler);
