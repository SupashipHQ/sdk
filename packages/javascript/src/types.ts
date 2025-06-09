import { DarkFeaturePlugin } from "./plugins/types";

export interface FeatureContext {
  [key: string]: any;
}

export interface FeatureResponse {
  features: {
    [key: string]: {
      variation: string;
      metadata?: {
        description?: string;
        type?: string;
        lastUpdated?: string;
      };
    };
  };
}

export interface RetryConfig {
  enabled?: boolean;
  maxAttempts?: number;
  backoff?: number;
}

export interface DarkFeatureConfig {
  apiKey: string;
  baseUrl?: string;
  context?: FeatureContext;
  retry?: RetryConfig;
  plugins?: DarkFeaturePlugin[];
}

export type FeatureValue = string | number | boolean | null;

export interface FeaturesOptions {
  features: Record<string, FeatureValue>;
  context?: FeatureContext;
}

export interface FeatureOptions {
  fallback?: FeatureValue;
  context?: FeatureContext;
}

export type FeatureVariation = string | number | boolean;
