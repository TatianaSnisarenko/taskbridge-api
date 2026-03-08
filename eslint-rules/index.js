/**
 * Custom ESLint plugin for TeamUp IT Backend
 *
 * Contains project-specific rules to enforce code quality standards.
 */

import englishOnly from './english-only.js';

export default {
  rules: {
    'english-only': englishOnly,
  },
};
