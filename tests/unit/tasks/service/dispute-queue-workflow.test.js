import { jest } from '@jest/globals';

const prismaMock = {
  $transaction: jest.fn(),
  task: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  taskDispute: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const notificationsServiceMock = {
  createApplicationCreatedNotification: jest.fn(),
  buildTaskNotificationPayload: jest.fn(),
  createNotification: jest.fn(),
};

const notificationEmailServiceMock = {
  sendImportantNotificationEmail: jest.fn(async () => {}),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule(
  '../../src/services/notifications/index.js',
  () => notificationsServiceMock
);
jest.unstable_mockModule(
  '../../src/services/notification-email/index.js',
  () => notificationEmailServiceMock
);

const tasksService = await import('../../../../src/services/tasks/index.js');

describe('tasks.service - dispute queue workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
  });

  test('getTaskDisputes maps dispute queue items with context', async () => {
    prismaMock.taskDispute.findMany.mockResolvedValue([
      {
        id: 'd1',
        taskId: 't1',
        initiatorUserId: 'dev1',
        initiatorPersona: 'developer',
        sourceStatus: 'COMPLETION_REQUESTED',
        reasonType: 'COMPLETION_NOT_CONFIRMED',
        reasonText: 'Company did not respond.',
        status: 'OPEN',
        resolutionAction: null,
        resolutionReason: null,
        resolvedByUserId: null,
        createdAt: new Date('2026-03-10T10:00:00.000Z'),
        updatedAt: new Date('2026-03-10T10:00:00.000Z'),
        resolvedAt: null,
        task: {
          id: 't1',
          title: 'Task title',
          status: 'DISPUTE',
          projectId: 'p1',
          ownerUserId: 'owner1',
          completionRequestedAt: new Date('2026-03-07T10:00:00.000Z'),
          completionRequestExpiresAt: new Date('2026-03-10T10:00:00.000Z'),
          owner: { companyProfile: { companyName: 'Company' } },
          acceptedApplication: {
            developerUserId: 'dev1',
            developer: { developerProfile: { displayName: 'Developer' } },
          },
        },
      },
    ]);
    prismaMock.taskDispute.count.mockResolvedValue(1);

    const result = await tasksService.getTaskDisputes({
      page: 1,
      size: 20,
      status: 'OPEN',
      reasonType: 'COMPLETION_NOT_CONFIRMED',
    });

    expect(result).toEqual({
      items: [
        {
          dispute_id: 'd1',
          task_id: 't1',
          task_title: 'Task title',
          task_status: 'DISPUTE',
          project_id: 'p1',
          company_user_id: 'owner1',
          company_name: 'Company',
          developer_user_id: 'dev1',
          developer_display_name: 'Developer',
          initiator_user_id: 'dev1',
          initiator_persona: 'developer',
          source_status: 'COMPLETION_REQUESTED',
          reason_type: 'COMPLETION_NOT_CONFIRMED',
          reason_text: 'Company did not respond.',
          status: 'OPEN',
          created_at: '2026-03-10T10:00:00.000Z',
          updated_at: '2026-03-10T10:00:00.000Z',
          resolved_at: null,
          resolved_by_user_id: null,
          resolution_action: null,
          resolution_reason: null,
          completion_requested_at: '2026-03-07T10:00:00.000Z',
          completion_request_expires_at: '2026-03-10T10:00:00.000Z',
          available_actions: ['RETURN_TO_PROGRESS', 'MARK_FAILED', 'MARK_COMPLETED'],
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    });
  });
});
