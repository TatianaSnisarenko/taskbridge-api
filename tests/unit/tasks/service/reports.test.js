import { jest } from '@jest/globals';

const prismaMock = {
  taskReport: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  task: {
    update: jest.fn(),
  },
  $transaction: jest.fn((arg) => {
    if (typeof arg === 'function') {
      return arg(prismaMock);
    }

    return Promise.all(arg);
  }),
};

const findTaskForReportMock = jest.fn();

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/db/queries/tasks.queries.js', () => ({
  findTaskForReport: findTaskForReportMock,
}));

const tasksReportingService = await import('../../../../src/services/tasks/reporting.js');

describe('tasks.service - reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reportTask', () => {
    test('creates report with explicit comment', async () => {
      const createdAt = new Date('2026-03-12T10:00:00Z');
      findTaskForReportMock.mockResolvedValue({ id: 't1' });
      prismaMock.taskReport.create.mockResolvedValue({ id: 'r1', createdAt });

      const result = await tasksReportingService.reportTask({
        userId: 'u1',
        persona: 'developer',
        taskId: 't1',
        report: { reason: 'SPAM', comment: 'Bad content' },
      });

      expect(findTaskForReportMock).toHaveBeenCalledWith('t1');
      expect(prismaMock.taskReport.create).toHaveBeenCalledWith({
        data: {
          taskId: 't1',
          reporterUserId: 'u1',
          reporterPersona: 'developer',
          reason: 'SPAM',
          comment: 'Bad content',
        },
        select: { id: true, createdAt: true },
      });
      expect(result).toEqual({ reportId: 'r1', createdAt });
    });

    test('maps unique violation to ALREADY_REPORTED', async () => {
      findTaskForReportMock.mockResolvedValue({ id: 't1' });
      prismaMock.taskReport.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        tasksReportingService.reportTask({
          userId: 'u1',
          persona: 'developer',
          taskId: 't1',
          report: { reason: 'SCAM' },
        })
      ).rejects.toMatchObject({ status: 409, code: 'ALREADY_REPORTED' });
    });
  });

  describe('getTaskReports', () => {
    test('returns paginated reports with filters', async () => {
      const items = [{ id: 'r1', reason: 'SPAM' }];
      prismaMock.taskReport.findMany.mockResolvedValue(items);
      prismaMock.taskReport.count.mockResolvedValue(1);

      const result = await tasksReportingService.getTaskReports({
        page: 2,
        size: 10,
        status: 'OPEN',
        reason: 'SPAM',
      });

      expect(prismaMock.taskReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'OPEN', reason: 'SPAM' },
          skip: 10,
          take: 10,
        })
      );
      expect(prismaMock.taskReport.count).toHaveBeenCalledWith({
        where: { status: 'OPEN', reason: 'SPAM' },
      });
      expect(result).toEqual({ items, page: 2, size: 10, total: 1 });
    });
  });

  describe('resolveTaskReport', () => {
    test('throws 404 when report does not exist', async () => {
      prismaMock.taskReport.findUnique.mockResolvedValue(null);

      await expect(
        tasksReportingService.resolveTaskReport({
          userId: 'm1',
          reportId: 'r404',
          action: 'DISMISS',
        })
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('throws 409 when report already resolved', async () => {
      prismaMock.taskReport.findUnique.mockResolvedValue({
        id: 'r1',
        taskId: 't1',
        status: 'RESOLVED',
        task: { id: 't1', deletedAt: null },
      });

      await expect(
        tasksReportingService.resolveTaskReport({
          userId: 'm1',
          reportId: 'r1',
          action: 'DELETE',
        })
      ).rejects.toMatchObject({ status: 409, code: 'ALREADY_RESOLVED' });
    });

    test('DELETE action soft-deletes task and resolves report', async () => {
      const resolvedAt = new Date('2026-03-12T10:05:00Z');
      prismaMock.taskReport.findUnique.mockResolvedValue({
        id: 'r1',
        taskId: 't1',
        status: 'OPEN',
        task: { id: 't1', deletedAt: null },
      });
      prismaMock.task.update.mockResolvedValue({ id: 't1' });
      prismaMock.taskReport.update.mockResolvedValue({
        id: 'r1',
        status: 'RESOLVED',
        resolutionAction: 'DELETE',
        resolvedAt,
      });

      const result = await tasksReportingService.resolveTaskReport({
        userId: 'm1',
        reportId: 'r1',
        action: 'DELETE',
        note: 'Confirmed',
      });

      expect(prismaMock.task.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: {
          status: 'DELETED',
          deletedAt: expect.any(Date),
        },
      });
      expect(prismaMock.taskReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1' },
          data: expect.objectContaining({
            status: 'RESOLVED',
            resolutionAction: 'DELETE',
            resolutionNote: 'Confirmed',
            resolvedByUserId: 'm1',
          }),
        })
      );
      expect(result).toEqual({
        reportId: 'r1',
        status: 'RESOLVED',
        action: 'DELETE',
        resolvedAt,
      });
    });

    test('DISMISS action resolves without task update and normalizes empty note', async () => {
      const resolvedAt = new Date('2026-03-12T10:08:00Z');
      prismaMock.taskReport.findUnique.mockResolvedValue({
        id: 'r2',
        taskId: 't2',
        status: 'OPEN',
        task: { id: 't2', deletedAt: null },
      });
      prismaMock.taskReport.update.mockResolvedValue({
        id: 'r2',
        status: 'RESOLVED',
        resolutionAction: 'DISMISS',
        resolvedAt,
      });

      const result = await tasksReportingService.resolveTaskReport({
        userId: 'm2',
        reportId: 'r2',
        action: 'DISMISS',
      });

      expect(prismaMock.task.update).not.toHaveBeenCalled();
      expect(prismaMock.taskReport.update).toHaveBeenCalledWith(
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
