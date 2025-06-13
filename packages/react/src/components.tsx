'use client'

import React, { ReactNode, Children, isValidElement } from 'react'
import { useFeature } from './hooks'
import { FeatureValue } from '@darkfeature/sdk-javascript'

export interface DarkFeatureProps {
  /**
   * The feature flag key to evaluate
   */
  feature: string

  /**
   * Fallback value to use when the feature is loading or fails to load
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
   * Child components (Variation, Loader, Fallback)
   */
  children: ReactNode
}

export interface VariationProps {
  /**
   * The expected variation value to match against
   */
  match: FeatureValue

  /**
   * Content to render when feature matches this variation
   */
  children: ReactNode
}

export interface LoaderProps {
  /**
   * Content to render while loading
   */
  children: ReactNode
}

export interface FallbackProps {
  /**
   * Content to render when no variations match
   */
  children: ReactNode
}

/**
 * Variation component for rendering content when feature matches a specific value
 */
export function Variation({ children }: VariationProps): React.JSX.Element {
  return <>{children}</>
}

/**
 * Loader component for rendering loading state
 */
export function Loader({ children }: LoaderProps): React.JSX.Element {
  return <>{children}</>
}

/**
 * Fallback component for rendering default content when no variations match
 */
export function Fallback({ children }: FallbackProps): React.JSX.Element {
  return <>{children}</>
}

/**
 * DarkFeature component that conditionally renders children based on feature flag variations.
 *
 * @example
 * ```tsx
 * <DarkFeature feature="my-feature" fallback={false}>
 *   <DarkFeature.Variation match={true}>
 *     <div>Feature is enabled!</div>
 *   </DarkFeature.Variation>
 *   <DarkFeature.Variation match="variant-a">
 *     <div>Variant A content</div>
 *   </DarkFeature.Variation>
 *   <DarkFeature.Loader>
 *     <div>Loading...</div>
 *   </DarkFeature.Loader>
 *   <DarkFeature.Fallback>
 *     <div>Default content</div>
 *   </DarkFeature.Fallback>
 * </DarkFeature>
 * ```
 */
export function DarkFeature({
  feature,
  fallback,
  context,
  shouldFetch = true,
  children,
}: DarkFeatureProps): React.JSX.Element | null {
  const { data, isLoading } = useFeature(feature, {
    fallback,
    context,
    shouldFetch,
  })

  // Find child components
  const variations: { match: FeatureValue; children: ReactNode }[] = []
  let loaderChildren: ReactNode | null = null
  let fallbackChildren: ReactNode | null = null

  Children.forEach(children, child => {
    if (isValidElement(child)) {
      if (child.type === Variation && child.props && 'match' in child.props) {
        const props = child.props as VariationProps
        // eslint-disable-next-line react/prop-types
        variations.push({ match: props.match, children: props.children })
      } else if (child.type === Loader && child.props) {
        const props = child.props as LoaderProps
        loaderChildren = props.children
      } else if (child.type === Fallback && child.props) {
        const props = child.props as FallbackProps
        fallbackChildren = props.children
      }
    }
  })

  // Show loading state if provided and currently loading
  if (isLoading && loaderChildren) {
    return <>{loaderChildren}</>
  }

  // Don't render anything if still loading and no loader component provided
  if (isLoading) {
    return null
  }

  // Find matching variation
  const matchingVariation = variations.find(variation => variation.match === data)

  // Render matching variation if found
  if (matchingVariation) {
    return <>{matchingVariation.children}</>
  }

  // Render fallback component if no variation matches
  if (fallbackChildren) {
    return <>{fallbackChildren}</>
  }

  // Don't render anything if no fallback provided and no variation matches
  return null
}

// Attach sub-components to main component
DarkFeature.Variation = Variation
DarkFeature.Loader = Loader
DarkFeature.Fallback = Fallback
