import { createSwaggerSpec } from '../src/docs/swagger.js';
import * as authSchemas from '../src/schemas/auth.schemas.js';
import * as invitesSchemas from '../src/schemas/invites.schemas.js';
import * as meSchemas from '../src/schemas/me.schemas.js';
import * as profilesSchemas from '../src/schemas/profiles.schemas.js';
import * as projectsSchemas from '../src/schemas/projects.schemas.js';
import * as tasksSchemas from '../src/schemas/tasks.schemas.js';

const swaggerComponents = createSwaggerSpec().components.schemas;

const schemaMappings = [
  { joi: authSchemas.signupSchema, swagger: 'SignupRequest' },
  { joi: authSchemas.loginSchema, swagger: 'AuthCredentials' },
  { joi: authSchemas.resendVerificationSchema, swagger: 'ResendVerificationRequest' },
  { joi: authSchemas.setPasswordSchema, swagger: 'SetPasswordRequest' },
  { joi: authSchemas.forgotPasswordSchema, swagger: 'ForgotPasswordRequest' },
  { joi: authSchemas.resetPasswordSchema, swagger: 'ResetPasswordRequest' },

  { joi: projectsSchemas.createProjectSchema, swagger: 'CreateProjectRequest' },
  { joi: projectsSchemas.updateProjectSchema, swagger: 'UpdateProjectRequest' },
  { joi: projectsSchemas.reportProjectSchema, swagger: 'ReportProjectRequest' },

  { joi: tasksSchemas.createTaskDraftSchema, swagger: 'CreateTaskDraftRequest' },
  { joi: tasksSchemas.updateTaskDraftSchema, swagger: 'UpdateTaskDraftRequest' },
  { joi: tasksSchemas.createTaskApplicationSchema, swagger: 'CreateTaskApplicationRequest' },
  { joi: tasksSchemas.rejectTaskCompletionSchema, swagger: 'RejectTaskCompletionRequest' },

  { joi: profilesSchemas.createDeveloperProfileSchema, swagger: 'CreateDeveloperProfileRequest' },
  { joi: profilesSchemas.updateDeveloperProfileSchema, swagger: 'UpdateDeveloperProfileRequest' },
  { joi: profilesSchemas.createCompanyProfileSchema, swagger: 'CreateCompanyProfileRequest' },
  { joi: profilesSchemas.updateCompanyProfileSchema, swagger: 'UpdateCompanyProfileRequest' },

  { joi: invitesSchemas.createTaskInviteSchema, swagger: 'CreateTaskInviteRequest' },
  { joi: meSchemas.createMessageBodySchema, swagger: 'CreateMessageRequest' },
];

function getRule(schema, name) {
  return schema.rules?.find((rule) => rule.name === name);
}

function getComparableJoiField(schema) {
  const field = {
    type: schema.type,
    required: schema.flags?.presence === 'required',
    nullable: Array.isArray(schema.allow) && schema.allow.includes(null),
  };

  if (schema.type === 'number' && getRule(schema, 'integer')) {
    field.type = 'integer';
  }

  if (schema.type === 'date') {
    field.type = 'string';
  }

  const min = getRule(schema, 'min')?.args?.limit;
  const max = getRule(schema, 'max')?.args?.limit;

  if (typeof min === 'number') {
    field.min = min;
  }

  if (typeof max === 'number') {
    field.max = max;
  }

  if (schema.type === 'array') {
    field.unique = Boolean(getRule(schema, 'unique'));
  }

  if (schema.flags?.only && Array.isArray(schema.allow)) {
    field.enum = schema.allow.filter((value) => value !== null);
  }

  if (schema.type === 'string' && getRule(schema, 'guid')) {
    field.format = 'uuid';
  }

  return field;
}

function getComparableSwaggerField(schema, isRequired) {
  const field = {
    type: schema.type,
    required: isRequired,
    nullable: Boolean(schema.nullable),
  };

  if (Array.isArray(schema.enum)) {
    field.enum = [...schema.enum];
  }

  if (schema.type === 'string') {
    if (typeof schema.minLength === 'number') {
      field.min = schema.minLength;
    }
    if (typeof schema.maxLength === 'number') {
      field.max = schema.maxLength;
    }
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    if (typeof schema.minimum === 'number') {
      field.min = schema.minimum;
    }
    if (typeof schema.maximum === 'number') {
      field.max = schema.maximum;
    }
  }

  if (schema.type === 'array') {
    if (typeof schema.minItems === 'number') {
      field.min = schema.minItems;
    }
    if (typeof schema.maxItems === 'number') {
      field.max = schema.maxItems;
    }
    field.unique = Boolean(schema.uniqueItems);
  }

  if (schema.type === 'object') {
    if (typeof schema.minProperties === 'number') {
      field.min = schema.minProperties;
    }
    if (typeof schema.maxProperties === 'number') {
      field.max = schema.maxProperties;
    }
  }

  if (schema.format === 'uuid') {
    field.format = 'uuid';
  }

  return field;
}

