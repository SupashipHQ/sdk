import { DarkFeaturePlugin, PluginConfig } from './types'
import { FeatureContext, FeatureValue } from '../types'

export interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

export interface LoggingPluginConfig extends PluginConfig {
  level?: 'debug' | 'info' | 'warn' | 'error'
}

export class LoggingPlugin implements DarkFeaturePlugin {
  name = 'logging'
  private logger: DefaultLogger
  private enabled: boolean

  constructor(config: LoggingPluginConfig = {}) {
    this.enabled = config.enabled ?? true
    this.logger = new DefaultLogger(config.level)
  }

  async beforeGetFeature(featureName: string, context?: FeatureContext): Promise<void> {
    if (!this.enabled) return
    this.logger.debug('Getting feature', { featureName, context })
  }

  async afterGetFeature(
    featureName: string,
    value: FeatureValue,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled) return
    this.logger.debug('Got feature value', { featureName, value, context })
  }

  async beforeGetFeatures(featureNames: string[], context?: FeatureContext): Promise<void> {
    if (!this.enabled) return
    this.logger.debug('Getting features', { featureNames, context })
  }

  async afterGetFeatures(
    results: Record<string, FeatureValue>,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled) return
    this.logger.debug('Got feature values', { results, context })
  }

  async onError(error: Error, context?: FeatureContext): Promise<void> {
    if (!this.enabled) return
    this.logger.error('Error occurred', { error, context })
  }
}

class DefaultLogger implements Logger {
  private level: 'debug' | 'info' | 'warn' | 'error'
  private enabled: boolean

  constructor(level: 'debug' | 'info' | 'warn' | 'error' = 'info', enabled: boolean = true) {
    this.level = level
    this.enabled = enabled
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    if (!this.enabled) return false
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    return levels[level] >= levels[this.level]
  }

  debug(_message: string, ..._args: unknown[]): void {
    if (this.shouldLog('debug')) {
      // Replace console statements with a logger or remove them if not needed
    }
  }

  info(_message: string, ..._args: unknown[]): void {
    if (this.shouldLog('info')) {
      // Replace console statements with a logger or remove them if not needed
    }
  }

  warn(_message: string, ..._args: unknown[]): void {
    if (this.shouldLog('warn')) {
      // Replace console statements with a logger or remove them if not needed
    }
  }

  error(_message: string, ..._args: unknown[]): void {
    if (this.shouldLog('error')) {
      // Replace console statements with a logger or remove them if not needed
    }
  }
}
