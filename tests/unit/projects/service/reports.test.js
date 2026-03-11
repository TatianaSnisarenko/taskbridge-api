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
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
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

  describe('getProjectReports', () => {
    test('returns paginated reports with filters', async () => {
      const items = [{ id: 'rp1', reason: 'SCAM', status: 'OPEN' }];
      prismaMock.projectReport.findMany.mockResolvedValue(items);
      prismaMock.projectReport.count.mockResolvedValue(1);

      const result = await projectsService.getProjectReports({
        page: 2,
        size: 10,
        status: 'OPEN',
        reason: 'SCAM',
      });

      expect(prismaMock.projectReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'OPEN', reason: 'SCAM' },
          skip: 10,
          take: 10,
        })
      );
      expect(prismaMock.projectReport.count).toHaveBeenCalledWith({
        where: { status: 'OPEN', reason: 'SCAM' },
      });
      expect(result).toEqual({
        items,
        page: 2,
        size: 10,
        total: 1,
      });
    });
  });

  describe('resolveProjectReport', () => {
    test('throws 404 when report is missing', async () => {
      prismaMock.projectReport.findUnique.mockResolvedValue(null);

      await expect(
        projectsService.resolveProjectReport({
          userId: 'm1',
          reportId: 'rp404',
          action: 'DISMISS',
        })
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('throws 409 when report already resolved', async () => {
      prismaMock.projectReport.findUnique.mockResolvedValue({
        id: 'rp1',
        projectId: 'p1',
        status: 'RESOLVED',
        project: { id: 'p1', deletedAt: null },
      });

      await expect(
        projectsService.resolveProjectReport({
          userId: 'm1',
          reportId: 'rp1',
          action: 'DELETE',
        })
      ).rejects.toMatchObject({ status: 409, code: 'ALREADY_RESOLVED' });
    });

    test('DELETE action archives project, deletes tasks and resolves report', async () => {
      const resolvedAt = new Date('2026-03-12T11:00:00Z');
      prismaMock.projectReport.findUnique.mockResolvedValue({
        id: 'rp1',
        projectId: 'p1',
        status: 'OPEN',
        project: { id: 'p1', deletedAt: null },
      });
      prismaMock.project.update.mockResolvedValue({ id: 'p1' });
      prismaMock.task.updateMany.mockResolvedValue({ count: 2 });
      prismaMock.projectReport.update.mockResolvedValue({
        id: 'rp1',
        status: 'RESOLVED',
        resolutionAction: 'DELETE',
        resolvedAt,
      });

      const result = await projectsService.resolveProjectReport({
        userId: 'm1',
        reportId: 'rp1',
        action: 'DELETE',
        note: 'Violation confirmed',
      });

      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: {
          deletedAt: expect.any(Date),
          status: 'ARCHIVED',
        },
      });
      expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
        where: {
          projectId: 'p1',
          deletedAt: null,
        },
        data: {
          status: 'DELETED',
          deletedAt: expect.any(Date),
        },
      });
      expect(prismaMock.projectReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rp1' },
          data: expect.objectContaining({
            status: 'RESOLVED',
            resolutionAction: 'DELETE',
            resolutionNote: 'Violation confirmed',
            resolvedByUserId: 'm1',
          }),
        })
      );
      expect(result).toEqual({
        reportId: 'rp1',
        status: 'RESOLVED',
        action: 'DELETE',
        resolvedAt,
      });
    });

    test('DISMISS action resolves without archive path', async () => {
      const resolvedAt = new Date('2026-03-12T11:10:00Z');
      prismaMock.projectReport.findUnique.mockResolvedValue({
        id: 'rp2',
        projectId: 'p2',
        status: 'OPEN',
        project: { id: 'p2', deletedAt: null },
      });
      prismaMock.projectReport.update.mockResolvedValue({
        id: 'rp2',
        status: 'RESOLVED',
        resolutionAction: 'DISMISS',
        resolvedAt,
      });

      const result = await projectsService.resolveProjectReport({
        userId: 'm2',
        reportId: 'rp2',
        action: 'DISMISS',
      });

      expect(prismaMock.project.update).not.toHaveBeenCalled();
      expect(prismaMock.task.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.projectReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resolutionAction: 'DISMISS',
            resolutionNote: '',
          }),
        })
      );
      expect(result.action).toBe('DISMISS');
    });
  });
});
