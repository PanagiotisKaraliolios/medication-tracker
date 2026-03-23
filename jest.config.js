const {
  watchPlugins: _,
  projects: rawProjects,
  ...rootPreset
} = require('jest-expo/universal/jest-preset');
const projects = rawProjects
  .filter((p) => ['Node', 'Web'].includes(p.displayName?.name))
  .map(({ watchPlugins: __, ...proj }) => ({
    ...proj,
    setupFiles: [...(proj.setupFiles || []), '<rootDir>/jest.setup.js'],
  }));

/** @type {import('jest').Config} */
module.exports = {
  ...rootPreset,
  projects,
  collectCoverageFrom: [
    'utils/**/*.ts',
    'stores/**/*.ts',
    'lib/queryKeys.ts',
    'lib/drugApi.ts',
    'lib/notifications.ts',
    'hooks/useQueryHooks.ts',
    'hooks/useCalendar.ts',
    'hooks/useSnooze.ts',
    'hooks/useNetworkStatus.ts',
    'hooks/useResponsive.ts',
    'contexts/AuthContext.tsx',
    'contexts/ThemeContext.tsx',
    '!**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
