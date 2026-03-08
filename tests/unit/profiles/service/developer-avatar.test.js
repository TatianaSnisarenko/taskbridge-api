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

describe('profiles.service - developer avatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configure $transaction to actually call the callback function
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.developerTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.developerTechnology.deleteMany.mockResolvedValue({ count: 0 });
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

    test('rejects image with missing dimensions', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      sharpMock.mockReturnValue({
        metadata: jest.fn().mockResolvedValue({ width: undefined, height: undefined }),
      });

      await expect(
        profilesService.uploadDeveloperAvatar({
          userId: 'u1',
          file: { buffer: Buffer.from('nodimensions') },
        })
      ).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_FILE_TYPE',
        message: 'Unable to determine image dimensions',
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
});
