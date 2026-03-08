import { jest } from '@jest/globals';

const prismaMock = {
  task: {
    findUnique: jest.fn(),
  },
};

const queriesMock = {
  findTaskForCandidates: jest.fn(),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/db/queries/tasks.queries.js', () => queriesMock);

const { getTaskForCandidates, buildCandidateOutput } =
  await import('../../../src/services/tasks/helpers.js');

describe('tasks.helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaskForCandidates', () => {
    test('returns task when status is PUBLISHED', async () => {
      const mockTask = {
        id: 't1',
        status: 'PUBLISHED',
        title: 'Task 1',
      };
      queriesMock.findTaskForCandidates.mockResolvedValue(mockTask);

      const result = await getTaskForCandidates({ userId: 'u1', taskId: 't1' });

      expect(result).toEqual(mockTask);
      expect(queriesMock.findTaskForCandidates).toHaveBeenCalledWith('t1', 'u1');
    });

    test('throws error when task status is not PUBLISHED', async () => {
      const mockTask = {
        id: 't1',
        status: 'DRAFT',
        title: 'Task 1',
      };
      queriesMock.findTaskForCandidates.mockResolvedValue(mockTask);

      await expect(getTaskForCandidates({ userId: 'u1', taskId: 't1' })).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
        message: 'Task must be in PUBLISHED status',
      });
    });

    test('throws error when task is IN_PROGRESS', async () => {
      const mockTask = {
        id: 't1',
        status: 'IN_PROGRESS',
      };
      queriesMock.findTaskForCandidates.mockResolvedValue(mockTask);

      await expect(getTaskForCandidates({ userId: 'u1', taskId: 't1' })).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });
  });

  describe('buildCandidateOutput', () => {
    test('builds candidate output with all matched technologies', () => {
      const profile = {
        userId: 'dev1',
        displayName: 'John Doe',
        jobTitle: 'Senior Developer',
        avatarUrl: 'https://example.com/avatar.jpg',
        experienceLevel: 'SENIOR',
        availability: 'FULL_TIME',
        avgRating: 4.5,
        reviewsCount: 20,
        technologies: [
          {
            technology: {
              id: 'tech1',
              slug: 'react',
              name: 'React',
              type: 'FRONTEND',
            },
          },
          {
            technology: {
              id: 'tech2',
              slug: 'nodejs',
              name: 'Node.js',
              type: 'BACKEND',
            },
          },
          {
            technology: {
              id: 'tech3',
              slug: 'python',
              name: 'Python',
              type: 'BACKEND',
            },
          },
        ],
      };

      const taskTechnologyIdSet = new Set(['tech1', 'tech2']);
      const appliedSet = new Set();
      const invitedSet = new Set();

      const result = buildCandidateOutput({
        profile,
        taskTechnologyIdSet,
        appliedSet,
        invitedSet,
      });

      expect(result).toMatchObject({
        user_id: 'dev1',
        display_name: 'John Doe',
        primary_role: 'Senior Developer',
        avatar_url: 'https://example.com/avatar.jpg',
        experience_level: 'SENIOR',
        availability: 'FULL_TIME',
        avg_rating: 4.5,
        reviews_count: 20,
        already_applied: false,
        already_invited: false,
        can_invite: true,
      });

      expect(result.technologies).toHaveLength(3);
      expect(result.matched_technologies).toHaveLength(2);
      expect(result.matched_technologies.map((t) => t.id)).toEqual(['tech1', 'tech2']);
      expect(result.score).toBe(33);
    });

    test('handles profile with no matched technologies', () => {
      const profile = {
        userId: 'dev2',
        displayName: 'Jane Smith',
        jobTitle: 'Junior Developer',
        avatarUrl: null,
        experienceLevel: 'JUNIOR',
        availability: 'PART_TIME',
        avgRating: null,
        reviewsCount: 0,
        technologies: [
          {
            technology: {
              id: 'tech5',
              slug: 'java',
              name: 'Java',
              type: 'BACKEND',
            },
          },
        ],
      };

      const taskTechnologyIdSet = new Set(['tech1', 'tech2']);
      const appliedSet = new Set();
      const invitedSet = new Set();

      const result = buildCandidateOutput({
        profile,
        taskTechnologyIdSet,
        appliedSet,
        invitedSet,
      });

      expect(result.matched_technologies).toHaveLength(0);
      expect(result.avg_rating).toBe(0);
      expect(result.score).toBe(0);
    });

    test('marks already_applied when developer applied', () => {
      const profile = {
        userId: 'dev3',
        displayName: 'Bob',
        jobTitle: 'Developer',
        avatarUrl: null,
        experienceLevel: 'INTERMEDIATE',
        availability: 'FULL_TIME',
        avgRating: 3.5,
        reviewsCount: 5,
        technologies: [],
      };

      const taskTechnologyIdSet = new Set();
      const appliedSet = new Set(['dev3']);
      const invitedSet = new Set();

      const result = buildCandidateOutput({
        profile,
        taskTechnologyIdSet,
        appliedSet,
        invitedSet,
      });

      expect(result.already_applied).toBe(true);
      expect(result.already_invited).toBe(false);
      expect(result.can_invite).toBe(false);
    });

    test('marks already_invited when developer invited', () => {
      const profile = {
        userId: 'dev4',
        displayName: 'Alice',
        jobTitle: 'Developer',
        avatarUrl: null,
        experienceLevel: 'SENIOR',
        availability: 'FULL_TIME',
        avgRating: 4.0,
        reviewsCount: 10,
        technologies: [],
      };

      const taskTechnologyIdSet = new Set();
      const appliedSet = new Set();
      const invitedSet = new Set(['dev4']);

      const result = buildCandidateOutput({
        profile,
        taskTechnologyIdSet,
        appliedSet,
        invitedSet,
      });

      expect(result.already_applied).toBe(false);
      expect(result.already_invited).toBe(true);
      expect(result.can_invite).toBe(false);
    });

    test('handles Prisma Decimal avgRating', () => {
      const profile = {
        userId: 'dev5',
        displayName: 'Charlie',
        jobTitle: 'Developer',
        avatarUrl: null,
        experienceLevel: 'INTERMEDIATE',
        availability: 'FULL_TIME',
        avgRating: { toNumber: () => 4.75 },
        reviewsCount: 8,
        technologies: [
          {
            technology: {
              id: 'tech1',
              slug: 'react',
              name: 'React',
              type: 'FRONTEND',
            },
          },
        ],
      };

      const taskTechnologyIdSet = new Set(['tech1']);
      const appliedSet = new Set();
      const invitedSet = new Set();

      const result = buildCandidateOutput({
        profile,
        taskTechnologyIdSet,
        appliedSet,
        invitedSet,
      });

      expect(result.avg_rating).toBe(4.75);
      expect(result.score).toBe(21.1);
    });
  });
});
