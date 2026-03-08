export const reviewsSchemas = {
  CreateReviewResponse: {
    type: 'object',
    properties: {
      review_id: {
        type: 'string',
        format: 'uuid',
        example: '1d2ac531-7646-4fbe-b9d7-54c20ca70ce3',
      },
      task_id: { type: 'string', format: 'uuid', example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5' },
      author_user_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      target_user_id: {
        type: 'string',
        format: 'uuid',
        example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c',
      },
      rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
      text: {
        type: 'string',
        nullable: true,
        example: 'Clear requirements and excellent communication.',
      },
      created_at: { type: 'string', format: 'date-time', example: '2026-03-07T13:02:00Z' },
    },
  },
  UserReviewsResponse: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            review_id: {
              type: 'string',
              format: 'uuid',
              example: '1d2ac531-7646-4fbe-b9d7-54c20ca70ce3',
            },
            task_id: {
              type: 'string',
              format: 'uuid',
              example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5',
            },
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 4 },
            text: {
              type: 'string',
              nullable: true,
              example: 'Solid implementation with clean code.',
            },
            created_at: { type: 'string', format: 'date-time', example: '2026-03-07T13:02:00Z' },
            author: {
              type: 'object',
              properties: {
                user_id: {
                  type: 'string',
                  format: 'uuid',
                  example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
                },
                display_name: { type: 'string', example: 'Olena Kovalenko' },
                company_name: { type: 'string', nullable: true, example: 'NovaTech Labs' },
              },
            },
          },
        },
      },
      page: { type: 'integer', minimum: 1 },
      size: { type: 'integer', minimum: 1, maximum: 100 },
      total: { type: 'integer', minimum: 0 },
    },
  },
  TaskReviewsResponse: {
    type: 'object',
    properties: {
      company_review: {
        type: 'object',
        nullable: true,
        properties: {
          review_id: {
            type: 'string',
            format: 'uuid',
            example: '1d2ac531-7646-4fbe-b9d7-54c20ca70ce3',
          },
          author_user_id: {
            type: 'string',
            format: 'uuid',
            example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
          },
          author_display_name: { type: 'string', example: 'Acme Corp' },
          rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          text: {
            type: 'string',
            nullable: true,
            example: 'Excellent execution and communication.',
          },
          created_at: { type: 'string', format: 'date-time', example: '2026-03-07T13:02:00Z' },
        },
      },
      developer_review: {
        type: 'object',
        nullable: true,
        properties: {
          review_id: {
            type: 'string',
            format: 'uuid',
            example: '2e3bd642-7757-5fcf-c8e8-65d31db81ef4',
          },
          author_user_id: {
            type: 'string',
            format: 'uuid',
            example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c',
          },
          author_display_name: { type: 'string', example: 'Alice Chen' },
          rating: { type: 'integer', minimum: 1, maximum: 5, example: 4 },
          text: {
            type: 'string',
            nullable: true,
            example: 'Clear requirements, fair timeline.',
          },
          created_at: { type: 'string', format: 'date-time', example: '2026-03-07T14:30:00Z' },
        },
      },
    },
  },
  ProjectReviewsResponse: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            review_id: {
              type: 'string',
              format: 'uuid',
              example: '1d2ac531-7646-4fbe-b9d7-54c20ca70ce3',
            },
            task_id: {
              type: 'string',
              format: 'uuid',
              example: '21f01069-2f1f-47ea-bf23-6fbe5b27f2f5',
            },
            task_title: { type: 'string', example: 'Add filtering to tasks catalog' },
            author_persona: { type: 'string', enum: ['company', 'developer'], example: 'company' },
            author_user_id: {
              type: 'string',
              format: 'uuid',
              example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
            },
            author_display_name: { type: 'string', example: 'Acme Corp' },
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            text: {
              type: 'string',
              nullable: true,
              example: 'Great teamwork and functionality.',
            },
            created_at: { type: 'string', format: 'date-time', example: '2026-03-07T13:02:00Z' },
          },
        },
      },
      page: { type: 'integer', minimum: 1, example: 1 },
      size: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
      total: { type: 'integer', minimum: 0, example: 42 },
      stats: {
        type: 'object',
        properties: {
          company_reviews_count: { type: 'integer', minimum: 0, example: 8 },
          developer_reviews_count: { type: 'integer', minimum: 0, example: 15 },
        },
      },
    },
  },
};
