export default {
  rootDir: '../..',
  testEnvironment: 'node',
  transform: {},
  clearMocks: true,
  setupFiles: ['<rootDir>/tests/config/jest.setup-env.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/config/jest.setup.js'],
  collectCoverageFrom: ['<rootDir>/src/**/*.js'],
  coveragePathIgnorePatterns: ['/docs/', '/src/docs/', '/src/templates/', '/src/jobs/'],
};
