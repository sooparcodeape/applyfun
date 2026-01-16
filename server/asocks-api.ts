/**
 * ASOCKS API Client
 * Documentation: https://docs.asocks.com/en/
 */

const ASOCKS_API_BASE = 'https://api.asocks.com/v2';
const ASOCKS_API_KEY = process.env.ASOCKS_API_KEY || '';

export interface AsocksProxy {
  id: number;
  name: string;
  proxy: string; // Format: "ip:port"
  template: string; // Format: "http://username:password@ip:port"
  login: string;
  password: string;
  countryCode: string;
  status: number; // 1 = active, 2 = archived
  created_at: string;
  spent_traffic_month: number;
  refresh_link: string;
}

export interface AsocksProxyListResponse {
  success: boolean;
  message: {
    current_page: number;
    data: AsocksProxy[];
    total: number;
  };
}

export interface AsocksCreateProxyResponse {
  success: boolean;
  data: AsocksProxy[];
}

/**
 * List all proxy ports
 */
export async function listProxies(page = 1, perPage = 50): Promise<AsocksProxy[]> {
  if (!ASOCKS_API_KEY) {
    console.log('[ASOCKS] No API key configured');
    return [];
  }

  try {
    const url = `${ASOCKS_API_BASE}/proxy/ports?apiKey=${ASOCKS_API_KEY}&page=${page}&per_page=${perPage}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`ASOCKS API error: ${response.status} ${response.statusText}`);
    }

    const data: AsocksProxyListResponse = await response.json();
    
    if (!data.success || !data.message?.data) {
      console.log('[ASOCKS] No proxies found');
      return [];
    }

    // Filter only active proxies (status = 1)
    const activeProxies = data.message.data.filter(p => p.status === 1);
    console.log(`[ASOCKS] Found ${activeProxies.length} active proxies`);
    return activeProxies;
  } catch (error: any) {
    console.error('[ASOCKS] Failed to list proxies:', error.message);
    return [];
  }
}

/**
 * Create a new proxy port
 * Note: Requires type_id and proxy_type_id which we need to discover from existing proxies
 */
export async function createProxy(countryCode = 'US', name = 'job-automation'): Promise<AsocksProxy | null> {
  if (!ASOCKS_API_KEY) {
    console.log('[ASOCKS] No API key configured');
    return null;
  }

  try {
    // First, get existing proxies to extract type_id and proxy_type_id
    const existingProxies = await listProxies();
    if (existingProxies.length === 0) {
      console.error('[ASOCKS] Cannot create proxy: no existing proxies to copy type IDs from');
      return null;
    }

    // Use the first proxy's type IDs as template
    const template = existingProxies[0];
    
    const url = `${ASOCKS_API_BASE}/proxy/create-port?apiKey=${ASOCKS_API_KEY}`;
    const body = {
      country_code: countryCode,
      name: `${name}-${Date.now()}`,
      ttl: 1, // Time to live in days
      // Copy type IDs from existing proxy (required by API)
      type_id: 1, // Residential type (inferred from docs)
      proxy_type_id: 2, // Mobile residential (from user's existing proxies)
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ASOCKS API error: ${response.status} - ${errorText}`);
    }

    const data: AsocksCreateProxyResponse = await response.json();
    
    if (!data.success || !data.data || data.data.length === 0) {
      console.error('[ASOCKS] Failed to create proxy:', data);
      return null;
    }

    const newProxy = data.data[0];
    console.log(`[ASOCKS] Created new proxy: ${newProxy.proxy} (${newProxy.countryCode})`);
    return newProxy;
  } catch (error: any) {
    console.error('[ASOCKS] Failed to create proxy:', error.message);
    return null;
  }
}

/**
 * Delete a proxy port
 */
export async function deleteProxy(proxyId: number): Promise<boolean> {
  if (!ASOCKS_API_KEY) {
    console.log('[ASOCKS] No API key configured');
    return false;
  }

  try {
    const url = `${ASOCKS_API_BASE}/proxy/delete-port?apiKey=${ASOCKS_API_KEY}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: proxyId }),
    });

    if (!response.ok) {
      throw new Error(`ASOCKS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[ASOCKS] Deleted proxy ID ${proxyId}`);
    return data.success === true;
  } catch (error: any) {
    console.error(`[ASOCKS] Failed to delete proxy ${proxyId}:`, error.message);
    return false;
  }
}

/**
 * Refresh proxy external IP
 */
export async function refreshProxy(proxyId: number): Promise<boolean> {
  if (!ASOCKS_API_KEY) {
    console.log('[ASOCKS] No API key configured');
    return false;
  }

  try {
    const url = `${ASOCKS_API_BASE}/proxy/refresh/${proxyId}?apiKey=${ASOCKS_API_KEY}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`ASOCKS API error: ${response.status} ${response.statusText}`);
    }

    console.log(`[ASOCKS] Refreshed proxy ID ${proxyId}`);
    return true;
  } catch (error: any) {
    console.error(`[ASOCKS] Failed to refresh proxy ${proxyId}:`, error.message);
    return false;
  }
}
