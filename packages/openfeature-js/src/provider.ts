import {
  EvaluationContext,
  JsonValue,
  Logger,
  OpenFeatureEventEmitter,
  Provider,
  ProviderMetadata,
  ProviderStatus,
  ResolutionDetails,
  TypeMismatchError,
  ErrorCode,
  StandardResolutionReasons,
} from '@openfeature/server-sdk'
import { SupaClient, FeatureContext, FeatureValue, Features } from '@supashiphq/javascript-sdk'

/**
 * Configuration for the Supaship OpenFeature provider
 */
export interface SupashipProviderConfig<TFeatures extends Features<Record<string, FeatureValue>>> {
  client: SupaClient<TFeatures>
}

/**
 * Supaship OpenFeature Provider
 * Integrates Supaship feature flags with OpenFeature SDK
 */
export class SupashipProvider<TFeatures extends Features<Record<string, FeatureValue>>>
  implements Provider
{
  readonly metadata: ProviderMetadata = {
    name: 'Supaship Provider',
  }

  readonly runsOn = 'server' as const
  readonly events = new OpenFeatureEventEmitter()

  private client: SupaClient<TFeatures>
  private _status: ProviderStatus = ProviderStatus.NOT_READY

  constructor(config: SupashipProviderConfig<TFeatures>) {
    this.client = config.client
  }

  get status(): ProviderStatus {
    return this._status
  }

  async initialize(): Promise<void> {
    this._status = ProviderStatus.READY
  }

  async onClose(): Promise<void> {
    this._status = ProviderStatus.NOT_READY
  }

  /**
   * Converts OpenFeature evaluation context to Supaship feature context
   */
  private convertContext(context?: EvaluationContext): FeatureContext | undefined {
    if (!context) return undefined

    // OpenFeature context is already compatible with our FeatureContext format
    return context as FeatureContext
  }

  /**
   * Validates that the feature value matches the expected type
   */
  private validateType(value: FeatureValue, expectedType: string): boolean {
    switch (expectedType) {
      case 'boolean':
        return typeof value === 'boolean'
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number'
      case 'object':
        return value !== null && typeof value === 'object'
      default:
        return false
    }
  }

  /**
   * Resolves a boolean feature flag
   */
  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    logger: Logger
  ): Promise<ResolutionDetails<boolean>> {
    try {
      const featureContext = this.convertContext(context)
      const value = await this.client.getFeature(flagKey as keyof TFeatures, {
        context: featureContext,
      })

      if (!this.validateType(value, 'boolean')) {
        throw new TypeMismatchError(`Feature "${flagKey}" is not a boolean. Got ${typeof value}`)
      }

      return {
        value: value as boolean,
        reason: StandardResolutionReasons.STATIC,
      }
    } catch (error) {
      logger.error(`Error evaluating boolean flag "${flagKey}":`, error)

      if (error instanceof TypeMismatchError) {
        throw error
      }

      // If the feature doesn't exist or there's an error, use the default
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.GENERAL,
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Resolves a string feature flag
   */
  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    logger: Logger
  ): Promise<ResolutionDetails<string>> {
    try {
      const featureContext = this.convertContext(context)
      const value = await this.client.getFeature(flagKey as keyof TFeatures, {
        context: featureContext,
      })

      if (!this.validateType(value, 'string')) {
        throw new TypeMismatchError(`Feature "${flagKey}" is not a string. Got ${typeof value}`)
      }

      return {
        value: String(value),
        reason: StandardResolutionReasons.STATIC,
      }
    } catch (error) {
      logger.error(`Error evaluating string flag "${flagKey}":`, error)

      if (error instanceof TypeMismatchError) {
        throw error
      }

      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.GENERAL,
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Resolves a number feature flag
   */
  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    logger: Logger
  ): Promise<ResolutionDetails<number>> {
    try {
      const featureContext = this.convertContext(context)
      const value = await this.client.getFeature(flagKey as keyof TFeatures, {
        context: featureContext,
      })

      if (!this.validateType(value, 'number')) {
        throw new TypeMismatchError(`Feature "${flagKey}" is not a number. Got ${typeof value}`)
      }

      return {
        value: Number(value),
        reason: StandardResolutionReasons.STATIC,
      }
    } catch (error) {
      logger.error(`Error evaluating number flag "${flagKey}":`, error)

      if (error instanceof TypeMismatchError) {
        throw error
      }

      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.GENERAL,
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Resolves an object feature flag
   */
  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    logger: Logger
  ): Promise<ResolutionDetails<T>> {
    try {
      const featureContext = this.convertContext(context)
      const value = await this.client.getFeature(flagKey as keyof TFeatures, {
        context: featureContext,
      })

      if (!this.validateType(value, 'object')) {
        throw new TypeMismatchError(`Feature "${flagKey}" is not an object. Got ${typeof value}`)
      }

      return {
        value: value as T,
        reason: StandardResolutionReasons.STATIC,
      }
    } catch (error) {
      logger.error(`Error evaluating object flag "${flagKey}":`, error)

      if (error instanceof TypeMismatchError) {
        throw error
      }

      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.GENERAL,
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
