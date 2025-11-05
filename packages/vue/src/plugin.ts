import { App, Plugin, inject, InjectionKey } from 'vue'
import {
  SupaClient,
  SupaClientConfig,
  FeatureContext,
  FeatureValue,
  FeaturesWithFallbacks,
  SupaToolbarOverrideChange,
  SupaToolbarPluginConfig,
} from '@supashiphq/javascript-sdk'
import { useQueryClient } from './query'

export type SupashipVuePluginConfig<
  TFeatures extends FeaturesWithFallbacks = FeaturesWithFallbacks,
> = Omit<SupaClientConfig, 'plugins' | 'toolbar' | 'features'> & {
  features: TFeatures
}

export interface SupaContextValue<TFeatures extends FeaturesWithFallbacks> {
  client: SupaClient<TFeatures>
  features: TFeatures
  updateContext: (context: FeatureContext, mergeWithExisting?: boolean) => void
  getContext: () => FeatureContext | undefined
}

// Injection key for Vue's provide/inject
const SupashipContextKey: InjectionKey<SupaContextValue<FeaturesWithFallbacks>> =
  Symbol('SupashipContext')

export interface SupashipVuePluginOptions<
  TFeatures extends FeaturesWithFallbacks = FeaturesWithFallbacks,
> {
  config: SupashipVuePluginConfig<TFeatures>
  toolbar?: SupaToolbarPluginConfig | boolean
}

// Default toolbar config (stable reference)
const DEFAULT_TOOLBAR_CONFIG: SupaToolbarPluginConfig = { enabled: 'auto' }

/**
 * Creates a Vue plugin for Supaship
 * @param options Configuration options for the Supaship client
 * @returns Vue plugin
 */
export function createSupaship<TFeatures extends FeaturesWithFallbacks>(
  options: SupashipVuePluginOptions<TFeatures>
): Plugin {
  const { config, toolbar } = options

  return {
    install(app: App): void {
      const queryClient = useQueryClient()

      // Use default if toolbar not provided
      const effectiveToolbar = toolbar ?? DEFAULT_TOOLBAR_CONFIG

      // Stable callback for toolbar override changes
      const handleOverrideChange = (
        featureOverride: SupaToolbarOverrideChange,
        allOverrides: Record<string, FeatureValue>
      ): void => {
        // Call user's onOverrideChange if provided
        if (typeof effectiveToolbar === 'object' && effectiveToolbar.onOverrideChange) {
          effectiveToolbar.onOverrideChange(featureOverride, allOverrides)
        }

        // Always invalidate cache to trigger refetch
        // The JavaScript SDK's toolbar plugin applies overrides in afterGetFeatures hook
        // So a refetch is needed for the override to take effect

        if (!featureOverride.feature || Object.keys(allOverrides).length === 0) {
          // Reset all overrides: invalidate all queries
          queryClient.invalidateQueriesByPrefix(['feature'])
          queryClient.invalidateQueriesByPrefix(['features'])
        } else {
          // Single feature override changed: invalidate that feature
          queryClient.invalidateQueriesByPrefix(['feature', featureOverride.feature])
          // Also invalidate multi-feature queries
          queryClient.invalidateQueriesByPrefix(['features'])
        }
      }

      // Merge toolbar config with Vue Query cache invalidation
      const toolbarConfig =
        effectiveToolbar === false
          ? false
          : {
              ...(typeof effectiveToolbar === 'object' ? effectiveToolbar : {}),
              onOverrideChange: handleOverrideChange,
            }

      const client = new SupaClient<TFeatures>({
        ...config,
        toolbar: toolbarConfig,
      })

      const updateContext = (context: FeatureContext, mergeWithExisting: boolean = true): void => {
        client.updateContext(context, mergeWithExisting)
      }

      const getContext = (): FeatureContext | undefined => {
        return client.getContext()
      }

      const contextValue: SupaContextValue<TFeatures> = {
        client,
        features: config.features,
        updateContext,
        getContext,
      }

      // Provide the context to the app with features type preserved
      app.provide(SupashipContextKey, contextValue as SupaContextValue<TFeatures>)

      // Cleanup on app unmount
      app.config.globalProperties.$supaship = client

      // Note: Vue 3 doesn't have a built-in unmount hook for plugins
      // Users should manually cleanup if needed, or we rely on garbage collection
    },
  }
}

/**
 * Composable to access the Supaship client
 * The features type will be inferred from the createSupaship config
 */
export function useClient(): SupaClient<FeaturesWithFallbacks> {
  const context = inject(SupashipContextKey)
  if (!context) {
    throw new Error(
      'useClient must be used within a component tree that has the Supaship plugin installed'
    )
  }
  return context.client
}

/**
 * Internal composable to access feature definitions with type safety
 * @internal
 */
export function useFeatureDefinitions<
  TFeatures extends FeaturesWithFallbacks = FeaturesWithFallbacks,
>(): TFeatures {
  const context = inject(SupashipContextKey)
  if (!context) {
    throw new Error(
      'useFeatureDefinitions must be used within a component tree that has the Supaship plugin installed'
    )
  }
  return context.features as TFeatures
}

/**
 * Composable to update the context dynamically
 * Useful when context depends on authentication or other async operations
 */
export function useFeatureContext(): {
  updateContext: (context: FeatureContext, mergeWithExisting?: boolean) => void
  getContext: () => FeatureContext | undefined
} {
  const context = inject(SupashipContextKey)
  if (!context) {
    throw new Error(
      'useFeatureContext must be used within a component tree that has the Supaship plugin installed'
    )
  }
  return {
    updateContext: context.updateContext,
    getContext: context.getContext,
  }
}
