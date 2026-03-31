import { FeatureValue, FeatureContext } from '@supashiphq/javascript-sdk'
import type { ExtractFeatureFlagValue, UseFeaturesResult } from '@supashiphq/react-core'
import { useFeatureUntyped, useFeaturesUntyped } from './supaship'
import { FeatureKey, TypedFeatures, Features } from './types'

/**
 * Returns the state of a given feature for the current context.
 *
 * @remarks
 * For type-safe feature flags, augment the Features interface:
 * ```ts
 * declare module '@supashiphq/react-native-sdk' {
 *   interface Features {
 *     'my-feature': { value: 'variant-a' | 'variant-b' }
 *     'dark-mode': { value: boolean }
 *   }
 * }
 * ```
 */
export function useFeature<TKey extends FeatureKey>(
  key: TKey,
  options?: { context?: FeatureContext; shouldFetch?: boolean }
): TypedFeatures[TKey] {
  return useFeatureUntyped(key as string, options) as TypedFeatures[TKey]
}

/**
 * Returns the state of multiple features for the current context.
 */
export function useFeatures<TKeys extends readonly FeatureKey[]>(
  featureNames: TKeys,
  options?: {
    context?: FeatureContext
    shouldFetch?: boolean
  }
): UseFeaturesResult<{
  [K in TKeys[number]]: K extends keyof Features
    ? ExtractFeatureFlagValue<Features[K]>
    : FeatureValue | null
}> {
  return useFeaturesUntyped(featureNames as readonly string[], options) as UseFeaturesResult<{
    [K in TKeys[number]]: K extends keyof Features
      ? ExtractFeatureFlagValue<Features[K]>
      : FeatureValue | null
  }>
}
