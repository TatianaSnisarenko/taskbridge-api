import { jest } from '@jest/globals';

const prismaMock = {
  $transaction: jest.fn(),
  developerProfile: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  companyProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  review: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  task: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  project: {
    count: jest.fn(),
  },
  developerTechnology: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
};

const cloudinaryMock = {
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
};

const sharpMock = jest.fn();

const technologiesServiceMock = {
  validateTechnologyIds: jest.fn(async (ids) => ids),
  incrementTechnologyPopularity: jest.fn(async () => {}),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/utils/cloudinary.js', () => cloudinaryMock);
jest.unstable_mockModule('sharp', () => ({ default: sharpMock }));
jest.unstable_mockModule('../../src/services/technologies/index.js', () => technologiesServiceMock);

const profilesService = await import('../../../../src/services/profiles/index.js');

const MOCK_TECH = {
  id: 'tech-1',
  slug: 'node-js',
  name: 'Node.js',
  type: 'BACKEND',
};

const makeDeveloperProfile = (overrides = {}) => ({
  userId: 'user-1',
  displayName: 'Alice Dev',
  jobTitle: 'Backend Engineer',
  bio: 'Experienced backend developer',
  experienceLevel: 'SENIOR',
  location: 'Ukraine',
  availability: 'FULL_TIME',
  avatarUrl: null,
  avgRating: 4.5,
  reviewsCount: 10,
  technologies: [
    {
      technology: MOCK_TECH,
    },
  ],
  ...overrides,
});

describe('profiles.service - getDevelopersCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.developerTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.developerTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  test('returns paginated developers sorted by avgRating desc', async () => {
    const profiles = [
      makeDeveloperProfile({ userId: 'user-1', avgRating: 4.8, reviewsCount: 20 }),
      makeDeveloperProfile({ userId: 'user-2', avgRating: 3.5, reviewsCount: 5 }),
    ];
    prismaMock.developerProfile.findMany.mockResolvedValue(profiles);
    prismaMock.developerProfile.count.mockResolvedValue(2);

    const result = await profilesService.getDevelopersCatalog({ page: 1, size: 20 });

    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { avgRating: 'desc' },
        skip: 0,
        take: 20,
        where: {},
      })
    );
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.size).toBe(20);
    expect(result.items).toHaveLength(2);
  });

  test('maps developer fields to snake_case output', async () => {
    prismaMock.developerProfile.findMany.mockResolvedValue([makeDeveloperProfile()]);
    prismaMock.developerProfile.count.mockResolvedValue(1);

    const result = await profilesService.getDevelopersCatalog({});

    expect(result.items[0]).toEqual({
      user_id: 'user-1',
      display_name: 'Alice Dev',
      primary_role: 'Backend Engineer',
      bio: 'Experienced backend developer',
      experience_level: 'SENIOR',
      location: 'Ukraine',
      availability: 'FULL_TIME',
      avatar_url: null,
      avg_rating: 4.5,
      reviews_count: 10,
      technologies: [
        {
          id: 'tech-1',
          slug: 'node-js',
          name: 'Node.js',
          type: 'BACKEND',
        },
      ],
    });
  });

  test('converts Decimal avgRating via Number()', async () => {
    prismaMock.developerProfile.findMany.mockResolvedValue([
      makeDeveloperProfile({ avgRating: { toNumber: () => 4.2, valueOf: () => 4.2 } }),
    ]);
    prismaMock.developerProfile.count.mockResolvedValue(1);

    const result = await profilesService.getDevelopersCatalog({});

    expect(result.items[0].avg_rating).toBe(4.2);
  });

  test('returns null avg_rating when avgRating is null', async () => {
    prismaMock.developerProfile.findMany.mockResolvedValue([
      makeDeveloperProfile({ avgRating: null }),
    ]);
    prismaMock.developerProfile.count.mockResolvedValue(1);

    const result = await profilesService.getDevelopersCatalog({});

    expect(result.items[0].avg_rating).toBeNull();
  });

  test('returns empty technologies array when developer has no technologies', async () => {
    prismaMock.developerProfile.findMany.mockResolvedValue([
      makeDeveloperProfile({ technologies: [] }),
    ]);
    prismaMock.developerProfile.count.mockResolvedValue(1);

    const result = await profilesService.getDevelopersCatalog({});

    expect(result.items[0].technologies).toEqual([]);
  });

  test('applies technology_type filter to where clause', async () => {
    prismaMock.developerProfile.findMany.mockResolvedValue([]);
    prismaMock.developerProfile.count.mockResolvedValue(0);

    await profilesService.getDevelopersCatalog({ technology_type: 'BACKEND' });

    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              technologies: {
                some: {
                  technology: { type: 'BACKEND' },
                },
              },
            },
          ],
        },
      })
    );
  });

  test('applies technology_ids filter to where clause', async () => {
    prismaMock.developerProfile.findMany.mockResolvedValue([]);
    prismaMock.developerProfile.count.mockResolvedValue(0);

    const ids = ['tech-uuid-1', 'tech-uuid-2'];
    await profilesService.getDevelopersCatalog({ technology_ids: ids });

    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              technologies: {
                some: {
                  technologyId: { in: ids },
                },
              },
            },
          ],
        },
      })
    );
  });

  test('combines technology_type and technology_ids filters with AND', async () => {
    prismaMock.developerProfile.findMany.mockResolvedValue([]);
    prismaMock.developerProfile.count.mockResolvedValue(0);

    const ids = ['tech-uuid-1'];
    await profilesService.getDevelopersCatalog({
      technology_type: 'FRONTEND',
      technology_ids: ids,
    });

    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              technologies: {
                some: { technology: { type: 'FRONTEND' } },
              },
            },
            {
              technologies: {
                some: { technologyId: { in: ids } },
              },
            },
          ],
        },
      })
    );
  });

  test('uses correct pagination skip/take based on page and size', async () => {
    prismaMock.developerProfile.findMany.mockResolvedValue([]);
    prismaMock.developerProfile.count.mockResolvedValue(0);

    await profilesService.getDevelopersCatalog({ page: 3, size: 10 });

    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
    expect(prismaMock.developerProfile.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  test('runs findMany and count in parallel', async () => {
    prismaMock.developerProfile.findMany.mockResolvedValue([]);
    prismaMock.developerProfile.count.mockResolvedValue(42);

    const result = await profilesService.getDevelopersCatalog({ page: 2, size: 5 });

    expect(result.total).toBe(42);
    expect(result.page).toBe(2);
    expect(result.size).toBe(5);
    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.developerProfile.count).toHaveBeenCalledTimes(1);
  });

  test('returns items with empty technologies when no technology_ids filter', async () => {
    prismaMock.developerProfile.findMany.mockResolvedValue([]);
    prismaMock.developerProfile.count.mockResolvedValue(0);

    const result = await profilesService.getDevelopersCatalog({
      page: 1,
      size: 20,
      technology_ids: [],
    });

    expect(result.items).toEqual([]);
    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  test('defaults page=1 and size=20 when not provided', async () => {
    prismaMock.developerProfile.findMany.mockResolvedValue([]);
    prismaMock.developerProfile.count.mockResolvedValue(0);

    const result = await profilesService.getDevelopersCatalog({});

    expect(result.page).toBe(1);
    expect(result.size).toBe(20);
    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 })
    );
  });
});
