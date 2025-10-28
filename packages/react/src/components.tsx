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
   * Variations object mapping feature values/keys to JSX elements
   */
  variations: Record<string, ReactNode>

  /**
   * Key in variations object to use for loading state
   */
  loading?: string
}

/**
 * SupaFeature component that conditionally renders variations based on feature flag values.
 * Uses the default value defined in the client configuration.
 *
 * @example
 * ```tsx
 * <SupaFeature
 *   feature="new-header"
 *   variations={{
 *     "true": <NewHeader />,
 *     "false": <OldHeader />,
 *     loading: <HeaderSkeleton />
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
  if (isLoading && loading && variations[loading]) {
    return <>{variations[loading]}</>
  }

  // Don't render anything if still loading and no loader provided
  if (isLoading) {
    return null
  }

  // Don't render anything if no feature value (client config should provide defaults)
  if (!hasValue(featureValue)) {
    return null
  }

  // Convert feature value to string for object key lookup
  const valueKey = String(featureValue)

  // Find matching variation by exact key match
  if (variations[valueKey]) {
    return <>{variations[valueKey]}</>
  }

  // Don't render anything if no variation matches
  return null
}
