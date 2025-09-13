import { SupaPlugin, SupaPluginConfig } from './types'
import { FeatureValue } from '../types'

export interface LocalDevPluginConfig extends SupaPluginConfig {
  features: Record<string, FeatureValue>
  overrides?: Record<string, FeatureValue>
}

export class LocalDevPlugin implements SupaPlugin {
  name = 'local-dev'
  private enabled: boolean
  private features: Record<string, FeatureValue>
  private overrides: Record<string, FeatureValue>

  constructor(config: LocalDevPluginConfig) {
    this.enabled = config.enabled ?? true
    this.features = config.features
    this.overrides = config.overrides || {}
  }

  async beforeGetFeatures(featureNames: string[]): Promise<void> {
    if (!this.enabled) return

    // If any feature has an override, throw an error to prevent the API call
    if (featureNames.some(name => name in this.overrides)) {
      throw new Error('LOCAL_OVERRIDE')
    }
  }

  async afterGetFeatures(results: Record<string, FeatureValue>): Promise<void> {
    if (!this.enabled) return

    // For any feature not in the API response, use the local value
    Object.entries(this.features).forEach(([name, value]) => {
      if (results[name] === null) {
        results[name] = value
      }
    })
  }

  // Method to update overrides at runtime
  setOverride(featureName: string, value: FeatureValue): void {
    this.overrides[featureName] = value
  }

  // Method to remove an override
  removeOverride(featureName: string): void {
    delete this.overrides[featureName]
  }

  // Method to clear all overrides
  clearOverrides(): void {
    this.overrides = {}
  }
}
