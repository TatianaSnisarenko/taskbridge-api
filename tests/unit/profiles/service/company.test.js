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

describe('profiles.service - company', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configure $transaction to actually call the callback function
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.developerTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.developerTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  test('createCompanyProfile rejects existing profile', async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({ userId: 'u2' });

    await expect(
      profilesService.createCompanyProfile({
        userId: 'u2',
        profile: { company_name: 'TeamUp' },
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'PROFILE_ALREADY_EXISTS',
    });
  });

  test('createCompanyProfile creates profile', async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);
    prismaMock.companyProfile.create.mockResolvedValue({ userId: 'u2' });

    const profile = {
      company_name: 'TeamUp Studio',
      company_type: 'STARTUP',
      description: 'We build platforms for remote teams',
      team_size: 4,
      country: 'Ukraine',
      timezone: 'Europe/Zaporozhye',
      contact_email: 'contact@teamup.dev',
      website_url: 'https://teamup.dev',
      links: { linkedin: 'https://linkedin.com/company/teamup' },
    };

    const result = await profilesService.createCompanyProfile({ userId: 'u2', profile });

    expect(prismaMock.companyProfile.create).toHaveBeenCalledWith({
      data: {
        userId: 'u2',
        companyName: 'TeamUp Studio',
        companyType: 'STARTUP',
        description: 'We build platforms for remote teams',
        teamSize: 4,
        country: 'Ukraine',
        timezone: 'Europe/Zaporozhye',
        contactEmail: 'contact@teamup.dev',
        websiteUrl: 'https://teamup.dev',
        links: { linkedin: 'https://linkedin.com/company/teamup' },
      },
    });

    expect(result).toEqual({ userId: 'u2', created: true });
  });

  test('updateCompanyProfile rejects missing profile', async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    await expect(
      profilesService.updateCompanyProfile({
        userId: 'u2',
        profile: { company_name: 'TeamUp Studio' },
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'PROFILE_NOT_FOUND',
    });
  });

  test('updateCompanyProfile updates profile', async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({ userId: 'u2' });
    const updatedAt = new Date('2026-02-14T12:00:00Z');
    prismaMock.companyProfile.update.mockResolvedValue({ userId: 'u2', updatedAt });

    const profile = {
      company_name: 'TeamUp Studio',
      company_type: 'STARTUP',
      description: 'Updated description',
      team_size: 5,
      country: 'Ukraine',
      timezone: 'Europe/Zaporozhye',
      contact_email: 'contact@teamup.dev',
      website_url: 'https://teamup.dev',
      links: { linkedin: 'https://linkedin.com/company/teamup' },
    };

    const result = await profilesService.updateCompanyProfile({ userId: 'u2', profile });

    expect(prismaMock.companyProfile.update).toHaveBeenCalledWith({
      where: { userId: 'u2' },
      data: {
        companyName: 'TeamUp Studio',
        companyType: 'STARTUP',
        description: 'Updated description',
        teamSize: 5,
        country: 'Ukraine',
        timezone: 'Europe/Zaporozhye',
        contactEmail: 'contact@teamup.dev',
        websiteUrl: 'https://teamup.dev',
        links: { linkedin: 'https://linkedin.com/company/teamup' },
      },
      select: { userId: true, updatedAt: true },
    });

    expect(result).toEqual({ userId: 'u2', updated: true, updatedAt });
  });

  test('getCompanyProfileByUserId rejects missing profile', async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue(null);

    await expect(profilesService.getCompanyProfileByUserId({ userId: 'u2' })).rejects.toMatchObject(
      {
        status: 404,
        code: 'PROFILE_NOT_FOUND',
      }
    );
  });

  test('getCompanyProfileByUserId returns mapped profile', async () => {
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      userId: 'u2',
      createdAt: new Date('2026-03-02T08:00:00.000Z'),
      companyName: 'TeamUp Studio',
      companyType: 'STARTUP',
      description: 'We build...',
      teamSize: 4,
      country: 'Ukraine',
      timezone: 'Europe/Zaporozhye',
      logoUrl: 'https://example.com/logo.png',
      websiteUrl: 'https://teamup.dev',
      links: { linkedin: 'https://linkedin.com/company/teamup' },
      verified: false,
      avgRating: { toNumber: () => 4.6 },
      reviewsCount: 8,
    });

    // Mock for active_projects count
    prismaMock.project.count.mockResolvedValue(3);

    // Mock for projects_completed (distinct projects with COMPLETED tasks)
    prismaMock.task.findMany.mockResolvedValue([{ projectId: 'p1' }, { projectId: 'p2' }]);

    const result = await profilesService.getCompanyProfileByUserId({ userId: 'u2' });

    expect(result).toEqual({
      user_id: 'u2',
      created_at: new Date('2026-03-02T08:00:00.000Z'),
      company_name: 'TeamUp Studio',
      company_type: 'STARTUP',
      description: 'We build...',
      team_size: 4,
      country: 'Ukraine',
      timezone: 'Europe/Zaporozhye',
      logo_url: 'https://example.com/logo.png',
      website_url: 'https://teamup.dev',
      links: { linkedin: 'https://linkedin.com/company/teamup' },
      verified: false,
      avg_rating: 4.6,
      reviews_count: 8,
      projects_completed: 2,
      active_projects: 3,
    });

    expect(prismaMock.project.count).toHaveBeenCalledWith({
      where: {
        ownerUserId: 'u2',
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    expect(prismaMock.task.findMany).toHaveBeenCalledWith({
      where: {
        ownerUserId: 'u2',
        status: 'COMPLETED',
        deletedAt: null,
        projectId: { not: null },
      },
      select: {
        projectId: true,
      },
      distinct: ['projectId'],
    });
  });
});
