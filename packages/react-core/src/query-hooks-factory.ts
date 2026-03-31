import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { UseFocusRefetchEffect } from './focus-types'

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

export interface BaseQueryState<TData = unknown, TError = Error> {
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

export interface QueryState<TData = unknown, TError = Error> extends BaseQueryState<TData, TError> {
  refetch: () => Promise<void>
}

export function getInitialQueryState<TData, TError>(
  initialData?: TData,
  enabled: boolean = true
): BaseQueryState<TData, TError> {
  return {
    status: !enabled ? 'idle' : initialData !== undefined ? 'success' : 'idle',
    data: initialData,
    error: null,
    isLoading: enabled && initialData === undefined,
    isSuccess: initialData !== undefined,
    isError: false,
    isIdle: !enabled || initialData === undefined,
    isFetching: false,
    dataUpdatedAt: initialData !== undefined ? Date.now() : 0,
  }
}

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

export type QueryKey = unknown[]

type QueryAction<TData, TError> =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { data: TData } }
  | { type: 'FETCH_ERROR'; payload: { error: TError } }

function queryReducer<TData, TError>(
  state: BaseQueryState<TData, TError>,
  action: QueryAction<TData, TError>
): BaseQueryState<TData, TError> {
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

class QueryCache {
  /** @internal */
  _entries: Map<string, { data: unknown; timestamp: number }> = new Map()
  /** @internal */
  _timers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  /** @internal */
  _observers: Map<string, Set<() => void>> = new Map()

  getQuery(queryKey: string): unknown {
    const entry = this._entries.get(queryKey)
    return entry ? entry.data : undefined
  }

  isStale(queryKey: string, staleTime: number): boolean {
    const entry = this._entries.get(queryKey)
    if (!entry) return true
    return Date.now() - entry.timestamp > staleTime
  }

  setQuery(queryKey: string, data: unknown, cacheTime: number = 5 * 60 * 1000): void {
    this._entries.set(queryKey, { data, timestamp: Date.now() })

    if (this._timers.has(queryKey)) {
      clearTimeout(this._timers.get(queryKey)!)
    }

    const timer = setTimeout(() => {
      this._entries.delete(queryKey)
      this._timers.delete(queryKey)
    }, cacheTime)

    this._timers.set(queryKey, timer)
  }

  subscribe(queryKey: string, callback: () => void): () => void {
    if (!this._observers.has(queryKey)) {
      this._observers.set(queryKey, new Set())
    }
    this._observers.get(queryKey)!.add(callback)

    return () => {
      const callbacks = this._observers.get(queryKey)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this._observers.delete(queryKey)
        }
      }
    }
  }

  notifyObservers(queryKey: string): void {
    const callbacks = this._observers.get(queryKey)
    if (callbacks) {
      callbacks.forEach(callback => callback())
    }
  }

  invalidateQuery(queryKey: string): void {
    this._entries.delete(queryKey)
    if (this._timers.has(queryKey)) {
      clearTimeout(this._timers.get(queryKey)!)
      this._timers.delete(queryKey)
    }
    this.notifyObservers(queryKey)
  }

  invalidateQueries(queryKeyPrefix: string): void {
    for (const [key] of this._entries) {
      if (key.startsWith(queryKeyPrefix)) {
        this.invalidateQuery(key)
      }
    }
  }

  clear(): void {
    this._entries.clear()
    this._timers.forEach(timer => clearTimeout(timer))
    this._timers.clear()
    this._observers.clear()
  }
}

function stableStringifyQueryKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey, (_, val) => (typeof val === 'function' ? val.toString() : val))
}

/**
 * Creates an isolated query layer (cache + hooks) for a given focus refetch implementation.
 * Each platform SDK calls this once and re-exports the result.
 */
// Inferred return bundles cache, QueryClient class, and hooks; naming it would duplicate the implementation.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- factory return shape is structural
export function createQueryHooks(useFocusRefetchEffect: UseFocusRefetchEffect) {
  const queryCache = new QueryCache()

  class QueryClient {
    /** @internal */
    _backing: QueryCache

    constructor(cache: QueryCache = queryCache) {
      this._backing = cache
    }

    invalidateQueries(queryKey: QueryKey): void {
      const stringifiedKey = stableStringifyQueryKey(queryKey)
      this._backing.invalidateQuery(stringifiedKey)
    }

    invalidateQueriesByPrefix(queryKeyPrefix: QueryKey): void {
      const stringifiedPrefix = stableStringifyQueryKey(queryKeyPrefix)
      this._backing.invalidateQueries(stringifiedPrefix.slice(0, -1))
    }

    clear(): void {
      this._backing.clear()
    }
  }

  const queryClientSingleton = new QueryClient(queryCache)

  function useQueryClient(): QueryClient {
    return queryClientSingleton
  }

  function useQuery<TData = unknown, TError = Error>(
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

    useEffect(() => {
      queryFnRef.current = queryFn
      optionsRef.current = options
    }, [queryFn, options])

    const cachedData = queryCache.getQuery(stringifiedQueryKey)
    const isStale = queryCache.isStale(stringifiedQueryKey, staleTime)

    const initialStateData = cachedData !== undefined ? (cachedData as TData) : initialData
    const initialState = getInitialQueryState<TData, TError>(initialStateData, enabled)
    const [state, dispatch] = useReducer(queryReducer<TData, TError>, initialState)

    const executeFetch = useCallback(async (): Promise<void> => {
      if (!enabled) return

      dispatch({ type: 'FETCH_START' })

      let retryCount = 0
      const maxRetries = typeof retry === 'boolean' ? (retry ? 3 : 0) : retry

      const runQuery = async (): Promise<void> => {
        try {
          const data = await queryFnRef.current()

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
            await new Promise(resolve => setTimeout(resolve, retryDelay))
            return runQuery()
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

      await runQuery()
    }, [enabled, stringifiedQueryKey, retry, retryDelay, cacheTime])

    useEffect(() => {
      if (enabled && (isStale || state.data === undefined)) {
        void executeFetch()
      }
    }, [enabled, isStale, executeFetch, state.data])

    useFocusRefetchEffect({
      refetchOnWindowFocus,
      enabled,
      isStale,
      executeFetch,
    })

    useEffect(() => {
      const unsubscribe = queryCache.subscribe(stringifiedQueryKey, () => {
        void executeFetch()
      })

      return unsubscribe
    }, [stringifiedQueryKey, executeFetch])

    const refetch = useCallback(async () => {
      await executeFetch()
    }, [executeFetch])

    return {
      ...state,
      refetch,
    }
  }

  return {
    queryCache,
    QueryClient,
    useQueryClient,
    useQuery,
    getInitialQueryState,
  }
}
