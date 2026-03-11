import { authPaths } from './swagger/paths/auth.paths.js';
import { healthPaths } from './swagger/paths/health.paths.js';
import { mePaths } from './swagger/paths/me.paths.js';
import { platformReviewsPaths } from './swagger/paths/platform-reviews.paths.js';
import { profilesPaths } from './swagger/paths/profiles.paths.js';
import { projectsPaths } from './swagger/paths/projects.paths.js';
import { tasksPaths } from './swagger/paths/tasks.paths.js';
import { technologiesPaths } from './swagger/paths/technologies.paths.js';
import { workflowsPaths } from './swagger/paths/workflows.paths.js';
import { applicationsSchemas } from './swagger/schemas/applications.schemas.js';
import { authSchemas } from './swagger/schemas/auth.schemas.js';
import { healthSchemas } from './swagger/schemas/health.schemas.js';
import { invitesSchemas } from './swagger/schemas/invites.schemas.js';
import { meSchemas } from './swagger/schemas/me.schemas.js';
import { platformReviewsSchemas } from './swagger/schemas/platform-reviews.schemas.js';
import { profilesSchemas } from './swagger/schemas/profiles.schemas.js';
import { projectsSchemas } from './swagger/schemas/projects.schemas.js';
import { reviewsSchemas } from './swagger/schemas/reviews.schemas.js';
import { sharedSchemas } from './swagger/schemas/shared.schemas.js';
import { tasksSchemas } from './swagger/schemas/tasks.schemas.js';
import { technologiesSchemas } from './swagger/schemas/technologies.schemas.js';

export const createSwaggerSpec = (appBaseUrl = 'http://localhost:3000') => ({
  openapi: '3.0.0',
  info: {
    title: 'TeamUp IT API',
    version: '0.1.0',
  },
  servers: [{ url: appBaseUrl }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Me' },
    { name: 'Users' },
    { name: 'Profiles' },
    { name: 'Projects' },
    { name: 'Tasks' },
    { name: 'Invites' },
    { name: 'Technologies' },
    { name: 'Platform Reviews' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ...authSchemas,
      ...healthSchemas,
      ...technologiesSchemas,
      ...profilesSchemas,
      ...projectsSchemas,
      ...tasksSchemas,
      ...applicationsSchemas,
      ...invitesSchemas,
      ...meSchemas,
      ...reviewsSchemas,
      ...platformReviewsSchemas,
      ...sharedSchemas,
    },
  },
  paths: {
    ...healthPaths,
    ...authPaths,
    ...mePaths,
    ...profilesPaths,
    ...projectsPaths,
    ...tasksPaths,
    ...technologiesPaths,
    ...platformReviewsPaths,
    ...workflowsPaths,
  },
});
