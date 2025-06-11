import React, { createContext, useContext, useEffect, useState } from 'react'
import { DarkFeatureClient } from '@darkfeature/sdk-javascript'

interface DarkFeatureProviderProps {
  apiKey: string
  children: React.ReactNode
}

interface DarkFeatureContextType {
  darkFeature: DarkFeatureClient | null
}

const DarkFeatureContext = createContext<DarkFeatureContextType>({ darkFeature: null })

export const useDarkFeature = () => {
  const context = useContext(DarkFeatureContext)
  if (!context) {
    throw new Error('useDarkFeature must be used within a DarkFeatureProvider')
  }
  return context.darkFeature
}

export const DarkFeatureProvider: React.FC<DarkFeatureProviderProps> = ({ apiKey, children }) => {
  const [darkFeature, setDarkFeature] = useState<DarkFeatureClient | null>(null)

  useEffect(() => {
    const client = new DarkFeatureClient({
      apiKey,
      retry: {
        enabled: true,
        maxAttempts: 3,
        backoff: 1000,
      },
    })
    setDarkFeature(client)
  }, [apiKey])

  return (
    <DarkFeatureContext.Provider value={{ darkFeature }}>{children}</DarkFeatureContext.Provider>
  )
}
