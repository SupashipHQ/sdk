'use client'

import React, { ReactNode } from 'react'
import { useFeature } from './hooks'
import { FeatureValue } from '@supashiphq/sdk-javascript'
import { hasValue } from './utils'

export interface DarkFeatureProps {
  /**
   * The feature flag key to evaluate
   */
  feature: string

  /**
   * Key in variations object to use when no feature value matches
   */
  fallback?: FeatureValue

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
 * DarkFeature component that conditionally renders variations based on feature flag values.
 *
 * Supports all FeatureValue types (string | number | boolean | null) as variation keys.
 * Feature values are automatically converted to strings for object key matching:
 * - boolean `true` → `"true"`
 * - boolean `false` → `"false"`
 * - number `42` → `"42"`
 * - string `"variant-a"` → `"variant-a"`
 * - `null` → `"null"`
 *
 * @example
 * String variations:
 * ```tsx
 * <DarkFeature
 *   feature="theme-variant"
 *   fallback="default"
 *   loading="spinner"
 *   variations={{
 *     "light": <LightTheme />,
 *     "dark": <DarkTheme />,
 *     "auto": <AutoTheme />,
 *     default: <DefaultTheme />,
 *     spinner: <ThemeLoader />
 *   }}
 * />
 * ```
 *
 * @example
 * Boolean variations:
 * ```tsx
 * <DarkFeature
 *   feature="new-header"
 *   fallback={false}
 *   loading="skeleton"
 *   variations={{
 *     "true": <NewHeader />,
 *     "false": <OldHeader />,
 *     skeleton: <HeaderSkeleton />
 *   }}
 * />
 * ```
 *
 * @example
 * Number variations:
 * ```tsx
 * <DarkFeature
 *   feature="max-items"
 *   fallback="default"
 *   variations={{
 *     "5": <ItemList maxItems={5} />,
 *     "10": <ItemList maxItems={10} />,
 *     "20": <ItemList maxItems={20} />,
 *     default: <ItemList maxItems={10} />
 *   }}
 * />
 * ```
 *
 * @example
 * Mixed types with null handling:
 * ```tsx
 * <DarkFeature
 *   feature="experiment-config"
 *   fallback="disabled"
 *   variations={{
 *     "control": <ControlExperiment />,
 *     "variant-a": <VariantAExperiment />,
 *     "42": <NumericExperiment value={42} />,
 *     "true": <EnabledExperiment />,
 *     "false": <DisabledExperiment />,
 *     "null": <NoExperiment />,
 *     disabled: <NoExperiment />
 *   }}
 * />
 * ```
 */
export function DarkFeature({
  feature,
  fallback,
  context,
  shouldFetch = true,
  variations,
  loading,
}: DarkFeatureProps): React.JSX.Element | null {
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
