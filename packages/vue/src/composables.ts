import { computed, ComputedRef, Ref } from 'vue'
import { useClient } from './plugin'
import { useQuery } from './query'
import { FeatureValue, FeatureContext } from '@supashiphq/javascript-sdk'
import { FeatureKey, TypedFeatures, Features } from './types'

// Custom return types for composables with generics
export interface UseFeatureResult<T extends FeatureValue> {
  feature: ComputedRef<T | null>
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

export interface UseFeaturesResult<T extends Record<string, FeatureValue>> {
  features: ComputedRef<T>
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

const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const CACHE_TIME = 10 * 60 * 1000 // 10 minutes

/**
 * Returns the state of a given feature for the current context.
 *
 * @example
 * ```ts
 * <script setup>
 * import { useFeature } from '@supashiphq/vue-sdk'
 *
 * const { feature, isLoading } = useFeature('my-feature')
 * </script>
 *
 * <template>
 *   <div v-if="isLoading">Loading...</div>
 *   <div v-else>Feature value: {{ feature }}</div>
 * </template>
 * ```
 *
 * @remarks
 * For type-safe feature flags, augment the Features interface:
 * ```ts
 * declare module '@supashiphq/vue-sdk' {
 *   interface Features {
 *     'my-feature': { value: 'variant-a' | 'variant-b' }
 *     'dark-mode': { value: boolean }
 *   }
 * }
 *
 * // Now get full type safety:
 * const { feature } = useFeature('my-feature')
 * // feature is typed as ComputedRef<'variant-a' | 'variant-b'>
 * ```
 */
export function useFeature<TKey extends FeatureKey>(
  key: TKey,
  options?: { context?: FeatureContext; shouldFetch?: boolean }
): TypedFeatures[TKey] {
  const client = useClient()
  const { context, shouldFetch = true } = options ?? {}

  // Get the fallback value from feature definitions
  const fallbackValue = client.getFeatureFallback(key as string)

  const result = useQuery(
    ['feature', key, context],
    async (): Promise<FeatureValue> => {
      return await client.getFeature(key as string, { context })
    },
    {
      enabled: shouldFetch,
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      refetchOnWindowFocus: false, // Feature flags shouldn't refetch on focus
    }
  )

  const { data, ...rest } = result
  const feature = computed(() => data.value ?? fallbackValue)

  return {
    ...rest,
    feature,
  } as TypedFeatures[TKey]
}

/**
 * Extract feature value type from Features interface
 */
type ExtractFeatureValue<T> = T extends { value: infer V } ? V : FeatureValue

/**
 * Returns the state of multiple features for the current context.
 *
 * @example
 * ```ts
 * <script setup>
 * import { useFeatures } from '@supashiphq/vue-sdk'
 *
 * const { features, isLoading } = useFeatures(['feature-a', 'feature-b'])
 * </script>
 *
 * <template>
 *   <div v-if="isLoading">Loading...</div>
 *   <div v-else>Feature A: {{ features['feature-a'] }}</div>
 * </template>
 * ```
 */
export function useFeatures<TKeys extends readonly FeatureKey[]>(
  featureNames: TKeys,
  options?: {
    context?: FeatureContext
    shouldFetch?: boolean
  }
): UseFeaturesResult<{
  [K in TKeys[number]]: K extends keyof Features
    ? ExtractFeatureValue<Features[K]>
    : FeatureValue | null
}> {
  const client = useClient()
  const { context, shouldFetch = true } = options ?? {}

  type ResultType = {
    [K in TKeys[number]]: K extends keyof Features
      ? ExtractFeatureValue<Features[K]>
      : FeatureValue | null
  }

  const result = useQuery(
    ['features', featureNames.join(','), context],
    async (): Promise<ResultType> => {
      const features = await client.getFeatures([...featureNames] as string[], { context })
      return features as ResultType
    },
    {
      enabled: shouldFetch,
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      refetchOnWindowFocus: false, // Feature flags shouldn't refetch on focus
    }
  )

  const { data, ...rest } = result
  const features = computed(() => data.value ?? ({} as ResultType))

  return {
    ...rest,
    features,
  }
}
