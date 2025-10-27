import type { FeatureValue } from '@supashiphq/sdk-javascript'
import type { QueryState } from './query'

export type {
  SupaClientConfig as SupaProviderConfig,
  SupaPlugin,
  FeatureValue,
} from '@supashiphq/sdk-javascript'

/**
 * Helper type to convert a feature flags object into the Features interface format.
 *
 * Supported feature value types:
 * - boolean: simple on/off flags
 * - object: structured configuration data
 * - array: lists of values
 * - null: disabled state
 *
 * @example
 * ```ts
 * export const FEATURE_FLAGS = {
 *   'landing.verification-links': [] as { element: string }[],
 *   'feature.activity-log': false as boolean,
 *   'ui-config': {
 *     theme: 'light' as 'light' | 'dark',
 *     showWelcome: true,
 *   },
 * }
 *
 * declare module '@supashiphq/sdk-react' {
 *   interface Features extends FeaturesFromConfig<typeof FEATURE_FLAGS> {}
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FeaturesFromConfig<T extends Record<string, any>> = {
  [K in keyof T]: { value: T[K] }
}

/**
 * Interface to be augmented by users for type-safe feature flags.
 *
 * Supported feature value types:
 * - boolean: simple on/off flags
 * - object: structured configuration data
 * - array: lists of values
 * - null: disabled state
 *
 * @example
 * ```ts
 * // lib/features.ts
 * import { createFeatures } from '@supashiphq/sdk-react'
 *
 * export const FEATURE_FLAGS = createFeatures({
 *   'dark-mode': false,
 *   'ui-config': {
 *     variant: 'a' as 'a' | 'b',
 *     showWelcome: true,
 *   },
 *   'allowed-features': ['feature-a', 'feature-b'],
 * })
 *
 * declare module '@supashiphq/sdk-react' {
 *   interface Features extends FeaturesFromConfig<typeof FEATURE_FLAGS> {}
 * }
 * ```
 */
export interface Features {
  // This interface is intentionally empty and should be augmented via declaration merging
}

/**
 * Extract the feature value type from a feature definition
 */
type ExtractFeatureValue<T> = T extends { value: infer V } ? V : FeatureValue

/**
 * Return type for useFeature hook with proper typing based on feature key
 */
export type TypedFeatures = keyof Features extends never
  ? {
      [key: string]: Omit<QueryState<FeatureValue | null>, 'data'> & {
        feature: FeatureValue | null
      }
    }
  : {
      [K in keyof Features]: Omit<QueryState<ExtractFeatureValue<Features[K]>>, 'data'> & {
        feature: ExtractFeatureValue<Features[K]>
      }
    }

export type FeatureKey = keyof Features extends never ? string : keyof Features

export interface UseFeatureOptions {
  context?: Record<string, unknown>
  shouldFetch?: boolean
}

export interface UseFeaturesOptions {
  context?: Record<string, unknown>
  shouldFetch?: boolean
}
