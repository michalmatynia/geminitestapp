module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  globalSetup: './jest.global-setup.js',
  globalTeardown: './jest.global-teardown.js',
  testTimeout: 30000,
};
