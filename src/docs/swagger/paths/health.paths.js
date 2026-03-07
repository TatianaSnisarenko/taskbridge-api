export const healthPaths = {
  '/api/v1/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      responses: {
        200: {
          description: 'Service is healthy',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthResponse' },
            },
          },
        },
      },
    },
  },
};
