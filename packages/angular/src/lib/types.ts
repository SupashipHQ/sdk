import { FeatureValue } from '@darkfeature/sdk-javascript'

export type { DarkFeatureConfig } from '@darkfeature/sdk-javascript'

export interface FeatureOptions {
  fallback?: FeatureValue
  context?: Record<string, unknown>
  shouldFetch?: boolean
}

export interface FeaturesOptions {
  features: Record<string, FeatureValue>
  context?: Record<string, unknown>
  shouldFetch?: boolean
}

export interface QueryOptions<T = unknown> {
  enabled?: boolean
  retry?: number | boolean
  retryDelay?: number
  staleTime?: number
  cacheTime?: number
  refetchOnWindowFocus?: boolean
  initialData?: T
}

export interface QueryResult<T = unknown> {
  data: T | undefined
  error: Error | null
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  isIdle: boolean
  isFetching: boolean
  status: 'idle' | 'loading' | 'success' | 'error'
}
