import {
  SupaClientConfig,
  FeatureContext,
  FeatureValue,
  NetworkConfig,
  Features,
  FeaturesWithFallbacks,
} from './types'
import { retry } from './utils'
import { SupaPlugin } from './plugins/types'
import { SupaToolbarPlugin } from './plugins/toolbar-plugin'
import { DEFAULT_FEATURES_URL, DEFAULT_EVENTS_URL } from './constants'

type RequiredRetryConfig = Required<NonNullable<NetworkConfig['retry']>>
type ResolvedNetworkConfig = {
  featuresAPIUrl: string
  eventsAPIUrl: string
  retry: RequiredRetryConfig
  requestTimeoutMs: number
}

export class SupaClient<TFeatures extends FeaturesWithFallbacks> {
  private sdkKey: string
  private environment: string
  private defaultContext?: FeatureContext
  private plugins: SupaPlugin[]
  private featureDefinitions: Features<TFeatures>
  private clientId: string
  private sensitiveContextProperties: Set<string>

  private fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  private networkConfig: ResolvedNetworkConfig

  constructor(config: SupaClientConfig & { features: TFeatures }) {
    this.sdkKey = config.sdkKey
    this.environment = config.environment
    this.defaultContext = config.context
    this.featureDefinitions = config.features as Features<TFeatures>
    this.sensitiveContextProperties = new Set(config.sensitiveContextProperties ?? [])

    // Generate unique client ID
    this.clientId = this.generateClientId()

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

    if (config.networkConfig?.fetchFn) {
      this.fetchFn = config.networkConfig.fetchFn
    }

    // Initialize plugins with automatic toolbar plugin in browser
    this.plugins = this.initializePlugins(config)

    // Initialize plugins with available features and their fallback values
    Promise.all(
      this.plugins.map(plugin =>
        plugin.onInit?.({
          clientId: this.clientId,
          availableFeatures: this.featureDefinitions,
          context: this.defaultContext,
        })
      )
    ).catch(console.error)
  }

  /**
   * Hashes configured sensitive context fields before sending requests.
   */
  private async hashSensitiveContext(
    context?: FeatureContext
  ): Promise<FeatureContext | undefined> {
    if (!context || this.sensitiveContextProperties.size === 0) {
      return context
    }

    const transformedContext = { ...context }
    const sensitiveEntries = Object.entries(context).filter(([key]) =>
      this.sensitiveContextProperties.has(key)
    )

    for (const [key, value] of sensitiveEntries) {
      if (value === null || value === undefined) {
        continue
      }

      transformedContext[key] = await this.hashStringValue(String(value))
    }

    return transformedContext
  }

  private async hashStringValue(value: string): Promise<string> {
    const subtleCrypto = (globalThis as unknown as { crypto?: { subtle?: SubtleCrypto } }).crypto
      ?.subtle
    const subtleAlgorithm = 'SHA-256'

    if (subtleCrypto && typeof TextEncoder !== 'undefined') {
      const digest = await subtleCrypto.digest(subtleAlgorithm, new TextEncoder().encode(value))
      return this.toHexString(digest)
    }

    const { createHash } = await import('node:crypto')
    return createHash('sha256').update(value).digest('hex')
  }

  private toHexString(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Generate a unique client ID
   */
  private generateClientId(): string {
    return `supaship-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Initialize plugins with automatic toolbar plugin in browser environments
   */
  private initializePlugins(config: SupaClientConfig & { features: TFeatures }): SupaPlugin[] {
    const plugins = config.plugins || []

    // Check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

    // If toolbar is explicitly disabled, don't add it
    if (config.toolbar === false) {
      return plugins
    }

    // If in browser and toolbar not disabled, add it automatically
    if (isBrowser) {
      // Check if user already added toolbar plugin manually
      const hasToolbarPlugin = plugins.some(p => p.name === 'toolbar-plugin')

      if (!hasToolbarPlugin) {
        // Add toolbar with user config or defaults
        const toolbarConfig = config.toolbar || { enabled: 'auto' }
        const toolbarPlugin = new SupaToolbarPlugin(toolbarConfig)
        return [toolbarPlugin, ...plugins]
      }
    }

    return plugins
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

  /**
   * Gets the fallback value for a feature from its definition
   */
  getFeatureFallback<TKey extends keyof TFeatures>(featureName: TKey): Features<TFeatures>[TKey] {
    return this.featureDefinitions[featureName]
  }

  private getVariationValue(variation: unknown, fallback: FeatureValue): FeatureValue {
    if (variation !== undefined && variation !== null) {
      return variation as FeatureValue
    }

    return fallback ?? null
  }

  async getFeature<TKey extends keyof TFeatures>(
    featureName: TKey,
    options?: { context?: FeatureContext }
  ): Promise<Features<TFeatures>[TKey]> {
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
      return value as Features<TFeatures>[TKey]
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
      return fallbackValue as Features<TFeatures>[TKey]
    }
  }

  async getFeatures<TKeys extends readonly (keyof TFeatures)[]>(
    featureNames: TKeys,
    options?: { context?: FeatureContext }
  ): Promise<{ [K in TKeys[number]]: Features<TFeatures>[K] }> {
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
          Authorization: `Bearer ${this.sdkKey}`,
        }
        const requestContext = await this.hashSensitiveContext(mergedContext)
        const body = JSON.stringify({
          environment: this.environment,
          features: featureNamesArray,
          context: requestContext,
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
          // Prefer an injected fetchFn (e.g. node-fetch for Node < 18), then
          // fall back to the global fetch available in browsers and Node ≥ 18.
          // Using `typeof fetch` avoids a globalThis bracket-access pattern
          // that static-analysis tools (e.g. socket.dev) flag as suspicious.
          const fetchImpl =
            this.fetchFn ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined)
          if (!fetchImpl) {
            throw new Error(
              'No fetch implementation available. Provide fetchFn in config or use a runtime with global fetch (e.g., Node 18+, browsers).'
            )
          }

          response = await fetchImpl(url, {
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
      return result as { [K in TKeys[number]]: Features<TFeatures>[K] }
    } catch (error) {
      if (featureNamesArray.length === 0) {
        throw error
      }

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

      return fallbackResult as { [K in TKeys[number]]: Features<TFeatures>[K] }
    }
  }
}
