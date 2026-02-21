import { jest } from '@jest/globals';

const prismaMock = {
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
    prismaMock.developerProfile.update.mockResolvedValue({ userId: 'u1', updatedAt });

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
        skills: ['Java', 'Spring'],
        techStack: ['Spring Boot', 'JPA'],
        availability: 'FEW_HOURS_WEEK',
        preferredTaskCategories: ['BACKEND'],
        portfolioUrl: 'https://example.com/portfolio',
        githubUrl: 'https://github.com/example',
        linkedinUrl: 'https://linkedin.com/in/example',
      },
      select: { userId: true, updatedAt: true },
    });

    expect(result).toEqual({ userId: 'u1', updated: true, updatedAt });
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
      skills: ['Java', 'Spring'],
      techStack: ['Spring Boot', 'JPA'],
      portfolioUrl: 'https://example.com/portfolio',
      githubUrl: 'https://github.com/example',
      linkedinUrl: 'https://linkedin.com/in/example',
      avgRating: { toNumber: () => 4.7 },
      reviewsCount: 12,
    });

    const result = await profilesService.getDeveloperProfileByUserId({ userId: 'u1' });

    expect(result).toEqual({
      user_id: 'u1',
      display_name: 'Tetiana',
      primary_role: 'Java Backend Engineer',
      bio: 'Short bio',
      experience_level: 'SENIOR',
      location: 'Ukraine',
      timezone: 'Europe/Zaporozhye',
      skills: ['Java', 'Spring'],
      tech_stack: ['Spring Boot', 'JPA'],
      portfolio_url: 'https://example.com/portfolio',
      github_url: 'https://github.com/example',
      linkedin_url: 'https://linkedin.com/in/example',
      avg_rating: 4.7,
      reviews_count: 12,
    });
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
      country: 'UA',
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
        country: 'UA',
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
      country: 'UA',
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
        country: 'UA',
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
      companyName: 'TeamUp Studio',
      companyType: 'STARTUP',
      description: 'We build...',
      teamSize: 4,
      country: 'UA',
      timezone: 'Europe/Zaporozhye',
      websiteUrl: 'https://teamup.dev',
      links: { linkedin: 'https://linkedin.com/company/teamup' },
      verified: false,
      avgRating: { toNumber: () => 4.6 },
      reviewsCount: 8,
    });

    const result = await profilesService.getCompanyProfileByUserId({ userId: 'u2' });

    expect(result).toEqual({
      user_id: 'u2',
      company_name: 'TeamUp Studio',
      company_type: 'STARTUP',
      description: 'We build...',
      team_size: 4,
      country: 'UA',
      timezone: 'Europe/Zaporozhye',
      website_url: 'https://teamup.dev',
      links: { linkedin: 'https://linkedin.com/company/teamup' },
      verified: false,
      avg_rating: 4.6,
      reviews_count: 8,
    });
  });

  describe('getUserReviews', () => {
    test('getUserReviews rejects missing user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        profilesService.getUserReviews({
          userId: 'u1',
          page: 1,
          size: 20,
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'USER_NOT_FOUND',
      });
    });

    test('getUserReviews returns paginated reviews', async () => {
      const createdAt1 = new Date('2026-02-14T10:00:00Z');
      const createdAt2 = new Date('2026-02-14T15:00:00Z');

      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
      prismaMock.review.findMany.mockResolvedValue([
        {
          id: 'r1',
          taskId: 't1',
          rating: 5,
          text: 'Great work',
          createdAt: createdAt2,
          author: {
            id: 'u2',
            developerProfile: { displayName: 'Reviewer Dev' },
            companyProfile: null,
          },
        },
        {
          id: 'r2',
          taskId: 't2',
          rating: 4,
          text: 'Good collaboration',
          createdAt: createdAt1,
          author: {
            id: 'u3',
            developerProfile: null,
            companyProfile: { companyName: 'Company X' },
          },
        },
      ]);
      prismaMock.review.count.mockResolvedValue(2);

      const result = await profilesService.getUserReviews({
        userId: 'u1',
        page: 1,
        size: 20,
      });

      expect(result).toEqual({
        items: [
          {
            review_id: 'r1',
            task_id: 't1',
            rating: 5,
            text: 'Great work',
            created_at: createdAt2.toISOString(),
            author: {
              user_id: 'u2',
              display_name: 'Reviewer Dev',
              company_name: null,
            },
          },
          {
            review_id: 'r2',
            task_id: 't2',
            rating: 4,
            text: 'Good collaboration',
            created_at: createdAt1.toISOString(),
            author: {
              user_id: 'u3',
              display_name: 'Company X',
              company_name: 'Company X',
            },
          },
        ],
        page: 1,
        size: 20,
        total: 2,
      });

      expect(prismaMock.review.findMany).toHaveBeenCalledWith({
        where: { targetUserId: 'u1' },
        select: {
          id: true,
          taskId: true,
          rating: true,
          text: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              developerProfile: {
                select: {
                  displayName: true,
                },
              },
              companyProfile: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    test('getUserReviews respects pagination parameters', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
      prismaMock.review.findMany.mockResolvedValue([]);
      prismaMock.review.count.mockResolvedValue(0);

      await profilesService.getUserReviews({
        userId: 'u1',
        page: 3,
        size: 10,
      });

      expect(prismaMock.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
    });
  });
});