function equalEnum(left = [], right = []) {
  const a = [...left].sort();
  const b = [...right].sort();
  return JSON.stringify(a) === JSON.stringify(b);
}

function compareSchemaPair(joiSchema, swaggerSchemaName) {
  const issues = [];
  const swaggerSchema = swaggerComponents[swaggerSchemaName];

  if (!swaggerSchema) {
    issues.push(`[${swaggerSchemaName}] Swagger schema is missing`);
    return issues;
  }

  const joiDescription = joiSchema.describe();
  if (joiDescription.type !== 'object') {
    issues.push(`[${swaggerSchemaName}] Joi schema is not an object`);
    return issues;
  }

  const joiKeys = joiDescription.keys || {};
  const swaggerRequiredSet = new Set(swaggerSchema.required || []);
  const swaggerProperties = swaggerSchema.properties || {};

  for (const [fieldName, joiFieldSchema] of Object.entries(joiKeys)) {
    const swaggerFieldSchema = swaggerProperties[fieldName];

    if (!swaggerFieldSchema) {
      issues.push(`[${swaggerSchemaName}.${fieldName}] Missing property in Swagger schema`);
      continue;
    }

    const joiField = getComparableJoiField(joiFieldSchema);
    const swaggerField = getComparableSwaggerField(
      swaggerFieldSchema,
      swaggerRequiredSet.has(fieldName)
    );

    if (joiField.required !== swaggerField.required) {
      issues.push(
        `[${swaggerSchemaName}.${fieldName}] Required mismatch (Joi: ${joiField.required}, Swagger: ${swaggerField.required})`
      );
    }

    if (joiField.type !== swaggerField.type) {
      issues.push(
        `[${swaggerSchemaName}.${fieldName}] Type mismatch (Joi: ${joiField.type}, Swagger: ${swaggerField.type})`
      );
    }

    if (joiField.format && joiField.format !== swaggerField.format) {
      issues.push(
        `[${swaggerSchemaName}.${fieldName}] Format mismatch (Joi: ${joiField.format}, Swagger: ${swaggerField.format || 'undefined'})`
      );
    }

    if (joiField.nullable !== swaggerField.nullable) {
      issues.push(
        `[${swaggerSchemaName}.${fieldName}] Nullable mismatch (Joi: ${joiField.nullable}, Swagger: ${swaggerField.nullable})`
      );
    }

    if (typeof joiField.min === 'number' && joiField.min !== swaggerField.min) {
      issues.push(
        `[${swaggerSchemaName}.${fieldName}] Min constraint mismatch (Joi: ${joiField.min}, Swagger: ${swaggerField.min ?? 'undefined'})`
      );
    }

    if (typeof joiField.max === 'number' && joiField.max !== swaggerField.max) {
      issues.push(
        `[${swaggerSchemaName}.${fieldName}] Max constraint mismatch (Joi: ${joiField.max}, Swagger: ${swaggerField.max ?? 'undefined'})`
      );
    }

    if (Array.isArray(joiField.enum) && !equalEnum(joiField.enum, swaggerField.enum || [])) {
      issues.push(`[${swaggerSchemaName}.${fieldName}] Enum mismatch`);
    }

    if (joiField.type === 'array' && joiField.unique !== swaggerField.unique) {
      issues.push(
        `[${swaggerSchemaName}.${fieldName}] uniqueItems mismatch (Joi: ${joiField.unique}, Swagger: ${swaggerField.unique})`
      );
    }
  }

  return issues;
}

function main() {
  const issues = [];

  for (const mapping of schemaMappings) {
    issues.push(...compareSchemaPair(mapping.joi, mapping.swagger));
  }

  if (issues.length > 0) {
    console.error('❌ Swagger-Joi consistency check failed:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }
}

main();
