import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';

function gitCommit() {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return process.env.GITHUB_SHA ?? '';
  }
}

export default defineConfig({
  base: '/shift-scheduler/',
  define: {
    'import.meta.env.VITE_BUILD_COMMIT': JSON.stringify(gitCommit()),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(new Date().toISOString()),
  },
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
