'use client'

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
   * Variations object mapping "true" or "false" to JSX elements
   */
  variations: {
    true: ReactNode
    false: ReactNode
  }

  /**
   * Component to render during loading state
   */
  loading?: ReactNode
}

/**
 * SupaFeature component that conditionally renders variations based on feature flag values.
 * Uses the default value defined in the client configuration.
 *
 * @example
 * ```tsx
 * <SupaFeature
 *   feature="new-header"
 *   loading={<HeaderSkeleton />}
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

  // Show loading state if provided and currently loading
  if (isLoading) {
    return loading ? <>{loading}</> : null
  }

  // Convert feature value to boolean string for lookup
  const valueKey = String(featureValue)

  // Match "true" or "false" variations
  if (variations.true && valueKey === 'true') {
    return <>{variations.true}</>
  }

  if (variations.false && (valueKey === 'false' || !hasValue(featureValue))) {
    return <>{variations.false}</>
  }

  // Don't render anything if no variation matches
  return null
}
