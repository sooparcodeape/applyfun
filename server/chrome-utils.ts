import { existsSync } from 'fs';

/**
 * Find Chrome executable path across different environments
 */
export function findChromePath(): string {
  console.log('[Chrome] Starting path detection...');
  console.log('[Chrome] Current user:', process.env.USER || 'unknown');
  console.log('[Chrome] Current UID:', process.getuid?.() || 'unknown');
  
  const chromePaths = [
    '/root/.cache/puppeteer/chrome/linux-143.0.7499.192/chrome-linux64/chrome',
    '/home/ubuntu/.cache/puppeteer/chrome/linux-143.0.7499.192/chrome-linux64/chrome',
    '/usr/local/share/puppeteer/chrome/linux-143.0.7499.192/chrome-linux64/chrome',
  ];
  
  for (const path of chromePaths) {
    console.log(`[Chrome] Checking: ${path}`);
    const exists = existsSync(path);
    console.log(`[Chrome] Exists: ${exists}`);
    if (exists) {
      console.log(`[Chrome] ✓ Found at: ${path}`);
      return path;
    }
  }
  
  console.error('[Chrome] ✗ Not found in any location');
  throw new Error('Chrome not found. Tried paths: ' + chromePaths.join(', '));
}
