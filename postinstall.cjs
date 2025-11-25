#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

if (process.env.PDF_RENDER_KIT_SKIP_BROWSER_INSTALL) {
  console.log('[pdf-render-kit] Skipping Playwright browser install (PDF_RENDER_KIT_SKIP_BROWSER_INSTALL=1)');
  process.exit(0);
}

console.log('[pdf-render-kit] Installing Playwright chromium...');

const result = spawnSync('npx', ['playwright', 'install', 'chromium'], {
  stdio: 'inherit',
  shell: true,
});

if (result.error) {
  console.error('[pdf-render-kit] Failed to run "npx playwright install chromium":', result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);