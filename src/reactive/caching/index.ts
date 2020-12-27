// Unique symbol to store cached getters information
export const GETTERS_CACHE_SYMBOL = Symbol("getters-cache");

// Cached getter with it's dependencies
export interface CacheEntry {
  dependentProps: Set<String>;
  val: any;
}

// Generic cache interface for getters
export interface GettersCache {
  // Get single item from cache
  get(getter: string): CacheEntry | undefined;
  // Add new item into cache
  add(getter: string, deps: string[]): void;
  // Remove item from cache
  remove(getter: string): void;
  // Add prop as dependency to getter
  addDependency(getter: string, prop: string): void;
  // Invalidates cache for items that depends from prop
  invalidate(prop: string): void;
}
