'use client'

import { useDarkFeature } from './provider'
import { UseFeatureOptions, UseFeaturesOptions } from './types'
import { useQuery, QueryState } from './query'
import { FeatureValue } from '@darkfeature/sdk-javascript'
import { hasValue } from './utils'

// Custom return types for hooks
export interface UseFeatureResult extends Omit<QueryState<FeatureValue>, 'data'> {
  feature: FeatureValue
}

export interface UseFeaturesResult extends Omit<QueryState<Record<string, FeatureValue>>, 'data'> {
  features: Record<string, FeatureValue>
}

const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const CACHE_TIME = 10 * 60 * 1000 // 10 minutes

// Main useFeature hook with options parameter
export function useFeature(featureKey: string, options?: UseFeatureOptions): UseFeatureResult {
  const client = useDarkFeature()
  const { fallback, context, shouldFetch = true } = options ?? {}

  const result = useQuery(
    ['feature', featureKey, context],
    async (): Promise<FeatureValue> => {
      try {
        // Try to get the feature value from the client
        const value = await client.getFeature(featureKey, { context })
        // Return the actual value if it exists (could be false, 0, etc.)
        return hasValue(value) ? value : (fallback ?? null)
      } catch (error) {
        // If the API call fails, use the fallback
        if (fallback !== undefined) {
          return fallback
        }
        // If no fallback provided, return null as safe default
        return null
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
    feature: data ?? null,
  }
}

export function useFeatures(options: UseFeaturesOptions): UseFeaturesResult {
  const client = useDarkFeature()
  const { features, context, shouldFetch = true } = options

  const result = useQuery(
    ['features', Object.keys(features).sort(), context],
    async (): Promise<Record<string, FeatureValue>> => {
      try {
        const result = await client.getFeatures({ features, context })
        // Merge API results with fallbacks for any missing values
        const mergedResult: Record<string, FeatureValue> = {}
        for (const [key, fallback] of Object.entries(features)) {
          mergedResult[key] = hasValue(result[key]) ? result[key] : fallback
        }
        return mergedResult
      } catch (error) {
        // If API fails, return the fallback features
        return features
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
    features: data ?? {},
  }
}
