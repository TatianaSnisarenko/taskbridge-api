import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/user/index.js';

export const toggleModeratorRole = asyncHandler(async (req, res) => {
  const updatedUser = await userService.setUserModeratorRole({
    userId: req.params.userId,
    enabled: req.body.enabled,
    actorUserId: req.user.id,
  });

  return res.status(200).json({
    user_id: updatedUser.id,
    roles: updatedUser.roles,
    moderator_enabled: updatedUser.roles.includes('MODERATOR'),
  });
});

export const getUsersCatalog = asyncHandler(async (req, res) => {
  const result = await userService.getUsersCatalog({
    page: req.query.page,
    size: req.query.size,
    q: req.query.q,
  });

  return res.status(200).json({
    items: result.items,
    page: result.page,
    size: result.size,
    total: result.total,
  });
});
