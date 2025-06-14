import { ref, computed, onUnmounted, Ref } from 'vue'

// Query status types
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

// Query state interface
export interface QueryState<TData = unknown, TError = Error> {
  status: Ref<QueryStatus>
  data: Ref<TData | undefined>
  error: Ref<TError | null>
  isLoading: Ref<boolean>
  isSuccess: Ref<boolean>
  isError: Ref<boolean>
  isIdle: Ref<boolean>
  isFetching: Ref<boolean>
  dataUpdatedAt: Ref<number>
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

  // Check cache for initial data
  const cachedData = queryCache.getQuery(stringifiedQueryKey)
  const isStale = queryCache.isStale(stringifiedQueryKey, staleTime)
  const initialStateData = cachedData !== undefined ? (cachedData as TData) : initialData

  // Reactive state
  const status = ref<QueryStatus>(
    !enabled ? 'idle' : initialStateData !== undefined ? 'success' : 'idle'
  )
  const data = ref<TData | undefined>(initialStateData)
  const error = ref<TError | null>(null)
  const dataUpdatedAt = ref<number>(initialStateData !== undefined ? Date.now() : 0)
  const isFetching = ref<boolean>(false)

  // Computed properties
  const isLoading = computed(() => status.value === 'loading')
  const isSuccess = computed(() => status.value === 'success')
  const isError = computed(() => status.value === 'error')
  const isIdle = computed(() => status.value === 'idle')

  let retryCount = 0
  let abortController: AbortController | null = null

  const runQuery = async (): Promise<void> => {
    if (!enabled || isFetching.value) return

    // Set up abort controller for this request
    abortController = new AbortController()

    try {
      isFetching.value = true

      // Set loading state only if we don't have data
      if (data.value === undefined) {
        status.value = 'loading'
      }

      const result = await queryFn()

      // Check if the request was aborted
      if (abortController.signal.aborted) {
        return
      }

      // Success
      status.value = 'success'
      data.value = result
      error.value = null
      dataUpdatedAt.value = Date.now()
      retryCount = 0

      // Cache the result
      queryCache.setQuery(stringifiedQueryKey, result, cacheTime)

      // Call success callback
      onSuccess?.(result)
      onSettled?.(result, null)
    } catch (err) {
      // Check if the request was aborted
      if (abortController.signal.aborted) {
        return
      }

      const errorObj = err as TError

      // Handle retry logic
      const shouldRetry = typeof retry === 'boolean' ? retry : retryCount < retry
      if (shouldRetry) {
        retryCount++
        setTimeout(() => runQuery(), retryDelay)
        return
      }

      // Error
      status.value = 'error'
      error.value = errorObj

      // Call error callback
      onError?.(errorObj)
      onSettled?.(data.value, errorObj)
    } finally {
      isFetching.value = false
      abortController = null
    }
  }

  // Initial fetch if enabled and data is stale or missing
  if (enabled && (isStale || cachedData === undefined)) {
    runQuery()
  }

  // Handle window focus refetch
  const handleFocus = (): void => {
    if (refetchOnWindowFocus && enabled && queryCache.isStale(stringifiedQueryKey, staleTime)) {
      runQuery()
    }
  }

  // Set up focus listener
  if (refetchOnWindowFocus && typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus)
  }

  // Cleanup function
  onUnmounted(() => {
    if (abortController) {
      abortController.abort()
    }
    if (refetchOnWindowFocus && typeof window !== 'undefined') {
      window.removeEventListener('focus', handleFocus)
    }
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
  }
}
