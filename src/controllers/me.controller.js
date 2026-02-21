import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as meService from '../services/me.service.js';

export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [dev, company] = await Promise.all([
    prisma.developerProfile.findUnique({ where: { userId } }),
    prisma.companyProfile.findUnique({ where: { userId } }),
  ]);

  return res.status(200).json({
    user_id: userId,
    email: req.user.email,
    hasDeveloperProfile: !!dev,
    hasCompanyProfile: !!company,
  });
});

export const getMyApplications = asyncHandler(async (req, res) => {
  const result = await meService.getMyApplications({
    userId: req.user.id,
    page: parseInt(req.query.page) || 1,
    size: parseInt(req.query.size) || 20,
  });

  return res.status(200).json({
    items: result.items,
    page: result.page,
    size: result.size,
    total: result.total,
  });
});
