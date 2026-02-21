import { jest } from '@jest/globals';
import { Buffer } from 'node:buffer';

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

// Mock cloudinary utilities
const cloudinaryMock = {
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
};

// Mock sharp
const sharpMock = jest.fn();

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/utils/cloudinary.js', () => cloudinaryMock);
jest.unstable_mockModule('sharp', () => ({ default: sharpMock }));

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

  describe('uploadDeveloperAvatar', () => {
    test('rejects missing profile', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);

      await expect(
        profilesService.uploadDeveloperAvatar({
          userId: 'u1',
          file: { buffer: Buffer.from('fake') },
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'PROFILE_NOT_FOUND',
      });
    });

    test('rejects invalid image', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      sharpMock.mockReturnValue({
        metadata: jest.fn().mockRejectedValue(new Error('Invalid image')),
      });

      await expect(
        profilesService.uploadDeveloperAvatar({
          userId: 'u1',
          file: { buffer: Buffer.from('invalid') },
        })
      ).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_FILE_TYPE',
      });
    });

    test('rejects image smaller than 512x512', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      sharpMock.mockReturnValue({
        metadata: jest.fn().mockResolvedValue({ width: 256, height: 256 }),
      });

      await expect(
        profilesService.uploadDeveloperAvatar({
          userId: 'u1',
          file: { buffer: Buffer.from('small') },
        })
      ).rejects.toMatchObject({
        status: 400,
        code: 'IMAGE_TOO_SMALL',
      });
    });

    test('uploads avatar and updates profile', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        avatarPublicId: null,
      });
      sharpMock.mockReturnValue({
        metadata: jest.fn().mockResolvedValue({ width: 512, height: 512 }),
      });
      cloudinaryMock.uploadImage.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/example/image/upload/avatar.webp',
        public_id: 'teamup/dev-avatars/avatar',
      });
      prismaMock.developerProfile.update.mockResolvedValue({
        userId: 'u1',
        avatarUrl: 'https://res.cloudinary.com/example/image/upload/avatar.webp',
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });

      const result = await profilesService.uploadDeveloperAvatar({
        userId: 'u1',
        file: { buffer: Buffer.from('validimage') },
      });

      expect(cloudinaryMock.uploadImage).toHaveBeenCalledWith(
        Buffer.from('validimage'),
        expect.objectContaining({
          folder: 'teamup/dev-avatars',
          width: 512,
          height: 512,
          crop: 'fill',
          gravity: 'center',
          quality: 'auto',
          fetch_format: 'auto',
        })
      );

      expect(prismaMock.developerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: {
          avatarUrl: 'https://res.cloudinary.com/example/image/upload/avatar.webp',
          avatarPublicId: 'teamup/dev-avatars/avatar',
        },
        select: { userId: true, avatarUrl: true, updatedAt: true },
      });

      expect(result).toEqual({
        userId: 'u1',
        avatarUrl: 'https://res.cloudinary.com/example/image/upload/avatar.webp',
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });
    });

    test('deletes old avatar when updating', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        avatarPublicId: 'teamup/dev-avatars/old-avatar',
      });
      sharpMock.mockReturnValue({
        metadata: jest.fn().mockResolvedValue({ width: 512, height: 512 }),
      });
      cloudinaryMock.uploadImage.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/example/image/upload/new-avatar.webp',
        public_id: 'teamup/dev-avatars/new-avatar',
      });
      prismaMock.developerProfile.update.mockResolvedValue({
        userId: 'u1',
        avatarUrl: 'https://res.cloudinary.com/example/image/upload/new-avatar.webp',
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });

      await profilesService.uploadDeveloperAvatar({
        userId: 'u1',
        file: { buffer: Buffer.from('newimage') },
      });

      expect(cloudinaryMock.deleteImage).toHaveBeenCalledWith('teamup/dev-avatars/old-avatar');
    });
  });

  describe('deleteDeveloperAvatar', () => {
    test('rejects missing profile', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);

      await expect(
        profilesService.deleteDeveloperAvatar({
          userId: 'u1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'PROFILE_NOT_FOUND',
      });
    });

    test('rejects when avatar does not exist', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        avatarUrl: null,
      });

      await expect(
        profilesService.deleteDeveloperAvatar({
          userId: 'u1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'AVATAR_NOT_FOUND',
      });
    });

    test('deletes avatar successfully', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        avatarUrl: 'https://res.cloudinary.com/example/image/upload/avatar.webp',
        avatarPublicId: 'teamup/dev-avatars/avatar',
      });
      prismaMock.developerProfile.update.mockResolvedValue({
        userId: 'u1',
        avatarUrl: null,
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });

      const result = await profilesService.deleteDeveloperAvatar({
        userId: 'u1',
      });

      expect(cloudinaryMock.deleteImage).toHaveBeenCalledWith('teamup/dev-avatars/avatar');
      expect(prismaMock.developerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: {
          avatarUrl: null,
          avatarPublicId: null,
        },
        select: { userId: true, avatarUrl: true, updatedAt: true },
      });

      expect(result).toEqual({
        userId: 'u1',
        avatarUrl: null,
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });
    });

    test('handles deletion when avatarPublicId is null', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        avatarUrl: 'https://example.com/avatar.jpg',
        avatarPublicId: null,
      });
      prismaMock.developerProfile.update.mockResolvedValue({
        userId: 'u1',
        avatarUrl: null,
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });

      const result = await profilesService.deleteDeveloperAvatar({
        userId: 'u1',
      });

      expect(cloudinaryMock.deleteImage).not.toHaveBeenCalled();
      expect(prismaMock.developerProfile.update).toHaveBeenCalled();
      expect(result.avatarUrl).toBeNull();
    });
  });

  describe('uploadCompanyLogo', () => {
    test('rejects missing profile', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue(null);

      await expect(
        profilesService.uploadCompanyLogo({
          userId: 'u1',
          file: { buffer: Buffer.from('fake') },
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'PROFILE_NOT_FOUND',
      });
    });

    test('rejects invalid image', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      sharpMock.mockReturnValue({
        metadata: jest.fn().mockRejectedValue(new Error('Invalid image')),
      });

      await expect(
        profilesService.uploadCompanyLogo({
          userId: 'u1',
          file: { buffer: Buffer.from('invalid') },
        })
      ).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_FILE_TYPE',
      });
    });

    test('rejects image smaller than 512x512', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      sharpMock.mockReturnValue({
        metadata: jest.fn().mockResolvedValue({ width: 256, height: 256 }),
      });

      await expect(
        profilesService.uploadCompanyLogo({
          userId: 'u1',
          file: { buffer: Buffer.from('small') },
        })
      ).rejects.toMatchObject({
        status: 400,
        code: 'IMAGE_TOO_SMALL',
      });
    });

    test('uploads logo and updates profile', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        logoPublicId: null,
      });
      sharpMock.mockReturnValue({
        metadata: jest.fn().mockResolvedValue({ width: 512, height: 512 }),
      });
      cloudinaryMock.uploadImage.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/example/image/upload/logo.webp',
        public_id: 'teamup/company-logos/logo',
      });
      prismaMock.companyProfile.update.mockResolvedValue({
        userId: 'u1',
        logoUrl: 'https://res.cloudinary.com/example/image/upload/logo.webp',
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });

      const result = await profilesService.uploadCompanyLogo({
        userId: 'u1',
        file: { buffer: Buffer.from('validimage') },
      });

      expect(cloudinaryMock.uploadImage).toHaveBeenCalledWith(
        Buffer.from('validimage'),
        expect.objectContaining({
          folder: 'teamup/company-logos',
          width: 512,
          height: 512,
          crop: 'fill',
          gravity: 'center',
          quality: 'auto',
          fetch_format: 'auto',
        })
      );

      expect(prismaMock.companyProfile.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: {
          logoUrl: 'https://res.cloudinary.com/example/image/upload/logo.webp',
          logoPublicId: 'teamup/company-logos/logo',
        },
        select: { userId: true, logoUrl: true, updatedAt: true },
      });

      expect(result).toEqual({
        userId: 'u1',
        logoUrl: 'https://res.cloudinary.com/example/image/upload/logo.webp',
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });
    });

    test('deletes old logo when updating', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        logoPublicId: 'teamup/company-logos/old-logo',
      });
      sharpMock.mockReturnValue({
        metadata: jest.fn().mockResolvedValue({ width: 512, height: 512 }),
      });
      cloudinaryMock.uploadImage.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/example/image/upload/new-logo.webp',
        public_id: 'teamup/company-logos/new-logo',
      });
      prismaMock.companyProfile.update.mockResolvedValue({
        userId: 'u1',
        logoUrl: 'https://res.cloudinary.com/example/image/upload/new-logo.webp',
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });

      await profilesService.uploadCompanyLogo({
        userId: 'u1',
        file: { buffer: Buffer.from('newimage') },
      });

      expect(cloudinaryMock.deleteImage).toHaveBeenCalledWith('teamup/company-logos/old-logo');
    });
  });

  describe('deleteCompanyLogo', () => {
    test('rejects missing profile', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue(null);

      await expect(
        profilesService.deleteCompanyLogo({
          userId: 'u1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'PROFILE_NOT_FOUND',
      });
    });

    test('rejects when logo does not exist', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        logoUrl: null,
      });

      await expect(
        profilesService.deleteCompanyLogo({
          userId: 'u1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'LOGO_NOT_FOUND',
      });
    });

    test('deletes logo successfully', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        logoUrl: 'https://res.cloudinary.com/example/image/upload/logo.webp',
        logoPublicId: 'teamup/company-logos/logo',
      });
      prismaMock.companyProfile.update.mockResolvedValue({
        userId: 'u1',
        logoUrl: null,
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });

      const result = await profilesService.deleteCompanyLogo({
        userId: 'u1',
      });

      expect(cloudinaryMock.deleteImage).toHaveBeenCalledWith('teamup/company-logos/logo');
      expect(prismaMock.companyProfile.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: {
          logoUrl: null,
          logoPublicId: null,
        },
        select: { userId: true, logoUrl: true, updatedAt: true },
      });

      expect(result).toEqual({
        userId: 'u1',
        logoUrl: null,
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });
    });

    test('handles deletion when logoPublicId is null', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        logoUrl: 'https://example.com/logo.jpg',
        logoPublicId: null,
      });
      prismaMock.companyProfile.update.mockResolvedValue({
        userId: 'u1',
        logoUrl: null,
        updatedAt: new Date('2026-02-21T12:00:00Z'),
      });

      const result = await profilesService.deleteCompanyLogo({
        userId: 'u1',
      });

      expect(cloudinaryMock.deleteImage).not.toHaveBeenCalled();
      expect(prismaMock.companyProfile.update).toHaveBeenCalled();
      expect(result.logoUrl).toBeNull();
    });
  });
});
