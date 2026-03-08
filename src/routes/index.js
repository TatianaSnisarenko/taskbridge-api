import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { meRouter } from './me.routes.js';
import { profilesRouter } from './profiles.routes.js';
import { projectsRouter } from './projects.routes.js';
import { tasksRouter } from './tasks.routes.js';
import { applicationsRouter } from './applications.routes.js';
import { invitesRouter } from './invites.routes.js';
import { usersRouter } from './users.routes.js';
import technologiesRouter from './technologies.routes.js';
import { platformReviewsRouter } from './platform-reviews.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));

apiRouter.use('/auth', authRouter);
apiRouter.use('/me', meRouter);
apiRouter.use('/profiles', profilesRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/applications', applicationsRouter);
apiRouter.use('/invites', invitesRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/technologies', technologiesRouter);
apiRouter.use('/platform-reviews', platformReviewsRouter);
