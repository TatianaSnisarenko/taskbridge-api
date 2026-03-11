import { TECHNOLOGY_TYPE_ENUM } from '../constants.js';

export const profilesSchemas = {
  CreateDeveloperProfileRequest: {
    type: 'object',
    required: ['display_name'],
    properties: {
      display_name: { type: 'string', minLength: 2, maxLength: 100, example: 'Olena Kovalenko' },
      primary_role: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        example: 'Backend Engineer',
      },
      bio: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example: 'Node.js developer focused on reliable APIs, testing, and clean architecture.',
      },
      experience_level: {
        type: 'string',
        enum: ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'],
      },
      location: { type: 'string', minLength: 2, maxLength: 100, example: 'Warsaw, PL' },
      timezone: { type: 'string', minLength: 3, maxLength: 50, example: 'Europe/Warsaw' },
      technology_ids: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        uniqueItems: true,
        maxItems: 50,
        description: 'Array of technology IDs from the catalog',
        example: ['3fa85f64-5717-4562-b3fc-2c963f66afa6', 'a1b2c3d4-5e6f-7890-abcd-ef1234567890'],
      },
      availability: {
        type: 'string',
        enum: ['FEW_HOURS_WEEK', 'PART_TIME', 'FULL_TIME'],
      },
      preferred_task_categories: {
        type: 'array',
        items: {
          type: 'string',
          enum: TECHNOLOGY_TYPE_ENUM,
        },
        uniqueItems: true,
        maxItems: 10,
      },
      portfolio_url: { type: 'string', format: 'uri' },
      linkedin_url: { type: 'string', format: 'uri' },
    },
  },
  CreateDeveloperProfileResponse: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2' },
      created: { type: 'boolean', example: true },
    },
  },
  UpdateDeveloperProfileRequest: {
    type: 'object',
    required: ['display_name'],
    properties: {
      display_name: { type: 'string', minLength: 2, maxLength: 100, example: 'Olena Kovalenko' },
      primary_role: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        example: 'Senior Backend Engineer',
      },
      bio: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example: 'Building scalable backend services with Node.js, PostgreSQL, and Prisma.',
      },
      experience_level: {
        type: 'string',
        enum: ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'],
      },
      location: { type: 'string', minLength: 2, maxLength: 100, example: 'Kraków, PL' },
      timezone: { type: 'string', minLength: 3, maxLength: 50, example: 'Europe/Warsaw' },
      technology_ids: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        uniqueItems: true,
        maxItems: 50,
        description:
          'Array of technology IDs from the catalog. If provided, replaces all existing technologies.',
        example: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
      },
      availability: {
        type: 'string',
        enum: ['FEW_HOURS_WEEK', 'PART_TIME', 'FULL_TIME'],
      },
      preferred_task_categories: {
        type: 'array',
        items: {
          type: 'string',
          enum: TECHNOLOGY_TYPE_ENUM,
        },
        uniqueItems: true,
        maxItems: 10,
      },
      portfolio_url: { type: 'string', format: 'uri', example: 'https://portfolio.example.dev' },
      linkedin_url: {
        type: 'string',
        format: 'uri',
        example: 'https://www.linkedin.com/in/olena-kovalenko',
      },
    },
  },
  UpdateDeveloperProfileResponse: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2' },
      updated: { type: 'boolean', example: true },
      updated_at: { type: 'string', format: 'date-time', example: '2026-03-07T14:20:00Z' },
      technologies: {
        type: 'array',
        items: { $ref: '#/components/schemas/TechnologyWithProficiency' },
      },
    },
  },
  CreateCompanyProfileRequest: {
    type: 'object',
    required: ['company_name'],
    properties: {
      company_name: { type: 'string', minLength: 2, maxLength: 100, example: 'NovaTech Labs' },
      company_type: {
        type: 'string',
        enum: ['STARTUP', 'SMB', 'ENTERPRISE', 'INDIVIDUAL'],
      },
      description: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example: 'Product company building SaaS collaboration tools for distributed teams.',
      },
      team_size: { type: 'integer', minimum: 1, maximum: 100000 },
      country: { type: 'string', pattern: '^[A-Z]{2}$' },
      timezone: { type: 'string', minLength: 3, maxLength: 50, example: 'Europe/Warsaw' },
      contact_email: { type: 'string', format: 'email', example: 'hello@novatechlabs.com' },
      website_url: { type: 'string', format: 'uri', example: 'https://novatechlabs.com' },
      links: {
        type: 'object',
        maxProperties: 20,
        additionalProperties: { type: 'string', format: 'uri' },
        example: { linkedin: 'https://www.linkedin.com/company/novatechlabs' },
      },
    },
  },
  CreateCompanyProfileResponse: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c' },
      created: { type: 'boolean', example: true },
    },
  },
  UpdateCompanyProfileRequest: {
    type: 'object',
    required: ['company_name'],
    properties: {
      company_name: { type: 'string', minLength: 2, maxLength: 100, example: 'NovaTech Labs' },
      company_type: {
        type: 'string',
        enum: ['STARTUP', 'SMB', 'ENTERPRISE', 'INDIVIDUAL'],
      },
      description: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example:
          'Updated company profile with focus on platform engineering and AI-enabled analytics.',
      },
      team_size: { type: 'integer', minimum: 1, maximum: 100000 },
      country: { type: 'string', pattern: '^[A-Z]{2}$' },
      timezone: { type: 'string', minLength: 3, maxLength: 50, example: 'Europe/Warsaw' },
      contact_email: { type: 'string', format: 'email', example: 'partnerships@novatechlabs.com' },
      website_url: { type: 'string', format: 'uri', example: 'https://novatechlabs.com' },
      links: {
        type: 'object',
        maxProperties: 20,
        additionalProperties: { type: 'string', format: 'uri' },
        example: { linkedin: 'https://www.linkedin.com/company/novatechlabs' },
      },
    },
  },
  UpdateCompanyProfileResponse: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c' },
      updated: { type: 'boolean', example: true },
      updated_at: { type: 'string', format: 'date-time', example: '2026-03-07T15:00:00Z' },
    },
  },
  CompanyPublicProfileResponse: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c' },
      created_at: {
        type: 'string',
        format: 'date-time',
        description: 'Company profile creation timestamp (registration date on platform)',
        example: '2026-02-14T09:30:00Z',
      },
      company_name: { type: 'string', minLength: 2, maxLength: 100, example: 'NovaTech Labs' },
      company_type: {
        type: 'string',
        enum: ['STARTUP', 'SMB', 'ENTERPRISE', 'INDIVIDUAL'],
      },
      description: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example: 'SaaS company focused on developer productivity and team workflows.',
      },
      team_size: { type: 'integer', minimum: 1, maximum: 100000 },
      country: { type: 'string', pattern: '^[A-Z]{2}$' },
      timezone: { type: 'string', minLength: 3, maxLength: 50, example: 'Europe/Warsaw' },
      logo_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
        description: 'Company logo URL from Cloudinary, null if not uploaded',
      },
      website_url: { type: 'string', format: 'uri', example: 'https://novatechlabs.com' },
      links: {
        type: 'object',
        additionalProperties: { type: 'string', format: 'uri' },
      },
      verified: { type: 'boolean' },
      avg_rating: { type: 'number', format: 'float', example: 4.6 },
      reviews_count: { type: 'integer', example: 8 },
      projects_completed: {
        type: 'integer',
        description: 'Count of unique projects with at least one COMPLETED task',
        example: 5,
      },
      active_projects: {
        type: 'integer',
        description: 'Count of projects with status ACTIVE',
        example: 3,
      },
    },
  },
  DeveloperPublicProfileResponse: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2' },
      display_name: { type: 'string', minLength: 2, maxLength: 100, example: 'Olena Kovalenko' },
      primary_role: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        example: 'Senior Backend Engineer',
      },
      bio: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example:
          'Backend engineer specializing in Node.js APIs, PostgreSQL optimization, and CI quality gates.',
      },
      experience_level: {
        type: 'string',
        enum: ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'],
      },
      location: { type: 'string', minLength: 2, maxLength: 100, example: 'Warsaw, PL' },
      timezone: { type: 'string', minLength: 3, maxLength: 50, example: 'Europe/Warsaw' },
      avatar_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
        description: 'Avatar image URL from Cloudinary, null if not uploaded',
      },
      technologies: {
        type: 'array',
        items: { $ref: '#/components/schemas/TechnologyWithProficiency' },
      },
      portfolio_url: { type: 'string', format: 'uri', example: 'https://portfolio.example.dev' },
      linkedin_url: {
        type: 'string',
        format: 'uri',
        example: 'https://www.linkedin.com/in/olena-kovalenko',
      },
      avg_rating: { type: 'number', format: 'float', example: 4.7 },
      reviews_count: { type: 'integer', example: 12 },
      projects_completed: {
        type: 'integer',
        description:
          'Number of completed projects (tasks with COMPLETED status where developer was accepted)',
        example: 5,
      },
      success_rate: {
        type: 'number',
        format: 'float',
        nullable: true,
        description:
          'Success rate calculated as completed / (completed + failed). null if no projects. Failed tasks occur after 3 completion rejections.',
        example: 0.85,
        minimum: 0,
        maximum: 1,
      },
    },
  },
  UploadAvatarResponse: {
    type: 'object',
    required: ['user_id', 'avatar_url', 'updated_at'],
    properties: {
      user_id: { type: 'string', format: 'uuid', example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2' },
      avatar_url: {
        type: 'string',
        format: 'uri',
        example:
          'https://res.cloudinary.com/example/image/upload/v1234567890/teamup/dev-avatars/example.webp',
      },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  DeleteAvatarResponse: {
    type: 'object',
    required: ['user_id', 'avatar_url', 'updated_at'],
    properties: {
      user_id: { type: 'string', format: 'uuid', example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2' },
      avatar_url: { type: 'null', description: 'Avatar URL is null after deletion' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  UploadLogoResponse: {
    type: 'object',
    required: ['user_id', 'logo_url', 'updated_at'],
    properties: {
      user_id: { type: 'string', format: 'uuid', example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c' },
      logo_url: {
        type: 'string',
        format: 'uri',
        example:
          'https://res.cloudinary.com/example/image/upload/v1234567890/teamup/company-logos/example.webp',
      },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  DeleteLogoResponse: {
    type: 'object',
    required: ['user_id', 'logo_url', 'updated_at'],
    properties: {
      user_id: { type: 'string', format: 'uuid', example: 'b2de0ab8-5cc1-4b79-9e79-9b7bf2b9981c' },
      logo_url: { type: 'null', description: 'Logo URL is null after deletion' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  DeveloperCatalogItem: {
    type: 'object',
    properties: {
      user_id: { type: 'string', format: 'uuid', example: '5f1c3ce6-cd67-46f5-95a8-c086ecf3e9b2' },
      display_name: { type: 'string', minLength: 2, maxLength: 100, example: 'Olena Kovalenko' },
      primary_role: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        example: 'Senior Backend Engineer',
      },
      bio: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example: 'Experienced backend developer focused on clean APIs.',
      },
      experience_level: {
        type: 'string',
        enum: ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'],
        nullable: true,
      },
      location: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        example: 'Warsaw, PL',
        nullable: true,
      },
      availability: {
        type: 'string',
        enum: ['FEW_HOURS_WEEK', 'PART_TIME', 'FULL_TIME'],
        nullable: true,
      },
      avatar_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
        example:
          'https://res.cloudinary.com/example/image/upload/v123/teamup/dev-avatars/test.webp',
      },
      avg_rating: { type: 'number', format: 'float', nullable: true, example: 4.7 },
      reviews_count: { type: 'integer', example: 12 },
      technologies: {
        type: 'array',
        items: { $ref: '#/components/schemas/TechnologyObject' },
      },
    },
  },
  GetDevelopersCatalogResponse: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/DeveloperCatalogItem' },
      },
      page: { type: 'integer', example: 1 },
      size: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 42 },
    },
  },
};
