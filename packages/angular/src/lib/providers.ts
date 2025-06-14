import { inject, Injectable, InjectionToken, Provider } from '@angular/core'
import {
  DarkFeatureClient,
  DarkFeatureConfig,
  DarkFeaturePlugin as DarkFeatureJSPlugin,
} from '@darkfeature/sdk-javascript'

// Injection token for the DarkFeature client
export const DARK_FEATURE_CLIENT = new InjectionToken<DarkFeatureClient>('DarkFeatureClient')

// Injection token for the configuration
export const DARK_FEATURE_CONFIG = new InjectionToken<DarkFeatureConfig>('DarkFeatureConfig')

// Injection token for plugins
export const DARK_FEATURE_PLUGINS = new InjectionToken<DarkFeatureJSPlugin[]>('DarkFeaturePlugins')

/**
 * Factory function to create a DarkFeature client
 */
export function createDarkFeatureClient(
  config: DarkFeatureConfig,
  plugins: DarkFeatureJSPlugin[] = []
): DarkFeatureClient {
  return new DarkFeatureClient({
    ...config,
    plugins: [...(config.plugins || []), ...plugins],
  })
}

/**
 * Provider factory for DarkFeature client
 */
export function provideDarkFeature(
  config: DarkFeatureConfig,
  plugins: DarkFeatureJSPlugin[] = []
): Provider[] {
  return [
    {
      provide: DARK_FEATURE_CONFIG,
      useValue: config,
    },
    {
      provide: DARK_FEATURE_PLUGINS,
      useValue: plugins,
    },
    {
      provide: DARK_FEATURE_CLIENT,
      useFactory: createDarkFeatureClient,
      deps: [DARK_FEATURE_CONFIG, DARK_FEATURE_PLUGINS],
    },
  ]
}

/**
 * Injectable service to access the DarkFeature client
 */
@Injectable()
export class DarkFeatureService {
  private readonly client = inject(DARK_FEATURE_CLIENT)

  getClient(): DarkFeatureClient {
    return this.client
  }

  updateContext(context: Record<string, unknown>, mergeWithExisting: boolean = true): void {
    this.client.updateContext(context, mergeWithExisting)
  }

  getContext(): Record<string, unknown> | undefined {
    return this.client.getContext()
  }
}
