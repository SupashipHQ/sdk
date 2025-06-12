import { DarkFeaturePlugin, PluginConfig } from './types'
import { FeatureContext, FeatureValue } from '../types'

export interface ObservabilityPluginConfig extends PluginConfig {
  metricsEndpoint?: string
  includeTimings?: boolean
  includePayloads?: boolean
}

interface MetricEvent {
  type: 'request' | 'response' | 'retry' | 'fallback' | 'context_update'
  timestamp: number
  data: Record<string, unknown>
}

export class ObservabilityPlugin implements DarkFeaturePlugin {
  name = 'observability'
  private enabled: boolean
  private metricsEndpoint: string
  private includeTimings: boolean
  private includePayloads: boolean
  private events: MetricEvent[] = []
  private requestStartTimes = new Map<string, number>()

  constructor(config: ObservabilityPluginConfig = {}) {
    this.enabled = config.enabled ?? true
    this.metricsEndpoint = config.metricsEndpoint || '/metrics'
    this.includeTimings = config.includeTimings ?? true
    this.includePayloads = config.includePayloads ?? false
  }

  async beforeGetFeatures(featureNames: string[], context?: FeatureContext): Promise<void> {
    if (!this.enabled) return

    this.events.push({
      type: 'request',
      timestamp: Date.now(),
      data: {
        featureCount: featureNames.length,
        features: featureNames,
        hasContext: !!context,
        contextKeys: context ? Object.keys(context) : [],
      },
    })
  }

  async beforeRequest(url: string, body: unknown, headers: Record<string, string>): Promise<void> {
    if (!this.enabled) return

    const requestId = this.generateRequestId()
    this.requestStartTimes.set(requestId, Date.now())

    this.events.push({
      type: 'request',
      timestamp: Date.now(),
      data: {
        url,
        method: 'POST',
        hasAuth: !!headers.Authorization,
        payloadSize: this.includePayloads ? JSON.stringify(body).length : undefined,
        payload: this.includePayloads ? body : undefined,
      },
    })
  }

  async afterResponse(response: Response, timing: { duration: number }): Promise<void> {
    if (!this.enabled) return

    this.events.push({
      type: 'response',
      timestamp: Date.now(),
      data: {
        status: response.status,
        statusText: response.statusText,
        duration: timing.duration,
        success: response.ok,
        responseSize: response.headers.get('content-length'),
      },
    })

    // Send metrics if we have accumulated enough events
    if (this.events.length >= 10) {
      await this.flushMetrics()
    }
  }

  async afterGetFeatures(
    results: Record<string, FeatureValue>,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled) return

    this.events.push({
      type: 'response',
      timestamp: Date.now(),
      data: {
        featureCount: Object.keys(results).length,
        features: Object.keys(results),
        hasNullValues: Object.values(results).some(v => v === null),
        contextPresent: !!context,
      },
    })
  }

  async onContextUpdate(
    oldContext: FeatureContext | undefined,
    newContext: FeatureContext,
    source: 'updateContext' | 'request'
  ): Promise<void> {
    if (!this.enabled) return

    this.events.push({
      type: 'context_update',
      timestamp: Date.now(),
      data: {
        source,
        oldContextKeys: oldContext ? Object.keys(oldContext) : [],
        newContextKeys: Object.keys(newContext),
        keysAdded: this.getKeysAdded(oldContext, newContext),
        keysRemoved: this.getKeysRemoved(oldContext, newContext),
        keysChanged: this.getKeysChanged(oldContext, newContext),
      },
    })
  }

  async onRetryAttempt(attempt: number, error: Error, willRetry: boolean): Promise<void> {
    if (!this.enabled) return

    this.events.push({
      type: 'retry',
      timestamp: Date.now(),
      data: {
        attempt,
        errorType: error.constructor.name,
        errorMessage: error.message,
        willRetry,
        finalAttempt: !willRetry,
      },
    })
  }

  async onFallbackUsed(
    featureName: string,
    fallbackValue: FeatureValue,
    reason: Error
  ): Promise<void> {
    if (!this.enabled) return

    this.events.push({
      type: 'fallback',
      timestamp: Date.now(),
      data: {
        featureName,
        fallbackValue,
        fallbackType: typeof fallbackValue,
        reasonType: reason.constructor.name,
        reasonMessage: reason.message,
      },
    })
  }

  async onError(error: Error, context?: FeatureContext): Promise<void> {
    if (!this.enabled) return

    this.events.push({
      type: 'request',
      timestamp: Date.now(),
      data: {
        eventType: 'error',
        errorType: error.constructor.name,
        errorMessage: error.message,
        hasContext: !!context,
        contextKeys: context ? Object.keys(context) : [],
      },
    })

    // Immediately flush on errors for faster debugging
    await this.flushMetrics()
  }

  async cleanup(): Promise<void> {
    await this.flushMetrics()
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getKeysAdded(
    oldContext: FeatureContext | undefined,
    newContext: FeatureContext
  ): string[] {
    const oldKeys = new Set(oldContext ? Object.keys(oldContext) : [])
    const newKeys = Object.keys(newContext)
    return newKeys.filter(key => !oldKeys.has(key))
  }

  private getKeysRemoved(
    oldContext: FeatureContext | undefined,
    newContext: FeatureContext
  ): string[] {
    if (!oldContext) return []
    const newKeys = new Set(Object.keys(newContext))
    const oldKeys = Object.keys(oldContext)
    return oldKeys.filter(key => !newKeys.has(key))
  }

  private getKeysChanged(
    oldContext: FeatureContext | undefined,
    newContext: FeatureContext
  ): string[] {
    if (!oldContext) return []
    return Object.keys(newContext).filter(
      key => key in oldContext && oldContext[key] !== newContext[key]
    )
  }

  private async flushMetrics(): Promise<void> {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      // In a real implementation, this would send to your metrics endpoint
      console.debug('[ObservabilityPlugin] Metrics:', {
        eventCount: eventsToSend.length,
        timeRange: {
          start: Math.min(...eventsToSend.map(e => e.timestamp)),
          end: Math.max(...eventsToSend.map(e => e.timestamp)),
        },
        events: eventsToSend,
      })

      // Example: Send to metrics endpoint
      // await fetch(this.metricsEndpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ events: eventsToSend })
      // })
    } catch (error) {
      console.error('[ObservabilityPlugin] Failed to send metrics:', error)
      // Put events back in the queue on failure
      this.events.unshift(...eventsToSend)
    }
  }
}
