import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { meRouter } from './me.routes.js';
import { profilesRouter } from './profiles.routes.js';
import { projectsRouter } from './projects.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));

apiRouter.use('/auth', authRouter);
apiRouter.use('/me', meRouter);
apiRouter.use('/profiles', profilesRouter);
apiRouter.use('/projects', projectsRouter);
