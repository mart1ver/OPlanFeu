// Tests de bout en bout : la page est servie en local, three.js est pris dans node_modules (pas de réseau)
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8765',
    viewport: { width: 1500, height: 950 },
    launchOptions: { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: { command: 'node tests/serve.js 8765', url: 'http://127.0.0.1:8765/index.html', reuseExistingServer: true },
});
