import { FeatureValue } from '@darkfeature/sdk-javascript'

export type { DarkFeatureConfig, DarkFeaturePlugin } from '@darkfeature/sdk-javascript'

export interface UseFeatureOptions {
  fallback?: FeatureValue
  context?: Record<string, unknown>
  shouldFetch?: boolean
}

export interface UseFeaturesOptions {
  features: Record<string, FeatureValue>
  context?: Record<string, unknown>
  shouldFetch?: boolean
}
