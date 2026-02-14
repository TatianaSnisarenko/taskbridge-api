import { asyncHandler } from '../utils/asyncHandler.js';
import * as profilesService from '../services/profiles.service.js';

export const createDeveloperProfile = asyncHandler(async (req, res) => {
  const result = await profilesService.createDeveloperProfile({
    userId: req.user.id,
    profile: req.body,
  });

  return res.status(201).json({
    user_id: result.userId,
    created: result.created,
  });
});
