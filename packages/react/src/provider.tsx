'use client'

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react'
import {
  SupaClient,
  SupaClientConfig,
  SupaPlugin,
  FeatureContext,
} from '@supashiphq/sdk-javascript'

interface SupaContextValue {
  client: SupaClient
  updateContext: (context: FeatureContext, mergeWithExisting?: boolean) => void
  getContext: () => FeatureContext | undefined
}

const SupaContext = createContext<SupaContextValue | null>(null)

interface SupaProviderProps {
  config: SupaClientConfig
  plugins?: SupaPlugin[]
  children: ReactNode
}

export function SupaProvider({
  config,
  plugins = [],
  children,
}: SupaProviderProps): React.JSX.Element {
  // Initialize the singleton instance if it hasn't been initialized yet
  const client = useMemo(() => {
    return new SupaClient({
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
