import { useDarkFeature } from './provider'
import { UseFeatureOptions, UseFeaturesOptions } from './types'
import { useQuery, QueryState } from './query'
import { FeatureValue } from '@darkfeature/sdk-javascript'

type UseFeatureParam = FeatureValue | UseFeatureOptions

export function useFeature(featureName: string, param?: UseFeatureParam): QueryState<FeatureValue> {
  const client = useDarkFeature()

  // Handle both direct value and options object
  const options =
    typeof param === 'object' && !Array.isArray(param) && param !== null
      ? (param as UseFeatureOptions)
      : { fallback: param as FeatureValue }

  const { context, shouldFetch = true, fallback } = options

  return useQuery(
    ['feature', featureName, context],
    () => client.getFeature(featureName, { fallback, context }),
    {
      enabled: shouldFetch,
      initialData: fallback ?? null,
    }
  )
}

export function useFeatures(options: UseFeaturesOptions): QueryState<Record<string, FeatureValue>> {
  const client = useDarkFeature()
  const { features, context, shouldFetch = true } = options

  return useQuery(
    ['features', Object.keys(features), context],
    () => client.getFeatures({ features, context }),
    {
      enabled: shouldFetch,
      initialData: features,
    }
  )
}
