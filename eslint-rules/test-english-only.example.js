/**
 * Test file to demonstrate the english-only ESLint rule
 *
 * This file contains intentional violations to show that the rule works correctly.
 * It should NOT be committed to the repository.
 */

import { ApiError } from '../src/utils/ApiError.js';

// Example 1: ApiError with English message (VALID ✓)
export function validErrorExample() {
  throw new ApiError(404, 'NOT_FOUND', 'Task not found');
}

// Example 2: ApiError with non-English message (VIOLATION - would trigger warning)
// Uncomment to test:
// export function invalidErrorExample() {
//   throw new ApiError(404, 'NOT_FOUND', 'Завдання не знайдено');
// }

// Example 3: English comment (VALID ✓)
// This is a valid comment in English

// Example 4: Non-English comment (VIOLATION - would trigger warning)
// Uncomment to test:
// Це коментар українською мовою

// Example 5: Joi validation message in English (VALID ✓)
export const validationSchemaExample = {
  messages: {
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 3 characters',
  },
};

// Example 6: Joi validation message with non-English (VIOLATION - would trigger warning)
// Uncomment to test:
// export const invalidValidationSchemaExample = {
//   messages: {
//     'string.empty': 'Заголовок обов\'язковий',
//   },
// };

// Example 7: Template literal with English (VALID ✓)
export function validTemplateExample(taskId) {
  throw new ApiError(404, 'NOT_FOUND', `Task ${taskId} not found`);
}

// Example 8: Template literal with non-English (VIOLATION - would trigger warning)
// Uncomment to test:
// export function invalidTemplateExample(taskId) {
//   throw new ApiError(404, 'NOT_FOUND', `Завдання ${taskId} не знайдено`);
// }
