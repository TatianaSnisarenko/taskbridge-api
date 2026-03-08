import { jest } from '@jest/globals';

const prismaMock = {
  project: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  task: {
    updateMany: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  projectReport: {
    create: jest.fn(),
  },
  projectTechnology: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((arg) => {
    if (typeof arg === 'function') {
      return arg(prismaMock);
    }

    return Promise.all(arg);
  }),
};

const technologiesServiceMock = {
  validateTechnologyIds: jest.fn(async (ids) => ids),
  incrementTechnologyPopularity: jest.fn(async () => {}),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/services/technologies/index.js', () => technologiesServiceMock);

const projectsService = await import('../../../../src/services/projects/index.js');

describe('projects.service - reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.projectTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.projectTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('reportProject', () => {
    test('creates report successfully', async () => {
      const createdAt = new Date('2026-02-14T12:40:00Z');
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: null,
      });
      prismaMock.projectReport.create.mockResolvedValue({
        id: 'r1',
        createdAt,
      });

      const result = await projectsService.reportProject({
        userId: 'u1',
        persona: 'developer',
        projectId: 'p1',
        report: { reason: 'SPAM', comment: 'This is spam' },
      });

      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
        select: { id: true, deletedAt: true },
      });
      expect(prismaMock.projectReport.create).toHaveBeenCalledWith({
        data: {
          projectId: 'p1',
          reporterUserId: 'u1',
          reporterPersona: 'developer',
          reason: 'SPAM',
          comment: 'This is spam',
        },
        select: { id: true, createdAt: true },
      });
      expect(result).toEqual({ reportId: 'r1', createdAt });
    });

    test('creates report with empty comment when not provided', async () => {
      const createdAt = new Date('2026-02-14T12:40:00Z');
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: null,
      });
      prismaMock.projectReport.create.mockResolvedValue({
        id: 'r1',
        createdAt,
      });

      const result = await projectsService.reportProject({
        userId: 'u1',
        persona: 'company',
        projectId: 'p1',
        report: { reason: 'SCAM' },
      });

      expect(prismaMock.projectReport.create).toHaveBeenCalledWith({
        data: {
          projectId: 'p1',
          reporterUserId: 'u1',
          reporterPersona: 'company',
          reason: 'SCAM',
          comment: '',
        },
        select: { id: true, createdAt: true },
      });
      expect(result).toEqual({ reportId: 'r1', createdAt });
    });

    test('rejects missing project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        projectsService.reportProject({
          userId: 'u1',
          persona: 'developer',
          projectId: 'p1',
          report: { reason: 'SPAM' },
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted project', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: new Date('2026-02-14T13:00:00Z'),
      });

      await expect(
        projectsService.reportProject({
          userId: 'u1',
          persona: 'developer',
          projectId: 'p1',
          report: { reason: 'SPAM' },
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects duplicate report (unique constraint violation)', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: null,
      });
      prismaMock.projectReport.create.mockRejectedValue({
        code: 'P2002',
      });

      await expect(
        projectsService.reportProject({
          userId: 'u1',
          persona: 'developer',
          projectId: 'p1',
          report: { reason: 'SPAM' },
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'ALREADY_REPORTED',
      });
    });

    test('rethrows other database errors', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: null,
      });
      const dbError = new Error('Database error');
      prismaMock.projectReport.create.mockRejectedValue(dbError);

      await expect(
        projectsService.reportProject({
          userId: 'u1',
          persona: 'developer',
          projectId: 'p1',
          report: { reason: 'SPAM' },
        })
      ).rejects.toEqual(dbError);
    });
  });
});
