/**
 * ESLint custom rule: english-only
 *
 * Enforces English-only content in:
 * - Error messages (ApiError constructor)
 * - Validation messages (Joi .messages() objects)
 * - Comments (both single-line and block comments)
 * - String literals in user-facing contexts
 *
 * Allows:
 * - ASCII characters (0-127)
 * - Common programming symbols
 * - Technical identifiers
 */

const NON_ASCII_REGEX = /[^\x00-\x7F]/;

/**
 * Checks if a string contains non-English (non-ASCII) characters
 */
function hasNonEnglishCharacters(text) {
  if (!text) return false;
  return NON_ASCII_REGEX.test(text);
}

/**
 * Checks if a node is an ApiError constructor call
 */
function isApiErrorCall(node) {
  return (
    node.type === 'NewExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'ApiError'
  );
}

/**
 * Checks if a node is a Joi .messages() call
 */
function isJoiMessagesCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'messages'
  );
}

/**
 * Checks if property is part of Joi messages object
 */
function isMessageProperty(node) {
  // Check if this is a property in an object passed to .messages()
  let parent = node.parent;
  while (parent) {
    if (parent.type === 'CallExpression' && isJoiMessagesCall(parent)) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce English-only content in error messages, validation messages, and comments',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      nonEnglishError: 'Error message must be in English only (contains non-ASCII characters)',
      nonEnglishValidation:
        'Validation message must be in English only (contains non-ASCII characters)',
      nonEnglishComment: 'Comment must be in English only (contains non-ASCII characters)',
      nonEnglishString:
        'User-facing string must be in English only (contains non-ASCII characters)',
    },
    schema: [
      {
        type: 'object',
        properties: {
          checkComments: {
            type: 'boolean',
            default: true,
          },
          checkAllStrings: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const checkComments = options.checkComments !== false;
    const checkAllStrings = options.checkAllStrings === true;

    return {
      // Check ApiError constructor calls
      NewExpression(node) {
        if (isApiErrorCall(node)) {
          // Check the message parameter (3rd argument)
          if (node.arguments.length >= 3) {
            const messageArg = node.arguments[2];
            if (messageArg.type === 'Literal' && typeof messageArg.value === 'string') {
              if (hasNonEnglishCharacters(messageArg.value)) {
                context.report({
                  node: messageArg,
                  messageId: 'nonEnglishError',
                });
              }
            }
            // Also check template literals
            if (messageArg.type === 'TemplateLiteral') {
              messageArg.quasis.forEach((quasi) => {
                if (hasNonEnglishCharacters(quasi.value.raw)) {
                  context.report({
                    node: quasi,
                    messageId: 'nonEnglishError',
                  });
                }
              });
            }
          }
        }
      },

      // Check Joi validation messages
      Property(node) {
        if (isMessageProperty(node)) {
          if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
            if (hasNonEnglishCharacters(node.value.value)) {
              context.report({
                node: node.value,
                messageId: 'nonEnglishValidation',
              });
            }
          }
          // Check template literals in validation messages
          if (node.value.type === 'TemplateLiteral') {
            node.value.quasis.forEach((quasi) => {
              if (hasNonEnglishCharacters(quasi.value.raw)) {
                context.report({
                  node: quasi,
                  messageId: 'nonEnglishValidation',
                });
              }
            });
          }
        }
      },

      // Check all string literals if checkAllStrings is enabled
      Literal(node) {
        if (checkAllStrings && typeof node.value === 'string') {
          // Skip if already checked (ApiError or Joi messages)
          const parent = node.parent;
          if (
            (parent.type === 'NewExpression' && isApiErrorCall(parent)) ||
            isMessageProperty(parent)
          ) {
            return;
          }

          if (hasNonEnglishCharacters(node.value)) {
            context.report({
              node,
              messageId: 'nonEnglishString',
            });
          }
        }
      },

      // Check comments
      Program(node) {
        if (!checkComments) return;

        const sourceCode = context.sourceCode || context.getSourceCode();
        const comments = sourceCode.getAllComments();

        comments.forEach((comment) => {
          if (hasNonEnglishCharacters(comment.value)) {
            context.report({
              loc: comment.loc,
              messageId: 'nonEnglishComment',
            });
          }
        });
      },
    };
  },
};
