import { App, Plugin, inject, InjectionKey } from 'vue'
import {
  DarkFeatureClient,
  DarkFeatureConfig,
  DarkFeaturePlugin as DarkFeatureJSPlugin,
  FeatureContext,
} from '@darkfeature/sdk-javascript'

// Create a unique injection key for the DarkFeature client
export const DarkFeatureInjectionKey: InjectionKey<DarkFeatureClient> = Symbol('DarkFeature')

export interface DarkFeaturePluginOptions {
  config: DarkFeatureConfig
  plugins?: DarkFeatureJSPlugin[]
}

// Vue plugin to install DarkFeature
export const DarkFeaturePlugin: Plugin = {
  install(app: App, options: DarkFeaturePluginOptions) {
    const { config, plugins = [] } = options

    const client = new DarkFeatureClient({
      ...config,
      plugins: [...(config.plugins || []), ...plugins],
    })

    // Provide the client globally
    app.provide(DarkFeatureInjectionKey, client)

    // Also make it available as a global property for easier access
    app.config.globalProperties.$darkFeature = client
  },
}

// Composable to access the DarkFeature client
export function useDarkFeature(): DarkFeatureClient {
  const client = inject(DarkFeatureInjectionKey)
  if (!client) {
    throw new Error('DarkFeature client not found. Did you install the DarkFeaturePlugin?')
  }
  return client
}

// Composable for context management
export function useFeatureContext(): {
  updateContext: (context: FeatureContext, mergeWithExisting?: boolean) => void
  getContext: () => FeatureContext | undefined
} {
  const client = useDarkFeature()

  const updateContext = (context: FeatureContext, mergeWithExisting: boolean = true): void => {
    client.updateContext(context, mergeWithExisting)
  }

  const getContext = (): FeatureContext | undefined => {
    return client.getContext()
  }

  return {
    updateContext,
    getContext,
  }
}

// Note: Vue global properties can be accessed via app.config.globalProperties.$darkFeature
