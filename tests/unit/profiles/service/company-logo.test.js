import { jest } from '@jest/globals';
import { Buffer } from 'node:buffer';

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

describe('profiles.service - company logo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configure $transaction to actually call the callback function
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.developerTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.developerTechnology.deleteMany.mockResolvedValue({ count: 0 });
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
