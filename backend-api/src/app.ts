import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import publicRoutes from './routes/public.routes';
import docsRoutes from './routes/docs.routes';

const app = express();
app.set('trust proxy', 1);

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://pravasatransworld.com',
  'https://www.pravasatransworld.com',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.ADMIN_URL ? [process.env.ADMIN_URL] : []),
];

const isAllowedOrigin = (origin: string) =>
  allowedOrigins.includes(origin) || /^https:\/\/[\w-]+(\.vercel\.app)$/.test(origin);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Request Logging (Morgan) ─────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── HTTP Security Headers (Helmet) ──────────────────────────────────────────
// Disabled contentSecurityPolicy for a JSON API — CSP is a browser/HTML concern.
app.use(helmet({ contentSecurityPolicy: false }));

// ── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── NoSQL Injection Protection ────────────────────────────────────────────────
// Strips MongoDB operators ($gt, $where, etc.) from req.body, req.query, req.params.
app.use(mongoSanitize());

// ── XSS Sanitisation ─────────────────────────────────────────────────────────
// Recursively escapes HTML tags in every string value of req.body / req.query.
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') return xss(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return value;
}

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query) as typeof req.query;
  next();
});

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Pravasa Transworld API' }));

// ── API Docs ──────────────────────────────────────────────────────────────────
app.use('/', docsRoutes);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/public', publicRoutes);

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

export default app;
