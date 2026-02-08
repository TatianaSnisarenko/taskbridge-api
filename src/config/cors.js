import cors from 'cors';
import { env } from './env.js';

function parseOrigins(value) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = parseOrigins(env.clientOrigin);

export const corsMiddleware = cors({
  origin: (origin, cb) => {
    // allow non-browser tools (no Origin header)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: Origin not allowed: ${origin}`));
  },
  credentials: true,
  allowedHeaders: ['Authorization', 'X-Persona', 'Content-Type'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

export const allowedOriginsList = allowedOrigins;
