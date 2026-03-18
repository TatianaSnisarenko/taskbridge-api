export const docsPaths = {
  '/api/v1/docs/openapi.json': {
    get: {
      tags: ['Docs'],
      summary: 'Get OpenAPI JSON specification',
      description:
        'Returns raw OpenAPI specification as JSON. Access is allowed only for authenticated users with ADMIN or MODERATOR role.',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'OpenAPI specification JSON',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - admin or moderator access required' },
      },
    },
  },
};
