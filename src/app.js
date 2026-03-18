import express from 'express';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { corsMiddleware } from './config/cors.js';
import { createSwaggerSpec } from './docs/swagger.js';
import { requireAuth, requireAdminOrModerator } from './middleware/auth.middleware.js';
import { apiRouter } from './routes/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';

export function createApp(appBaseUrl = 'http://localhost:3000') {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json());
  app.use(cookieParser());

  const swaggerSpec = createSwaggerSpec(appBaseUrl);
  app.get('/api/v1/docs/openapi.json', requireAuth, requireAdminOrModerator, (req, res) => {
    return res.status(200).json(swaggerSpec);
  });
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api/v1', apiRouter);

  app.use(errorMiddleware);
  return app;
}
