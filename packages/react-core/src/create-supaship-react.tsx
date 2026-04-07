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
  SupashipClient,
  SupashipClientConfig as SupashipProviderConfig,
  FeatureContext,
  FeatureValue,
  Features,
  SupashipToolbarOverrideChange,
  SupashipToolbarPluginConfig,
} from '@supashiphq/javascript-sdk'
import type { UseFocusRefetchEffect } from './focus-types'
import { createFeatureHooks } from './feature-hooks'
import { createQueryHooks } from './query-hooks-factory'

/** @internal Narrow feature map for context typing */
export type SupashipGenericFeatures = Features<Record<string, FeatureValue>>

interface SupashipContextValue<TFeatures extends Features<Record<string, FeatureValue>>> {
  client: SupashipClient<TFeatures>
  updateContext: (context: FeatureContext, mergeWithExisting?: boolean) => void
  getContext: () => FeatureContext | undefined
}

const DEFAULT_TOOLBAR_CONFIG: SupashipToolbarPluginConfig = { enabled: 'auto' }

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- return bundles provider, hooks, and query API
export function createSupashipReact(useFocusRefetchEffect: UseFocusRefetchEffect) {
  const { useQuery, useQueryClient, queryCache, QueryClient, getInitialQueryState } =
    createQueryHooks(useFocusRefetchEffect)

  const SupashipContext = createContext<SupashipContextValue<SupashipGenericFeatures> | null>(null)

  function SupashipProvider<TFeatures extends Features<Record<string, FeatureValue>>>({
    config,
    toolbar,
    children,
  }: {
    config: Omit<SupashipProviderConfig, 'plugins' | 'toolbar'> & { features: TFeatures }
    toolbar?: SupashipToolbarPluginConfig | boolean
    children: ReactNode
  }): React.JSX.Element {
    const queryClient = useQueryClient()
    const effectiveToolbar = toolbar ?? DEFAULT_TOOLBAR_CONFIG

    const handleOverrideChange = useCallback(
      (
        featureOverride: SupashipToolbarOverrideChange,
        allOverrides: Record<string, FeatureValue>
      ): void => {
        if (typeof effectiveToolbar === 'object' && effectiveToolbar.onOverrideChange) {
          effectiveToolbar.onOverrideChange(featureOverride, allOverrides)
        }

        if (featureOverride.feature) {
          queryClient.invalidateQueriesByPrefix(['feature', featureOverride.feature])
          queryClient.invalidateQueriesByPrefix(['features'])
        }
      },
      [effectiveToolbar, queryClient]
    )

    const clientRef = useRef<SupashipClient<TFeatures> | null>(null)

    if (!clientRef.current) {
      const toolbarConfig =
        effectiveToolbar === false
          ? false
          : {
              ...(typeof effectiveToolbar === 'object' ? effectiveToolbar : {}),
              onOverrideChange: handleOverrideChange,
            }

      clientRef.current = new SupashipClient<TFeatures>({
        ...config,
        toolbar: toolbarConfig,
      })
    }

    const client = clientRef.current

    useEffect(() => {
      return () => {
        if (clientRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = clientRef.current as any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (c.plugins && Array.isArray(c.plugins)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            c.plugins.forEach((plugin: any) => {
              if (plugin.cleanup) {
                plugin.cleanup()
              }
            })
          }
          clientRef.current = null
        }
      }
    }, [])

    const updateContext = useCallback(
      (ctx: FeatureContext, mergeWithExisting: boolean = true) => {
        client.updateContext(ctx, mergeWithExisting)
      },
      [client]
    )

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

    return <SupashipContext.Provider value={contextValue}>{children}</SupashipContext.Provider>
  }

  function useClient<
    TFeatures extends Features<Record<string, FeatureValue>>,
  >(): SupashipClient<TFeatures> {
    const context = useContext(SupashipContext)
    if (!context) {
      throw new Error('useClient must be used within a SupashipProvider')
    }
    return context.client as SupashipClient<TFeatures>
  }

  function useFeatureContext(): {
    updateContext: (context: FeatureContext, mergeWithExisting?: boolean) => void
    getContext: () => FeatureContext | undefined
  } {
    const context = useContext(SupashipContext)
    if (!context) {
      throw new Error('useFeatureContext must be used within a SupashipProvider')
    }
    return {
      updateContext: context.updateContext,
      getContext: context.getContext,
    }
  }

  const { useFeature, useFeatures } = createFeatureHooks(useClient, useQuery)

  return {
    SupashipProvider,
    useClient,
    useFeatureContext,
    useFeature,
    useFeatures,
    useQuery,
    useQueryClient,
    queryCache,
    QueryClient,
    getInitialQueryState,
  }
}
