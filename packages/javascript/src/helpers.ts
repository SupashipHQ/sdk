import type { FeatureValue, Features } from './types'

/**
 * Helper function to define feature flags with type safety.
 * This is a no-op at runtime but provides type inference for TypeScript.
 *
 * Supported feature value types:
 * - boolean: simple on/off flags
 * - object: structured configuration data
 * - array: lists of values
 * - null: disabled state
 *
 * @example
 * ```ts
 * import { createFeatures, SupaClient } from '@supashiphq/sdk-javascript'
 *
 * const features = createFeatures({
 *   'dark-mode': false,  // Inferred as boolean
 *   'ui-config': {
 *     theme: 'light' as 'light' | 'dark',  // Use 'as' for specific unions
 *     maxUsers: 100,
 *   },
 *   'allowed-features': ['feature-a', 'feature-b'],
 *   'disabled-feature': null,
 * })
 *
 * const client = new SupaClient({
 *   apiKey: 'your-api-key',
 *   environment: 'production',
 *   features,
 * })
 *
 * // Now fully typed!
 * const darkMode = await client.getFeature('dark-mode') // boolean
 * const config = await client.getFeature('ui-config') // { theme: 'light' | 'dark', maxUsers: number }
 * const allowed = await client.getFeature('allowed-features') // string[]
 * ```
 */
export function createFeatures<T extends Record<string, FeatureValue>>(features: T): Features<T> {
  return features as Features<T>
}
