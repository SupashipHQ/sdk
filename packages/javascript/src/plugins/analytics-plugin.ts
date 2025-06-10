import { DarkFeaturePlugin, PluginConfig } from './types'
import { FeatureContext, FeatureValue } from '../types'

export interface AnalyticsPluginConfig extends PluginConfig {
  endpoint?: string
  batchSize?: number
  flushInterval?: number
}

interface AnalyticsEvent {
  type: 'impression' | 'conversion'
  featureName: string
  value: FeatureValue
  context: FeatureContext
  timestamp: number
}

export class AnalyticsPlugin implements DarkFeaturePlugin {
  name = 'analytics'
  private enabled: boolean
  private endpoint: string
  private batchSize: number
  private flushInterval: number
  private events: AnalyticsEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null

  constructor(config: AnalyticsPluginConfig = {}) {
    this.enabled = config.enabled ?? true
    this.endpoint = config.endpoint || 'https://edge.darkfeature.com/v1/events'
    this.batchSize = config.batchSize || 100
    this.flushInterval = config.flushInterval || 5000
  }

  async initialize(): Promise<void> {
    if (this.enabled) {
      this.startFlushTimer()
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents().catch(console.error)
    }, this.flushInterval)
  }

  private async flushEvents(): Promise<void> {
    if (this.events.length === 0) return

    const eventsToSend = this.events.splice(0, this.batchSize)
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
      })
    } catch (error) {
      // If sending fails, put the events back in the queue
      this.events.unshift(...eventsToSend)
      console.error('Failed to send analytics events:', error)
    }
  }

  async afterGetFeature(
    featureName: string,
    value: FeatureValue,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled || !context) return

    this.events.push({
      type: 'impression',
      featureName,
      value,
      context,
      timestamp: Date.now(),
    })

    if (this.events.length >= this.batchSize) {
      await this.flushEvents()
    }
  }

  async afterGetFeatures(
    results: Record<string, FeatureValue>,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled || !context) return

    Object.entries(results).forEach(([featureName, value]) => {
      this.events.push({
        type: 'impression',
        featureName,
        value,
        context,
        timestamp: Date.now(),
      })
    })

    if (this.events.length >= this.batchSize) {
      await this.flushEvents()
    }
  }

  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    await this.flushEvents()
  }

  // Method to track conversions (can be called by the application)
  async trackConversion(
    featureName: string,
    value: FeatureValue,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled || !context) return

    this.events.push({
      type: 'conversion',
      featureName,
      value,
      context,
      timestamp: Date.now(),
    })

    if (this.events.length >= this.batchSize) {
      await this.flushEvents()
    }
  }
}
