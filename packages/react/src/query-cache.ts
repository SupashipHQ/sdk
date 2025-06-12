class QueryCache {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map()
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  getQuery(queryKey: string): unknown {
    const entry = this.cache.get(queryKey)
    return entry ? entry.data : undefined
  }

  isStale(queryKey: string, staleTime: number): boolean {
    const entry = this.cache.get(queryKey)
    if (!entry) return true
    return Date.now() - entry.timestamp > staleTime
  }

  setQuery(queryKey: string, data: unknown, cacheTime: number = 5 * 60 * 1000): void {
    this.cache.set(queryKey, { data, timestamp: Date.now() })

    // Clear previous timer if it exists
    if (this.timers.has(queryKey)) {
      clearTimeout(this.timers.get(queryKey)!)
    }

    // Set new timer for cache expiration
    const timer = setTimeout(() => {
      this.cache.delete(queryKey)
      this.timers.delete(queryKey)
    }, cacheTime)

    this.timers.set(queryKey, timer)
  }

  invalidateQuery(queryKey: string): void {
    this.cache.delete(queryKey)
    if (this.timers.has(queryKey)) {
      clearTimeout(this.timers.get(queryKey)!)
      this.timers.delete(queryKey)
    }
  }

  invalidateQueries(queryKeyPrefix: string): void {
    for (const [key] of this.cache) {
      if (key.startsWith(queryKeyPrefix)) {
        this.invalidateQuery(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
  }
}

// Singleton instance of QueryCache
export const queryCache = new QueryCache()
