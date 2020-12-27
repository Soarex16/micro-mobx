import { GettersCache, CacheEntry } from "./index";

/**
 * Simple getters cache implementation based on Map
 */
class MapCache implements GettersCache {
  private _cache: Map<string, CacheEntry> = new Map<string, CacheEntry>();

  get(getter: string): CacheEntry | undefined {
    return this._cache.get(getter);
  }

  add(getter: string, deps: string[]): void {
    this._cache.set(getter, {
      dependentProps: new Set(deps),
      val: undefined
    });
  }

  remove(getter: string): void {
    this._cache.delete(getter);
  }

  addDependency(getter: string, prop: string): void {
    const item = this.get(getter);

    if (item) {
      item.dependentProps.add(prop);
    }
  }

  invalidate(prop: string): void {
    this._cache.forEach((cacheEntry) => {
      if (cacheEntry.dependentProps.has(prop)) {
        cacheEntry.val = undefined;
      }
    });
  }
}

export default MapCache;
