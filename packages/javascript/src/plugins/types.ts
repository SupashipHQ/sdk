import { FeatureContext, FeatureValue } from "../types";

export interface Plugin {
  name: string;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
}

export interface DarkFeaturePlugin extends Plugin {
  beforeGetFeature?(
    featureName: string,
    context?: FeatureContext
  ): Promise<void>;
  afterGetFeature?(
    featureName: string,
    value: FeatureValue,
    context?: FeatureContext
  ): Promise<void>;
  beforeGetFeatures?(
    featureNames: string[],
    context?: FeatureContext
  ): Promise<void>;
  afterGetFeatures?(
    results: Record<string, FeatureValue>,
    context?: FeatureContext
  ): Promise<void>;
  onError?(error: Error, context?: FeatureContext): Promise<void>;
}

export interface PluginConfig {
  enabled?: boolean;
  [key: string]: any;
}
