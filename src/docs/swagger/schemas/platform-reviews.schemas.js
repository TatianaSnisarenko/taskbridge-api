export const platformReviewsSchemas = {
  CreatePlatformReviewRequest: {
    type: 'object',
    required: ['rating', 'text'],
    properties: {
      rating: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        example: 5,
        description: 'Rating from 1 to 5 stars',
      },
      text: {
        type: 'string',
        minLength: 20,
        maxLength: 2000,
        example:
          'Excellent platform for finding great projects and collaborating with talented developers!',
        description: 'Review text, minimum 20 characters',
      },
    },
  },
  CreatePlatformReviewResponse: {
    type: 'object',
    properties: {
      review_id: {
        type: 'string',
        format: 'uuid',
        example: '1d2ac531-7646-4fbe-b9d7-54c20ca70ce3',
      },
      user_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      author_name: {
        type: 'string',
        example: 'Olena Kovalenko',
        description: 'Display name or company name of the author',
      },
      author_type: {
        type: 'string',
        enum: ['developer', 'company'],
        nullable: true,
        example: 'developer',
      },
      author_image_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
        example: 'https://cdn.example.com/avatars/user.png',
      },
      rating: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        example: 5,
      },
      text: {
        type: 'string',
        example:
          'Excellent platform for finding great projects and collaborating with talented developers!',
      },
      is_approved: {
        type: 'boolean',
        example: false,
        description: 'Whether the review has been approved by admin',
      },
      created_at: {
        type: 'string',
        format: 'date-time',
        example: '2026-03-08T10:00:00.000Z',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
        example: '2026-03-08T10:00:00.000Z',
      },
    },
  },
  UpdatePlatformReviewRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      rating: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        example: 4,
      },
      text: {
        type: 'string',
        minLength: 20,
        maxLength: 2000,
        example: 'Updated review text with more detailed feedback about the platform.',
      },
      is_approved: {
        type: 'boolean',
        example: true,
        description: 'Only admins can approve reviews',
      },
    },
  },
  UpdatePlatformReviewResponse: {
    type: 'object',
    properties: {
      review_id: {
        type: 'string',
        format: 'uuid',
        example: '1d2ac531-7646-4fbe-b9d7-54c20ca70ce3',
      },
      user_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      author_name: {
        type: 'string',
        example: 'Olena Kovalenko',
      },
      author_type: {
        type: 'string',
        enum: ['developer', 'company'],
        nullable: true,
        example: 'developer',
      },
      author_image_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
        example: 'https://cdn.example.com/avatars/user.png',
      },
      rating: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        example: 4,
      },
      text: {
        type: 'string',
        example: 'Updated review text with more detailed feedback about the platform.',
      },
      is_approved: {
        type: 'boolean',
        example: true,
      },
      created_at: {
        type: 'string',
        format: 'date-time',
        example: '2026-03-08T10:00:00.000Z',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
        example: '2026-03-08T11:30:00.000Z',
      },
    },
  },
  PlatformReview: {
    type: 'object',
    properties: {
      review_id: {
        type: 'string',
        format: 'uuid',
        example: '1d2ac531-7646-4fbe-b9d7-54c20ca70ce3',
      },
      user_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      author_name: {
        type: 'string',
        example: 'Olena Kovalenko',
      },
      author_type: {
        type: 'string',
        enum: ['developer', 'company'],
        nullable: true,
        example: 'developer',
      },
      author_image_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
        example: 'https://cdn.example.com/avatars/user.png',
      },
      rating: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        example: 5,
      },
      text: {
        type: 'string',
        example: 'Great platform for connecting developers with interesting projects.',
      },
      is_approved: {
        type: 'boolean',
        example: true,
      },
      created_at: {
        type: 'string',
        format: 'date-time',
        example: '2026-03-08T10:00:00.000Z',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
        example: '2026-03-08T10:00:00.000Z',
      },
    },
  },
  GetPlatformReviewsResponse: {
    type: 'object',
    properties: {
      reviews: {
        type: 'array',
        items: { $ref: '#/components/schemas/PlatformReview' },
      },
      total: {
        type: 'integer',
        minimum: 0,
        example: 42,
        description: 'Total number of reviews matching the filter',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        example: 20,
      },
      offset: {
        type: 'integer',
        minimum: 0,
        example: 0,
      },
    },
  },
  ApprovePlatformReviewResponse: {
    type: 'object',
    properties: {
      review_id: {
        type: 'string',
        format: 'uuid',
        example: '1d2ac531-7646-4fbe-b9d7-54c20ca70ce3',
      },
      user_id: {
        type: 'string',
        format: 'uuid',
        example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2',
      },
      author_name: {
        type: 'string',
        example: 'TechCorp Inc.',
      },
      author_type: {
        type: 'string',
        enum: ['developer', 'company'],
        nullable: true,
        example: 'company',
      },
      author_image_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
        example: 'https://cdn.example.com/logos/company.png',
      },
      rating: {
        type: 'integer',
        example: 5,
      },
      text: {
        type: 'string',
        example: 'Excellent platform for finding talented developers!',
      },
      is_approved: {
        type: 'boolean',
        example: true,
      },
      created_at: {
        type: 'string',
        format: 'date-time',
        example: '2026-03-08T10:00:00.000Z',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
        example: '2026-03-08T12:00:00.000Z',
      },
    },
  },
  DeletePlatformReviewResponse: {
    type: 'object',
    properties: {
      deleted: {
        type: 'boolean',
        example: true,
      },
    },
  },
};
