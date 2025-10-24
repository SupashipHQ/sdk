import { SupaPlugin } from './plugins/types'

export interface SupaClientConfig {
  /**
   * API key used to authenticate requests to Supaship services.
   * Typically created in your project settings.
   */
  apiKey: string
  /**
   * Environment identifier used for feature flag evaluation (e.g. "production", "staging").
   */
  environment: string
  /**
   * Feature definitions with their fallback values.
   * Must be created using createFeatures() for type safety.
   * Defines all feature flags used in the application.
   */
  features: Features<Record<string, FeatureValue>>
  /**
   * Default context included with every feature evaluation request.
   * Can be merged/overridden per-call via options.context.
   */
  context?: FeatureContext
  /**
   * Optional network configuration allowing you to override API endpoints.
   * If omitted, defaults are used.
   */
  networkConfig?: NetworkConfig
  /**
   * Optional plugins to observe or augment client behavior.
   */
  plugins?: SupaPlugin[]
}
export interface FeatureContext {
  [key: string]: unknown
}

export interface NetworkConfig {
  /**
   * Fully-qualified URL to the features evaluation endpoint.
   * Example: "https://edge.supaship.com/v1/features"
   */
  featuresAPIUrl?: string
  /**
   * Fully-qualified URL to the events/analytics endpoint.
   * Example: "https://edge.supaship.com/v1/events"
   */
  eventsAPIUrl?: string
  /**
   * Retry behavior for network requests (exponential backoff).
   */
  retry?: RetryConfig
  /**
   * Request timeout in milliseconds. If provided, requests will be aborted after this duration.
   */
  requestTimeoutMs?: number
  /**
   * Optional fetch implementation to use (e.g., node-fetch for Node < 18).
   */
  fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export interface RetryConfig {
  enabled?: boolean
  maxAttempts?: number
  backoff?: number
}

/**
 * Supported feature flag value types.
 * - boolean: true/false flags
 * - object: structured configuration data
 * - array: lists of items
 * - null: disabled/empty state
 */
export type FeatureValue = boolean | null | Record<string, unknown> | unknown[]

/**
 * Widens boolean literals to boolean type while preserving other types.
 * This allows `false` and `true` to be inferred as `boolean` for better ergonomics.
 * @internal
 */
export type WidenFeatureValue<T> = T extends boolean
  ? boolean
  : T extends readonly unknown[]
    ? T extends readonly (infer U)[]
      ? U[]
      : T
    : T

/**
 * Widens all feature values in a features object.
 * @internal
 */
export type WidenFeatures<T extends Record<string, FeatureValue>> = {
  [K in keyof T]: WidenFeatureValue<T[K]>
}

/**
 * Brand symbol to ensure features are created via createFeatures()
 * @internal
 */
declare const __supaship: unique symbol

/**
 * Branded type for features created via createFeatures()
 * This ensures type safety and prevents raw objects from being passed to SupaClient
 * @internal
 */
export type Features<T extends Record<string, FeatureValue>> = WidenFeatures<T> & {
  readonly [__supaship]: 'use createFeatures() to create features'
}
