import { jest } from '@jest/globals';

const prismaMock = {
  developerProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const profilesService = await import('../../src/services/profiles.service.js');

describe('profiles.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      skills: ['Java', 'Spring'],
      tech_stack: ['Spring Boot', 'JPA'],
      availability: 'FEW_HOURS_WEEK',
      preferred_task_categories: ['BACKEND'],
      portfolio_url: 'https://example.com/portfolio',
      github_url: 'https://github.com/example',
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
        skills: ['Java', 'Spring'],
        techStack: ['Spring Boot', 'JPA'],
        availability: 'FEW_HOURS_WEEK',
        preferredTaskCategories: ['BACKEND'],
        portfolioUrl: 'https://example.com/portfolio',
        githubUrl: 'https://github.com/example',
        linkedinUrl: 'https://linkedin.com/in/example',
      },
    });

    expect(result).toEqual({ userId: 'u1', created: true });
  });
});
