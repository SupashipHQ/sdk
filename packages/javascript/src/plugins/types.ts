import { FeatureContext, FeatureValue } from '../types'

export interface SupaPluginConfig {
  enabled?: boolean
}
interface Plugin {
  name: string
  initialize?(): Promise<void>
  cleanup?(): Promise<void>
}

export interface SupaPlugin extends Plugin {
  beforeGetFeatures?(featureNames: string[], context?: FeatureContext): Promise<void>
  afterGetFeatures?(results: Record<string, FeatureValue>, context?: FeatureContext): Promise<void>
  onError?(error: Error, context?: FeatureContext): Promise<void>

  // Network lifecycle hooks for observability
  beforeRequest?(url: string, body: unknown, headers: Record<string, string>): Promise<void>
  afterResponse?(response: Response, timing: { duration: number }): Promise<void>

  // Context tracking for session replay and user journey analysis
  onContextUpdate?(
    oldContext: FeatureContext | undefined,
    newContext: FeatureContext,
    source: 'updateContext' | 'request'
  ): Promise<void>

  // Retry and fallback tracking for reliability monitoring
  onRetryAttempt?(attempt: number, error: Error, willRetry: boolean): Promise<void>
  onFallbackUsed?(featureName: string, fallbackValue: FeatureValue, reason: Error): Promise<void>
}
