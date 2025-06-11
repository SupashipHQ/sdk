import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import {
  DarkFeatureClient,
  DarkFeatureConfig,
  DarkFeaturePlugin,
} from '@darkfeature/sdk-javascript'

const DarkFeatureContext = createContext<DarkFeatureClient | null>(null)

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

  return <DarkFeatureContext.Provider value={client}>{children}</DarkFeatureContext.Provider>
}

export function useDarkFeature(): DarkFeatureClient {
  const client = useContext(DarkFeatureContext)
  if (!client) {
    throw new Error('useDarkFeature must be used within a DarkFeatureProvider')
  }
  return client
}
