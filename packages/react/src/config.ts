import type { FeaturesWithFallbacks, SupashipClientConfig } from '@supashiphq/javascript-sdk'

/**
 * Configuration passed to `SupashipProvider` and `createSupashipServerClient`.
 * Matches the provider’s `config` prop (no `toolbar` / `plugins` — use the provider’s `toolbar` prop for browser toolbar behavior).
 */
export type SupashipConfig<TFeatures extends FeaturesWithFallbacks = FeaturesWithFallbacks> = Omit<
  SupashipClientConfig,
  'plugins' | 'toolbar'
> & { features: TFeatures }

/**
 * Defines the Supaship config object used for both the React provider and server clients.
 * Typing helper at runtime (returns the same object).
 *
 * @example
 * ```ts
 * // lib/supaship-config.ts — use `@supashiphq/react-sdk/config` when this file is imported from RSC
 * import { defineSupashipConfig } from '@supashiphq/react-sdk/config'
 *
 * export const supashipConfig = defineSupashipConfig({
 *   sdkKey: process.env.SUPASHIP_SDK_KEY!,
 *   environment: 'production',
 *   features: FEATURE_FLAGS,
 *   context: { app: 'web' },
 * })
 * ```
 */
export function defineSupashipConfig<TFeatures extends FeaturesWithFallbacks>(
  config: SupashipConfig<TFeatures>
): SupashipConfig<TFeatures> {
  return config
}
