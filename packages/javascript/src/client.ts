import {
  DarkFeatureConfig,
  FeatureContext,
  FeaturesOptions,
  FeatureValue,
  FeatureOptions,
} from "./types";
import { retry } from "./utils";
import { DarkFeaturePlugin } from "./plugins/types";

export class DarkFeatureClient {
  private apiKey: string;
  private baseUrl: string;
  private defaultContext?: FeatureContext;
  private retryEnabled: boolean;
  private maxRetries: number;
  private retryBackoff: number;
  private plugins: DarkFeaturePlugin[];

  constructor(config: DarkFeatureConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://edge.darkfeature.com/v1";
    this.defaultContext = config.context;
    this.retryEnabled = config.retry?.enabled ?? true;
    this.maxRetries = config.retry?.maxAttempts ?? 3;
    this.retryBackoff = config.retry?.backoff ?? 1000;
    this.plugins = config.plugins || [];
  }

  private parseValue(value: string): FeatureValue {
    if (value === "true") return true;
    if (value === "false") return false;
    if (!isNaN(Number(value))) return Number(value);
    return value;
  }

  async getFeature(
    featureName: string,
    param?: FeatureValue | FeatureOptions
  ): Promise<FeatureValue> {
    // Handle both direct value and options object
    const options =
      typeof param === "object" && !Array.isArray(param) && param !== null
        ? (param as FeatureOptions)
        : { fallback: param as FeatureValue };

    const { fallback, context } = options;

    // Only merge context if it's defined and not null
    const mergedContext =
      typeof context === "object" && context !== null
        ? { ...this.defaultContext, ...context }
        : this.defaultContext;

    try {
      // Run beforeGetFeature hooks
      await Promise.all(
        this.plugins.map((plugin) =>
          plugin.beforeGetFeature?.(featureName, mergedContext)
        )
      );

      const response = await this.getFeatures({
        features: { [featureName]: fallback ?? null },
        context: mergedContext,
      });

      const value = response[featureName] ?? fallback ?? null;

      // Run afterGetFeature hooks
      await Promise.all(
        this.plugins.map((plugin) =>
          plugin.afterGetFeature?.(featureName, value, mergedContext)
        )
      );

      return value;
    } catch (error) {
      // Run onError hooks
      await Promise.all(
        this.plugins.map((plugin) =>
          plugin.onError?.(error as Error, mergedContext)
        )
      );

      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  async getFeatures(
    options: FeaturesOptions
  ): Promise<Record<string, FeatureValue>> {
    const context = {
      ...this.defaultContext,
      ...options.context,
    };

    const featureNames = Object.keys(options.features);

    try {
      // Run beforeGetFeatures hooks
      await Promise.all(
        this.plugins.map((plugin) =>
          plugin.beforeGetFeatures?.(featureNames, context)
        )
      );

      const fetchFeatures = async () => {
        const response = await fetch(`${this.baseUrl}/features`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            features: featureNames,
            context,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch features: ${response.statusText}`);
        }

        const data = await response.json();
        const result: Record<string, FeatureValue> = {};

        featureNames.forEach((name) => {
          const variation = data.features[name]?.variation;
          result[name] =
            variation !== undefined
              ? this.parseValue(variation)
              : options.features[name] ?? null;
        });

        return result;
      };

      const result = this.retryEnabled
        ? await retry(fetchFeatures, this.maxRetries, this.retryBackoff)
        : await fetchFeatures();

      // Run afterGetFeatures hooks
      await Promise.all(
        this.plugins.map((plugin) => plugin.afterGetFeatures?.(result, context))
      );

      return result;
    } catch (error) {
      // Run onError hooks
      await Promise.all(
        this.plugins.map((plugin) => plugin.onError?.(error as Error, context))
      );

      // If fallbacks are provided and an error occurs, return fallback values
      if (options.features && Object.keys(options.features).length > 0) {
        return options.features;
      }

      // Re-throw the error if no fallbacks are available
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    await Promise.all(this.plugins.map((plugin) => plugin.cleanup?.()));
  }
}
