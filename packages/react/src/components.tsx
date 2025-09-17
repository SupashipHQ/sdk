'use client'

import React, { ReactNode } from 'react'
import { useFeature } from './hooks'
import { FeatureValue } from '@supashiphq/sdk-javascript'
import { hasValue } from './utils'

export interface SupaFeatureProps {
  /**
   * The feature flag key to evaluate
   */
  feature: string

  /**
   * Key in variations object to use when no feature value matches
   */
  fallback: FeatureValue

  /**
   * Context for feature evaluation
   */
  context?: Record<string, unknown>

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
 *
 * @example
 * ```tsx
 * <SupaFeature
 *   feature="new-header"
 *   fallback={false}
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
  fallback,
  context,
  shouldFetch = true,
  variations,
  loading,
}: SupaFeatureProps): React.JSX.Element | null {
  const { feature: featureValue, isLoading } = useFeature(feature, {
    context,
    shouldFetch,
    fallback,
  })

  // Show loading state if provided and currently loading
  if (isLoading && loading && variations[loading]) {
    return <>{variations[loading]}</>
  }

  // Don't render anything if still loading and no loader provided
  if (isLoading) {
    return null
  }

  // Use fallback if data is undefined/null and fallback is provided
  const effectiveValue = hasValue(featureValue) ? featureValue : (fallback ?? null)

  // Don't render anything if no effective value
  if (!hasValue(effectiveValue)) {
    return null
  }

  // Convert effective value to string for object key lookup
  const valueKey = String(effectiveValue)

  // Find matching variation by exact key match
  if (variations[valueKey]) {
    return <>{variations[valueKey]}</>
  }

  // Don't render anything if no variation matches
  return null
}
