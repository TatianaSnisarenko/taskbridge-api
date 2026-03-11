import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/user/index.js';

export const toggleModeratorRole = asyncHandler(async (req, res) => {
  const updatedUser = await userService.setUserModeratorRole({
    userId: req.params.userId,
    enabled: req.body.enabled,
  });

  return res.status(200).json({
    user_id: updatedUser.id,
    roles: updatedUser.roles,
    moderator_enabled: updatedUser.roles.includes('MODERATOR'),
  });
});
