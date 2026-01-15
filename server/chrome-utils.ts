import { existsSync } from 'fs';

/**
 * Find Chrome executable path across different environments
 */
export function findChromePath(): string {
  const chromePaths = [
    '/root/.cache/puppeteer/chrome/linux-143.0.7499.192/chrome-linux64/chrome',
    '/home/ubuntu/.cache/puppeteer/chrome/linux-143.0.7499.192/chrome-linux64/chrome',
    '/usr/local/share/puppeteer/chrome/linux-143.0.7499.192/chrome-linux64/chrome',
  ];
  
  for (const path of chromePaths) {
    if (existsSync(path)) {
      console.log(`[Chrome] Found at: ${path}`);
      return path;
    }
  }
  
  throw new Error('Chrome not found. Tried paths: ' + chromePaths.join(', '));
}
