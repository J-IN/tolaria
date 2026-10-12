import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

// Static web bundle lane (TOL-3): serves apps/web/dist with `pnpm preview:web` and
// runs the same checks in desktop Chromium, desktop WebKit and iPhone/iPad
// emulation. Not part of the pre-push smoke lane; run `pnpm build:web` first.

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:41760'
const port = new URL(baseURL).port || '41760'
const storageState = {
  cookies: [],
  origins: [
    {
      origin: baseURL,
      localStorage: [
        { name: 'tolaria:claude-code-onboarding-dismissed', value: '1' },
      ],
    },
  ],
}

export default defineConfig({
  testDir: './tests',
  outputDir: '../../test-results/web',
  timeout: 45_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL,
    headless: true,
    storageState,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'iphone-15', use: { ...devices['iPhone 15'] } },
    { name: 'ipad', use: { ...devices['iPad Pro 11'] } },
    { name: 'ipad-landscape', use: { ...devices['iPad Pro 11 landscape'] } },
  ],
  webServer: {
    command: `pnpm preview:web --port ${port}`,
    cwd: repoRoot,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
