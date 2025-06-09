import { FeatureResponse, FeatureVariation } from "./types";

/**
 * Extract a boolean value from a feature response
 * @param response The feature response
 * @param featureName The feature name to extract
 * @returns The boolean value of the feature, or false if not found
 */
export function getFeatureValue(
  response: FeatureResponse,
  featureName: string
): boolean {
  return response.features[featureName]?.variation === "true";
}

/**
 * Extract a typed variation value from a feature response
 * @param response The feature response
 * @param featureName The feature name to extract
 * @returns The typed variation value, or undefined if not found
 */
export function getVariationValue<T extends FeatureVariation>(
  response: FeatureResponse,
  featureName: string
): T | undefined {
  const variation = response.features[featureName]?.variation;
  if (variation === undefined) return undefined;

  return parseVariation<T>(variation);
}

/**
 * Extract a map of feature names to boolean values
 * @param response The feature response
 * @returns A map of feature names to boolean values
 */
export function getFeatureValues(
  response: FeatureResponse
): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  for (const key in response.features) {
    if (Object.prototype.hasOwnProperty.call(response.features, key)) {
      result[key] = response.features[key].variation === "true";
    }
  }

  return result;
}

/**
 * Extract a map of feature names to typed variation values
 * @param response The feature response
 * @returns A map of feature names to typed variation values
 */
export function getVariationValues<T extends FeatureVariation>(
  response: FeatureResponse
): Record<string, T> {
  const result: Record<string, T> = {};

  for (const key in response.features) {
    if (Object.prototype.hasOwnProperty.call(response.features, key)) {
      result[key] = parseVariation<T>(response.features[key].variation);
    }
  }

  return result;
}

/**
 * Parse a variation string to its appropriate type
 * @param variation The variation string to parse
 * @returns The typed variation value
 */
function parseVariation<T extends FeatureVariation>(variation: string): T {
  // For boolean values
  if (variation === "true" || variation === "false") {
    return (variation === "true") as unknown as T;
  }

  // For number values
  if (!isNaN(Number(variation))) {
    return Number(variation) as unknown as T;
  }

  // Default to string
  return variation as unknown as T;
}

export function detectEnvironment(): "development" | "staging" | "production" {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "production" ? "production" : "development";
  }

  const hostname = window.location.hostname;
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    return "development";
  }
  if (hostname.includes("staging") || hostname.includes("test")) {
    return "staging";
  }
  return "production";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  backoff: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxAttempts) break;
      await sleep(backoff * Math.pow(2, attempt - 1));
    }
  }

  throw lastError!;
}
