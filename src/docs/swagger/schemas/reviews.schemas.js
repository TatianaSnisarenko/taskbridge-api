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
};
