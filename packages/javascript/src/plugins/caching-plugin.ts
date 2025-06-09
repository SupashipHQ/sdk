import { DarkFeaturePlugin, PluginConfig } from "./types";
import { FeatureContext, FeatureValue } from "../types";

export interface CacheEntry {
  value: any;
  timestamp: number;
  ttl: number;
}

export interface CachingPluginConfig extends PluginConfig {
  storage?: "memory" | "localStorage" | "sessionStorage";
  ttl?: number;
}

export class CachingPlugin implements DarkFeaturePlugin {
  name = "caching";
  private cache: Cache;
  private enabled: boolean;

  constructor(config: CachingPluginConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.cache = new Cache(config.storage, config.ttl);
  }

  private getCacheKey(features: string[], context: FeatureContext): string {
    return `darkfeature:${JSON.stringify({ features, context })}`;
  }

  async beforeGetFeatures(
    featureNames: string[],
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled || !context) return;

    const cacheKey = this.getCacheKey(featureNames, context);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      throw new Error("CACHE_HIT");
    }
  }

  async afterGetFeatures(
    results: Record<string, FeatureValue>,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled || !context) return;

    const featureNames = Object.keys(results);
    const cacheKey = this.getCacheKey(featureNames, context);
    this.cache.set(cacheKey, results);
  }

  async cleanup(): Promise<void> {
    this.cache.clear();
  }
}

class Cache {
  private storage: Storage | Map<string, string>;
  private ttl: number;

  constructor(
    storage: "memory" | "localStorage" | "sessionStorage" = "memory",
    ttl: number = 60000
  ) {
    this.ttl = ttl;
    this.storage = storage === "memory" ? new Map() : window[storage];
  }

  private isStorage(
    storage: Storage | Map<string, string>
  ): storage is Storage {
    return (
      "setItem" in storage && "getItem" in storage && "removeItem" in storage
    );
  }

  set(key: string, value: any): void {
    const entry: CacheEntry = {
      value,
      timestamp: Date.now(),
      ttl: this.ttl,
    };
    const serialized = JSON.stringify(entry);
    if (this.isStorage(this.storage)) {
      this.storage.setItem(key, serialized);
    } else {
      this.storage.set(key, serialized);
    }
  }

  get(key: string): any | null {
    let entry: string | null;
    if (this.isStorage(this.storage)) {
      entry = this.storage.getItem(key);
    } else {
      entry = this.storage.get(key) || null;
    }

    if (!entry) return null;

    const { value, timestamp, ttl } = JSON.parse(entry) as CacheEntry;
    if (Date.now() - timestamp > ttl) {
      this.remove(key);
      return null;
    }

    return value;
  }

  remove(key: string): void {
    if (this.isStorage(this.storage)) {
      this.storage.removeItem(key);
    } else {
      this.storage.delete(key);
    }
  }

  clear(): void {
    if (this.isStorage(this.storage)) {
      const storage = this.storage as Storage;
      Object.keys(storage).forEach((key) => {
        if (key.startsWith("darkfeature:")) {
          storage.removeItem(key);
        }
      });
    } else {
      this.storage.clear();
    }
  }
}
