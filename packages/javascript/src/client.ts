import {
  DarkFeatureConfig,
  FeatureContext,
  FeaturesOptions,
  FeatureValue,
  FeatureOptions,
} from './types'
import { retry } from './utils'
import { DarkFeaturePlugin } from './plugins/types'

export class DarkFeatureClient {
  private apiKey: string
  private environment: string
  private baseUrl: string
  private defaultContext?: FeatureContext
  private retryEnabled: boolean
  private maxRetries: number
  private retryBackoff: number
  private plugins: DarkFeaturePlugin[]

  constructor(config: DarkFeatureConfig) {
    this.apiKey = config.apiKey
    this.environment = config.environment
    this.baseUrl = config.baseUrl || 'https://edge.supaship.com/v1'
    this.defaultContext = config.context
    this.retryEnabled = config.retry?.enabled ?? true
    this.maxRetries = config.retry?.maxAttempts ?? 3
    this.retryBackoff = config.retry?.backoff ?? 1000
    this.plugins = config.plugins || []
  }

  /**
   * Updates the default context for the client
   * @param context - New context to merge with or replace the existing context
   * @param mergeWithExisting - Whether to merge with existing context (default: true)
   */
  updateContext(context: FeatureContext, mergeWithExisting: boolean = true): void {
    const oldContext = this.defaultContext

    if (mergeWithExisting && this.defaultContext) {
      this.defaultContext = { ...this.defaultContext, ...context }
    } else {
      this.defaultContext = context
    }

    // Notify plugins of context change
    Promise.all(
      this.plugins.map(plugin =>
        plugin.onContextUpdate?.(oldContext, this.defaultContext!, 'updateContext')
      )
    ).catch(console.error)
  }

  /**
   * Gets the current default context
   */
  getContext(): FeatureContext | undefined {
    return this.defaultContext
  }

  private getVariationValue(variation: FeatureValue, fallback: FeatureValue): FeatureValue {
    if (variation !== undefined && variation !== null) {
      return variation
    }

    return fallback ?? null
  }

  async getFeature<T extends FeatureValue = FeatureValue>(
    featureName: string,
    options?: FeatureOptions<T>
  ): Promise<T> {
    const { fallback, context } = options ?? {}

    // Only merge context if it's defined and not null
    const mergedContext =
      typeof context === 'object' && context !== null
        ? { ...this.defaultContext, ...context }
        : this.defaultContext

    try {
      const response = await this.getFeatures({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        features: { [featureName]: fallback ?? null } as any,
        context: mergedContext,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (response as any)[featureName] ?? fallback ?? null

      return value as unknown as T
    } catch (error) {
      // Run onError hooks
      await Promise.all(this.plugins.map(plugin => plugin.onError?.(error as Error, mergedContext)))

      if (fallback !== undefined) {
        // Notify plugins that fallback was used
        await Promise.all(
          this.plugins.map(plugin =>
            plugin.onFallbackUsed?.(featureName, fallback as FeatureValue, error as Error)
          )
        )
        return fallback as unknown as T
      }
      throw error
    }
  }

  async getFeatures<T extends Record<string, FeatureValue> = Record<string, FeatureValue>>(
    options: FeaturesOptions<T>
  ): Promise<T> {
    const context = {
      ...this.defaultContext,
      ...options.context,
    }

    // Notify plugins of context update for this request
    if (options.context) {
      await Promise.all(
        this.plugins.map(plugin =>
          plugin.onContextUpdate?.(this.defaultContext, context, 'request')
        )
      )
    }

    const featureNames = Object.keys(options.features)

    try {
      // Run beforeGetFeatures hooks
      await Promise.all(
        this.plugins.map(plugin => plugin.beforeGetFeatures?.(featureNames, context))
      )

      const fetchFeatures = async (): Promise<Record<string, FeatureValue>> => {
        const url = `${this.baseUrl}/features`
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        }
        const body = JSON.stringify({
          features: featureNames,
          environment: this.environment,
          context,
        })

        // Notify plugins before request
        await Promise.all(this.plugins.map(plugin => plugin.beforeRequest?.(url, body, headers)))

        const startTime = Date.now()
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
        })
        const duration = Date.now() - startTime

        // Notify plugins after response
        await Promise.all(
          this.plugins.map(plugin => plugin.afterResponse?.(response, { duration }))
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch features: ${response.statusText}`)
        }

        const data = await response.json()
        const result: Record<string, FeatureValue> = {}

        featureNames.forEach(name => {
          const variation = data.features[name]?.variation
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result[name] = this.getVariationValue(variation, (options.features as any)[name])
        })

        return result
      }

      const result = this.retryEnabled
        ? await retry(
            fetchFeatures,
            this.maxRetries,
            this.retryBackoff,
            (attempt, error, willRetry) => {
              // Notify plugins of retry attempts
              Promise.all(
                this.plugins.map(plugin => plugin.onRetryAttempt?.(attempt, error, willRetry))
              ).catch(console.error)
            }
          )
        : await fetchFeatures()

      // Run afterGetFeatures hooks
      await Promise.all(this.plugins.map(plugin => plugin.afterGetFeatures?.(result, context)))

      return result as unknown as T
    } catch (error) {
      // Run onError hooks
      await Promise.all(this.plugins.map(plugin => plugin.onError?.(error as Error, context)))

      // If fallbacks are provided and an error occurs, return fallback values
      if (options.features && Object.keys(options.features).length > 0) {
        // Notify plugins that fallbacks were used
        await Promise.all(
          Object.entries(options.features).map(([featureName, fallbackValue]) =>
            Promise.all(
              this.plugins.map(plugin =>
                plugin.onFallbackUsed?.(featureName, fallbackValue as FeatureValue, error as Error)
              )
            )
          )
        )
        return options.features as unknown as T
      }

      throw error
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup resources if needed
  }
}
