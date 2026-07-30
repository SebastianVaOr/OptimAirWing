export interface DbAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

const memoryStore = new Map<string, string>();

export function createDbAdapter(): DbAdapter {
  if (process.env.VERCEL_KV_URL || process.env.KV_URL) {
    return new VercelKvAdapter();
  }
  return new MemoryAdapter();
}

class MemoryAdapter implements DbAdapter {
  async get(key: string): Promise<string | null> {
    return memoryStore.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);
  }
  async del(key: string): Promise<void> {
    memoryStore.delete(key);
  }
  async exists(key: string): Promise<boolean> {
    return memoryStore.has(key);
  }
}

class VercelKvAdapter implements DbAdapter {
  private getClient(): { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<void>; del: (k: string) => Promise<void> } | null {
    try {
      const { kv } = require('@vercel/kv');
      return kv;
    } catch {
      return null;
    }
  }

  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    if (!client) return new MemoryAdapter().get(key);
    return client.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    const client = this.getClient();
    if (!client) return new MemoryAdapter().set(key, value);
    return client.set(key, value);
  }

  async del(key: string): Promise<void> {
    const client = this.getClient();
    if (!client) return new MemoryAdapter().del(key);
    return client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }
}

export const dbAdapter = createDbAdapter();
