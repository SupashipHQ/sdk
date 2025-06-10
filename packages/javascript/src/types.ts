import { DarkFeaturePlugin } from './plugins/types'

export interface DarkFeatureConfig {
  apiKey: string
  baseUrl?: string
  context?: FeatureContext
  retry?: RetryConfig
  plugins?: DarkFeaturePlugin[]
}

export interface FeatureContext {
  [key: string]: unknown
}

export interface RetryConfig {
  enabled?: boolean
  maxAttempts?: number
  backoff?: number
}

export interface FeatureOptions {
  fallback?: FeatureValue
  context?: FeatureContext
}

export interface FeaturesOptions {
  features: Record<string, FeatureValue>
  context?: FeatureContext
}

export type FeatureValue = string | number | boolean | null
