import { ref, computed, watch, onBeforeUnmount, Ref, ComputedRef } from 'vue'

// Query status types
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

// Query state interface
export interface QueryState<TData = unknown, TError = Error> {
  status: Ref<QueryStatus>
  data: Ref<TData | undefined>
  error: Ref<TError | null>
  isLoading: ComputedRef<boolean>
  isSuccess: ComputedRef<boolean>
  isError: ComputedRef<boolean>
  isIdle: ComputedRef<boolean>
  isFetching: Ref<boolean>
  dataUpdatedAt: Ref<number>
  refetch: () => Promise<void>
}

// Query options
export interface UseQueryOptions<TData = unknown, TError = Error> {
  enabled?: boolean
  retry?: number | boolean
  retryDelay?: number
  staleTime?: number
  cacheTime?: number
  refetchOnWindowFocus?: boolean
  initialData?: TData
  onSuccess?: (data: TData) => void
  onError?: (error: TError) => void
  onSettled?: (data: TData | undefined, error: TError | null) => void
}

// Query key type
export type QueryKey = unknown[]

// Cache implementation
class QueryCache {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map()
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private observers: Map<string, Set<() => void>> = new Map()

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

  subscribe(queryKey: string, callback: () => void): () => void {
    if (!this.observers.has(queryKey)) {
      this.observers.set(queryKey, new Set())
    }
    this.observers.get(queryKey)!.add(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.observers.get(queryKey)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.observers.delete(queryKey)
        }
      }
    }
  }

  private notifyObservers(queryKey: string): void {
    const callbacks = this.observers.get(queryKey)
    if (callbacks) {
      callbacks.forEach(callback => callback())
    }
  }

  invalidateQuery(queryKey: string): void {
    this.cache.delete(queryKey)
    if (this.timers.has(queryKey)) {
      clearTimeout(this.timers.get(queryKey)!)
      this.timers.delete(queryKey)
    }
    // Notify observers to trigger refetch
    this.notifyObservers(queryKey)
  }

  invalidateQueries(queryKeyPrefix: string): void {
    const keysToInvalidate: string[] = []
    for (const [key] of this.cache) {
      if (key.startsWith(queryKeyPrefix)) {
        keysToInvalidate.push(key)
      }
    }
    // Invalidate all matching keys
    keysToInvalidate.forEach(key => this.invalidateQuery(key))
  }

  updateQuery(queryKey: string, data: unknown): void {
    // Update cache without invalidating (no refetch)
    this.cache.set(queryKey, { data, timestamp: Date.now() })
    // Notify observers to update UI
    this.notifyObservers(queryKey)
  }

  clear(): void {
    this.cache.clear()
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
    this.observers.clear()
  }
}

// Singleton instance of QueryCache
export const queryCache = new QueryCache()

// Query Client class for managing queries
export class QueryClient {
  private cache: QueryCache

  constructor(cache: QueryCache = queryCache) {
    this.cache = cache
  }

  /**
   * Invalidates a specific query by its query key
   * This will remove it from cache and trigger refetch in all components using this query
   */
  invalidateQueries(queryKey: QueryKey): void {
    const stringifiedKey = stableStringifyQueryKey(queryKey)
    this.cache.invalidateQuery(stringifiedKey)
  }

  /**
   * Invalidates all queries matching a partial query key
   * For example, invalidateQueriesByPrefix(['feature']) will invalidate all feature queries
   */
  invalidateQueriesByPrefix(queryKeyPrefix: QueryKey): void {
    const stringifiedPrefix = stableStringifyQueryKey(queryKeyPrefix)
    this.cache.invalidateQueries(stringifiedPrefix.slice(0, -1)) // Remove closing bracket
  }

  /**
   * Updates a specific query's cached data without invalidating
   * This is useful for local updates like toolbar overrides
   */
  setQueryData(queryKey: QueryKey, data: unknown): void {
    const stringifiedKey = stableStringifyQueryKey(queryKey)
    this.cache.updateQuery(stringifiedKey, data)
  }

  /**
   * Clears all queries from the cache
   */
  clear(): void {
    this.cache.clear()
  }
}

