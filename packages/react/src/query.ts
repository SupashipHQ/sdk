import { useCallback, useEffect, useReducer, useRef } from 'react'

// Query status types
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

// Query state
export interface QueryState<TData = unknown, TError = Error> {
  status: QueryStatus
  data: TData | undefined
  error: TError | null
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  isIdle: boolean
  isFetching: boolean
  dataUpdatedAt: number
}

// Initial state factory for queries
export function getInitialQueryState<TData, TError>(
  initialData?: TData
): QueryState<TData, TError> {
  return {
    status: initialData !== undefined ? 'success' : 'idle',
    data: initialData,
    error: null,
    isLoading: initialData === undefined,
    isSuccess: initialData !== undefined,
    isError: false,
    isIdle: initialData === undefined,
    isFetching: false,
    dataUpdatedAt: initialData !== undefined ? Date.now() : 0,
  }
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

// Actions for the query reducer
type QueryAction<TData, TError> =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { data: TData } }
  | { type: 'FETCH_ERROR'; payload: { error: TError } }

// Reducer for query state
function queryReducer<TData, TError>(
  state: QueryState<TData, TError>,
  action: QueryAction<TData, TError>
): QueryState<TData, TError> {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        status: state.data === undefined ? 'loading' : state.status,
        isLoading: state.data === undefined,
        isIdle: false,
        isFetching: true,
      }
    case 'FETCH_SUCCESS':
      return {
        ...state,
        status: 'success',
        data: action.payload.data,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
        isIdle: false,
        isFetching: false,
        dataUpdatedAt: Date.now(),
      }
    case 'FETCH_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.payload.error,
        isLoading: false,
        isSuccess: !!state.data,
        isError: true,
        isIdle: false,
        isFetching: false,
      }
    default:
      return state
  }
}

// Cache implementation
class QueryCache {
  private cache: Map<string, unknown> = new Map()
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  getQuery(queryKey: string): unknown {
    return this.cache.get(queryKey)
  }

  setQuery(queryKey: string, data: unknown, cacheTime: number = 5 * 60 * 1000): void {
    this.cache.set(queryKey, data)

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

// The useQuery hook
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
  } = options

  const stringifiedQueryKey = stableStringifyQueryKey(queryKey)
  const queryFnRef = useRef(queryFn)
  const optionsRef = useRef(options)

  // Update refs when dependencies change
  useEffect(() => {
    queryFnRef.current = queryFn
    optionsRef.current = options
  }, [queryFn, options])

  // Initialize state from cache or with default
  const initialState = getInitialQueryState<TData, TError>(initialData)
  const [state, dispatch] = useReducer(queryReducer<TData, TError>, initialState)

  const executeFetch = useCallback(async () => {
    if (!enabled) return

    dispatch({ type: 'FETCH_START' })

    let retryCount = 0
    const maxRetries = typeof retry === 'boolean' ? (retry ? 3 : 0) : retry

    const runQuery = async (): Promise<void> => {
      try {
        const data = await queryFnRef.current()

        // Update cache
        queryCache.setQuery(stringifiedQueryKey, data, cacheTime)

        dispatch({ type: 'FETCH_SUCCESS', payload: { data } })

        if (optionsRef.current.onSuccess) {
          optionsRef.current.onSuccess(data)
        }

        if (optionsRef.current.onSettled) {
          optionsRef.current.onSettled(data, null)
        }
      } catch (err) {
        const error = err as TError

        if (retryCount < maxRetries) {
          retryCount++
          setTimeout(runQuery, retryDelay)
          return
        }

        dispatch({ type: 'FETCH_ERROR', payload: { error } })

        if (optionsRef.current.onError) {
          optionsRef.current.onError(error)
        }

        if (optionsRef.current.onSettled) {
          optionsRef.current.onSettled(undefined, error)
        }
      }
    }

    runQuery()
  }, [enabled, stringifiedQueryKey, retry, retryDelay, cacheTime])

  // Initial fetch and refetch on dependencies change
  useEffect(() => {
    if (!enabled) return

    // Check cache first
    const cachedData = queryCache.getQuery(stringifiedQueryKey)
    if (cachedData && staleTime > 0) {
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { data: cachedData as TData },
      })
    }

    executeFetch()

    // Handle refetch on window focus
    const handleFocus = (): void => {
      if (refetchOnWindowFocus) {
        executeFetch()
      }
    }

    if (refetchOnWindowFocus && typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus)
    }

    return () => {
      if (refetchOnWindowFocus && typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [executeFetch, enabled, stringifiedQueryKey, staleTime, refetchOnWindowFocus])

  return state
}
