import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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
