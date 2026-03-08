export const platformReviewsPaths = {
  '/api/v1/platform-reviews': {
    get: {
      tags: ['Platform Reviews'],
      summary: 'Get platform reviews',
      description:
        'Get list of platform reviews. Public users see only approved reviews. Authenticated admins can filter by status.',
      security: [{}, { bearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['approved', 'pending', 'all'],
            default: 'approved',
          },
          description: 'Filter by approval status (admin only for pending/all)',
        },
        {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
          description: 'Number of reviews to return',
        },
        {
          name: 'offset',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 0,
            default: 0,
          },
          description: 'Number of reviews to skip',
        },
        {
          name: 'sort',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['newest', 'oldest', 'highest_rated', 'lowest_rated'],
            default: 'newest',
          },
          description: 'Sort order for reviews',
        },
      ],
      responses: {
        200: {
          description: 'List of platform reviews',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GetPlatformReviewsResponse' },
            },
          },
        },
        400: { description: 'Invalid query parameters' },
      },
    },
    post: {
      tags: ['Platform Reviews'],
      summary: 'Create platform review',
      description:
        'Create a review about the platform. Users can submit one review per cooldown period (30 days by default).',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreatePlatformReviewRequest' },
            example: {
              rating: 5,
              text: 'Excellent platform for finding great projects and collaborating with talented developers!',
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Platform review created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePlatformReviewResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        404: { description: 'User not found' },
        429: {
          description: 'Too many reviews - cooldown period not passed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'REVIEW_COOLDOWN' },
                      message: {
                        type: 'string',
                        example: 'You can submit a new review in 15 days',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/platform-reviews/{reviewId}': {
    get: {
      tags: ['Platform Reviews'],
      summary: 'Get platform review by ID',
      description:
        'Get a single platform review. Public users can only see approved reviews. Users can see their own unapproved reviews.',
      security: [{}, { bearerAuth: [] }],
      parameters: [
        {
          name: 'reviewId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Platform review ID',
        },
      ],
      responses: {
        200: {
          description: 'Platform review details',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PlatformReview' },
            },
          },
        },
        403: { description: 'Access denied - review not approved and not owned by user' },
        404: { description: 'Review not found' },
      },
    },
    patch: {
      tags: ['Platform Reviews'],
      summary: 'Update platform review',
      description:
        'Update a platform review. Owners can update their unapproved reviews. Admins can update any review and approve them.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'reviewId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Platform review ID',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdatePlatformReviewRequest' },
            examples: {
              updateRatingAndText: {
                summary: 'Update rating and text',
                value: {
                  rating: 4,
                  text: 'Updated review text with more detailed feedback about the platform.',
                },
              },
              adminApprove: {
                summary: 'Admin approves review',
                value: {
                  is_approved: true,
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Platform review updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdatePlatformReviewResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: {
          description: 'Access denied - not owner or trying to approve own review',
        },
        404: { description: 'Review not found' },
      },
    },
    delete: {
      tags: ['Platform Reviews'],
      summary: 'Delete platform review',
      description: 'Delete a platform review. Only admins can delete reviews.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'reviewId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Platform review ID',
        },
      ],
      responses: {
        200: {
          description: 'Platform review deleted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DeletePlatformReviewResponse' },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Access denied - admin only' },
        404: { description: 'Review not found' },
      },
    },
  },
  '/api/v1/platform-reviews/{reviewId}/approve': {
    patch: {
      tags: ['Platform Reviews'],
      summary: 'Approve platform review',
      description: 'Approve a pending platform review. Only admins can approve reviews.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'reviewId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Platform review ID',
        },
      ],
      responses: {
        200: {
          description: 'Platform review approved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApprovePlatformReviewResponse' },
            },
          },
        },
        400: { description: 'Review already approved' },
        401: { description: 'Unauthorized' },
        403: { description: 'Access denied - admin only' },
        404: { description: 'Review not found' },
      },
    },
  },
};
