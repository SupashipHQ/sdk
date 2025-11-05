import type { ComputedRef, Ref } from 'vue'
import type {
  FeatureValue,
  FeatureContext,
  FeaturesWithFallbacks,
} from '@supashiphq/javascript-sdk'

export type {
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
export type { FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'

/**
 * Helper type to infer feature types from your feature config for module augmentation.
 *
 * ⚠️ Remember: Define features with `satisfies FeaturesWithFallbacks`, not type annotation
 *
 * @example
 * ```ts
 * import { FeaturesWithFallbacks, InferFeatures } from '@supashiphq/vue-sdk'
 *
 * // ✅ Use satisfies to preserve literal types
 * export const FEATURE_FLAGS = {
 *   'dark-mode': false,
 *   'ui-config': { variant: 'a' as const }
 * } satisfies FeaturesWithFallbacks
 *
 * declare module '@supashiphq/vue-sdk' {
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
 * import { FeaturesWithFallbacks, InferFeatures } from '@supashiphq/vue-sdk'
 *
 * export const FEATURE_FLAGS = {
 *   'dark-mode': false,
 *   'ui-config': {
 *     variant: 'a' as const,
 *     showWelcome: true,
 *   },
 * } satisfies FeaturesWithFallbacks
 *
 * declare module '@supashiphq/vue-sdk' {
 *   interface Features extends InferFeatures<typeof FEATURE_FLAGS> {}
 * }
 * ```
 */
export interface Features {
  // This interface is intentionally empty and should be augmented via declaration merging
}

/**
 * Return type for useFeature composable with proper typing based on feature key
 */
export type TypedFeatures = keyof Features extends never
  ? {
      [key: string]: {
        feature: ComputedRef<FeatureValue | null>
        status: Ref<'idle' | 'loading' | 'success' | 'error'>
        error: Ref<Error | null>
        isLoading: ComputedRef<boolean>
        isSuccess: ComputedRef<boolean>
        isError: ComputedRef<boolean>
        isIdle: ComputedRef<boolean>
        isFetching: Ref<boolean>
        dataUpdatedAt: Ref<number>
        refetch: () => Promise<void>
      }
    }
  : {
      [K in keyof Features]: {
        feature: ComputedRef<Features[K]>
        status: Ref<'idle' | 'loading' | 'success' | 'error'>
        error: Ref<Error | null>
        isLoading: ComputedRef<boolean>
        isSuccess: ComputedRef<boolean>
        isError: ComputedRef<boolean>
        isIdle: ComputedRef<boolean>
        isFetching: Ref<boolean>
        dataUpdatedAt: Ref<number>
        refetch: () => Promise<void>
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
