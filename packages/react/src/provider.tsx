'use client'

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react'
import {
  SupaClient,
  SupaClientConfig as SupaProviderConfig,
  SupaPlugin,
  FeatureContext,
  FeatureValue,
  Features,
  ToolbarPlugin,
  SupaToolbarPluginConfig,
  SupaToolbarOverrideChange,
} from '@supashiphq/sdk-javascript'
import { useQueryClient } from './query'

interface SupaContextValue<TFeatures extends Features<Record<string, FeatureValue>>> {
  client: SupaClient<TFeatures>
  updateContext: (context: FeatureContext, mergeWithExisting?: boolean) => void
  getContext: () => FeatureContext | undefined
}

const SupaContext = createContext<SupaContextValue<any> | null>(null)

interface SupaProviderProps<TFeatures extends Features<Record<string, FeatureValue>>> {
  config: SupaProviderConfig & { features: TFeatures }
  plugins?: SupaPlugin[]
  toolbar?: SupaToolbarPluginConfig | boolean
  children: ReactNode
}

export function SupaProvider<TFeatures extends Features<Record<string, FeatureValue>>>({
  config,
  plugins = [],
  toolbar = { show: 'auto' },
  children,
}: SupaProviderProps<TFeatures>): React.JSX.Element {
  const queryClient = useQueryClient()

  // Create toolbar plugin if toolbar prop is provided
  const toolbarPlugin = useMemo(() => {
    if (toolbar === false) return null

    const toolbarConfig = {
      ...(typeof toolbar === 'object' ? { ...toolbar, show: toolbar.show ?? 'auto' } : {}),
    }

    // Otherwise use the provided config
    return new ToolbarPlugin({
      ...toolbarConfig,
      onOverrideChange: (featureOverride: SupaToolbarOverrideChange): void => {
        // Invalidate the query cache for the changed feature to trigger refetch
        // Use prefix matching to invalidate all queries for this feature regardless of context
        if (featureOverride.feature) {
          queryClient.invalidateQueriesByPrefix(['feature', featureOverride.feature])
        }
      },
    })
  }, [toolbar])

  // Initialize the singleton instance if it hasn't been initialized yet
  const client = useMemo(() => {
    const allPlugins = [...(config.plugins || []), ...plugins]
    if (toolbarPlugin) {
      allPlugins.push(toolbarPlugin)
    }

    return new SupaClient<TFeatures>({
      ...config,
      plugins: allPlugins,
    })
  }, [config, plugins, toolbarPlugin])

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
