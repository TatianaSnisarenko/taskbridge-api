import { randomUUID } from 'node:crypto';
import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { deleteImage } from '../../utils/cloudinary.js';

const ANONYMOUS_DEVELOPER_NAME = 'Anonymous Developer';
const ANONYMOUS_COMPANY_NAME = 'Anonymous Company';

function buildDeletedEmail(userId) {
  const compactUserId = String(userId || '').replace(/-/g, '');
  return `deleted+${compactUserId}.${randomUUID()}@deleted.local`;
}

function buildDeletedPasswordHash(currentHash) {
  return `${currentHash}:deleted:${randomUUID()}`;
}

export async function deactivateMyAccount({ userId }) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      deletedAt: true,
      passwordHash: true,
      developerProfile: {
        select: {
          userId: true,
          avatarPublicId: true,
        },
      },
      companyProfile: {
        select: {
          userId: true,
          logoPublicId: true,
        },
      },
    },
  });

  if (!existing || existing.deletedAt) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const deletedAt = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    if (existing.developerProfile) {
      await tx.developerTechnology.deleteMany({ where: { developerUserId: userId } });

      await tx.developerProfile.update({
        where: { userId },
        data: {
          displayName: ANONYMOUS_DEVELOPER_NAME,
          jobTitle: '',
          bio: '',
          experienceLevel: null,
          location: null,
          timezone: null,
          availability: null,
          preferredTaskCategories: [],
          portfolioUrl: null,
          linkedinUrl: null,
          avatarUrl: null,
          avatarPublicId: null,
        },
      });
    }

    if (existing.companyProfile) {
      await tx.companyProfile.update({
        where: { userId },
        data: {
          companyName: ANONYMOUS_COMPANY_NAME,
          companyType: null,
          description: '',
          teamSize: null,
          country: null,
          timezone: null,
          logoUrl: null,
          logoPublicId: null,
          contactEmail: null,
          websiteUrl: null,
          links: {},
          verified: false,
        },
      });
    }

    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: deletedAt },
    });

    await tx.verificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: deletedAt },
    });

    return tx.user.update({
      where: { id: userId },
      data: {
        email: buildDeletedEmail(userId),
        emailVerified: false,
        passwordHash: buildDeletedPasswordHash(existing.passwordHash),
        deletedAt,
      },
      select: { id: true, deletedAt: true },
    });
  });

  const mediaPublicIds = [
    existing.developerProfile?.avatarPublicId,
    existing.companyProfile?.logoPublicId,
  ].filter(Boolean);

  if (mediaPublicIds.length > 0) {
    await Promise.allSettled(mediaPublicIds.map((publicId) => deleteImage(publicId)));
  }

  return {
    userId: updated.id,
    deletedAt: updated.deletedAt,
  };
}
