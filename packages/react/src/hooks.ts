'use client'

import { useDarkFeature } from './provider'
import { UseFeatureOptions, UseFeaturesOptions } from './types'
import { useQuery, QueryState } from './query'
import { FeatureValue } from '@darkfeature/sdk-javascript'
import { hasValue } from './utils'

// Custom return types for hooks with generics
export interface UseFeatureResult<T extends FeatureValue> extends Omit<QueryState<T>, 'data'> {
  feature: T
}

export interface UseFeaturesResult<T extends Record<string, FeatureValue>>
  extends Omit<QueryState<T>, 'data'> {
  features: T
}

const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const CACHE_TIME = 10 * 60 * 1000 // 10 minutes

export function useFeature<T extends FeatureValue = FeatureValue>(
  featureName: string,
  options?: UseFeatureOptions<T>
): UseFeatureResult<T> {
  const client = useDarkFeature()
  const { fallback, context, shouldFetch = true } = options ?? {}

  const result = useQuery(
    ['feature', featureName, context],
    async (): Promise<T> => {
      try {
        // Try to get the feature value from the client
        const value = await client.getFeature(featureName, { context })
        // Return the actual value if it exists (could be false, 0, etc.)
        if (hasValue(value)) {
          // Since T extends FeatureValue and value is FeatureValue, this is safe
          return value as unknown as T
        }
        if (fallback !== undefined) {
          return fallback
        }
        return null as unknown as T
      } catch (error) {
        // If the API call fails, use the fallback
        if (fallback !== undefined) {
          return fallback
        }
        // If no fallback provided, return null as safe default
        return null as unknown as T
      }
    },
    {
      enabled: shouldFetch,
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      refetchOnWindowFocus: false, // Feature flags shouldn't refetch on focus
      initialData: fallback, // Use fallback as initial data
    }
  )

  const { data, ...rest } = result
  return {
    ...rest,
    feature: data ?? (null as unknown as T),
  }
}

export function useFeatures<T extends Record<string, FeatureValue> = Record<string, FeatureValue>>(
  options: UseFeaturesOptions<T>
): UseFeaturesResult<T> {
  const client = useDarkFeature()
  const { features, context, shouldFetch = true } = options

  const result = useQuery(
    ['features', Object.keys(features).sort(), context],
    async (): Promise<T> => {
      try {
        const result = await client.getFeatures({
          features: features as Record<string, FeatureValue>,
          context,
        })
        // Merge API results with fallbacks for any missing values
        const mergedResult = {} as T
        for (const [key, fallback] of Object.entries(features)) {
          const apiValue = result[key]
          if (hasValue(apiValue)) {
            ;(mergedResult as any)[key] = apiValue
          } else {
            ;(mergedResult as any)[key] = fallback
          }
        }
        return mergedResult
      } catch (error) {
        // If API fails, return the fallback features
        return features as unknown as T
      }
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
    features: data ?? ({} as T),
  }
}
