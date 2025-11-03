'use client'

import React, { ReactNode } from 'react'
import { OpenFeatureProvider } from '@openfeature/react-sdk'
import { OpenFeature } from '@openfeature/react-sdk'
import { SupashipProvider } from '@supashiphq/openfeature-js-provider'
import { useClient } from '@supashiphq/sdk-react'

/**
 * Props for SupashipOpenFeatureProvider
 */
export interface SupashipOpenFeatureProviderProps {
  children: ReactNode
  /**
   * Optional domain for the OpenFeature client
   * If not provided, uses the default domain
   */
  domain?: string
}

/**
 * Combined provider that wraps both Supaship and OpenFeature providers
 * Use this component to enable OpenFeature hooks with Supaship
 *
 * Must be nested inside a SupaProvider from @supashiphq/sdk-react
 *
 * @example
 * ```tsx
 * import { SupaProvider } from '@supashiphq/sdk-react'
 * import { SupashipOpenFeatureProvider } from '@supashiphq/openfeature-react-provider'
 *
 * function App() {
 *   return (
 *     <SupaProvider config={config}>
 *       <SupashipOpenFeatureProvider>
 *         <YourApp />
 *       </SupashipOpenFeatureProvider>
 *     </SupaProvider>
 *   )
 * }
 * ```
 */
export function SupashipOpenFeatureProvider({
  children,
  domain,
}: SupashipOpenFeatureProviderProps): React.JSX.Element {
  // Get the Supaship client from context
  const supashipClient = useClient()

  // Create Supaship provider for OpenFeature
  const provider = React.useMemo(() => {
    return new SupashipProvider({ client: supashipClient })
  }, [supashipClient])

  // Set the provider in OpenFeature
  React.useEffect(() => {
    const setProvider = async () => {
      if (domain) {
        await OpenFeature.setProviderAndWait(domain, provider as any)
      } else {
        await OpenFeature.setProviderAndWait(provider as any)
      }
    }

    setProvider().catch(console.error)
  }, [provider, domain])

  return <OpenFeatureProvider domain={domain}>{children}</OpenFeatureProvider>
}
