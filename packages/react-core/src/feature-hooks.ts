import type {
  FeatureContext,
  FeatureValue,
  Features,
  SupashipClient,
} from '@supashiphq/javascript-sdk'
import type { QueryState, QueryKey, UseQueryOptions } from './query-hooks-factory'

/** Narrow SDK feature definition `{ value: T }` to `T`; otherwise {@link FeatureValue}. */
export type ExtractFeatureFlagValue<T> = T extends { value: infer V } ? V : FeatureValue

/** Return shape for {@link createFeatureHooks} `useFeature` (string keys; use SDK wrappers for augmentation). */
export interface UseFeatureResult<T extends FeatureValue>
  extends Omit<QueryState<T | null>, 'data'> {
  feature: T | null
}

/** Return shape for {@link createFeatureHooks} `useFeatures` (string keys; use SDK wrappers for augmentation). */
export interface UseFeaturesResult<T extends Record<string, FeatureValue>>
  extends Omit<QueryState<T>, 'data'> {
  features: T
}

/** @internal */
export type UseQueryHook = <TData = unknown, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: UseQueryOptions<TData, TError>
) => QueryState<TData, TError>

/** @internal */
export type UseClientHook = <
  TFeatures extends Features<Record<string, FeatureValue>>,
>() => SupashipClient<TFeatures>

const FEATURE_STALE_MS = 5 * 60 * 1000
const FEATURE_CACHE_MS = 10 * 60 * 1000

/**
 * Feature-flag hooks bound to a Supaship client + query implementation (same instance the provider uses).
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- return is { useFeature, useFeatures }
export function createFeatureHooks(useClient: UseClientHook, useQuery: UseQueryHook) {
  function useFeature(
    key: string,
    options?: { context?: FeatureContext; shouldFetch?: boolean }
  ): Omit<QueryState<FeatureValue | null>, 'data'> & { feature: FeatureValue | null } {
    const client = useClient()
    const { context, shouldFetch = true } = options ?? {}

    const fallbackValue = client.getFeatureFallback(key)

    const result = useQuery(
      ['feature', key, context],
      async (): Promise<FeatureValue> => {
        return await client.getFeature(key, { context })
      },
      {
        enabled: shouldFetch,
        staleTime: FEATURE_STALE_MS,
        cacheTime: FEATURE_CACHE_MS,
        refetchOnWindowFocus: false,
      }
    )

    const { data, ...rest } = result
    return {
      ...rest,
      feature: data ?? fallbackValue,
    }
  }

  function useFeatures(
    featureNames: readonly string[],
    options?: {
      context?: FeatureContext
      shouldFetch?: boolean
    }
  ): Omit<QueryState<Record<string, FeatureValue | null>>, 'data'> & {
    features: Record<string, FeatureValue | null>
  } {
    const client = useClient()
    const { context, shouldFetch = true } = options ?? {}

    const result = useQuery(
      ['features', featureNames.join(','), context],
      async (): Promise<Record<string, FeatureValue | null>> => {
        return (await client.getFeatures([...featureNames] as string[], { context })) as Record<
          string,
          FeatureValue | null
        >
      },
      {
        enabled: shouldFetch,
        staleTime: FEATURE_STALE_MS,
        cacheTime: FEATURE_CACHE_MS,
        refetchOnWindowFocus: false,
      }
    )

    const { data, ...rest } = result
    return {
      ...rest,
      features: data ?? {},
    }
  }

  return { useFeature, useFeatures }
}
