import { Router } from 'express';
import { getTechnologies } from '../controllers/technologies.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { searchTechnologiesSchema } from '../schemas/technologies.schemas.js';

const router = Router();
router.get('/', validate(searchTechnologiesSchema, 'query'), getTechnologies);

export default router;
