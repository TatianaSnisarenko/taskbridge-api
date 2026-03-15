import { Router } from 'express';
import { getTimezonesHandler } from '../controllers/timezones.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { getTimezonesQuerySchema } from '../schemas/timezones.schemas.js';

const router = Router();

router.get('/', validate(getTimezonesQuerySchema, 'query'), getTimezonesHandler);

export default router;
