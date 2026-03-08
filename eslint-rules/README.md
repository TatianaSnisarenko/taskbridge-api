# Custom ESLint Rules

This directory contains custom ESLint rules specific to the TeamUp IT Backend project.

## Rules

### `english-only`

Enforces English-only content in critical areas of the codebase to maintain consistency and readability.

**What it checks:**

1. **Error messages** - All `ApiError` constructor messages (3rd parameter)
2. **Validation messages** - All Joi `.messages()` object values
3. **Comments** - Single-line and block comments (optional)
4. **String literals** - All strings (optional, disabled by default)

**Configuration:**

```javascript
{
  'custom/english-only': ['warn', {
    checkComments: true,      // Check comments for non-English characters
    checkAllStrings: false    // Don't check all strings, only specific contexts
  }]
}
```

**Examples:**

✅ **Valid** (English only):

```javascript
// This is a valid comment
throw new ApiError(404, 'NOT_FOUND', 'Task not found');

const schema = Joi.object({
  title: Joi.string().required().messages({
    'string.empty': 'Title is required',
  }),
});
```

❌ **Invalid** (Contains non-English characters):

```javascript
// Це коментар українською мовою
throw new ApiError(404, 'NOT_FOUND', 'Завдання не знайдено');

const schema = Joi.object({
  title: Joi.string().required().messages({
    'string.empty': "Заголовок обов'язковий",
  }),
});
```

**Why this rule exists:**

- Maintains consistency across the codebase
- Ensures all error messages are understandable by the team
- Enforces the PROJECT_STANDARDS.md requirement programmatically
- Prevents accidental non-English content in user-facing messages

**Scope:**

This rule is applied only to:

- `src/**/*.js` - Source code files
- `tests/**/*.js` - Test files

Excluded from the rule:

- `prisma/**` - Database scripts (may contain unicode emojis for logging)
- `dev-notes/**` - Development documentation
- `coverage/**` - Test coverage reports
- `node_modules/**` - Dependencies

## Testing the Rule

See `test-english-only.example.js` for examples of valid and invalid code patterns.

To test violations, uncomment the invalid examples and run:

```bash
npm run lint
```

## Development

To add a new custom rule:

1. Create a new rule file in this directory (e.g., `my-rule.js`)
2. Follow the ESLint rule structure:
   ```javascript
   export default {
     meta: {
       /* ... */
     },
     create(context) {
       /* ... */
     },
   };
   ```
3. Add the rule to `index.js`:

   ```javascript
   import myRule from './my-rule.js';

   export default {
     rules: {
       'my-rule': myRule,
     },
   };
   ```

4. Update `eslint.config.js` to use the rule
5. Update this README with documentation

## References

- [ESLint Custom Rule Documentation](https://eslint.org/docs/latest/extend/custom-rules)
- [ESLint Plugin Development Guide](https://eslint.org/docs/latest/extend/plugins)
- [AST Explorer](https://astexplorer.net/) - For understanding JavaScript AST structure
