import { DarkFeaturePlugin, PluginConfig } from "./types";
import { FeatureContext, FeatureValue } from "../types";

export interface LocalDevPluginConfig extends PluginConfig {
  features: Record<string, FeatureValue>;
  overrides?: Record<string, FeatureValue>;
}

export class LocalDevPlugin implements DarkFeaturePlugin {
  name = "local-dev";
  private enabled: boolean;
  private features: Record<string, FeatureValue>;
  private overrides: Record<string, FeatureValue>;

  constructor(config: LocalDevPluginConfig) {
    this.enabled = config.enabled ?? true;
    this.features = config.features;
    this.overrides = config.overrides || {};
  }

  async beforeGetFeature(
    featureName: string,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled) return;

    // If there's an override, throw an error to prevent the API call
    if (featureName in this.overrides) {
      throw new Error("LOCAL_OVERRIDE");
    }
  }

  async afterGetFeature(
    featureName: string,
    value: FeatureValue,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled) return;

    // If the feature is not in the API response, use the local value
    if (value === null && featureName in this.features) {
      throw new Error("LOCAL_FALLBACK");
    }
  }

  async beforeGetFeatures(
    featureNames: string[],
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled) return;

    // If any feature has an override, throw an error to prevent the API call
    if (featureNames.some((name) => name in this.overrides)) {
      throw new Error("LOCAL_OVERRIDE");
    }
  }

  async afterGetFeatures(
    results: Record<string, FeatureValue>,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled) return;

    // For any feature not in the API response, use the local value
    Object.entries(this.features).forEach(([name, value]) => {
      if (results[name] === null) {
        results[name] = value;
      }
    });
  }

  // Method to update overrides at runtime
  setOverride(featureName: string, value: FeatureValue): void {
    this.overrides[featureName] = value;
  }

  // Method to remove an override
  removeOverride(featureName: string): void {
    delete this.overrides[featureName];
  }

  // Method to clear all overrides
  clearOverrides(): void {
    this.overrides = {};
  }
}
