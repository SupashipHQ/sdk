'use client'

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react'
import {
  DarkFeatureClient,
  DarkFeatureConfig,
  DarkFeaturePlugin,
  FeatureContext,
} from '@darkfeature/sdk-javascript'

interface DarkFeatureContextValue {
  client: DarkFeatureClient
  updateContext: (context: FeatureContext, mergeWithExisting?: boolean) => void
  getContext: () => FeatureContext | undefined
}

const DarkFeatureContext = createContext<DarkFeatureContextValue | null>(null)

interface DarkFeatureProviderProps {
  config: DarkFeatureConfig
  plugins?: DarkFeaturePlugin[]
  children: ReactNode
}

export function DarkFeatureProvider({
  config,
  plugins = [],
  children,
}: DarkFeatureProviderProps): React.JSX.Element {
  // Initialize the singleton instance if it hasn't been initialized yet
  const client = useMemo(() => {
    return new DarkFeatureClient({
      ...config,
      plugins: [...(config.plugins || []), ...plugins],
    })
  }, [config, plugins])

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

  return <DarkFeatureContext.Provider value={contextValue}>{children}</DarkFeatureContext.Provider>
}

export function useDarkFeature(): DarkFeatureClient {
  const context = useContext(DarkFeatureContext)
  if (!context) {
    throw new Error('useDarkFeature must be used within a DarkFeatureProvider')
  }
  return context.client
}

/**
 * Hook to update the DarkFeature context dynamically
 * Useful when context depends on authentication or other async operations
 */
export function useFeatureContext(): Omit<DarkFeatureContextValue, 'client'> {
  const context = useContext(DarkFeatureContext)
  if (!context) {
    throw new Error('useFeatureContext must be used within a DarkFeatureProvider')
  }
  return {
    updateContext: context.updateContext,
    getContext: context.getContext,
  }
}
