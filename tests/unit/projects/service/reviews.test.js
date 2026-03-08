import { jest } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prismaMock = {
  project: {
    findUnique: jest.fn(),
  },
  review: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.unstable_mockModule(path.resolve(__dirname, '../../../../src/db/prisma.js'), () => ({
  prisma: prismaMock,
}));

const { getProjectReviews } = await import(
  path.resolve(__dirname, '../../../../src/services/projects/project-reviews.js')
);

describe('projects.service - getProjectReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty list when project has no reviews', async () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';

    prismaMock.project.findUnique.mockResolvedValue({
      id: projectId,
      deletedAt: null,
    });

    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.review.count.mockResolvedValue(0);

    const result = await getProjectReviews({ projectId, page: 1, size: 20 });

    expect(result.items).toEqual([]);
    expect(result.page).toBe(1);
    expect(result.size).toBe(20);
    expect(result.total).toBe(0);
    expect(result.stats.company_reviews_count).toBe(0);
    expect(result.stats.developer_reviews_count).toBe(0);
  });

  test('returns paginated reviews with context', async () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const reviews = [
      {
        id: 'rev1',
        taskId: 'task1',
        task: { title: 'Add filtering' },
        authorUserId: 'user1',
        rating: 5,
        text: 'Excellent',
        createdAt: new Date('2026-03-08T10:00:00Z'),
        author: {
          companyProfile: { companyName: 'Acme Corp' },
          developerProfile: null,
        },
      },
      {
        id: 'rev2',
        taskId: 'task1',
        task: { title: 'Add filtering' },
        authorUserId: 'user2',
        rating: 4,
        text: 'Good',
        createdAt: new Date('2026-03-08T11:00:00Z'),
        author: {
          companyProfile: null,
          developerProfile: { displayName: 'Alice' },
        },
      },
    ];

    prismaMock.project.findUnique.mockResolvedValue({
      id: projectId,
      deletedAt: null,
    });

    prismaMock.review.findMany.mockResolvedValue(reviews);
    prismaMock.review.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const result = await getProjectReviews({ projectId, page: 1, size: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].task_title).toBe('Add filtering');
    expect(result.items[0].author_persona).toBe('company');
    expect(result.items[1].author_persona).toBe('developer');
    expect(result.stats.company_reviews_count).toBe(1);
    expect(result.stats.developer_reviews_count).toBe(1);
  });

  test('filters by author_persona when specified', async () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';

    prismaMock.project.findUnique.mockResolvedValue({
      id: projectId,
      deletedAt: null,
    });

    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.review.count.mockResolvedValue(0);

    await getProjectReviews({ projectId, page: 1, size: 20, authorPersona: 'company' });

    const callArgs = prismaMock.review.findMany.mock.calls[0][0];
    expect(callArgs.where.author.companyProfile).toBeDefined();
  });

  test('throws NOT_FOUND when project does not exist', async () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';

    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(getProjectReviews({ projectId })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('throws NOT_FOUND when project is deleted', async () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';

    prismaMock.project.findUnique.mockResolvedValue({
      id: projectId,
      deletedAt: new Date('2026-03-01'),
    });

    await expect(getProjectReviews({ projectId })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('applies pagination correctly', async () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';

    prismaMock.project.findUnique.mockResolvedValue({
      id: projectId,
      deletedAt: null,
    });

    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.review.count.mockResolvedValue(100);

    await getProjectReviews({ projectId, page: 3, size: 10 });

    const callArgs = prismaMock.review.findMany.mock.calls[0][0];
    expect(callArgs.skip).toBe(20); // (3-1) * 10
    expect(callArgs.take).toBe(10);
  });
});
