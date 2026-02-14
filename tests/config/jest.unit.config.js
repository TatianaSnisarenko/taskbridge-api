import baseConfig from './jest.base.config.js';

export default {
  ...baseConfig,
  displayName: 'unit',
  testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
};
