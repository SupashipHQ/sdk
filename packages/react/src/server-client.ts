import { SupashipClient, type FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'
import type { SupashipConfig } from './config'

/**
 * Creates a {@link SupashipClient} for Node / Edge / Route Handlers / Server Components.
 * Uses the same shape as `SupashipProvider`’s `config` (via {@link defineSupashipConfig}).
 * Sets `toolbar: false` so the dev toolbar is never initialized on the server.
 */
export function createSupashipServerClient<TFeatures extends FeaturesWithFallbacks>(
  config: SupashipConfig<TFeatures>
): SupashipClient<TFeatures> {
  return new SupashipClient<TFeatures>({
    ...config,
    toolbar: false,
  })
}
