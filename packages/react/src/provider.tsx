'use client'

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react'
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

  // Use ref to persist client across StrictMode double-renders in development
  const clientRef = useRef<SupaClient<TFeatures> | null>(null)

  // Initialize client only once to prevent duplicate toolbars in StrictMode
  if (!clientRef.current) {
    // Merge toolbar config with React Query cache invalidation
    const toolbarConfig =
      effectiveToolbar === false
        ? false
        : {
            ...(typeof effectiveToolbar === 'object' ? effectiveToolbar : {}),
            onOverrideChange: handleOverrideChange,
          }

    clientRef.current = new SupaClient<TFeatures>({
      ...config,
      toolbar: toolbarConfig,
    })
  }

  const client = clientRef.current

  // Cleanup client on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        // Cleanup plugins (which includes toolbar cleanup)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = clientRef.current as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (client.plugins && Array.isArray(client.plugins)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          client.plugins.forEach((plugin: any) => {
            if (plugin.cleanup) {
              plugin.cleanup()
            }
          })
        }
        clientRef.current = null
      }
    }
  }, [])

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
