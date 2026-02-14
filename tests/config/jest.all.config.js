import baseConfig from './jest.base.config.js';

export default {
  ...baseConfig,
  displayName: 'all',
  testMatch: ['<rootDir>/tests/unit/**/*.test.js', '<rootDir>/tests/integration/**/*.test.js'],
  globalSetup: '<rootDir>/tests/config/jest.global-setup.js',
  globalTeardown: '<rootDir>/tests/config/jest.global-teardown.js',
  testTimeout: 60000,
};
