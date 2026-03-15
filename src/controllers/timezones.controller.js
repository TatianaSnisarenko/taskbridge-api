import { getTimezones } from '../services/timezones.service.js';

/**
 * GET /api/v1/timezones
 * Returns the full list of supported IANA timezones.
 */
export async function getTimezonesHandler(req, res, next) {
  try {
    const { q, limit, groupByOffset } = req.query;
    const result = getTimezones({ q, limit, groupByOffset });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
