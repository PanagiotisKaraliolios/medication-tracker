/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/universal',
  collectCoverageFrom: ['utils/**/*.ts', 'stores/**/*.ts', '!**/index.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
