import { jest } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prismaMock = {
  task: {
    findUnique: jest.fn(),
  },
  review: {
    findFirst: jest.fn(),
  },
};

const prismaModulePath = path.resolve(__dirname, '../../../../src/db/prisma.js');

jest.unstable_mockModule(prismaModulePath, () => ({ prisma: prismaMock }));

const { getTaskReviews } = await import(
  path.resolve(__dirname, '../../../../src/services/tasks/task-reviews.js')
);

describe('tasks.service - getTaskReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null reviews when task has no reviews', async () => {
    const taskId = '123e4567-e89b-12d3-a456-426614174000';

    prismaMock.task.findUnique.mockResolvedValue({
      id: taskId,
      deletedAt: null,
    });

    prismaMock.review.findFirst.mockResolvedValue(null);

    const result = await getTaskReviews({ taskId });

    expect(result.company_review).toBeNull();
    expect(result.developer_review).toBeNull();
  });

  test('returns company_review when exists', async () => {
    const taskId = '123e4567-e89b-12d3-a456-426614174000';
    const companyReview = {
      id: 'rev123',
      authorUserId: 'user123',
      rating: 5,
      text: 'Great work',
      createdAt: new Date('2026-03-08T10:00:00Z'),
      author: {
        companyProfile: {
          companyName: 'Acme Corp',
        },
      },
    };

    prismaMock.task.findUnique.mockResolvedValue({
      id: taskId,
      deletedAt: null,
    });

    prismaMock.review.findFirst.mockResolvedValueOnce(companyReview).mockResolvedValueOnce(null);

    const result = await getTaskReviews({ taskId });

    expect(result.company_review).toEqual({
      review_id: 'rev123',
      author_user_id: 'user123',
      author_display_name: 'Acme Corp',
      rating: 5,
      text: 'Great work',
      created_at: '2026-03-08T10:00:00.000Z',
    });
    expect(result.developer_review).toBeNull();
  });

  test('returns developer_review when exists', async () => {
    const taskId = '123e4567-e89b-12d3-a456-426614174000';
    const devReview = {
      id: 'rev456',
      authorUserId: 'user456',
      rating: 4,
      text: 'Clear requirements',
      createdAt: new Date('2026-03-08T14:30:00Z'),
      author: {
        developerProfile: {
          displayName: 'Alice Chen',
        },
      },
    };

    prismaMock.task.findUnique.mockResolvedValue({
      id: taskId,
      deletedAt: null,
    });

    prismaMock.review.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(devReview);

    const result = await getTaskReviews({ taskId });

    expect(result.company_review).toBeNull();
    expect(result.developer_review).toEqual({
      review_id: 'rev456',
      author_user_id: 'user456',
      author_display_name: 'Alice Chen',
      rating: 4,
      text: 'Clear requirements',
      created_at: '2026-03-08T14:30:00.000Z',
    });
  });

  test('throws NOT_FOUND when task does not exist', async () => {
    const taskId = '123e4567-e89b-12d3-a456-426614174000';

    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(getTaskReviews({ taskId })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('throws NOT_FOUND when task is deleted', async () => {
    const taskId = '123e4567-e89b-12d3-a456-426614174000';

    prismaMock.task.findUnique.mockResolvedValue({
      id: taskId,
      deletedAt: new Date('2026-03-01'),
    });

    await expect(getTaskReviews({ taskId })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});
