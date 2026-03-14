import { jest } from '@jest/globals';

const prismaMock = {
  developerProfile: {
    findUnique: jest.fn(),
  },
  companyProfile: {
    findUnique: jest.fn(),
  },
  userOnboardingState: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const {
  getMyOnboardingState,
  updateMyOnboardingState,
  resetMyOnboardingState,
  checkShouldShowOnboarding,
} = await import('../../../../src/services/me/onboarding.js');

describe('me.service - onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyOnboardingState', () => {
    test('returns default role states when no records exist', async () => {
      prismaMock.userOnboardingState.findMany.mockResolvedValue([]);

      const result = await getMyOnboardingState({ userId: 'u1' });

      expect(prismaMock.userOnboardingState.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          role: { in: ['developer', 'company'] },
        },
      });

      expect(result).toEqual({
        developer: {
          status: 'not_started',
          version: 1,
          completed_at: null,
          skipped_at: null,
        },
        company: {
          status: 'not_started',
          version: 1,
          completed_at: null,
          skipped_at: null,
        },
      });
    });

    test('maps persisted states for both roles', async () => {
      prismaMock.userOnboardingState.findMany.mockResolvedValue([
        {
          role: 'developer',
          status: 'completed',
          version: 2,
          completedAt: new Date('2026-03-14T10:00:00.000Z'),
          skippedAt: null,
        },
        {
          role: 'company',
          status: 'skipped',
          version: 1,
          completedAt: null,
          skippedAt: new Date('2026-03-14T11:00:00.000Z'),
        },
      ]);

      const result = await getMyOnboardingState({ userId: 'u1' });

      expect(result).toEqual({
        developer: {
          status: 'completed',
          version: 2,
          completed_at: '2026-03-14T10:00:00.000Z',
          skipped_at: null,
        },
        company: {
          status: 'skipped',
          version: 1,
          completed_at: null,
          skipped_at: '2026-03-14T11:00:00.000Z',
        },
      });
    });
  });

  describe('updateMyOnboardingState', () => {
    test('rejects developer role update when profile is missing', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);

      await expect(
        updateMyOnboardingState({
          userId: 'u1',
          role: 'developer',
          status: 'completed',
          version: 1,
        })
      ).rejects.toMatchObject({ status: 403, code: 'PERSONA_NOT_AVAILABLE' });
    });

    test('rejects company role update when profile is missing', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue(null);

      await expect(
        updateMyOnboardingState({
          userId: 'u1',
          role: 'company',
          status: 'skipped',
          version: 1,
        })
      ).rejects.toMatchObject({ status: 403, code: 'PERSONA_NOT_AVAILABLE' });
    });

    test('upserts completed state with completed_at', async () => {
      const updatedAt = new Date('2026-03-14T12:00:00.000Z');
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.userOnboardingState.upsert.mockResolvedValue({
        role: 'developer',
        status: 'completed',
        version: 3,
        completedAt: new Date('2026-03-14T12:00:00.000Z'),
        skippedAt: null,
        updatedAt,
      });

      const result = await updateMyOnboardingState({
        userId: 'u1',
        role: 'developer',
        status: 'completed',
        version: 3,
      });

      expect(prismaMock.userOnboardingState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_role: { userId: 'u1', role: 'developer' } },
          update: expect.objectContaining({
            status: 'completed',
            version: 3,
            skippedAt: null,
          }),
        })
      );

      expect(result).toEqual({
        role: 'developer',
        status: 'completed',
        version: 3,
        completed_at: '2026-03-14T12:00:00.000Z',
        skipped_at: null,
        updated_at: updatedAt.toISOString(),
      });
    });

    test('upserts skipped state with skipped_at', async () => {
      const updatedAt = new Date('2026-03-14T12:30:00.000Z');
      prismaMock.companyProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.userOnboardingState.upsert.mockResolvedValue({
        role: 'company',
        status: 'skipped',
        version: 1,
        completedAt: null,
        skippedAt: new Date('2026-03-14T12:30:00.000Z'),
        updatedAt,
      });

      const result = await updateMyOnboardingState({
        userId: 'u1',
        role: 'company',
        status: 'skipped',
        version: 1,
      });

      expect(result).toEqual({
        role: 'company',
        status: 'skipped',
        version: 1,
        completed_at: null,
        skipped_at: '2026-03-14T12:30:00.000Z',
        updated_at: updatedAt.toISOString(),
      });
    });
  });

  describe('resetMyOnboardingState', () => {
    test('rejects reset when profile for role does not exist', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue(null);

      await expect(resetMyOnboardingState({ userId: 'u1', role: 'company' })).rejects.toMatchObject(
        {
          status: 403,
          code: 'PERSONA_NOT_AVAILABLE',
        }
      );
    });

    test('resets role state to not_started', async () => {
      const updatedAt = new Date('2026-03-14T13:00:00.000Z');
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.userOnboardingState.upsert.mockResolvedValue({
        role: 'developer',
        status: 'not_started',
        version: 4,
        completedAt: null,
        skippedAt: null,
        updatedAt,
      });

      const result = await resetMyOnboardingState({ userId: 'u1', role: 'developer' });

      expect(prismaMock.userOnboardingState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_role: { userId: 'u1', role: 'developer' } },
          update: {
            status: 'not_started',
            completedAt: null,
            skippedAt: null,
          },
        })
      );

      expect(result).toEqual({
        role: 'developer',
        status: 'not_started',
        version: 4,
        completed_at: null,
        skipped_at: null,
        updated_at: updatedAt.toISOString(),
      });
    });
  });

  describe('checkShouldShowOnboarding', () => {
    test('rejects check when profile for role does not exist', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue(null);

      await expect(
        checkShouldShowOnboarding({ userId: 'u1', role: 'company', version: 1 })
      ).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });

    test('returns should_show=true when status is not_started', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.userOnboardingState.findMany.mockResolvedValue([]);

      const result = await checkShouldShowOnboarding({
        userId: 'u1',
        role: 'developer',
        version: 1,
      });

      expect(result).toEqual({
        should_show: true,
        current_status: 'not_started',
        current_version: 1,
      });
    });

    test('returns should_show=false when completed with same version', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.userOnboardingState.findMany.mockResolvedValue([
        {
          role: 'developer',
          status: 'completed',
          version: 2,
          completedAt: new Date('2026-03-14T10:00:00.000Z'),
          skippedAt: null,
        },
      ]);

      const result = await checkShouldShowOnboarding({
        userId: 'u1',
        role: 'developer',
        version: 2,
      });

      expect(result).toEqual({
        should_show: false,
        current_status: 'completed',
        current_version: 2,
      });
    });

    test('returns should_show=true when frontend version is newer than stored', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.userOnboardingState.findMany.mockResolvedValue([
        {
          role: 'developer',
          status: 'completed',
          version: 1,
          completedAt: new Date('2026-03-14T10:00:00.000Z'),
          skippedAt: null,
        },
      ]);

      const result = await checkShouldShowOnboarding({
        userId: 'u1',
        role: 'developer',
        version: 2,
      });

      expect(result).toEqual({
        should_show: true,
        current_status: 'completed',
        current_version: 1,
      });
    });

    test('returns should_show=false when skipped with same version', async () => {
      prismaMock.companyProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.userOnboardingState.findMany.mockResolvedValue([
        {
          role: 'company',
          status: 'skipped',
          version: 3,
          completedAt: null,
          skippedAt: new Date('2026-03-14T11:00:00.000Z'),
        },
      ]);

      const result = await checkShouldShowOnboarding({ userId: 'u1', role: 'company', version: 3 });

      expect(result).toEqual({
        should_show: false,
        current_status: 'skipped',
        current_version: 3,
      });
    });
  });
});
