import { SupaPlugin } from './plugins/types'
import { SupaToolbarPluginConfig } from './plugins/toolbar-plugin'

export type { SupaToolbarPluginConfig } from './plugins/toolbar-plugin'

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
   * Use `satisfies FeaturesWithFallbacks` for type safety.
   * Defines all feature flags used in the application.
   */
  features: FeaturesWithFallbacks
  /**
   * Default context included with every feature evaluation request.
   * Can be merged/overridden per-call via options.context.
   */
  context: FeatureContext
  /**
   * Optional network configuration allowing you to override API endpoints.
   * If omitted, defaults are used.
   */
  networkConfig?: NetworkConfig
  /**
   * Optional plugins to observe or augment client behavior.
   */
  plugins?: SupaPlugin[]
  /**
   * Toolbar plugin configuration (browser only).
   * - `false`: Disable toolbar (opt-out)
   * - `undefined`: Enable with defaults (enabled: 'auto')
   * - `object`: Custom configuration
   *
   * Default: Enabled in browser with 'auto' mode (shows only on localhost)
   */
  toolbar?: false | SupaToolbarPluginConfig
}
export interface FeatureContext {
  [key: string]: string | number | boolean | null | undefined
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
 * ⚠️ IMPORTANT: Use with `satisfies` operator, NOT type annotation
 *
 * Type representing feature flag definitions with their fallback values.
 * Used to configure the SupaClient with feature flags.
 *
 * **Why `satisfies` over type annotation:**
 * - ✅ `satisfies` preserves exact types ('feature-flag' stays 'feature-flag')
 * - ❌ Type annotation widens types ('feature-flag' becomes string)
 *
 * Supported feature value types:
 * - boolean: simple on/off flags
 * - object: structured configuration data
 * - array: lists of values
 * - null: disabled state
 *
 * @example
 * ```ts
 * import { FeaturesWithFallbacks } from '@supashiphq/sdk-javascript'
 *
 * // ✅ RECOMMENDED: satisfies ✅
 * const features = {
 *   'dark-mode': false,
 *   'ui-config': {
 *     theme: 'light' as const,
 *     showWelcome: true,
 *   },
 * } satisfies FeaturesWithFallbacks
 *
 * // ❌ AVOID: Type annotation ❌
 * const features: FeaturesWithFallbacks = {
 *   'dark-mode': false,
 *   'ui-config': {
 *     theme: 'light',
 *     showWelcome: true,
 *   },
 * }
 * ```
 */
export type FeaturesWithFallbacks = Record<string, FeatureValue>

/**
 * Type alias for widened feature definitions.
 * This is the type that gets stored and used internally.
 */
export type Features<T extends FeaturesWithFallbacks> = WidenFeatures<T>
