import { jest } from '@jest/globals';

const txMock = {
  developerTechnology: {
    deleteMany: jest.fn(),
  },
  developerProfile: {
    update: jest.fn(),
  },
  companyProfile: {
    update: jest.fn(),
  },
  refreshToken: {
    updateMany: jest.fn(),
  },
  verificationToken: {
    updateMany: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
};

const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(async (callback) => callback(txMock)),
};

const deleteImageMock = jest.fn();

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/utils/cloudinary.js', () => ({
  deleteImage: deleteImageMock,
}));

const { deactivateMyAccount } = await import('../../../../src/services/me/account.js');

describe('me.service - account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    txMock.developerTechnology.deleteMany.mockResolvedValue({ count: 0 });
    txMock.developerProfile.update.mockResolvedValue({ userId: 'u1' });
    txMock.companyProfile.update.mockResolvedValue({ userId: 'u1' });
    txMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    txMock.verificationToken.updateMany.mockResolvedValue({ count: 1 });
    txMock.user.update.mockResolvedValue({ id: 'u1', deletedAt: new Date('2026-03-14T12:00:00Z') });
    deleteImageMock.mockResolvedValue(undefined);
  });

  test('throws USER_NOT_FOUND when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(deactivateMyAccount({ userId: 'u1' })).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    });
  });

  test('throws USER_NOT_FOUND when user is already deleted', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      deletedAt: new Date('2026-03-14T10:00:00Z'),
      passwordHash: 'hash',
      developerProfile: null,
      companyProfile: null,
    });

    await expect(deactivateMyAccount({ userId: 'u1' })).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    });
  });

  test('anonymizes both profiles, revokes tokens, and anonymizes user identity', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      deletedAt: null,
      passwordHash: 'hash',
      developerProfile: {
        userId: 'u1',
        avatarPublicId: 'dev-avatar-id',
      },
      companyProfile: {
        userId: 'u1',
        logoPublicId: 'company-logo-id',
      },
    });

    const result = await deactivateMyAccount({ userId: 'u1' });

    expect(txMock.developerTechnology.deleteMany).toHaveBeenCalledWith({
      where: { developerUserId: 'u1' },
    });

    expect(txMock.developerProfile.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: expect.objectContaining({
        displayName: 'Anonymous Developer',
        bio: '',
        location: null,
        portfolioUrl: null,
        linkedinUrl: null,
        avatarUrl: null,
        avatarPublicId: null,
      }),
    });

    expect(txMock.companyProfile.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: expect.objectContaining({
        companyName: 'Anonymous Company',
        description: '',
        country: null,
        contactEmail: null,
        websiteUrl: null,
        links: {},
        verified: false,
      }),
    });

    expect(txMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', revokedAt: null } })
    );
    expect(txMock.verificationToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', usedAt: null } })
    );

    expect(txMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({
        email: expect.stringMatching(/^deleted\+.+@deleted\.local$/),
        emailVerified: false,
        passwordHash: expect.stringContaining('hash:deleted:'),
        deletedAt: expect.any(Date),
      }),
      select: { id: true, deletedAt: true },
    });

    expect(deleteImageMock).toHaveBeenCalledTimes(2);
    expect(deleteImageMock).toHaveBeenNthCalledWith(1, 'dev-avatar-id');
    expect(deleteImageMock).toHaveBeenNthCalledWith(2, 'company-logo-id');

    expect(result).toEqual({
      userId: 'u1',
      deletedAt: new Date('2026-03-14T12:00:00Z'),
    });
  });

  test('does not touch profile tables or media when profiles do not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      deletedAt: null,
      passwordHash: 'hash',
      developerProfile: null,
      companyProfile: null,
    });

    await deactivateMyAccount({ userId: 'u1' });

    expect(txMock.developerTechnology.deleteMany).not.toHaveBeenCalled();
    expect(txMock.developerProfile.update).not.toHaveBeenCalled();
    expect(txMock.companyProfile.update).not.toHaveBeenCalled();
    expect(deleteImageMock).not.toHaveBeenCalled();
  });
});
