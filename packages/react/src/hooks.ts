'use client'

import { useDarkFeature } from './provider'
import { UseFeatureOptions, UseFeaturesOptions } from './types'
import { useQuery, QueryState } from './query'
import { FeatureValue } from '@darkfeature/sdk-javascript'

const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const CACHE_TIME = 10 * 60 * 1000 // 10 minutes

// Main useFeature hook with multiple overloads for different use cases
export function useFeature(featureKey: string): QueryState<FeatureValue>

export function useFeature(featureKey: string, options: UseFeatureOptions): QueryState<FeatureValue>

export function useFeature(featureKey: string, fallback: FeatureValue): QueryState<FeatureValue>

export function useFeature(
  featureKey: string,
  fallback: FeatureValue,
  options: Omit<UseFeatureOptions, 'fallback'>
): QueryState<FeatureValue>

export function useFeature(
  featureKey: string,
  fallbackOrOptions?: FeatureValue | UseFeatureOptions,
  options?: Omit<UseFeatureOptions, 'fallback'>
): QueryState<FeatureValue> {
  const client = useDarkFeature()

  // Parse parameters to handle all overload signatures
  let finalOptions: UseFeatureOptions

  if (fallbackOrOptions === undefined) {
    // useFeature(key)
    finalOptions = {}
  } else if (
    typeof fallbackOrOptions === 'object' &&
    fallbackOrOptions !== null &&
    !Array.isArray(fallbackOrOptions)
  ) {
    // useFeature(key, options)
    finalOptions = fallbackOrOptions as UseFeatureOptions
  } else {
    // useFeature(key, fallback) or useFeature(key, fallback, options)
    finalOptions = {
      fallback: fallbackOrOptions as FeatureValue,
      ...options,
    }
  }

  const { fallback, context, shouldFetch = true } = finalOptions

  return useQuery(
    ['feature', featureKey, context],
    async (): Promise<FeatureValue> => {
      try {
        // Try to get the feature value from the client
        const value = await client.getFeature(featureKey, { context })
        // Return the actual value if it exists (could be false, 0, etc.)
        return value !== undefined && value !== null ? value : (fallback ?? null)
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
    }
  )
}

export function useFeatures(options: UseFeaturesOptions): QueryState<Record<string, FeatureValue>> {
  const client = useDarkFeature()
  const { features, context, shouldFetch = true } = options

  return useQuery(
    ['features', Object.keys(features).sort(), context],
    async (): Promise<Record<string, FeatureValue>> => {
      try {
        const result = await client.getFeatures({ features, context })
        // Merge API results with fallbacks for any missing values
        const mergedResult: Record<string, FeatureValue> = {}
        for (const [key, fallback] of Object.entries(features)) {
          mergedResult[key] =
            result[key] !== undefined && result[key] !== null ? result[key] : fallback
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
}
