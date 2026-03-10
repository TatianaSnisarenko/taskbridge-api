const { mapProjectDetailsOutput } = await import('../../../src/services/projects/helpers.js');

describe('projects.helpers - mapProjectDetailsOutput', () => {
  test('maps details output with null deadline and deleted_at', () => {
    const project = {
      id: 'proj-123',
      ownerUserId: 'user-456',
      title: 'Payment Integration',
      shortDescription: 'Stripe payment gateway',
      description: 'Detailed description',
      technologies: null,
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      maxTalents: 3,
      deadline: null,
      createdAt: new Date('2026-03-01T10:00:00Z'),
      updatedAt: new Date('2026-03-02T10:00:00Z'),
      deletedAt: new Date('2026-03-03T10:00:00Z'),
      owner: {
        id: 'user-456',
        companyProfile: {
          companyName: 'PayTech Inc',
          verified: true,
          avgRating: 4.8,
          reviewsCount: 15,
        },
      },
    };

    const result = mapProjectDetailsOutput(
      project,
      { total: 0, draft: 0, published: 0, in_progress: 0, completed: 0, closed: 0 },
      []
    );

    expect(result).toEqual({
      project_id: 'proj-123',
      owner_user_id: 'user-456',
      title: 'Payment Integration',
      short_description: 'Stripe payment gateway',
      description: 'Detailed description',
      technologies: undefined,
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      max_talents: 3,
      deadline: null,
      created_at: '2026-03-01T10:00:00.000Z',
      updated_at: '2026-03-02T10:00:00.000Z',
      deleted_at: '2026-03-03T10:00:00.000Z',
      company: {
        user_id: 'user-456',
        company_name: 'PayTech Inc',
        verified: true,
        avg_rating: 4.8,
        reviews_count: 15,
      },
      tasks_summary: {
        total: 0,
        draft: 0,
        published: 0,
        in_progress: 0,
        completed: 0,
        closed: 0,
      },
      tasks_preview: [],
    });
  });
});
