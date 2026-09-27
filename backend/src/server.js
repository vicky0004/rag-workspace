import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import workspaceRoutes from './routes/workspaces.js';
import documentRoutes from './routes/documents.js';
import chatRoutes from './routes/chat.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://ragworkspace.netlify.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow matching exact or localhost origins
    if (ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle pre-flight OPTIONS for all routes (Express 5: regex)
app.options(/(.*)/, cors());

// ── Request logger (dev) ─────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Origin: ${req.headers.origin || '—'} | Auth: ${req.headers.authorization ? 'Bearer ***' : 'NONE'}`);
  next();
});

app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces', documentRoutes);
app.use('/api/workspaces', chatRoutes);
app.use('/api/workspaces', dashboardRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});