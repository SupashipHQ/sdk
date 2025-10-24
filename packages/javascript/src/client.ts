import { SupaClientConfig, FeatureContext, FeatureValue, NetworkConfig, NoInfer } from './types'
import { retry } from './utils'
import { SupaPlugin } from './plugins/types'
import { DEFAULT_FEATURES_URL, DEFAULT_EVENTS_URL } from './constants'

type RequiredRetryConfig = Required<NonNullable<NetworkConfig['retry']>>
type ResolvedNetworkConfig = {
  featuresAPIUrl: string
  eventsAPIUrl: string
  retry: RequiredRetryConfig
  requestTimeoutMs: number
}

export class SupaClient<TFeatures extends Record<string, FeatureValue>> {
  private apiKey: string
  private environment: string
  private defaultContext?: FeatureContext
  private plugins: SupaPlugin[]
  private featureDefinitions: TFeatures

  private fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  private networkConfig: ResolvedNetworkConfig

  constructor(config: NoInfer<SupaClientConfig<TFeatures>>) {
    this.apiKey = config.apiKey
    this.environment = config.environment
    this.defaultContext = config.context
    this.plugins = config.plugins || []
    this.featureDefinitions = config.features

    this.networkConfig = {
      featuresAPIUrl: config.networkConfig?.featuresAPIUrl || DEFAULT_FEATURES_URL,
      eventsAPIUrl: config.networkConfig?.eventsAPIUrl || DEFAULT_EVENTS_URL,
      retry: {
        enabled: config.networkConfig?.retry?.enabled ?? true,
        maxAttempts: config.networkConfig?.retry?.maxAttempts ?? 3,
        backoff: config.networkConfig?.retry?.backoff ?? 1000,
      },
      requestTimeoutMs: config.networkConfig?.requestTimeoutMs ?? 10000,
    }

    // Prefer injected fetch, then global fetch if available
    const globalFetch: typeof fetch | undefined =
      typeof globalThis !== 'undefined'
        ? (globalThis as unknown as { fetch?: typeof fetch }).fetch
        : undefined
    if (config.networkConfig?.fetchFn) {
      this.fetchImpl = config.networkConfig.fetchFn
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
    featureName: keyof TFeatures,
    options?: { context?: FeatureContext }
  ): Promise<T> {
    const { context } = options ?? {}

    // Only merge context if it's defined and not null
    const mergedContext: FeatureContext | undefined =
      typeof context === 'object' && context !== null
        ? { ...(this.defaultContext ?? {}), ...context }
        : this.defaultContext

    try {
      const response = await this.getFeatures([featureName as string], {
        context: mergedContext,
      })

      // Get the specific feature value
      const value = response[featureName as string]
      return value as T
    } catch (error) {
      // Run onError hooks
      await Promise.all(this.plugins.map(plugin => plugin.onError?.(error as Error, mergedContext)))

      // Use fallback feature value when API fails
      const fallbackValue = this.featureDefinitions[featureName]

      // Notify plugins that fallback was used
      await Promise.all(
        this.plugins.map(plugin =>
          plugin.onFallbackUsed?.(
            featureName as string,
            fallbackValue as FeatureValue,
            error as Error
          )
        )
      )
      return fallbackValue as T
    }
  }

  async getFeatures(
    featureNames: (keyof TFeatures)[],
    options?: { context?: FeatureContext }
  ): Promise<Record<string, FeatureValue>> {
    const { context: contextOverride } = options ?? {}

    // Only merge context if it's defined and not null
    const mergedContext: FeatureContext | undefined =
      typeof contextOverride === 'object' && contextOverride !== null
        ? { ...(this.defaultContext ?? {}), ...contextOverride }
        : this.defaultContext

    // Notify plugins of context update for this request
    if (contextOverride) {
      await Promise.all(
        this.plugins.map(plugin =>
          plugin.onContextUpdate?.(this.defaultContext, mergedContext!, 'request')
        )
      )
    }

    // Convert feature names to strings for API call
    const featureNamesArray = featureNames.map(name => name as string)

    try {
      // Run beforeGetFeatures hooks
      await Promise.all(
        this.plugins.map(plugin => plugin.beforeGetFeatures?.(featureNamesArray, mergedContext))
      )

      type FeaturesResponse = { features: Record<string, { variation: FeatureValue }> }
      const fetchFeatures = async (): Promise<Record<string, FeatureValue>> => {
        const url = this.networkConfig.featuresAPIUrl
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        }
        const body = JSON.stringify({
          apiKey: this.apiKey,
          environment: this.environment,
          features: featureNamesArray,
          context: mergedContext,
        })

        // Notify plugins before request
        await Promise.all(this.plugins.map(plugin => plugin.beforeRequest?.(url, body, headers)))

        const startTime = Date.now()
        // Support timeout via AbortController when available
        const AbortCtrl: typeof AbortController | undefined =
          typeof globalThis !== 'undefined'
            ? (globalThis as unknown as { AbortController?: typeof AbortController })
                .AbortController
            : undefined
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

        const data = (await response.json()) as FeaturesResponse
        const result: Record<string, FeatureValue> = {}

        featureNamesArray.forEach(name => {
          const variation = data.features[name]?.variation
          result[name] = this.getVariationValue(
            variation,
            this.featureDefinitions[name as keyof TFeatures]
          )
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
      await Promise.all(
        this.plugins.map(plugin => plugin.afterGetFeatures?.(result, mergedContext))
      )

      // Return the fetched features
      return result
    } catch (error) {
      // Run onError hooks
      await Promise.all(this.plugins.map(plugin => plugin.onError?.(error as Error, mergedContext)))

      // Create fallback result with requested feature names
      const fallbackResult: Record<string, FeatureValue> = {}

      featureNamesArray.forEach(featureName => {
        fallbackResult[featureName] = this.featureDefinitions[featureName as keyof TFeatures]

        // Notify plugins that fallback was used for each feature
        Promise.all(
          this.plugins.map(plugin =>
            plugin.onFallbackUsed?.(
              featureName,
              this.featureDefinitions[featureName as keyof TFeatures],
              error as Error
            )
          )
        ).catch(console.error)
      })

      return fallbackResult
    }
  }
}
