import { getTechnologyTypes, searchTechnologies } from '../services/technologies/index.js';

/**
 * GET /technologies
 * Autocomplete endpoint for technology search
 */
export async function getTechnologies(req, res, next) {
  try {
    const { q, type, limit, activeOnly } = req.query;

    // Convert query params to proper types
    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    const parsedActiveOnly = activeOnly === 'false' ? false : true;

    const result = await searchTechnologies({
      q,
      type,
      limit: parsedLimit,
      activeOnly: parsedActiveOnly,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /technologies/types
 * Returns the list of available TechnologyType enum values
 */
export async function getTechnologyTypesList(req, res, next) {
  try {
    res.status(200).json({ items: getTechnologyTypes() });
  } catch (error) {
    next(error);
  }
}