// Singleton instance of QueryClient
const queryClient = new QueryClient()

// Composable to access the query client
export function useQueryClient(): QueryClient {
  return queryClient
}

// Stable stringify for query keys
function stableStringifyQueryKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey, (_, val) => (typeof val === 'function' ? val.toString() : val))
}

// The useQuery composable
export function useQuery<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options: UseQueryOptions<TData, TError> = {}
): QueryState<TData, TError> {
  const {
    enabled = true,
    retry = 3,
    retryDelay = 1000,
    staleTime = 0,
    cacheTime = 5 * 60 * 1000,
    refetchOnWindowFocus = true,
    initialData,
    onSuccess,
    onError,
    onSettled,
  } = options

  const stringifiedQueryKey = stableStringifyQueryKey(queryKey)

  // Initialize state from cache or with default
  const cachedData = queryCache.getQuery(stringifiedQueryKey)
  const initialStateData = cachedData !== undefined ? (cachedData as TData) : initialData

  // Reactive state
  const status = ref<QueryStatus>(
    !enabled ? 'idle' : initialStateData !== undefined ? 'success' : 'idle'
  ) as Ref<QueryStatus>
  const data = ref<TData | undefined>(initialStateData) as Ref<TData | undefined>
  const error = ref<TError | null>(null) as Ref<TError | null>
  const isFetching = ref(false)
  const dataUpdatedAt = ref(initialStateData !== undefined ? Date.now() : 0)

  // Computed properties
  const isLoading = computed(() => status.value === 'loading')
  const isSuccess = computed(() => status.value === 'success')
  const isError = computed(() => status.value === 'error')
  const isIdle = computed(() => status.value === 'idle')

  const executeFetch = async (): Promise<void> => {
    if (!enabled) return

    status.value = data.value === undefined ? 'loading' : status.value
    isFetching.value = true

    let retryCount = 0
    const maxRetries = typeof retry === 'boolean' ? (retry ? 3 : 0) : retry

    const runQuery = async (): Promise<void> => {
      try {
        const result = await queryFn()

        // Update cache
        queryCache.setQuery(stringifiedQueryKey, result, cacheTime)

        data.value = result
        error.value = null
        status.value = 'success'
        dataUpdatedAt.value = Date.now()
        isFetching.value = false

        if (onSuccess) {
          onSuccess(result)
        }

        if (onSettled) {
          onSettled(result, null)
        }
      } catch (err) {
        const queryError = err as TError

        if (retryCount < maxRetries) {
          retryCount++
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return runQuery()
        }

        error.value = queryError
        status.value = 'error'
        isFetching.value = false

        if (onError) {
          onError(queryError)
        }

        if (onSettled) {
          onSettled(undefined, queryError)
        }
      }
    }

    await runQuery()
  }

  const refetch = async (): Promise<void> => {
    await executeFetch()
  }

  // Check if data is stale
  const isStale = queryCache.isStale(stringifiedQueryKey, staleTime)

  // Execute query on mount and when dependencies change
  if (enabled && (isStale || data.value === undefined)) {
    executeFetch()
  }

  // Watch for enabled changes
  watch(
    () => enabled,
    newEnabled => {
      if (
        newEnabled &&
        (queryCache.isStale(stringifiedQueryKey, staleTime) || data.value === undefined)
      ) {
        executeFetch()
      }
    }
  )

  // Handle window focus
  if (refetchOnWindowFocus) {
    const handleFocus = (): void => {
      if (enabled && queryCache.isStale(stringifiedQueryKey, staleTime)) {
        executeFetch()
      }
    }

    window.addEventListener('focus', handleFocus)

    onBeforeUnmount(() => {
      window.removeEventListener('focus', handleFocus)
    })
  }

  // Subscribe to cache invalidations
  const unsubscribe = queryCache.subscribe(stringifiedQueryKey, () => {
    // When query is invalidated, force immediate refetch
    // This is important for toolbar override changes
    executeFetch()
  })

  onBeforeUnmount(() => {
    unsubscribe()
  })

  return {
    status,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    isIdle,
    isFetching,
    dataUpdatedAt,
    refetch,
  }
}
