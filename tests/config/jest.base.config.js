export default {
  rootDir: '../..',
  testEnvironment: 'node',
  transform: {},
  clearMocks: true,
  setupFiles: ['<rootDir>/tests/config/jest.setup-env.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/config/jest.setup.js'],
  collectCoverageFrom: ['<rootDir>/src/**/*.js'],
  coverageReporters: ['json-summary', 'json', 'lcov', 'text', 'clover'],
  coveragePathIgnorePatterns: ['/docs/', '/src/docs/', '/src/templates/', '/src/jobs/'],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 70,
      functions: 90,
      lines: 85,
    },
  },
};
