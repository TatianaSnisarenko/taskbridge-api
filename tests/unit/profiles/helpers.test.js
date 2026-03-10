import { jest } from '@jest/globals';

const {
  mapDeveloperProfileInput,
  mapCompanyProfileInput,
  toNumber,
  mapDeveloperProfileOutput,
  mapCompanyProfileOutput,
} = await import('../../../src/services/profiles/helpers.js');

describe('profiles.helpers', () => {
  describe('mapDeveloperProfileInput', () => {
    test('maps all API input fields to Prisma schema format', () => {
      const input = {
        display_name: 'John Developer',
        primary_role: 'Full Stack Developer',
        bio: 'Experienced developer',
        experience_level: 'SENIOR',
        location: 'San Francisco',
        timezone: 'America/Los_Angeles',
        availability: 'AVAILABLE',
        preferred_task_categories: ['BACKEND', 'FRONTEND'],
        portfolio_url: 'https://portfolio.com',
        linkedin_url: 'https://linkedin.com/in/john',
      };

      const result = mapDeveloperProfileInput(input);

      expect(result).toEqual({
        displayName: 'John Developer',
        jobTitle: 'Full Stack Developer',
        bio: 'Experienced developer',
        experienceLevel: 'SENIOR',
        location: 'San Francisco',
        timezone: 'America/Los_Angeles',
        availability: 'AVAILABLE',
        preferredTaskCategories: ['BACKEND', 'FRONTEND'],
        portfolioUrl: 'https://portfolio.com',
        linkedinUrl: 'https://linkedin.com/in/john',
      });
    });

    test('handles partial input with undefined fields', () => {
      const input = {
        display_name: 'Jane Developer',
        primary_role: 'Frontend Developer',
      };

      const result = mapDeveloperProfileInput(input);

      expect(result.displayName).toBe('Jane Developer');
      expect(result.jobTitle).toBe('Frontend Developer');
      expect(result.bio).toBeUndefined();
      expect(result.location).toBeUndefined();
    });

    test('preserves array fields', () => {
      const input = {
        display_name: 'Dev',
        primary_role: 'Dev',
        preferred_task_categories: ['BACKEND', 'DEVOPS', 'MOBILE'],
      };

      const result = mapDeveloperProfileInput(input);

      expect(result.preferredTaskCategories).toEqual(['BACKEND', 'DEVOPS', 'MOBILE']);
      expect(Array.isArray(result.preferredTaskCategories)).toBe(true);
    });

    test('handles empty categories array', () => {
      const input = {
        display_name: 'Dev',
        primary_role: 'Dev',
        preferred_task_categories: [],
      };

      const result = mapDeveloperProfileInput(input);

      expect(result.preferredTaskCategories).toEqual([]);
    });
  });

  describe('mapCompanyProfileInput', () => {
    test('maps all API input fields to Prisma schema format', () => {
      const input = {
        company_name: 'TechCorp',
        company_type: 'STARTUP',
        description: 'Innovative tech company',
        team_size: 'SIZE_50_100',
        country: 'USA',
        timezone: 'America/New_York',
        contact_email: 'contact@techcorp.com',
        website_url: 'https://techcorp.com',
        links: ['https://github.com/techcorp', 'https://twitter.com/techcorp'],
      };

      const result = mapCompanyProfileInput(input);

      expect(result).toEqual({
        companyName: 'TechCorp',
        companyType: 'STARTUP',
        description: 'Innovative tech company',
        teamSize: 'SIZE_50_100',
        country: 'USA',
        timezone: 'America/New_York',
        contactEmail: 'contact@techcorp.com',
        websiteUrl: 'https://techcorp.com',
        links: ['https://github.com/techcorp', 'https://twitter.com/techcorp'],
      });
    });

    test('handles partial input with undefined fields', () => {
      const input = {
        company_name: 'StartupXYZ',
        company_type: 'STARTUP',
      };

      const result = mapCompanyProfileInput(input);

      expect(result.companyName).toBe('StartupXYZ');
      expect(result.companyType).toBe('STARTUP');
      expect(result.description).toBeUndefined();
      expect(result.country).toBeUndefined();
    });

    test('preserves links array', () => {
      const input = {
        company_name: 'Company',
        company_type: 'ENTERPRISE',
        links: ['https://github.com', 'https://medium.com'],
      };

      const result = mapCompanyProfileInput(input);

      expect(result.links).toEqual(['https://github.com', 'https://medium.com']);
      expect(Array.isArray(result.links)).toBe(true);
    });

    test('handles empty links array', () => {
      const input = {
        company_name: 'Company',
        company_type: 'ENTERPRISE',
        links: [],
      };

      const result = mapCompanyProfileInput(input);

      expect(result.links).toEqual([]);
    });
  });

  describe('toNumber', () => {
    test('returns null for null input', () => {
      expect(toNumber(null)).toBeNull();
    });

    test('returns null for undefined input', () => {
      expect(toNumber(undefined)).toBeNull();
    });

    test('returns number as-is for number input', () => {
      expect(toNumber(42)).toBe(42);
      expect(toNumber(3.14)).toBe(3.14);
      expect(toNumber(0)).toBe(0);
    });

    test('converts string to number', () => {
      expect(toNumber('100')).toBe(100);
      expect(toNumber('3.14')).toBe(3.14);
    });

    test('converts Prisma Decimal to number using toNumber method', () => {
      const decimalMock = {
        toNumber: jest.fn(() => 4.5),
      };

      expect(toNumber(decimalMock)).toBe(4.5);
      expect(decimalMock.toNumber).toHaveBeenCalled();
    });

    test('handles NaN conversion gracefully', () => {
      const result = toNumber('not-a-number');
      expect(isNaN(result)).toBe(true);
    });
  });

  describe('mapDeveloperProfileOutput', () => {
    test('maps database record to API response format', () => {
      const profile = {
        userId: 'user-123',
        displayName: 'John Dev',
        jobTitle: 'Backend Developer',
        bio: 'Tech enthusiast',
        experienceLevel: 'SENIOR',
        location: 'Remote',
        timezone: 'UTC',
        portfolioUrl: 'https://dev.example.com',
        linkedinUrl: 'https://linkedin.com/in/johndev',
        avatarUrl: 'https://avatar.example.com/john.jpg',
        avgRating: 4.5,
        reviewsCount: 10,
        technologies: [
          {
            technology: {
              id: 'tech-1',
              slug: 'javascript',
              name: 'JavaScript',
              type: 'LANGUAGE',
            },
            proficiencyYears: 5,
          },
          {
            technology: {
              id: 'tech-2',
              slug: 'typescript',
              name: 'TypeScript',
              type: 'LANGUAGE',
            },
            proficiencyYears: 3,
          },
        ],
      };

      const result = mapDeveloperProfileOutput(profile);

      expect(result).toEqual({
        user_id: 'user-123',
        display_name: 'John Dev',
        primary_role: 'Backend Developer',
        bio: 'Tech enthusiast',
        experience_level: 'SENIOR',
        location: 'Remote',
        timezone: 'UTC',
        portfolio_url: 'https://dev.example.com',
        linkedin_url: 'https://linkedin.com/in/johndev',
        avatar_url: 'https://avatar.example.com/john.jpg',
        avg_rating: 4.5,
        reviews_count: 10,
        technologies: [
          {
            id: 'tech-1',
            slug: 'javascript',
            name: 'JavaScript',
            type: 'LANGUAGE',
            proficiency_years: 5,
          },
          {
            id: 'tech-2',
            slug: 'typescript',
            name: 'TypeScript',
            type: 'LANGUAGE',
            proficiency_years: 3,
          },
        ],
      });
    });

    test('handles null technologies', () => {
      const profile = {
        userId: 'user-123',
        displayName: 'Jane Dev',
        jobTitle: 'Developer',
        technologies: null,
      };

      const result = mapDeveloperProfileOutput(profile);

      expect(result.technologies).toBeUndefined();
    });

    test('converts Decimal avgRating to number', () => {
      const decimalMock = {
        toNumber: jest.fn(() => 4.8),
      };

      const profile = {
        userId: 'user-123',
        displayName: 'Dev',
        jobTitle: 'Developer',
        avgRating: decimalMock,
      };

      const result = mapDeveloperProfileOutput(profile);

      expect(result.avg_rating).toBe(4.8);
    });

    test('handles null avgRating', () => {
      const profile = {
        userId: 'user-123',
        displayName: 'Dev',
        jobTitle: 'Developer',
        avgRating: null,
      };

      const result = mapDeveloperProfileOutput(profile);

      expect(result.avg_rating).toBeNull();
    });

    test('handles undefined technologies gracefully', () => {
      const profile = {
        userId: 'user-123',
        displayName: 'Dev',
        jobTitle: 'Developer',
        technologies: undefined,
      };

      const result = mapDeveloperProfileOutput(profile);

      expect(result.technologies).toBeUndefined();
    });

    test('handles empty technologies array', () => {
      const profile = {
        userId: 'user-123',
        displayName: 'Dev',
        jobTitle: 'Developer',
        technologies: [],
      };

      const result = mapDeveloperProfileOutput(profile);

      expect(result.technologies).toEqual([]);
    });
  });

  describe('mapCompanyProfileOutput', () => {
    test('maps database record to API response format', () => {
      const profile = {
        userId: 'company-123',
        createdAt: new Date('2026-03-01T12:00:00.000Z'),
        companyName: 'TechCorp',
        companyType: 'STARTUP',
        description: 'Innovative company',
        teamSize: 'SIZE_50_100',
        country: 'USA',
        timezone: 'America/New_York',
        logoUrl: 'https://logo.example.com/techcorp.png',
        websiteUrl: 'https://techcorp.com',
        links: ['https://github.com/techcorp'],
        verified: true,
        avgRating: 4.7,
        reviewsCount: 25,
      };

      const result = mapCompanyProfileOutput(profile);

      expect(result).toEqual({
        user_id: 'company-123',
        created_at: new Date('2026-03-01T12:00:00.000Z'),
        company_name: 'TechCorp',
        company_type: 'STARTUP',
        description: 'Innovative company',
        team_size: 'SIZE_50_100',
        country: 'USA',
        timezone: 'America/New_York',
        logo_url: 'https://logo.example.com/techcorp.png',
        website_url: 'https://techcorp.com',
        links: ['https://github.com/techcorp'],
        verified: true,
        avg_rating: 4.7,
        reviews_count: 25,
      });
    });

    test('handles numeric avgRating conversion', () => {
      const profile = {
        userId: 'company-123',
        companyName: 'Corporation',
        avgRating: 3.5,
        reviewsCount: 10,
      };

      const result = mapCompanyProfileOutput(profile);

      expect(result.avg_rating).toBe(3.5);
      expect(typeof result.avg_rating).toBe('number');
    });

    test('converts Decimal avgRating to number', () => {
      const decimalMock = {
        toNumber: jest.fn(() => 4.2),
      };

      const profile = {
        userId: 'company-123',
        companyName: 'Corporation',
        avgRating: decimalMock,
      };

      const result = mapCompanyProfileOutput(profile);

      expect(result.avg_rating).toBe(4.2);
    });

    test('handles null avgRating', () => {
      const profile = {
        userId: 'company-123',
        companyName: 'Corporation',
        avgRating: null,
      };

      const result = mapCompanyProfileOutput(profile);

      expect(result.avg_rating).toBeNull();
    });

    test('preserves null fields', () => {
      const profile = {
        userId: 'company-123',
        companyName: 'Corporation',
        logoUrl: null,
        websiteUrl: null,
        links: null,
      };

      const result = mapCompanyProfileOutput(profile);

      expect(result.logo_url).toBeNull();
      expect(result.website_url).toBeNull();
      expect(result.links).toBeNull();
    });

    test('handles empty links array', () => {
      const profile = {
        userId: 'company-123',
        companyName: 'Corporation',
        links: [],
      };

      const result = mapCompanyProfileOutput(profile);

      expect(result.links).toEqual([]);
    });

    test('validates verified boolean field', () => {
      const profileTrue = { userId: 'c1', companyName: 'Corp', verified: true };
      const profileFalse = { userId: 'c2', companyName: 'Corp', verified: false };

      expect(mapCompanyProfileOutput(profileTrue).verified).toBe(true);
      expect(mapCompanyProfileOutput(profileFalse).verified).toBe(false);
    });
  });
});
