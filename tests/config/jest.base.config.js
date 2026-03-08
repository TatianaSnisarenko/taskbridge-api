export default {
  rootDir: '../..',
  testEnvironment: 'node',
  transform: {},
  clearMocks: true,
  setupFiles: ['<rootDir>/tests/config/jest.setup-env.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/config/jest.setup.js'],
  collectCoverageFrom: ['<rootDir>/src/**/*.js'],
  coverageReporters: ['json-summary', 'json', 'lcov', 'text', 'clover'],
  coveragePathIgnorePatterns: [
    '/docs/',
    '/src/docs/',
    '/src/templates/',
    '/src/jobs/',
    // Exclude only pure barrel service index files (re-exports only, no runtime logic).
    // Keep logic-bearing index files in coverage.
    '/src/services/invites/index\\.js$',
    '/src/services/me/index\\.js$',
    '/src/services/profiles/index\\.js$',
    '/src/services/projects/index\\.js$',
    '/src/services/tasks/index\\.js$',
    '/src/services/tasks/workflows/index\\.js$',
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 80,
      functions: 95,
      lines: 90,
    },
  },
};
