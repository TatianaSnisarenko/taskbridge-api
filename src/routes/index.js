import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { meRouter } from './me.routes.js';
import { profilesRouter } from './profiles.routes.js';
import { projectsRouter } from './projects.routes.js';
import { tasksRouter } from './tasks.routes.js';
import { applicationsRouter } from './applications.routes.js';
import { usersRouter } from './users.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));

apiRouter.use('/auth', authRouter);
apiRouter.use('/me', meRouter);
apiRouter.use('/profiles', profilesRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/applications', applicationsRouter);
apiRouter.use('/users', usersRouter);
