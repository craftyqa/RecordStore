import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    workspace: [
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts'],
          environment: 'node',
          setupFiles: ['src/test/setup.ts'],
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
        },
      },
      {
        extends: true,
        test: {
          name: 'contract',
          include: ['src/**/*.contract.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
})
