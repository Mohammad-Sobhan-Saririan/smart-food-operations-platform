import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import eventsRoutes from './routes/eventsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import baristaRoutes from './routes/baristaRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import reportingRoutes from './routes/reportingRoutes.js';
import floorRoutes from './routes/floorRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import restaurantRoutes from './routes/restaurantRoutes.js';
import restaurantAdminRoutes from './routes/restaurantAdminRoutes.js';
import restaurantReportRoutes from './routes/restaurantReportsRoutes.js';
import { env } from './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const configuredOrigins = (process.env.ALLOWED_ORIGINS || env.frontendUrl)
  .split(',').map(value => value.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS policy.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: env.appName }));
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/barista', baristaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reports', reportingRoutes);
app.use('/api/floors', floorRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/admin/restaurant', restaurantAdminRoutes);
app.use('/api/admin/restaurant/reports', restaurantReportRoutes);
const imagesDirectory = path.join(__dirname, 'images');
app.use('/images', express.static(imagesDirectory));
// Backward-compatible alias for legacy DB rows that stored api/images/... paths.
app.use('/api/images', express.static(imagesDirectory));

app.use((error, _req, res, _next) => {
  console.error('Unhandled request error:', error.message);
  res.status(500).json({ message: 'Internal server error.' });
});

export default app;
