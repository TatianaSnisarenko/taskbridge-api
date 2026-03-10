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

const { mapTaskInput, mapTaskDetailsOutput } =
  await import('../../../src/services/tasks/helpers.js');

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
        deadline: '2027-01-31',
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
        deadline: '2027-01-31',
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
        deadline: new Date('2026-07-30'),
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
        deadline: '2026-07-30',
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
});
