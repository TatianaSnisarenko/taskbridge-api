import { jest } from '@jest/globals';

const prismaMock = {
  developerProfile: {
    findUnique: jest.fn(),
  },
  companyProfile: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const {
  findDeveloperProfileForOwnership,
  findCompanyProfileForOwnership,
  findProfileWithReviews,
  ensureUserExists,
  calculateAverageRating,
} = await import('../../../src/db/queries/profiles.queries.js');

describe('profiles.queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findDeveloperProfileForOwnership returns profile for owner', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });

    const result = await findDeveloperProfileForOwnership('u1', 'u1');

    expect(prismaMock.developerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(result).toEqual({ userId: 'u1' });
  });

  test('findDeveloperProfileForOwnership throws when requester is not owner', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });

    await expect(findDeveloperProfileForOwnership('u1', 'u2')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('findCompanyProfileForOwnership throws when company profile missing', async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    await expect(findCompanyProfileForOwnership('u1', 'u1')).rejects.toMatchObject({
      status: 404,
      code: 'PROFILE_NOT_FOUND',
    });
  });

  test('findProfileWithReviews loads developer profile with technologies', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });

    await findProfileWithReviews('u1', false);

    expect(prismaMock.developerProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        include: expect.objectContaining({
          technologies: expect.any(Object),
        }),
      })
    );
  });

  test('findProfileWithReviews loads company profile for company mode', async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({ userId: 'u2' });

    await findProfileWithReviews('u2', true);

    expect(prismaMock.companyProfile.findUnique).toHaveBeenCalledWith({ where: { userId: 'u2' } });
  });

  test('ensureUserExists throws when user missing', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(ensureUserExists('u3')).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    });
  });

  test('calculateAverageRating returns zero for empty count', () => {
    expect(calculateAverageRating(15, 0)).toBe(0);
  });

  test('calculateAverageRating rounds to one decimal place', () => {
    expect(calculateAverageRating(14, 3)).toBe(4.7);
  });
});
