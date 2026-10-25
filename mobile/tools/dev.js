// Starts the Expo dev server for web (used by the preview pane).
// Usage: node tools/dev.js [port]
const { spawn } = require('child_process');
const path = require('path');

const port = process.argv[2] || '8082';
const child = spawn('npx', ['expo', 'start', '--web', '--port', port], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, BROWSER: 'none', EXPO_NO_TELEMETRY: '1' },
});
child.on('exit', (code) => process.exit(code ?? 0));
