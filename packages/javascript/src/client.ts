import {
  SupaClientConfig,
  FeatureContext,
  FeaturesOptions,
  FeatureValue,
  FeatureOptions,
  NetworkConfig,
} from './types'
import { retry } from './utils'
import { SupaPlugin } from './plugins/types'

const DEFAULT_FEATURES_URL = 'https://edge.supaship.com/v1/features'
const DEFAULT_EVENTS_URL = 'https://edge.supaship.com/v1/events'

type DeepRequired<T> = {
  [K in keyof T]-?: T[K] extends object ? DeepRequired<T[K]> : T[K]
}

export class SupaClient {
  private apiKey: string
  private environment: string
  private defaultContext?: FeatureContext
  private plugins: SupaPlugin[]

  private fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  private networkConfig: DeepRequired<NetworkConfig>

  constructor(config: SupaClientConfig) {
    this.apiKey = config.apiKey
    this.environment = config.environment
    this.defaultContext = config.context
    this.plugins = config.plugins || []

    this.networkConfig = {
      featuresAPIUrl: config.networkConfig?.featuresAPIUrl || DEFAULT_FEATURES_URL,
      eventsAPIUrl: config.networkConfig?.eventsAPIUrl || DEFAULT_EVENTS_URL,
      retry: {
        enabled: config.networkConfig?.retry?.enabled ?? true,
        maxAttempts: config.networkConfig?.retry?.maxAttempts ?? 3,
        backoff: config.networkConfig?.retry?.backoff ?? 1000,
      },
      requestTimeoutMs: config.networkConfig?.requestTimeoutMs ?? 10000,
      fetchFn: config.networkConfig?.fetchFn as (
        input: RequestInfo | URL,
        init?: RequestInit
      ) => Promise<Response>,
    }

    // Prefer injected fetch, then global fetch if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalFetch = (globalThis as any)?.fetch as typeof fetch | undefined
    if (config.networkConfig?.fetchFn) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.fetchImpl = config.networkConfig.fetchFn as any
    } else if (typeof globalFetch === 'function') {
      this.fetchImpl = globalFetch.bind(globalThis)
    } else {
      throw new Error(
        'No fetch implementation available. Provide fetchFn in config or use a runtime with global fetch (e.g., Node 18+, browsers).'
      )
    }
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

      // Notify plugins that fallback was used
      await Promise.all(
        this.plugins.map(plugin =>
          plugin.onFallbackUsed?.(featureName, fallback as FeatureValue, error as Error)
        )
      )
      return fallback as unknown as T
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
        const url = this.networkConfig.featuresAPIUrl
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        }
        const body = JSON.stringify({
          apiKey: this.apiKey,
          environment: this.environment,
          features: featureNames,
          context,
        })

        // Notify plugins before request
        await Promise.all(this.plugins.map(plugin => plugin.beforeRequest?.(url, body, headers)))

        const startTime = Date.now()
        // Support timeout via AbortController when available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AbortCtrl: typeof AbortController | undefined = (globalThis as any)?.AbortController
        let controller: AbortController | undefined
        let timeoutId: ReturnType<typeof setTimeout> | undefined
        if (this.networkConfig.requestTimeoutMs && typeof AbortCtrl === 'function') {
          controller = new AbortCtrl()
          timeoutId = setTimeout(() => controller?.abort(), this.networkConfig.requestTimeoutMs)
        }
        let response: Response
        try {
          response = await this.fetchImpl(url, {
            method: 'POST',
            headers,
            body,
            signal: controller?.signal,
          })
        } finally {
          if (timeoutId) clearTimeout(timeoutId)
        }
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

      const result = this.networkConfig.retry.enabled
        ? await retry(
            fetchFeatures,
            this.networkConfig.retry.maxAttempts,
            this.networkConfig.retry.backoff,
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

      // Notify plugins that fallbacks were used
      if (options.features && Object.keys(options.features).length > 0) {
        await Promise.all(
          Object.entries(options.features).map(([featureName, fallbackValue]) =>
            Promise.all(
              this.plugins.map(plugin =>
                plugin.onFallbackUsed?.(featureName, fallbackValue as FeatureValue, error as Error)
              )
            )
          )
        )
      }

      return (options.features || {}) as unknown as T
    }
  }
}
