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

const {
  mapTaskInput,
  mapTaskDetailsOutput,
  toNumber,
  calculateCandidateScore,
  sortCandidates,
  getTaskForCandidates,
  buildCandidateOutput,
} = await import('../../src/services/tasks/helpers.js');

describe('tasks.helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapTaskInput', () => {
    test('maps all API input fields to Prisma schema format', () => {
      const input = {
        title: 'Test Task',
        description: 'Test Description',
        category: 'FRONTEND',
        type: 'FEATURE_IMPLEMENTATION',
        difficulty: 'INTERMEDIATE',
        estimated_effort_hours: 40,
        expected_duration: '1-2 weeks',
        communication_language: 'English',
        timezone_preference: 'UTC+0',
        application_deadline: '2026-12-31',
        visibility: 'PUBLIC',
        deliverables: ['Code', 'Documentation'],
        requirements: ['React', 'TypeScript'],
        nice_to_have: ['Testing experience'],
      };

      const result = mapTaskInput(input);

      expect(result).toEqual({
        title: 'Test Task',
        description: 'Test Description',
        category: 'FRONTEND',
        type: 'FEATURE_IMPLEMENTATION',
        difficulty: 'INTERMEDIATE',
        estimatedEffortHours: 40,
        expectedDuration: '1-2 weeks',
        communicationLanguage: 'English',
        timezonePreference: 'UTC+0',
        applicationDeadline: '2026-12-31',
        visibility: 'PUBLIC',
        deliverables: ['Code', 'Documentation'],
        requirements: ['React', 'TypeScript'],
        niceToHave: ['Testing experience'],
      });
    });

    test('handles undefined optional fields', () => {
      const input = {
        title: 'Minimal Task',
        description: 'Description',
      };

      const result = mapTaskInput(input);

      expect(result.title).toBe('Minimal Task');
      expect(result.description).toBe('Description');
      expect(result.deliverables).toBeUndefined();
    });
  });

  describe('mapTaskDetailsOutput', () => {
    test('maps task with all fields to API output format', () => {
      const task = {
        id: 't1',
        ownerUserId: 'u1',
        status: 'PUBLISHED',
        project: { id: 'p1', title: 'Project 1' },
        title: 'Task 1',
        description: 'Description',
        category: 'BACKEND',
        type: 'BUG_FIX',
        difficulty: 'BEGINNER',
        technologies: [
          {
            technology: {
              id: 'tech1',
              slug: 'nodejs',
              name: 'Node.js',
              type: 'BACKEND',
            },
            isRequired: true,
          },
        ],
        estimatedEffortHours: 20,
        expectedDuration: '1 week',
        communicationLanguage: 'English',
        timezonePreference: 'UTC+1',
        applicationDeadline: new Date('2026-06-30'),
        visibility: 'PUBLIC',
        deliverables: ['API'],
        requirements: ['Express'],
        niceToHave: ['Jest'],
        createdAt: new Date('2026-01-01T12:00:00Z'),
        publishedAt: new Date('2026-01-02T12:00:00Z'),
        acceptedApplicationId: 'app1',
        deletedAt: null,
        owner: {
          companyProfile: {
            companyName: 'Test Company',
            verified: true,
            avgRating: 4.5,
            reviewsCount: 10,
          },
        },
      };

      const computed = {
        applicationsCount: 5,
        canApply: true,
        isOwner: false,
        isAcceptedDeveloper: false,
      };

      const result = mapTaskDetailsOutput(task, computed);

      expect(result).toMatchObject({
        task_id: 't1',
        owner_user_id: 'u1',
        status: 'PUBLISHED',
        project: { project_id: 'p1', title: 'Project 1' },
        title: 'Task 1',
        description: 'Description',
        category: 'BACKEND',
        type: 'BUG_FIX',
        difficulty: 'BEGINNER',
        estimated_effort_hours: 20,
        expected_duration: '1 week',
        communication_language: 'English',
        timezone_preference: 'UTC+1',
        application_deadline: '2026-06-30',
        visibility: 'PUBLIC',
        deliverables: ['API'],
        requirements: ['Express'],
        nice_to_have: ['Jest'],
        created_at: '2026-01-01T12:00:00.000Z',
        published_at: '2026-01-02T12:00:00.000Z',
        accepted_application_id: 'app1',
        deleted_at: null,
        applications_count: 5,
        can_apply: true,
        is_owner: false,
        is_accepted_developer: false,
        company: {
          user_id: 'u1',
          company_name: 'Test Company',
          verified: true,
          avg_rating: 4.5,
          reviews_count: 10,
        },
      });
      expect(result.technologies).toHaveLength(1);
      expect(result.technologies[0]).toEqual({
        id: 'tech1',
        slug: 'nodejs',
        name: 'Node.js',
        type: 'BACKEND',
        is_required: true,
      });
    });

    test('handles null avgRating in company profile', () => {
      const task = {
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        project: null,
        title: 'Task',
        description: 'Desc',
        category: 'BACKEND',
        type: 'BUG_FIX',
        difficulty: 'BEGINNER',
        technologies: undefined,
        estimatedEffortHours: 10,
        expectedDuration: '1 day',
        communicationLanguage: 'English',
        timezonePreference: 'UTC',
        applicationDeadline: null,
        visibility: 'PRIVATE',
        deliverables: [],
        requirements: [],
        niceToHave: [],
        createdAt: new Date('2026-01-01'),
        publishedAt: null,
        acceptedApplicationId: null,
        deletedAt: null,
        owner: {
          companyProfile: {
            companyName: 'New Company',
            verified: false,
            avgRating: null,
            reviewsCount: 0,
          },
        },
      };

      const computed = {
        applicationsCount: 0,
        canApply: false,
        isOwner: true,
        isAcceptedDeveloper: false,
      };

      const result = mapTaskDetailsOutput(task, computed);

      expect(result.company.avg_rating).toBeNull();
      expect(result.project).toBeNull();
      expect(result.technologies).toBeUndefined();
    });

    test('handles undefined avgRating in company profile', () => {
      const task = {
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        project: null,
        title: 'Task',
        description: 'Desc',
        category: 'BACKEND',
        type: 'BUG_FIX',
        difficulty: 'BEGINNER',
        technologies: undefined,
        estimatedEffortHours: 10,
        expectedDuration: '1 day',
        communicationLanguage: 'English',
        timezonePreference: 'UTC',
        applicationDeadline: null,
        visibility: 'PRIVATE',
        deliverables: [],
        requirements: [],
        niceToHave: [],
        createdAt: new Date('2026-01-01'),
        publishedAt: null,
        acceptedApplicationId: null,
        deletedAt: null,
        owner: {
          companyProfile: {
            companyName: 'New Company',
            verified: false,
            avgRating: undefined,
            reviewsCount: 0,
          },
        },
      };

      const computed = {
        applicationsCount: 0,
        canApply: false,
        isOwner: true,
        isAcceptedDeveloper: false,
      };

      const result = mapTaskDetailsOutput(task, computed);

      expect(result.company.avg_rating).toBeNull();
    });
  });

  describe('toNumber', () => {
    test('returns null for null input', () => {
      expect(toNumber(null)).toBeNull();
    });

    test('returns null for undefined input', () => {
      expect(toNumber(undefined)).toBeNull();
    });

    test('returns number as-is', () => {
      expect(toNumber(42)).toBe(42);
      expect(toNumber(3.14)).toBe(3.14);
      expect(toNumber(0)).toBe(0);
    });

    test('converts Decimal-like object with toNumber method', () => {
      const decimal = { toNumber: () => 123.45 };
      expect(toNumber(decimal)).toBe(123.45);
    });

    test('converts string to number', () => {
      expect(toNumber('456')).toBe(456);
      expect(toNumber('78.9')).toBe(78.9);
    });

    test('converts boolean to number', () => {
      expect(toNumber(true)).toBe(1);
      expect(toNumber(false)).toBe(0);
    });
  });

  describe('calculateCandidateScore', () => {
    test('calculates score with all positive values', () => {
      const result = calculateCandidateScore({
        matchCount: 5,
        avgRating: 4.5,
        reviewsCount: 25,
      });
      // 5 * 10 + 4.5 * 2 + min(25, 20) * 0.2 = 50 + 9 + 4 = 63
      expect(result).toBe(63);
    });

    test('handles zero matchCount', () => {
      const result = calculateCandidateScore({
        matchCount: 0,
        avgRating: 5.0,
        reviewsCount: 10,
      });
      // 0 * 10 + 5 * 2 + min(10, 20) * 0.2 = 0 + 10 + 2 = 12
      expect(result).toBe(12);
    });

    test('handles null avgRating', () => {
      const result = calculateCandidateScore({
        matchCount: 3,
        avgRating: null,
        reviewsCount: 5,
      });
      // 3 * 10 + 0 + min(5, 20) * 0.2 = 30 + 0 + 1 = 31
      expect(result).toBe(31);
    });

    test('handles undefined avgRating', () => {
      const result = calculateCandidateScore({
        matchCount: 2,
        avgRating: undefined,
        reviewsCount: 15,
      });
      // 2 * 10 + 0 + min(15, 20) * 0.2 = 20 + 0 + 3 = 23
      expect(result).toBe(23);
    });

    test('caps reviewsCount at 20', () => {
      const result = calculateCandidateScore({
        matchCount: 1,
        avgRating: 3.0,
        reviewsCount: 100,
      });
      // 1 * 10 + 3 * 2 + min(100, 20) * 0.2 = 10 + 6 + 4 = 20
      expect(result).toBe(20);
    });

    test('handles null reviewsCount', () => {
      const result = calculateCandidateScore({
        matchCount: 4,
        avgRating: 4.0,
        reviewsCount: null,
      });
      // 4 * 10 + 4 * 2 + min(0, 20) * 0.2 = 40 + 8 + 0 = 48
      expect(result).toBe(48);
    });

    test('handles all nulls', () => {
      const result = calculateCandidateScore({
        matchCount: 0,
        avgRating: null,
        reviewsCount: null,
      });
      expect(result).toBe(0);
    });
  });

  describe('sortCandidates', () => {
    test('sorts by score descending (primary)', () => {
      const a = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Alice' };
      const b = { score: 60, avg_rating: 4.0, reviews_count: 10, display_name: 'Bob' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0); // b before a
      expect(sortCandidates(b, a)).toBeLessThan(0); // b before a
    });

    test('sorts by avgRating descending when scores equal', () => {
      const a = { score: 50, avg_rating: 3.5, reviews_count: 10, display_name: 'Alice' };
      const b = { score: 50, avg_rating: 4.5, reviews_count: 10, display_name: 'Bob' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0); // b before a
    });

    test('sorts by reviewsCount descending when score and rating equal', () => {
      const a = { score: 50, avg_rating: 4.0, reviews_count: 5, display_name: 'Alice' };
      const b = { score: 50, avg_rating: 4.0, reviews_count: 15, display_name: 'Bob' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0); // b before a
    });

    test('sorts by display_name alphabetically when all else equal', () => {
      const a = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Zoe' };
      const b = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Alice' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0); // Alice before Zoe
    });

    test('handles null avg_rating', () => {
      const a = { score: 50, avg_rating: null, reviews_count: 10, display_name: 'Alice' };
      const b = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Bob' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0); // b has rating, a doesn't
    });

    test('handles null reviews_count', () => {
      const a = { score: 50, avg_rating: 4.0, reviews_count: null, display_name: 'Alice' };
      const b = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Bob' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0); // b has reviews, a doesn't
    });

    test('handles empty display_name', () => {
      const a = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: null };
      const b = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Bob' };

      const result = sortCandidates(a, b);
      expect(typeof result).toBe('number'); // should not crash
    });
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

      // Score: 2 * 10 + 4.5 * 2 + min(20, 20) * 0.2 = 20 + 9 + 4 = 33
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
      // Score: 0 * 10 + 0 + 0 = 0
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
        avgRating: { toNumber: () => 4.75 }, // Prisma Decimal mock
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
      // Score: 1 * 10 + 4.75 * 2 + min(8, 20) * 0.2 = 10 + 9.5 + 1.6 = 21.1
      expect(result.score).toBe(21.1);
    });
  });
});
