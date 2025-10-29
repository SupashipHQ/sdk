import type {
  FeatureValue,
  FeatureContext,
  FeaturesWithFallbacks,
} from '@supashiphq/sdk-javascript'
import type { QueryState } from './query'

export type {
  SupaClientConfig as SupaProviderConfig,
  SupaPlugin,
  FeatureValue,
  FeatureContext,
  SupaToolbarPluginConfig,
  SupaToolbarPosition,
} from '@supashiphq/sdk-javascript'

/**
 * ⚠️ IMPORTANT: Use with `satisfies` operator, NOT type annotation
 *
 * Re-exported from @supashiphq/sdk-javascript for convenience.
 * See the main package documentation for full details.
 *
 * @example
 * ```ts
 * // ✅ RECOMMENDED: satisfies
 * const features = {
 *   'dark-mode': false,
 *   theme: { mode: 'light' as const }
 * } satisfies FeaturesWithFallbacks
 *
 * // ❌ AVOID: Type annotation
 * const features: FeaturesWithFallbacks = {
 *   'dark-mode': false,
 *   theme: { mode: 'light' }
 * }
 * ```
 */
export type { FeaturesWithFallbacks } from '@supashiphq/sdk-javascript'

/**
 * Helper type to infer feature types from your feature config for module augmentation.
 *
 * ⚠️ Remember: Define features with `satisfies FeaturesWithFallbacks`, not type annotation
 *
 * @example
 * ```ts
 * import { FeaturesWithFallbacks, InferFeatures } from '@supashiphq/sdk-react'
 *
 * // ✅ Use satisfies to preserve literal types
 * export const FEATURE_FLAGS = {
 *   'dark-mode': false,
 *   'ui-config': { variant: 'a' as const }
 * } satisfies FeaturesWithFallbacks
 *
 * declare module '@supashiphq/sdk-react' {
 *   interface Features extends InferFeatures<typeof FEATURE_FLAGS> {}
 * }
 * ```
 */
export type InferFeatures<T extends FeaturesWithFallbacks> = {
  [K in keyof T]: T[K]
}

/**
 * Interface to be augmented by users for type-safe feature flags.
 * Use InferFeatures helper to enable type-safe feature access.
 *
 * @example
 * ```ts
 * // lib/features.ts
 * import { FeaturesWithFallbacks, InferFeatures } from '@supashiphq/sdk-react'
 *
 * export const FEATURE_FLAGS = {
 *   'dark-mode': false,
 *   'ui-config': {
 *     variant: 'a' as const,
 *     showWelcome: true,
 *   },
 * } satisfies FeaturesWithFallbacks
 *
 * declare module '@supashiphq/sdk-react' {
 *   interface Features extends InferFeatures<typeof FEATURE_FLAGS> {}
 * }
 * ```
 */
export interface Features {
  // This interface is intentionally empty and should be augmented via declaration merging
}

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
      [K in keyof Features]: Omit<QueryState<Features[K]>, 'data'> & {
        feature: Features[K]
      }
    }

export type FeatureKey = keyof Features extends never ? string : keyof Features

export interface UseFeatureOptions {
  context?: FeatureContext
  shouldFetch?: boolean
}

export interface UseFeaturesOptions {
  context?: FeatureContext
  shouldFetch?: boolean
}
