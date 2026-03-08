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

describe('profiles.service - developer read', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configure $transaction to actually call the callback function
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.developerTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.developerTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  test('getDeveloperProfileByUserId rejects missing profile', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue(null);

    await expect(
      profilesService.getDeveloperProfileByUserId({ userId: 'u1' })
    ).rejects.toMatchObject({
      status: 404,
      code: 'PROFILE_NOT_FOUND',
    });
  });

  test('getDeveloperProfileByUserId returns mapped profile', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({
      userId: 'u1',
      displayName: 'Tetiana',
      jobTitle: 'Java Backend Engineer',
      bio: 'Short bio',
      experienceLevel: 'SENIOR',
      location: 'Ukraine',
      timezone: 'Europe/Zaporozhye',
      technologies: [
        {
          technology: {
            id: 'tech-1',
            slug: 'java',
            name: 'Java',
            type: 'BACKEND',
          },
          proficiencyYears: 5,
        },
      ],
      portfolioUrl: 'https://example.com/portfolio',
      linkedinUrl: 'https://linkedin.com/in/example',
      avatarUrl: null,
      avgRating: { toNumber: () => 4.7 },
      reviewsCount: 12,
    });

    // Mock task.count for projects_completed and projects_failed
    prismaMock.task.count
      .mockResolvedValueOnce(5) // completed tasks
      .mockResolvedValueOnce(1); // failed tasks

    const result = await profilesService.getDeveloperProfileByUserId({ userId: 'u1' });

    expect(result).toEqual({
      user_id: 'u1',
      display_name: 'Tetiana',
      primary_role: 'Java Backend Engineer',
      bio: 'Short bio',
      experience_level: 'SENIOR',
      location: 'Ukraine',
      timezone: 'Europe/Zaporozhye',
      technologies: [
        {
          id: 'tech-1',
          slug: 'java',
          name: 'Java',
          type: 'BACKEND',
          proficiency_years: 5,
        },
      ],
      portfolio_url: 'https://example.com/portfolio',
      linkedin_url: 'https://linkedin.com/in/example',
      avatar_url: null,
      avg_rating: 4.7,
      reviews_count: 12,
      projects_completed: 5,
      success_rate: 5 / 6, // 5 completed / (5 completed + 1 failed)
    });

    expect(prismaMock.task.count).toHaveBeenCalledWith({
      where: {
        status: 'COMPLETED',
        acceptedApplication: {
          developerUserId: 'u1',
        },
      },
    });

    expect(prismaMock.task.count).toHaveBeenCalledWith({
      where: {
        status: 'FAILED',
        acceptedApplication: {
          developerUserId: 'u1',
        },
      },
    });
  });

  test('getDeveloperProfileByUserId returns success_rate as null when no projects', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({
      userId: 'u2',
      displayName: 'NewDev',
      jobTitle: 'Junior Developer',
      bio: 'New to the platform',
      experienceLevel: 'JUNIOR',
      location: 'USA',
      timezone: 'America/New_York',
      technologies: [],
      portfolioUrl: null,
      linkedinUrl: null,
      avatarUrl: null,
      avgRating: null,
      reviewsCount: 0,
    });

    // Mock task.count for 0 completed and 0 failed tasks
    prismaMock.task.count
      .mockResolvedValueOnce(0) // completed tasks
      .mockResolvedValueOnce(0); // failed tasks

    const result = await profilesService.getDeveloperProfileByUserId({ userId: 'u2' });

    expect(result).toMatchObject({
      user_id: 'u2',
      display_name: 'NewDev',
      projects_completed: 0,
      success_rate: null, // null when totalProjects is 0
    });
  });
});
