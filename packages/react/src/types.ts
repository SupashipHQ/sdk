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
 *   interface Features extends FeaturesFromObject<typeof FEATURE_FLAGS> {}
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToFeatures<T extends Record<string, any>> = {
  [K in keyof T]: { value: T[K] }
}

/**
 * Helper function to define feature flags with type safety.
 * This is a no-op at runtime but provides type inference for TypeScript.
 *
 * @deprecated Use `createFeatures` instead
 *
 * @example
 * ```ts
 * // lib/features.ts
 * import { defineFeatureFlags } from '@supashiphq/sdk-react'
 *
 * export const FEATURE_FLAGS = defineFeatureFlags({
 *   'landing.verification-links': [] as { element: string }[],
 *   'feature.activity-log': false as boolean,
 *   'ui-config': { theme: 'light' as 'light' | 'dark' },
 * })
 *
 * // lib/features.d.ts
 * import '@supashiphq/sdk-react'
 * import type { FEATURE_FLAGS } from './features'
 *
 * declare module '@supashiphq/sdk-react' {
 *   interface Features extends FeaturesFromObject<typeof FEATURE_FLAGS> {}
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineFeatureFlags<T extends Record<string, any>>(flags: T): T {
  return flags
}

/**
 * Creates and registers feature flags for type-safe usage with hooks.
 * Use this function to define your feature flags, then augment the Features interface in one line.
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
 * export const features = createFeatures({
 *   'landing.verification-links': [] as { element: string }[],
 *   'feature.activity-log': false as boolean,
 *   'ui-config': {
 *     theme: 'light' as 'light' | 'dark',
 *     showWelcome: true,
 *   },
 *   'disabled-feature': null,
 * })
 *
 * // Single-line type registration (can be in same file)
 * declare module '@supashiphq/sdk-react' { interface Features extends typeof features {} }
 * ```
 *
 * Now `useFeature` will automatically have full type safety!
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// export function createFeatures<T extends Record<string, any>>(flags: T): FeaturesFromObject<T> {
//   // At runtime, return the flags as-is (they're already in the correct format for the config)
//   return flags as FeaturesFromObject<T>
// }

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
 * Method 1: Using createFeatures helper (recommended)
 * ```ts
 * // lib/features.ts
 * import { createFeatures } from '@supashiphq/sdk-react'
 *
 * export const features = createFeatures({
 *   'dark-mode': false as boolean,
 *   'ui-config': {
 *     variant: 'a' as 'a' | 'b',
 *     showWelcome: true,
 *   },
 *   'allowed-features': ['feature-a', 'feature-b'],
 * })
 *
 * // Single-line type registration
 * declare module '@supashiphq/sdk-react' { interface Features extends typeof features {} }
 * ```
 *
 * Method 2: Manual declaration
 * ```ts
 * declare module '@supashiphq/sdk-react' {
 *   interface Features {
 *     'dark-mode': { value: boolean }
 *     'ui-config': { value: { variant: 'a' | 'b', showWelcome: boolean } }
 *     'allowed-features': { value: string[] }
 *   }
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
      [K in keyof Features]: Omit<QueryState<ExtractFeatureValue<Features[K]> | null>, 'data'> & {
        feature: ExtractFeatureValue<Features[K]> | null
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
