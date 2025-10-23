'use client'

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react'
import {
  SupaClient,
  SupaClientConfig as SupaProviderConfig,
  SupaPlugin,
  FeatureContext,
  ToolbarPlugin,
  ToolbarPluginConfig,
  ToolbarOverrideChange,
} from '@supashiphq/sdk-javascript'

interface SupaContextValue {
  client: SupaClient
  updateContext: (context: FeatureContext, mergeWithExisting?: boolean) => void
  getContext: () => FeatureContext | undefined
}

const SupaContext = createContext<SupaContextValue | null>(null)

interface SupaProviderProps {
  config: SupaProviderConfig
  plugins?: SupaPlugin[]
  toolbar?: ToolbarPluginConfig | boolean
  children: ReactNode
}

export function SupaProvider({
  config,
  plugins = [],
  toolbar = { show: 'auto' },
  children,
}: SupaProviderProps): React.JSX.Element {
  // Create toolbar plugin if toolbar prop is provided
  const toolbarPlugin = useMemo(() => {
    if (toolbar === false) return null

    const toolbarConfig = {
      ...(typeof toolbar === 'object' ? { ...toolbar, show: toolbar.show ?? 'auto' } : {}),
    }

    // Otherwise use the provided config
    return new ToolbarPlugin({
      ...toolbarConfig,
      onOverrideChange: (_featureOverride: ToolbarOverrideChange): void => {
        // Invalidate the query cache for the changed feature to trigger refetch
      },
    })
  }, [toolbar])

  // Initialize the singleton instance if it hasn't been initialized yet
  const client = useMemo(() => {
    const allPlugins = [...(config.plugins || []), ...plugins]
    if (toolbarPlugin) {
      allPlugins.push(toolbarPlugin)
    }

    return new SupaClient({
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

export function useClient(): SupaClient {
  const context = useContext(SupaContext)
  if (!context) {
    throw new Error('useClient must be used within a SupaProvider')
  }
  return context.client
}

/**
 * Hook to update the context dynamically
 * Useful when context depends on authentication or other async operations
 */
export function useFeatureContext(): Omit<SupaContextValue, 'client'> {
  const context = useContext(SupaContext)
  if (!context) {
    throw new Error('useFeatureContext must be used within a SupaProvider')
  }
  return {
    updateContext: context.updateContext,
    getContext: context.getContext,
  }
}
