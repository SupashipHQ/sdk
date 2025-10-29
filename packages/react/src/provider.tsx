'use client'

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react'
import {
  SupaClient,
  SupaClientConfig as SupaProviderConfig,
  FeatureContext,
  FeatureValue,
  Features,
  SupaToolbarOverrideChange,
  SupaToolbarPluginConfig,
} from '@supashiphq/sdk-javascript'
import { useQueryClient } from './query'

interface SupaContextValue<TFeatures extends Features<Record<string, FeatureValue>>> {
  client: SupaClient<TFeatures>
  updateContext: (context: FeatureContext, mergeWithExisting?: boolean) => void
  getContext: () => FeatureContext | undefined
}

const SupaContext = createContext<SupaContextValue<any> | null>(null)

interface SupaProviderProps<TFeatures extends Features<Record<string, FeatureValue>>> {
  config: Omit<SupaProviderConfig, 'plugins' | 'toolbar'> & { features: TFeatures }
  toolbar?: SupaToolbarPluginConfig | boolean
  children: ReactNode
}

// Default toolbar config (stable reference)
const DEFAULT_TOOLBAR_CONFIG: SupaToolbarPluginConfig = { enabled: 'auto' }

export function SupaProvider<TFeatures extends Features<Record<string, FeatureValue>>>({
  config,
  toolbar,
  children,
}: SupaProviderProps<TFeatures>): React.JSX.Element {
  const queryClient = useQueryClient()

  // Use default if toolbar not provided
  const effectiveToolbar = toolbar ?? DEFAULT_TOOLBAR_CONFIG

  // Stable callback for toolbar override changes
  const handleOverrideChange = useCallback(
    (
      featureOverride: SupaToolbarOverrideChange,
      allOverrides: Record<string, FeatureValue>
    ): void => {
      // Call user's onOverrideChange if provided
      if (typeof effectiveToolbar === 'object' && effectiveToolbar.onOverrideChange) {
        effectiveToolbar.onOverrideChange(featureOverride, allOverrides)
      }

      // Invalidate the query cache for the changed feature to trigger refetch
      if (featureOverride.feature) {
        // Invalidate single feature queries (useFeature)
        queryClient.invalidateQueriesByPrefix(['feature', featureOverride.feature])
        // Invalidate multi-feature queries (useFeatures) that include this feature
        queryClient.invalidateQueriesByPrefix(['features'])
      }
    },
    [effectiveToolbar, queryClient]
  )

  // Initialize client with React Query cache invalidation for toolbar overrides
  const client = useMemo(() => {
    // Merge toolbar config with React Query cache invalidation
    const toolbarConfig =
      effectiveToolbar === false
        ? false
        : {
            ...(typeof effectiveToolbar === 'object' ? effectiveToolbar : {}),
            onOverrideChange: handleOverrideChange,
          }

    return new SupaClient<TFeatures>({
      ...config,
      toolbar: toolbarConfig,
    })
  }, [config, effectiveToolbar, handleOverrideChange])

  // Memoized context update function
  const updateContext = useCallback(
    (context: FeatureContext, mergeWithExisting: boolean = true) => {
      client.updateContext(context, mergeWithExisting)
    },
    [client]
  )

  // Memoized context getter function
  const getContext = useCallback(() => {
    return client.getContext()
  }, [client])

  const contextValue = useMemo(
    () => ({
      client,
      updateContext,
      getContext,
    }),
    [client, updateContext, getContext]
  )

  return <SupaContext.Provider value={contextValue}>{children}</SupaContext.Provider>
}

export function useClient<
  TFeatures extends Features<Record<string, FeatureValue>>,
>(): SupaClient<TFeatures> {
  const context = useContext(SupaContext)
  if (!context) {
    throw new Error('useClient must be used within a SupaProvider')
  }
  return context.client as SupaClient<TFeatures>
}

/**
 * Hook to update the context dynamically
 * Useful when context depends on authentication or other async operations
 */
export function useFeatureContext(): Omit<SupaContextValue<any>, 'client'> {
  const context = useContext(SupaContext)
  if (!context) {
    throw new Error('useFeatureContext must be used within a SupaProvider')
  }
  return {
    updateContext: context.updateContext,
    getContext: context.getContext,
  }
}
