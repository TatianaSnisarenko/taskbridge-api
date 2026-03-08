import { jest } from '@jest/globals';

const prismaMock = {
  $transaction: jest.fn(),
  developerProfile: {
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

// Mock cloudinary utilities
const cloudinaryMock = {
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
};

// Mock sharp
const sharpMock = jest.fn();

// Mock technologies service
const technologiesServiceMock = {
  validateTechnologyIds: jest.fn(async (ids) => ids),
  incrementTechnologyPopularity: jest.fn(async () => {}),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/utils/cloudinary.js', () => cloudinaryMock);
jest.unstable_mockModule('sharp', () => ({ default: sharpMock }));
jest.unstable_mockModule('../../src/services/technologies/index.js', () => technologiesServiceMock);

const profilesService = await import('../../../../src/services/profiles/index.js');

describe('profiles.service - developer write', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configure $transaction to actually call the callback function
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.developerTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.developerTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  test('createDeveloperProfile rejects existing profile', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });

    await expect(
      profilesService.createDeveloperProfile({
        userId: 'u1',
        profile: { display_name: 'Tetiana' },
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'PROFILE_ALREADY_EXISTS',
    });
  });

  test('createDeveloperProfile creates profile', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue(null);
    prismaMock.developerProfile.create.mockResolvedValue({ userId: 'u1' });

    const profile = {
      display_name: 'Tetiana',
      primary_role: 'Java Backend Engineer',
      bio: 'Experienced developer with passion for clean code',
      experience_level: 'SENIOR',
      location: 'Ukraine',
      timezone: 'Europe/Zaporozhye',
      availability: 'FEW_HOURS_WEEK',
      preferred_task_categories: ['BACKEND'],
      portfolio_url: 'https://example.com/portfolio',
      linkedin_url: 'https://linkedin.com/in/example',
    };

    const result = await profilesService.createDeveloperProfile({ userId: 'u1', profile });

    expect(prismaMock.developerProfile.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        displayName: 'Tetiana',
        jobTitle: 'Java Backend Engineer',
        bio: 'Experienced developer with passion for clean code',
        experienceLevel: 'SENIOR',
        location: 'Ukraine',
        timezone: 'Europe/Zaporozhye',
        availability: 'FEW_HOURS_WEEK',
        preferredTaskCategories: ['BACKEND'],
        portfolioUrl: 'https://example.com/portfolio',
        linkedinUrl: 'https://linkedin.com/in/example',
      },
    });

    expect(result).toEqual({ userId: 'u1', created: true });
  });

  test('createDeveloperProfile creates profile with technologies', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue(null);
    prismaMock.developerProfile.create.mockResolvedValue({ userId: 'u1' });

    const profile = {
      display_name: 'Tetiana',
      primary_role: 'Java Backend Engineer',
      technology_ids: ['tech1', 'tech2'],
    };

    technologiesServiceMock.validateTechnologyIds.mockResolvedValue(['tech1', 'tech2']);

    const result = await profilesService.createDeveloperProfile({ userId: 'u1', profile });

    expect(prismaMock.developerTechnology.createMany).toHaveBeenCalledWith({
      data: [
        { developerUserId: 'u1', technologyId: 'tech1', proficiencyYears: 0 },
        { developerUserId: 'u1', technologyId: 'tech2', proficiencyYears: 0 },
      ],
      skipDuplicates: true,
    });

    expect(result).toEqual({ userId: 'u1', created: true });
  });

  test('updateDeveloperProfile rejects missing profile', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue(null);

    await expect(
      profilesService.updateDeveloperProfile({
        userId: 'u1',
        profile: { display_name: 'Tetiana' },
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'PROFILE_NOT_FOUND',
    });
  });

  test('updateDeveloperProfile updates profile', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
    const updatedAt = new Date('2026-02-14T12:00:00Z');
    prismaMock.developerProfile.update.mockResolvedValue({
      userId: 'u1',
      updatedAt,
      technologies: [],
    });

    const profile = {
      display_name: 'Tetiana',
      primary_role: 'Java Backend Engineer',
      bio: 'Experienced developer with passion for clean code',
      experience_level: 'SENIOR',
      location: 'Ukraine',
      timezone: 'Europe/Zaporozhye',
      availability: 'FEW_HOURS_WEEK',
      preferred_task_categories: ['BACKEND'],
      portfolio_url: 'https://example.com/portfolio',
      linkedin_url: 'https://linkedin.com/in/example',
    };

    const result = await profilesService.updateDeveloperProfile({ userId: 'u1', profile });

    expect(prismaMock.developerProfile.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: {
        displayName: 'Tetiana',
        jobTitle: 'Java Backend Engineer',
        bio: 'Experienced developer with passion for clean code',
        experienceLevel: 'SENIOR',
        location: 'Ukraine',
        timezone: 'Europe/Zaporozhye',
        availability: 'FEW_HOURS_WEEK',
        preferredTaskCategories: ['BACKEND'],
        portfolioUrl: 'https://example.com/portfolio',
        linkedinUrl: 'https://linkedin.com/in/example',
      },
      include: {
        technologies: {
          include: {
            technology: {
              select: {
                id: true,
                slug: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    expect(result).toEqual({
      user_id: 'u1',
      updated: true,
      updated_at: updatedAt.toISOString(),
      technologies: [],
    });
  });

  test('updateDeveloperProfile updates technologies when provided', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
    const updatedAt = new Date('2026-02-14T12:00:00Z');

    prismaMock.developerProfile.update.mockResolvedValue({
      userId: 'u1',
      updatedAt,
      technologies: [],
    });

    prismaMock.developerTechnology.findMany.mockResolvedValue([
      {
        developerUserId: 'u1',
        technologyId: 'tech1',
        proficiencyYears: 0,
        technology: {
          id: 'tech1',
          slug: 'nodejs',
          name: 'Node.js',
          type: 'BACKEND',
        },
      },
      {
        developerUserId: 'u1',
        technologyId: 'tech2',
        proficiencyYears: 0,
        technology: {
          id: 'tech2',
          slug: 'react',
          name: 'React',
          type: 'FRONTEND',
        },
      },
    ]);

    technologiesServiceMock.validateTechnologyIds.mockResolvedValue(['tech1', 'tech2']);

    const profile = {
      display_name: 'Tetiana',
      technology_ids: ['tech1', 'tech2'],
    };

    const result = await profilesService.updateDeveloperProfile({ userId: 'u1', profile });

    expect(prismaMock.developerTechnology.deleteMany).toHaveBeenCalledWith({
      where: { developerUserId: 'u1' },
    });

    expect(prismaMock.developerTechnology.createMany).toHaveBeenCalledWith({
      data: [
        { developerUserId: 'u1', technologyId: 'tech1', proficiencyYears: 0 },
        { developerUserId: 'u1', technologyId: 'tech2', proficiencyYears: 0 },
      ],
      skipDuplicates: true,
    });

    expect(technologiesServiceMock.incrementTechnologyPopularity).toHaveBeenCalledWith([
      'tech1',
      'tech2',
    ]);

    expect(result).toMatchObject({
      user_id: 'u1',
      updated: true,
      updated_at: updatedAt.toISOString(),
    });

    expect(result.technologies).toEqual([
      {
        id: 'tech1',
        slug: 'nodejs',
        name: 'Node.js',
        type: 'BACKEND',
        proficiency_years: 0,
      },
      {
        id: 'tech2',
        slug: 'react',
        name: 'React',
        type: 'FRONTEND',
        proficiency_years: 0,
      },
    ]);
  });

  test('updateDeveloperProfile handles empty technology_ids array', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
    const updatedAt = new Date('2026-02-14T12:00:00Z');

    prismaMock.developerProfile.update.mockResolvedValue({
      userId: 'u1',
      updatedAt,
      technologies: [],
    });

    technologiesServiceMock.validateTechnologyIds.mockResolvedValue([]);

    const profile = {
      display_name: 'Tetiana',
      technology_ids: [],
    };

    const result = await profilesService.updateDeveloperProfile({ userId: 'u1', profile });

    expect(prismaMock.developerTechnology.deleteMany).toHaveBeenCalledWith({
      where: { developerUserId: 'u1' },
    });

    // Should not create any technologies
    expect(prismaMock.developerTechnology.createMany).not.toHaveBeenCalled();

    // Should not increment popularity for empty array
    expect(technologiesServiceMock.incrementTechnologyPopularity).not.toHaveBeenCalled();

    expect(result).toMatchObject({
      user_id: 'u1',
      updated: true,
      technologies: [],
    });
  });
});
