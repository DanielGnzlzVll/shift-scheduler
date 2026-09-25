import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/shift-scheduler/',
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.js'],
          exclude: ['tests/**/*.dom.test.js'],
        },
      },
      {
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['tests/**/*.dom.test.js'],
        },
      },
    ],
  },
});
