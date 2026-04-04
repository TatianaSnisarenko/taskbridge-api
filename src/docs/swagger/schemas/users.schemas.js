export const usersSchemas = {
  UserCatalogItem: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      roles: {
        type: 'array',
        items: { type: 'string', enum: ['USER', 'ADMIN', 'MODERATOR'] },
        example: ['USER'],
      },
      created_at: { type: 'string', format: 'date-time' },
      hasDeveloperProfile: { type: 'boolean' },
      hasCompanyProfile: { type: 'boolean' },
      onboarding: { $ref: '#/components/schemas/OnboardingState' },
    },
  },
  GetUsersCatalogResponse: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/UserCatalogItem' },
      },
      page: { type: 'integer', minimum: 1, example: 1 },
      size: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
      total: { type: 'integer', minimum: 0, example: 42 },
    },
  },
};
