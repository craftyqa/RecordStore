import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'contract',
      include: ['src/**/*.contract.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'integration',
      include: ['src/**/*.integration.test.ts'],
      environment: 'node',
      setupFiles: ['src/test/setup.ts'],
      pool: 'forks',
      poolOptions: { forks: { singleFork: true } },
    },
  },
])
