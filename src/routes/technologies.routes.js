import { Router } from 'express';
import { getTechnologies, getTechnologyTypesList } from '../controllers/technologies.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { searchTechnologiesSchema } from '../schemas/technologies.schemas.js';

const router = Router();
router.get('/types', getTechnologyTypesList);
router.get('/', validate(searchTechnologiesSchema, 'query'), getTechnologies);

export default router;
