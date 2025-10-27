'use client'

import { useClient } from './provider'
import { useQuery, QueryState } from './query'
import { FeatureValue } from '@supashiphq/sdk-javascript'
import { FeatureKey, TypedFeatures, Features } from './types'

// Custom return types for hooks with generics
export interface UseFeatureResult<T extends FeatureValue>
  extends Omit<QueryState<T | null>, 'data'> {
  feature: T | null
}

export interface UseFeaturesResult<T extends Record<string, FeatureValue>>
  extends Omit<QueryState<T>, 'data'> {
  features: T
}

const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const CACHE_TIME = 10 * 60 * 1000 // 10 minutes

/**
 * Returns the state of a given feature for the current context.
 *
 * @example
 * ```ts
 * function MyComponent() {
 *   const { feature, isLoading } = useFeature('my-feature')
 *   if (isLoading) return <div>Loading...</div>
 *   return <div>Feature value: {String(feature)}</div>
 * }
 * ```
 *
 * @remarks
 * For type-safe feature flags, augment the Features interface:
 * ```ts
 * declare module '@supashiphq/sdk-react' {
 *   interface Features {
 *     'my-feature': { value: 'variant-a' | 'variant-b' }
 *     'dark-mode': { value: boolean }
 *   }
 * }
 *
 * // Now get full type safety:
 * const { feature } = useFeature('my-feature')
 * // feature is typed as 'variant-a' | 'variant-b'
 * ```
 */
export function useFeature<TKey extends FeatureKey>(
  key: TKey,
  options?: { context?: Record<string, unknown>; shouldFetch?: boolean }
): TypedFeatures[TKey] {
  const client = useClient()
  const { context, shouldFetch = true } = options ?? {}

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
  return {
    ...rest,
    feature: data ?? (null as unknown as FeatureValue),
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
 * function MyComponent() {
 *   const { features, isLoading } = useFeatures(['feature-a', 'feature-b'])
 *   if (isLoading) return <div>Loading...</div>
 *   return <div>Feature A: {String(features['feature-a'])}</div>
 * }
 * ```
 */
export function useFeatures<TKeys extends readonly FeatureKey[]>(
  featureNames: TKeys,
  options?: {
    context?: Record<string, unknown>
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
  return {
    ...rest,
    features: data ?? ({} as ResultType),
  }
}
