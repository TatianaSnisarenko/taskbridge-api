const { mapProjectInput, mapProjectOutput, buildTaskSummary } =
  await import('../../../src/services/projects/helpers.js');

describe('projects.helpers', () => {
  describe('mapProjectInput', () => {
    test('maps all API input fields to Prisma schema format', () => {
      const input = {
        title: 'Build Mobile App',
        short_description: 'iOS app for task management',
        description: 'Full-featured iOS application with real-time sync',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        max_talents: 5,
        deadline: '2026-09-01',
      };

      const result = mapProjectInput(input);

      expect(result).toEqual({
        title: 'Build Mobile App',
        shortDescription: 'iOS app for task management',
        description: 'Full-featured iOS application with real-time sync',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        maxTalents: 5,
        deadline: '2026-09-01',
      });
    });

    test('handles partial input with undefined fields', () => {
      const input = {
        title: 'Project Name',
        short_description: 'Short desc',
      };

      const result = mapProjectInput(input);

      expect(result.title).toBe('Project Name');
      expect(result.shortDescription).toBe('Short desc');
      expect(result.description).toBeUndefined();
      expect(result.visibility).toBeUndefined();
    });

    test('preserves numeric fields', () => {
      const input = {
        title: 'Project',
        short_description: 'Desc',
        max_talents: 10,
      };

      const result = mapProjectInput(input);

      expect(result.maxTalents).toBe(10);
      expect(typeof result.maxTalents).toBe('number');
    });

    test('handles zero maxTalents', () => {
      const input = {
        title: 'Project',
        short_description: 'Desc',
        max_talents: 0,
      };

      const result = mapProjectInput(input);

      expect(result.maxTalents).toBe(0);
    });

    test('preserves status enum values', () => {
      const statuses = ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];

      for (const status of statuses) {
        const input = { title: 'P', short_description: 'D', status };
        const result = mapProjectInput(input);
        expect(result.status).toBe(status);
      }
    });

    test('preserves visibility enum values', () => {
      const visibilities = ['PUBLIC', 'PRIVATE'];

      for (const visibility of visibilities) {
        const input = { title: 'P', short_description: 'D', visibility };
        const result = mapProjectInput(input);
        expect(result.visibility).toBe(visibility);
      }
    });
  });

  describe('mapProjectOutput', () => {
    test('maps database record to API response format', () => {
      const project = {
        id: 'proj-123',
        title: 'Payment Integration',
        shortDescription: 'Stripe payment gateway',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        maxTalents: 3,
        deadline: new Date('2026-09-01'),
        createdAt: new Date('2026-03-01T10:00:00Z'),
        owner: {
          id: 'user-456',
          companyProfile: {
            companyName: 'PayTech Inc',
            verified: true,
            avgRating: 4.8,
            reviewsCount: 15,
          },
        },
        technologies: [
          {
            technology: {
              id: 'tech-1',
              slug: 'stripe',
              name: 'Stripe',
              type: 'SERVICE',
            },
            isRequired: true,
          },
          {
            technology: {
              id: 'tech-2',
              slug: 'nodejs',
              name: 'Node.js',
              type: 'FRAMEWORK',
            },
            isRequired: true,
          },
        ],
      };

      const result = mapProjectOutput(project);

      expect(result).toEqual({
        project_id: 'proj-123',
        title: 'Payment Integration',
        short_description: 'Stripe payment gateway',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        max_talents: 3,
        deadline: '2026-09-01',
        created_at: '2026-03-01T10:00:00.000Z',
        company: {
          user_id: 'user-456',
          company_name: 'PayTech Inc',
          verified: true,
          avg_rating: 4.8,
          reviews_count: 15,
        },
        technologies: [
          {
            id: 'tech-1',
            slug: 'stripe',
            name: 'Stripe',
            type: 'SERVICE',
            is_required: true,
          },
          {
            id: 'tech-2',
            slug: 'nodejs',
            name: 'Node.js',
            type: 'FRAMEWORK',
            is_required: true,
          },
        ],
      });
    });

    test('handles null technologies', () => {
      const project = {
        id: 'proj-123',
        title: 'Project',
        shortDescription: 'Desc',
        createdAt: new Date('2026-03-01T10:00:00Z'),
        owner: {
          id: 'user-456',
          companyProfile: {
            companyName: 'Company',
            avgRating: 4.5,
          },
        },
        technologies: null,
      };

      const result = mapProjectOutput(project);

      expect(result.technologies).toBeUndefined();
    });

    test('handles empty technologies array', () => {
      const project = {
        id: 'proj-123',
        title: 'Project',
        shortDescription: 'Desc',
        createdAt: new Date('2026-03-01T10:00:00Z'),
        owner: {
          id: 'user-456',
          companyProfile: {
            companyName: 'Company',
            avgRating: 4.5,
          },
        },
        technologies: [],
      };

      const result = mapProjectOutput(project);

      expect(result.technologies).toEqual([]);
    });

    test('converts avgRating to number', () => {
      const project = {
        id: 'proj-123',
        title: 'Project',
        shortDescription: 'Desc',
        createdAt: new Date('2026-03-01T10:00:00Z'),
        owner: {
          id: 'user-456',
          companyProfile: {
            companyName: 'Company',
            avgRating: 4.5,
            reviewsCount: 10,
          },
        },
      };

      const result = mapProjectOutput(project);

      expect(result.company.avg_rating).toBe(4.5);
      expect(typeof result.company.avg_rating).toBe('number');
    });

    test('formats createdAt as ISO string', () => {
      const date = new Date('2026-03-15T14:30:45.123Z');
      const project = {
        id: 'proj-123',
        title: 'Project',
        shortDescription: 'Desc',
        createdAt: date,
        owner: {
          id: 'user-456',
          companyProfile: {
            companyName: 'Company',
            avgRating: 4.0,
          },
        },
      };

      const result = mapProjectOutput(project);

      expect(result.created_at).toBe('2026-03-15T14:30:45.123Z');
    });

    test('maps isRequired field for technologies', () => {
      const project = {
        id: 'proj-123',
        title: 'Project',
        shortDescription: 'Desc',
        createdAt: new Date('2026-03-01T10:00:00Z'),
        owner: {
          id: 'user-456',
          companyProfile: {
            companyName: 'Company',
            avgRating: 4.0,
          },
        },
        technologies: [
          {
            technology: { id: 'tech-1', slug: 'react', name: 'React', type: 'LIBRARY' },
            isRequired: true,
          },
          {
            technology: { id: 'tech-2', slug: 'jest', name: 'Jest', type: 'TOOL' },
            isRequired: false,
          },
        ],
      };

      const result = mapProjectOutput(project);

      expect(result.technologies[0].is_required).toBe(true);
      expect(result.technologies[1].is_required).toBe(false);
    });
  });

  describe('buildTaskSummary', () => {
    test('aggregates task counts by status', () => {
      const groups = [
        { status: 'DRAFT', _count: { _all: 2 } },
        { status: 'PUBLISHED', _count: { _all: 5 } },
        { status: 'IN_PROGRESS', _count: { _all: 3 } },
        { status: 'COMPLETED', _count: { _all: 8 } },
        { status: 'CLOSED', _count: { _all: 1 } },
      ];

      const result = buildTaskSummary(groups);

      expect(result).toEqual({
        total: 19,
        draft: 2,
        published: 5,
        in_progress: 3,
        completed: 8,
        closed: 1,
      });
    });

    test('handles empty groups array', () => {
      const result = buildTaskSummary([]);

      expect(result).toEqual({
        total: 0,
        draft: 0,
        published: 0,
        in_progress: 0,
        completed: 0,
        closed: 0,
      });
    });

    test('handles groups with zero counts', () => {
      const groups = [
        { status: 'DRAFT', _count: { _all: 0 } },
        { status: 'PUBLISHED', _count: { _all: 0 } },
      ];

      const result = buildTaskSummary(groups);

      expect(result.total).toBe(0);
      expect(result.draft).toBe(0);
      expect(result.published).toBe(0);
    });

    test('calculates total as sum of all statuses', () => {
      const groups = [
        { status: 'DRAFT', _count: { _all: 1 } },
        { status: 'PUBLISHED', _count: { _all: 2 } },
        { status: 'IN_PROGRESS', _count: { _all: 3 } },
      ];

      const result = buildTaskSummary(groups);

      expect(result.total).toBe(6);
    });

    test('handles partial groups (some statuses missing)', () => {
      const groups = [
        { status: 'DRAFT', _count: { _all: 1 } },
        { status: 'COMPLETED', _count: { _all: 5 } },
      ];

      const result = buildTaskSummary(groups);

      expect(result).toEqual({
        total: 6,
        draft: 1,
        published: 0,
        in_progress: 0,
        completed: 5,
        closed: 0,
      });
    });

    test('handles large counts', () => {
      const groups = [
        { status: 'PUBLISHED', _count: { _all: 1000 } },
        { status: 'COMPLETED', _count: { _all: 500 } },
      ];

      const result = buildTaskSummary(groups);

      expect(result.total).toBe(1500);
      expect(result.published).toBe(1000);
      expect(result.completed).toBe(500);
    });

    test('maintains total accuracy with many groups', () => {
      const groups = [
        { status: 'DRAFT', _count: { _all: 10 } },
        { status: 'PUBLISHED', _count: { _all: 20 } },
        { status: 'IN_PROGRESS', _count: { _all: 15 } },
        { status: 'COMPLETED', _count: { _all: 30 } },
        { status: 'CLOSED', _count: { _all: 5 } },
      ];

      const result = buildTaskSummary(groups);

      const manualTotal = 10 + 20 + 15 + 30 + 5;
      expect(result.total).toBe(manualTotal);
      expect(result.total).toBe(80);
    });

    test('handles COMPLETION_REQUESTED status (mapped to in_progress)', () => {
      const groups = [
        { status: 'IN_PROGRESS', _count: { _all: 2 } },
        { status: 'COMPLETION_REQUESTED', _count: { _all: 3 } },
      ];

      const result = buildTaskSummary(groups);

      expect(result.in_progress).toBe(5);
      expect(result.total).toBe(5);
    });

    test('ignores unknown status values', () => {
      const groups = [
        { status: 'DRAFT', _count: { _all: 5 } },
        { status: 'UNKNOWN_STATUS', _count: { _all: 10 } },
      ];

      const result = buildTaskSummary(groups);

      expect(result.draft).toBe(5);
      expect(result.total).toBe(15);
    });
  });
});
