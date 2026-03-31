import type {
  FeatureValue,
  FeatureContext,
  FeaturesWithFallbacks,
} from '@supashiphq/javascript-sdk'
import type { QueryState } from '@supashiphq/react-core'

export type { UseFeatureResult, UseFeaturesResult } from '@supashiphq/react-core'

export type {
  SupaClientConfig as SupaProviderConfig,
  SupaPlugin,
  FeatureValue,
  FeatureContext,
  SupaToolbarPluginConfig,
  SupaToolbarPosition,
} from '@supashiphq/javascript-sdk'

/**
 * ⚠️ IMPORTANT: Use with `satisfies` operator, NOT type annotation
 *
 * Re-exported from @supashiphq/javascript-sdk for convenience.
 * See the main package documentation for full details.
 *
 * @example
 * ```ts
 * const features = {
 *   'dark-mode': false,
 *   theme: { mode: 'light' as const }
 * } satisfies FeaturesWithFallbacks
 * ```
 */
export type { FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'

/**
 * Helper type to infer feature types from your feature config for module augmentation.
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
 * declare module '@supashiphq/react-native-sdk' {
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
