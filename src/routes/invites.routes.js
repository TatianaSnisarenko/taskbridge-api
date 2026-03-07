import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePersona } from '../middleware/persona.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as invitesController from '../controllers/invites.controller.js';
import { inviteIdParamSchema } from '../schemas/invites.schemas.js';

export const invitesRouter = Router();

// Accept invite (developer)
invitesRouter.post(
  '/:inviteId/accept',
  requireAuth,
  requirePersona('developer'),
  validate(inviteIdParamSchema, 'params'),
  invitesController.acceptInvite
);

// Decline invite (developer)
invitesRouter.post(
  '/:inviteId/decline',
  requireAuth,
  requirePersona('developer'),
  validate(inviteIdParamSchema, 'params'),
  invitesController.declineInvite
);

// Cancel invite (company)
invitesRouter.post(
  '/:inviteId/cancel',
  requireAuth,
  requirePersona('company'),
  validate(inviteIdParamSchema, 'params'),
  invitesController.cancelInvite
);
