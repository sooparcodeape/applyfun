/**
 * Proxy Manager - Smart proxy rotation with failure tracking
 * Implements Option B: Use one proxy until it fails, then rotate
 */

import { listProxies, createProxy, deleteProxy, refreshProxy, type AsocksProxy } from './asocks-api';

interface ProxyWithStats {
  proxy: AsocksProxy;
  consecutiveFailures: number;
  totalAttempts: number;
  successfulAttempts: number;
  lastUsed: Date;
}

class ProxyManager {
  private proxies: Map<number, ProxyWithStats> = new Map();
  private currentProxyId: number | null = null;
  private initialized = false;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly MAX_PROXIES = 5;

  /**
   * Initialize proxy manager - fetch existing proxies
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[ProxyManager] Initializing...');
    const existingProxies = await listProxies();

    if (existingProxies.length === 0) {
      console.log('[ProxyManager] No existing proxies found, creating first proxy...');
      const newProxy = await createProxy('US', 'job-automation');
      if (newProxy) {
        this.addProxy(newProxy);
      }
    } else {
      console.log(`[ProxyManager] Found ${existingProxies.length} existing proxies`);
      existingProxies.forEach(proxy => this.addProxy(proxy));
    }

    // Set first proxy as current
    if (this.proxies.size > 0) {
      this.currentProxyId = Array.from(this.proxies.keys())[0];
      console.log(`[ProxyManager] Using proxy ID ${this.currentProxyId} as default`);
    }

    this.initialized = true;
  }

  /**
   * Add a proxy to the manager
   */
  private addProxy(proxy: AsocksProxy): void {
    this.proxies.set(proxy.id, {
      proxy,
      consecutiveFailures: 0,
      totalAttempts: 0,
      successfulAttempts: 0,
      lastUsed: new Date(),
    });
  }

  /**
   * Get current proxy URL for Puppeteer
   * Returns null if no proxy is configured
   */
  async getProxyUrl(): Promise<string | null> {
    await this.initialize();

    if (!this.currentProxyId || this.proxies.size === 0) {
      console.log('[ProxyManager] No proxies available');
      return null;
    }

    const proxyStats = this.proxies.get(this.currentProxyId);
    if (!proxyStats) {
      console.log('[ProxyManager] Current proxy not found, selecting new one');
      await this.selectNextProxy();
      return this.getProxyUrl();
    }

    const { proxy } = proxyStats;
    // Extract credentials from template format: "http://username:password@ip:port"
    const template = proxy.template;
    
    // Return the full proxy URL
    console.log(`[ProxyManager] Using proxy: ${proxy.proxy} (${proxy.countryCode})`);
    return template;
  }

  /**
   * Report success for current proxy
   */
  async reportSuccess(): Promise<void> {
    if (!this.currentProxyId) return;

    const proxyStats = this.proxies.get(this.currentProxyId);
    if (proxyStats) {
      proxyStats.consecutiveFailures = 0; // Reset failure count
      proxyStats.totalAttempts++;
      proxyStats.successfulAttempts++;
      proxyStats.lastUsed = new Date();
      
      const successRate = ((proxyStats.successfulAttempts / proxyStats.totalAttempts) * 100).toFixed(1);
      console.log(`[ProxyManager] Proxy ${this.currentProxyId} success (${successRate}% success rate)`);
    }
  }

  /**
   * Report failure for current proxy and rotate if needed
   */
  async reportFailure(): Promise<void> {
    if (!this.currentProxyId) return;

    const proxyStats = this.proxies.get(this.currentProxyId);
    if (!proxyStats) return;

    proxyStats.consecutiveFailures++;
    proxyStats.totalAttempts++;
    proxyStats.lastUsed = new Date();

    const successRate = ((proxyStats.successfulAttempts / proxyStats.totalAttempts) * 100).toFixed(1);
    console.log(
      `[ProxyManager] Proxy ${this.currentProxyId} failed (${proxyStats.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES} failures, ${successRate}% success rate)`
    );

    // Rotate if too many consecutive failures
    if (proxyStats.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      console.log(`[ProxyManager] Proxy ${this.currentProxyId} exceeded failure threshold, rotating...`);
      await this.rotateProxy();
    }
  }

  /**
   * Rotate to next available proxy or create a new one
   */
  private async rotateProxy(): Promise<void> {
    const failedProxyId = this.currentProxyId;

    // Try to find another working proxy
    const workingProxy = Array.from(this.proxies.entries()).find(
      ([id, stats]) => id !== failedProxyId && stats.consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES
    );

    if (workingProxy) {
      this.currentProxyId = workingProxy[0];
      console.log(`[ProxyManager] Rotated to existing proxy ID ${this.currentProxyId}`);
      return;
    }

    // All proxies failed, create a new one
    console.log('[ProxyManager] All proxies failed, creating new proxy...');
    const newProxy = await createProxy('US', 'job-automation');
    
    if (newProxy) {
      this.addProxy(newProxy);
      this.currentProxyId = newProxy.id;
      console.log(`[ProxyManager] Created and rotated to new proxy ID ${newProxy.id}`);

      // Clean up old proxies if we have too many
      await this.cleanupOldProxies();
    } else {
      console.error('[ProxyManager] Failed to create new proxy, will retry without proxy');
      this.currentProxyId = null;
    }
  }

  /**
   * Select next available proxy (used when current proxy is not found)
   */
  private async selectNextProxy(): Promise<void> {
    const availableProxies = Array.from(this.proxies.entries())
      .filter(([_, stats]) => stats.consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES)
      .sort((a, b) => a[1].consecutiveFailures - b[1].consecutiveFailures);

    if (availableProxies.length > 0) {
      this.currentProxyId = availableProxies[0][0];
      console.log(`[ProxyManager] Selected proxy ID ${this.currentProxyId}`);
    } else {
      console.log('[ProxyManager] No available proxies, creating new one...');
      const newProxy = await createProxy('US', 'job-automation');
      if (newProxy) {
        this.addProxy(newProxy);
        this.currentProxyId = newProxy.id;
      }
    }
  }

  /**
   * Clean up old/failed proxies, keep only MAX_PROXIES
   */
  private async cleanupOldProxies(): Promise<void> {
    if (this.proxies.size <= this.MAX_PROXIES) return;

    // Sort by last used date (oldest first)
    const sortedProxies = Array.from(this.proxies.entries())
      .filter(([id]) => id !== this.currentProxyId) // Don't delete current proxy
      .sort((a, b) => a[1].lastUsed.getTime() - b[1].lastUsed.getTime());

    const toDelete = sortedProxies.slice(0, sortedProxies.length - this.MAX_PROXIES + 1);

    for (const [id, stats] of toDelete) {
      console.log(`[ProxyManager] Cleaning up old proxy ID ${id}`);
      await deleteProxy(id);
      this.proxies.delete(id);
    }
  }

  /**
   * Get proxy statistics
   */
  getStats(): { total: number; active: number; failed: number } {
    const active = Array.from(this.proxies.values()).filter(
      s => s.consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES
    ).length;
    const failed = this.proxies.size - active;

    return {
      total: this.proxies.size,
      active,
      failed,
    };
  }
}

// Singleton instance
export const proxyManager = new ProxyManager();
