export const profilesPaths = {
  '/api/v1/profiles/developer': {
    post: {
      tags: ['Profiles'],
      summary: 'Create developer profile',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateDeveloperProfileRequest' },
            example: {
              display_name: 'Developer',
              primary_role: 'Backend Engineer',
              bio: 'Short bio',
              experience_level: 'MIDDLE',
              location: 'EU',
              timezone: 'Europe/UTC',
              technology_ids: [
                '6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61',
                '8a311c84-7d56-4d1e-96c4-9ca2f83e7082',
              ],
              availability: 'FEW_HOURS_WEEK',
              preferred_task_categories: ['BACKEND'],
              portfolio_url: 'https://example.com/portfolio',
              linkedin_url: 'https://linkedin.com/in/example',
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Developer profile created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDeveloperProfileResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        409: { description: 'Profile already exists' },
      },
    },
    put: {
      tags: ['Profiles'],
      summary: 'Update developer profile',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateDeveloperProfileRequest' },
            example: {
              display_name: 'Developer',
              primary_role: 'Backend Engineer',
              bio: 'Updated bio',
              experience_level: 'MIDDLE',
              location: 'EU',
              timezone: 'Europe/UTC',
              technology_ids: [
                '6c8e4a2a-d1b4-4de8-b7d2-f4b9f7fddf61',
                '8a311c84-7d56-4d1e-96c4-9ca2f83e7082',
              ],
              availability: 'PART_TIME',
              preferred_task_categories: ['BACKEND', 'DEVOPS'],
              portfolio_url: 'https://example.com/portfolio',
              linkedin_url: 'https://linkedin.com/in/example',
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Developer profile updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateDeveloperProfileResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        404: { description: 'Profile not found' },
      },
    },
  },
  '/api/v1/profiles/developer/{userId}': {
    get: {
      tags: ['Profiles'],
      summary: 'Get public developer profile',
      parameters: [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        200: {
          description: 'Developer profile',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DeveloperPublicProfileResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        404: { description: 'Profile not found' },
      },
    },
  },
  '/api/v1/profiles/developer/avatar': {
    post: {
      tags: ['Profiles'],
      summary: 'Upload developer avatar',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'X-Persona',
          in: 'header',
          required: true,
          schema: { type: 'string', enum: ['developer'] },
          description: 'User persona (must be developer)',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Image file (JPEG, PNG, or WebP, max 5MB, min 512x512)',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Avatar uploaded successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UploadAvatarResponse' },
            },
          },
        },
        400: {
          description: 'Validation error or invalid image',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                missingFile: {
                  value: {
                    error: {
                      code: 'VALIDATION_ERROR',
                      message: 'Validation failed',
                      details: [{ field: 'file', issue: 'File is required' }],
                    },
                  },
                },
                invalidFileType: {
                  value: {
                    error: {
                      code: 'INVALID_FILE_TYPE',
                      message: 'File type must be one of: image/jpeg, image/png, image/webp',
                    },
                  },
                },
                fileTooLarge: {
                  value: {
                    error: {
                      code: 'FILE_TOO_LARGE',
                      message: 'File size must not exceed 5MB',
                    },
                  },
                },
                imageTooSmall: {
                  value: {
                    error: {
                      code: 'IMAGE_TOO_SMALL',
                      message: 'Image resolution must be at least 512x512 pixels',
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Developer profile does not exist' },
        404: { description: 'Profile not found' },
        500: {
          description: 'Upload failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Profiles'],
      summary: 'Delete developer avatar',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'X-Persona',
          in: 'header',
          required: true,
          schema: { type: 'string', enum: ['developer'] },
          description: 'User persona (must be developer)',
        },
      ],
      responses: {
        200: {
          description: 'Avatar deleted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DeleteAvatarResponse' },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Developer profile does not exist' },
        404: {
          description: 'Avatar not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                error: {
                  code: 'AVATAR_NOT_FOUND',
                  message: 'Avatar not found',
                },
              },
            },
          },
        },
        500: {
          description: 'Delete failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/api/v1/profiles/company': {
    post: {
      tags: ['Profiles'],
      summary: 'Create company profile',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateCompanyProfileRequest' },
            example: {
              company_name: 'NovaTech Labs',
              company_type: 'SMB',
              description:
                'Product company building SaaS collaboration tools for distributed teams.',
              team_size: 10,
              country: 'US',
              timezone: 'America/New_York',
              contact_email: 'hello@novatechlabs.com',
              website_url: 'https://novatechlabs.com',
              links: { linkedin: 'https://www.linkedin.com/company/novatechlabs' },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Company profile created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCompanyProfileResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        409: { description: 'Profile already exists' },
      },
    },
    put: {
      tags: ['Profiles'],
      summary: 'Update company profile',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateCompanyProfileRequest' },
            example: {
              company_name: 'NovaTech Labs',
              company_type: 'SMB',
              description: 'Updated profile with stronger focus on backend platform and analytics.',
              team_size: 12,
              country: 'US',
              timezone: 'America/New_York',
              contact_email: 'partnerships@novatechlabs.com',
              website_url: 'https://novatechlabs.com',
              links: { linkedin: 'https://www.linkedin.com/company/novatechlabs' },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Company profile updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCompanyProfileResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        404: { description: 'Profile not found' },
      },
    },
  },
  '/api/v1/profiles/company/{userId}': {
    get: {
      tags: ['Profiles'],
      summary: 'Get public company profile',
      parameters: [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        200: {
          description: 'Company profile',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CompanyPublicProfileResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
        404: { description: 'Profile not found' },
      },
    },
  },
  '/api/v1/profiles/company/logo': {
    post: {
      tags: ['Profiles'],
      summary: 'Upload company logo',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'X-Persona',
          in: 'header',
          required: true,
          schema: { type: 'string', enum: ['company'] },
          description: 'User persona (must be company)',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Image file (JPEG, PNG, or WebP, max 5MB, min 512x512)',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Logo uploaded successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UploadLogoResponse' },
            },
          },
        },
        400: {
          description: 'Validation error or invalid image',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Company profile does not exist' },
        404: { description: 'Profile not found' },
        500: {
          description: 'Upload failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Profiles'],
      summary: 'Delete company logo',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'X-Persona',
          in: 'header',
          required: true,
          schema: { type: 'string', enum: ['company'] },
          description: 'User persona (must be company)',
        },
      ],
      responses: {
        200: {
          description: 'Logo deleted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DeleteLogoResponse' },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Company profile does not exist' },
        404: {
          description: 'Logo not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                error: {
                  code: 'LOGO_NOT_FOUND',
                  message: 'Logo not found',
                },
              },
            },
          },
        },
        500: {
          description: 'Delete failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
};
