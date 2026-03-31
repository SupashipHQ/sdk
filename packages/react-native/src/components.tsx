import React, { ReactNode } from 'react'
import { useFeature } from './hooks'
import { FeatureKey, FeatureContext } from './types'
import { hasValue } from './utils'

export interface SupaFeatureProps {
  /**
   * The feature flag key to evaluate
   */
  feature: FeatureKey

  /**
   * Context for feature evaluation
   */
  context?: FeatureContext

  /**
   * Whether to fetch the feature (default: true)
   */
  shouldFetch?: boolean

  /**
   * Variations object mapping "true" or "false" to React nodes (e.g. RN Views)
   */
  variations: {
    true: ReactNode
    false?: ReactNode
  }

  /**
   * Component to render during loading state
   */
  loading?: ReactNode
}

/**
 * Conditionally renders variations based on boolean-style feature flag values.
 *
 * @example
 * ```tsx
 * <SupaFeature
 *   feature="new-header"
 *   loading={<ActivityIndicator />}
 *   variations={{
 *     true: <NewHeader />,
 *     false: <OldHeader />
 *   }}
 * />
 * ```
 */
export function SupaFeature({
  feature,
  context,
  shouldFetch = true,
  variations,
  loading,
}: SupaFeatureProps): React.JSX.Element | null {
  const { feature: featureValue, isLoading } = useFeature(feature, {
    context,
    shouldFetch,
  })

  if (isLoading) {
    return loading ? <>{loading}</> : null
  }

  const valueKey = String(featureValue)

  if (variations.true && valueKey === 'true') {
    return <>{variations.true}</>
  }

  if (variations.false && (valueKey === 'false' || !hasValue(featureValue))) {
    return <>{variations.false}</>
  }

  return null
}
