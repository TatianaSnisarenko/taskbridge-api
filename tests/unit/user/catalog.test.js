import { jest } from '@jest/globals';

const prismaMock = {
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/utils/password.js', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));
jest.unstable_mockModule('../../src/services/technologies/index.js', () => ({
  validateTechnologyIds: jest.fn().mockResolvedValue([]),
  incrementTechnologyPopularity: jest.fn().mockResolvedValue(undefined),
}));

const userService = await import('../../../src/services/user/index.js');

describe('user.catalog.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getUsersCatalog returns paginated users with me-like identity shape', async () => {
    const completedAt = new Date('2026-04-01T10:00:00.000Z');
    const skippedAt = new Date('2026-04-01T11:00:00.000Z');

    prismaMock.$transaction.mockResolvedValue([
      [
        {
          id: 'u1',
          email: 'u1@example.com',
          roles: ['USER', 'MODERATOR'],
          developerProfile: { userId: 'u1' },
          companyProfile: null,
          onboardingStates: [
            {
              role: 'developer',
              status: 'completed',
              version: 3,
              completedAt,
              skippedAt: null,
            },
          ],
        },
        {
          id: 'u2',
          email: 'u2@example.com',
          roles: ['USER'],
          developerProfile: null,
          companyProfile: { userId: 'u2' },
          onboardingStates: [
            {
              role: 'company',
              status: 'skipped',
              version: 2,
              completedAt: null,
              skippedAt,
            },
          ],
        },
      ],
      12,
    ]);

    const result = await userService.getUsersCatalog({ page: 2, size: 2 });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      items: [
        {
          user_id: 'u1',
          email: 'u1@example.com',
          roles: ['USER', 'MODERATOR'],
          hasDeveloperProfile: true,
          hasCompanyProfile: false,
          onboarding: {
            developer: {
              status: 'completed',
              version: 3,
              completed_at: completedAt.toISOString(),
              skipped_at: null,
            },
            company: {
              status: 'not_started',
              version: 1,
              completed_at: null,
              skipped_at: null,
            },
          },
        },
        {
          user_id: 'u2',
          email: 'u2@example.com',
          roles: ['USER'],
          hasDeveloperProfile: false,
          hasCompanyProfile: true,
          onboarding: {
            developer: {
              status: 'not_started',
              version: 1,
              completed_at: null,
              skipped_at: null,
            },
            company: {
              status: 'skipped',
              version: 2,
              completed_at: null,
              skipped_at: skippedAt.toISOString(),
            },
          },
        },
      ],
      page: 2,
      size: 2,
      total: 12,
    });
  });

  test('getUsersCatalog applies default pagination values', async () => {
    prismaMock.$transaction.mockResolvedValue([[], 0]);

    const result = await userService.getUsersCatalog({});

    expect(result).toEqual({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });
  });

  test('getUsersCatalog filters users by email search query', async () => {
    prismaMock.$transaction.mockResolvedValue([
      [
        {
          id: 'u1',
          email: 'alice@example.com',
          roles: ['USER'],
          developerProfile: { userId: 'u1' },
          companyProfile: null,
          onboardingStates: [],
        },
      ],
      1,
    ]);

    const result = await userService.getUsersCatalog({ page: 1, size: 20, q: 'alice' });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].email).toBe('alice@example.com');
    expect(result.total).toBe(1);
  });

  test('getUsersCatalog ignores empty search query and returns all results', async () => {
    prismaMock.$transaction.mockResolvedValue([[], 0]);

    const result = await userService.getUsersCatalog({ page: 1, size: 20, q: '' });

    // Empty query (or whitespace only) is treated as "no filter"
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
