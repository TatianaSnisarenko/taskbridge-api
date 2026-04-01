import { createSwaggerSpec } from '../../../src/docs/swagger.js';
import { docsPaths } from '../../../src/docs/swagger/paths/docs.paths.js';

describe('swagger spec - docs json endpoint', () => {
  test('includes Docs tag', () => {
    const spec = createSwaggerSpec('http://localhost:3000');

    expect(spec.tags).toEqual(expect.arrayContaining([{ name: 'Docs' }]));
  });

  test('includes openapi json path from docsPaths', () => {
    const spec = createSwaggerSpec('http://localhost:3000');

    expect(spec.paths['/api/v1/docs/openapi.json']).toBeDefined();
    expect(spec.paths['/api/v1/docs/openapi.json']).toEqual(docsPaths['/api/v1/docs/openapi.json']);
  });

  test('documents bearer auth and role-based responses for docs json endpoint', () => {
    const spec = createSwaggerSpec('http://localhost:3000');
    const endpoint = spec.paths['/api/v1/docs/openapi.json'].get;

    expect(endpoint.security).toEqual([{ bearerAuth: [] }]);
    expect(endpoint.responses[401]).toEqual({ description: 'Unauthorized' });
    expect(endpoint.responses[403]).toEqual({
      description: 'Forbidden - admin or moderator access required',
    });
  });

  test('returns openapi json schema description for docs endpoint', () => {
    const spec = createSwaggerSpec('http://localhost:3000');
    const responseSchema =
      spec.paths['/api/v1/docs/openapi.json'].get.responses[200].content['application/json'].schema;

    expect(responseSchema).toEqual({
      type: 'object',
      additionalProperties: true,
    });
  });

  test('includes roles in GetMeResponse schema', () => {
    const spec = createSwaggerSpec('http://localhost:3000');
    const getMeSchema = spec.components.schemas.GetMeResponse;

    expect(getMeSchema.properties.roles).toEqual({
      type: 'array',
      items: { type: 'string', enum: ['USER', 'ADMIN', 'MODERATOR'] },
      example: ['USER'],
    });
  });
});
