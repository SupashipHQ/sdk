# Supaship React SDK

A React SDK for Supaship that provides hooks and components for feature flag management with full TypeScript type safety.

## Installation

```bash
npm install @supashiphq/sdk-react
# or
yarn add @supashiphq/sdk-react
# or
pnpm add @supashiphq/sdk-react
```

## Quick Start

```tsx
import { SupaProvider, useFeature, createFeatures } from '@supashiphq/sdk-react'

// Define your features with type safety
const features = createFeatures({
  'new-header': false,
  'theme-config': { mode: 'dark' as 'dark' | 'light', showLogo: true },
  'beta-features': [] as string[],
})

function App() {
  return (
    <SupaProvider
      config={{
        apiKey: 'your-api-key',
        environment: 'production',
        features,
        context: {
          userID: '123',
          email: 'user@example.com',
        },
      }}
    >
      <YourApp />
    </SupaProvider>
  )
}

function YourApp() {
  // Hook returns { feature, isLoading, error, ... }
  const { feature: newHeader, isLoading } = useFeature('new-header')

  if (isLoading) return <div>Loading...</div>

  return <div>{newHeader ? <NewHeader /> : <OldHeader />}</div>
}
```

## Type-Safe Feature Flags

For full TypeScript type safety, define your features and augment the `Features` interface:

```tsx
// lib/features.ts
import { createFeatures, FeaturesFromObject } from '@supashiphq/sdk-react'

export const FEATURE_FLAGS = createFeatures({
  'new-header': false,
  'theme-config': {
    mode: 'dark' as 'dark' | 'light',
    primaryColor: '#007bff',
    showLogo: true,
  },
  'beta-features': [] as string[],
  'disabled-feature': null,
})

// Type augmentation for global type safety, it is required
declare module '@supashiphq/sdk-react' {
  interface Features extends FeaturesFromObject<typeof FEATURE_FLAGS> {}
}
```

Now `useFeature` and `useFeatures` will have full type safety:

```tsx
function MyComponent() {
  // TypeScript knows 'new-header' is valid and feature is boolean | null
  const { feature } = useFeature('new-header')

  // TypeScript knows 'theme-config' returns the exact object shape
  const { feature: config } = useFeature('theme-config')
  // config is { mode: 'dark' | 'light', primaryColor: string, showLogo: boolean } | null

  // TypeScript will error on invalid feature names
  const { feature: invalid } = useFeature('non-existent-feature') // ❌ Type error
}
```

[See detailed type-safe usage guide](./TYPE_SAFE_FEATURES.md)

## API Reference

### SupaProvider

The provider component that makes feature flags available to your React component tree.

```tsx
<SupaProvider config={config}>{children}</SupaProvider>
```

**Props:**

| Prop       | Type               | Required | Description                  |
| ---------- | ------------------ | -------- | ---------------------------- |
| `config`   | `SupaClientConfig` | Yes      | Configuration for the client |
| `children` | `React.ReactNode`  | Yes      | Child components             |
| `plugins`  | `SupaPlugin[]`     | No       | Custom plugins               |
| `toolbar`  | `ToolbarConfig`    | No       | Development toolbar settings |

**Configuration Options:**

```tsx
import { createFeatures } from '@supashiphq/sdk-react'

const config = {
  apiKey: 'your-api-key',
  environment: 'production',
  features: createFeatures({
    // Required: define all feature flags with fallback values
    'my-feature': false,
    config: { theme: 'light' },
  }),
  context: {
    // Optional: targeting context
    userID: 'user-123',
    email: 'user@example.com',
    plan: 'premium',
  },
  networkConfig: {
    // Optional: network settings
    featuresAPIUrl: 'https://api.supashiphq.com/features',
    retry: {
      enabled: true,
      maxAttempts: 3,
      backoff: 1000,
    },
    requestTimeoutMs: 5000,
  },
}
```

**Supported Feature Value Types:**

| Type      | Example                             | Description               |
| --------- | ----------------------------------- | ------------------------- |
| `boolean` | `false`                             | Simple on/off flags       |
| `object`  | `{ theme: 'dark', showLogo: true }` | Configuration objects     |
| `array`   | `['feature-a', 'feature-b']`        | Lists of values           |
| `null`    | `null`                              | Disabled/unavailable flag |

> **Note:** Strings and numbers are not supported as standalone feature values. Use objects instead: `{ value: 'string' }` or `{ value: 42 }`.

### useFeature Hook

Retrieves a single feature flag value with React state management and full TypeScript type safety.

```tsx
const result = useFeature(featureName, options?)
```

**Parameters:**

- `featureName: string` - The feature flag key
- `options?: object`
  - `context?: Record<string, unknown>` - Context override for this request
  - `shouldFetch?: boolean` - Whether to fetch the feature (default: true)

**Return Value:**

```tsx
{
  feature: T | null,        // The feature value (typed based on your Features interface)
  isLoading: boolean,       // Loading state
  isSuccess: boolean,       // Success state
  isError: boolean,         // Error state
  error: Error | null,      // Error object if failed
  status: 'idle' | 'loading' | 'success' | 'error',
  refetch: () => void,      // Function to manually refetch
  // ... other query state properties
}
```

**Examples:**

```tsx
function MyComponent() {
  // Simple boolean feature
  const { feature: isEnabled, isLoading } = useFeature('new-ui')

  if (isLoading) return <Skeleton />

  return <div>{isEnabled ? <NewUI /> : <OldUI />}</div>
}

function ConfigComponent() {
  // Object feature
  const { feature: config } = useFeature('theme-config')

  if (!config) return null

  return (
    <div className={config.theme}>
      {config.showLogo && <Logo />}
      <div style={{ color: config.primaryColor }}>Content</div>
    </div>
  )
}

function ConditionalFetch() {
  const { user, isLoading: userLoading } = useUser()

  // Only fetch when user is loaded
  const { feature } = useFeature('user-specific-feature', {
    context: { userId: user?.id },
    shouldFetch: !userLoading && !!user,
  })

  return <div>{feature && <SpecialContent />}</div>
}
```

### useFeatures Hook

Retrieves multiple feature flags in a single request with type safety.

```tsx
const result = useFeatures(featureNames, options?)
```

**Parameters:**

- `featureNames: readonly string[]` - Array of feature flag keys
- `options?: object`
  - `context?: Record<string, unknown>` - Context override for this request
  - `shouldFetch?: boolean` - Whether to fetch features (default: true)

**Return Value:**

```tsx
{
  features: { [key: string]: T | null },  // Object with feature values (typed based on keys)
  isLoading: boolean,
  isSuccess: boolean,
  isError: boolean,
  error: Error | null,
  status: 'idle' | 'loading' | 'success' | 'error',
  refetch: () => void,
  // ... other query state properties
}
```

**Examples:**

```tsx
function Dashboard() {
  const { user } = useUser()

  // Fetch multiple features at once (more efficient than multiple useFeature calls)
  const { features, isLoading } = useFeatures(['new-dashboard', 'beta-mode', 'show-sidebar'], {
    context: {
      userId: user?.id,
      plan: user?.plan,
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className={features['new-dashboard'] ? 'new-layout' : 'old-layout'}>
      {features['show-sidebar'] && <Sidebar />}
      {features['beta-mode'] && <BetaBadge />}
      <MainContent />
    </div>
  )
}

function FeatureList() {
  // TypeScript will infer the correct types for each feature
  const { features } = useFeatures(['feature-a', 'feature-b', 'config-feature'])

  return (
    <div>
      {features['feature-a'] && <FeatureA />}
      {features['feature-b'] && <FeatureB />}
      {features['config-feature'] && <ConfigDisplay config={features['config-feature']} />}
    </div>
  )
}
```

### useFeatureContext Hook

Access and update the feature context within components.

```tsx
const { context, updateContext } = useFeatureContext()
```

**Example:**

```tsx
function UserProfileSettings() {
  const { context, updateContext } = useFeatureContext()
  const [user, setUser] = useState(null)

  const handleUserUpdate = newUser => {
    setUser(newUser)

    // Update feature context when user changes
    // This will trigger refetch of all features
    updateContext({
      userId: newUser.id,
      plan: newUser.subscriptionPlan,
      segment: newUser.segment,
    })
  }

  return <form onSubmit={handleUserUpdate}>{/* User profile form */}</form>
}
```

### useClient Hook

Access the underlying SupaClient instance for advanced use cases.

```tsx
const client = useClient()

// Use client methods directly
const feature = await client.getFeature('my-feature', { context: { ... } })
const features = await client.getFeatures(['feature-1', 'feature-2'])
```

## Best Practices

### 1. Define Features in One Place

```tsx
// ✅ Good - centralized feature definitions
// lib/features.ts
export const FEATURE_FLAGS = createFeatures({
  'new-header': false,
  theme: { mode: 'light' as 'light' | 'dark' },
  'beta-features': [] as string[],
})

// ❌ Bad - scattered feature definitions
const config1 = { features: createFeatures({ 'feature-1': false }) }
const config2 = { features: createFeatures({ 'feature-2': true }) }
```

### 2. Use Type Augmentation for Type Safety

```tsx
// ✅ Good - type augmentation for global type safety
declare module '@supashiphq/sdk-react' {
  interface Features extends FeaturesFromObject<typeof FEATURE_FLAGS> {}
}

// Now all useFeature calls are type-safe
const { feature } = useFeature('new-header') // ✅ TypeScript knows this is boolean | null
const { feature } = useFeature('invalid') // ❌ TypeScript error
```

### 3. Use Context for User Targeting

```tsx
function App() {
  const { user } = useAuth()

  return (
    <SupaProvider
      config={{
        apiKey: 'your-api-key',
        features: FEATURE_FLAGS,
        context: {
          userId: user?.id,
          email: user?.email,
          plan: user?.subscriptionPlan,
          version: process.env.REACT_APP_VERSION,
        },
      }}
    >
      <YourApp />
    </SupaProvider>
  )
}
```

### 4. Batch Feature Requests

```tsx
// ✅ Good - single API call
const { features } = useFeatures(['feature-1', 'feature-2', 'feature-3'])

// ❌ Less efficient - multiple API calls
const feature1 = useFeature('feature-1')
const feature2 = useFeature('feature-2')
const feature3 = useFeature('feature-3')
```

### 5. Handle Loading States

```tsx
function MyComponent() {
  const { user, isLoading: userLoading } = useUser()

  const { features, isLoading: featuresLoading } = useFeatures(['user-specific-feature'], {
    context: { userId: user?.id },
    shouldFetch: !userLoading && !!user,
  })

  if (userLoading || featuresLoading) return <Skeleton />

  return <div>{features['user-specific-feature'] && <SpecialContent />}</div>
}
```

### 6. Update Context Reactively

```tsx
function UserDashboard() {
  const { updateContext } = useFeatureContext()
  const [currentPage, setCurrentPage] = useState('dashboard')

  // Update context when navigation changes
  useEffect(() => {
    updateContext({ currentPage })
  }, [currentPage, updateContext])

  return (
    <div>
      <Navigation onPageChange={setCurrentPage} />
      <PageContent page={currentPage} />
    </div>
  )
}
```

## Framework Integration

### Next.js App Router (Next.js 13+)

```tsx
// app/providers.tsx
'use client'
import { SupaProvider, createFeatures } from '@supashiphq/sdk-react'

const features = createFeatures({
  'new-hero': false,
  theme: { mode: 'light' as 'light' | 'dark' },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupaProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_SUPASHIP_API_KEY!,
        environment: process.env.NODE_ENV!,
        features,
      }}
    >
      {children}
    </SupaProvider>
  )
}

// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

// app/page.tsx
;('use client')
import { useFeature } from '@supashiphq/sdk-react'

export default function HomePage() {
  const { feature: newHero } = useFeature('new-hero')

  return <main>{newHero ? <NewHeroSection /> : <OldHeroSection />}</main>
}
```

### Next.js Pages Router (Next.js 12 and below)

```tsx
// pages/_app.tsx
import { SupaProvider, createFeatures } from '@supashiphq/sdk-react'
import type { AppProps } from 'next/app'

const features = createFeatures({
  'new-homepage': false,
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SupaProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_SUPASHIP_API_KEY!,
        environment: process.env.NODE_ENV!,
        features,
      }}
    >
      <Component {...pageProps} />
    </SupaProvider>
  )
}
```

### Vite / Create React App

```tsx
// src/main.tsx or src/index.tsx
import { SupaProvider, createFeatures } from '@supashiphq/sdk-react'

const features = createFeatures({
  'new-ui': false,
  theme: { mode: 'light' as 'light' | 'dark' },
})

function App() {
  return (
    <SupaProvider
      config={{
        apiKey: import.meta.env.VITE_SUPASHIP_API_KEY, // Vite
        // or
        apiKey: process.env.REACT_APP_SUPASHIP_API_KEY, // CRA
        environment: import.meta.env.MODE,
        features,
      }}
    >
      <YourApp />
    </SupaProvider>
  )
}
```

## Development Toolbar

The SDK includes a development toolbar for testing and debugging feature flags locally.

```tsx
<SupaProvider
  config={{ ... }}
  toolbar={{
    show: 'auto', // 'auto' | 'always' | 'never'
    position: 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  }}
>
  <YourApp />
</SupaProvider>
```

- `'auto'`: Shows toolbar in development environments only (default)
- `'always'`: Always shows toolbar
- `'never'`: Never shows toolbar

The toolbar allows you to:

- View all available feature flags
- Override feature values locally
- See feature value types and current values
- Clear local overrides

## Plugins

Extend the SDK functionality with custom plugins:

```tsx
import { SupaPlugin } from '@supashiphq/sdk-react'

const analyticsPlugin: SupaPlugin = {
  name: 'analytics',
  onInit: async (availableFeatures, context) => {
    console.log('SDK initialized with features:', Object.keys(availableFeatures))
  },
  afterGetFeatures: async (features, context) => {
    // Track feature usage
    analytics.track('features_fetched', { features: Object.keys(features) })
  },
}

<SupaProvider config={config} plugins={[analyticsPlugin]}>
  <App />
</SupaProvider>
```

## Testing

### Mocking Feature Flags in Tests

```tsx
// test-utils/providers.tsx
import { SupaProvider, createFeatures } from '@supashiphq/sdk-react'

export function TestProviders({ children, features = {} }) {
  const testFeatures = createFeatures(features)

  return (
    <SupaProvider
      config={{
        apiKey: 'test-key',
        environment: 'test',
        features: testFeatures,
      }}
    >
      {children}
    </SupaProvider>
  )
}
```

### Example Test

```tsx
// MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import { TestProviders } from '../test-utils/providers'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('shows new feature when enabled', () => {
    render(
      <TestProviders features={{ 'new-feature': true }}>
        <MyComponent />
      </TestProviders>
    )

    expect(screen.getByText('New Feature Content')).toBeInTheDocument()
  })

  it('shows old feature when disabled', () => {
    render(
      <TestProviders features={{ 'new-feature': false }}>
        <MyComponent />
      </TestProviders>
    )

    expect(screen.getByText('Old Feature Content')).toBeInTheDocument()
  })
})
```

## Migration Guide

### From v0.5.x to v0.6.x

**1. Features config is now required:**

```tsx
// ❌ Old
<SupaProvider
  config={{
    apiKey: 'key',
    environment: 'prod',
  }}
/>

// ✅ New
import { createFeatures } from '@supashiphq/sdk-react'

const features = createFeatures({
  'my-feature': false,
})

<SupaProvider
  config={{
    apiKey: 'key',
    environment: 'prod',
    features, // Required
  }}
/>
```

**2. useFeature returns `feature`, not `data`:**

```tsx
// ❌ Old
const { data } = useFeature('my-feature')

// ✅ New
const { feature } = useFeature('my-feature')
```

**3. useFeatures takes an array, not an object:**

```tsx
// ❌ Old
const { features } = useFeatures({
  features: { 'feature-1': false, 'feature-2': true },
})

// ✅ New
const { features } = useFeatures(['feature-1', 'feature-2'])
```

**4. Feature values are restricted:**

```tsx
// ❌ Old - strings and numbers as values
const features = {
  variant: 'a', // ❌ Not supported
  count: 42, // ❌ Not supported
}

// ✅ New - use objects instead
const features = createFeatures({
  variant: { value: 'a' as 'a' | 'b' | 'c' }, // ✅ Object
  count: { value: 42 }, // ✅ Object
  enabled: false, // ✅ Boolean
  config: { theme: 'dark' }, // ✅ Object
  list: ['a', 'b'], // ✅ Array
})
```

## Troubleshooting

### Common Issues

#### Provider Not Found Error

```
Error: useFeature must be used within a SupaProvider
```

**Solution:** Ensure your component is wrapped in a `SupaProvider`:

```tsx
// ✅ Correct
function App() {
  return (
    <SupaProvider config={{ ... }}>
      <MyComponent />
    </SupaProvider>
  )
}

// ❌ Incorrect
function App() {
  return <MyComponent /> // Missing provider
}
```

#### Features Not Loading

- **Check API key:** Verify your API key is correct
- **Check network:** Open browser dev tools and check network requests
- **Check features config:** Ensure features are defined in the config

#### Type Errors

```
Property 'my-feature' does not exist on type 'Features'
```

**Solution:** Add type augmentation:

```tsx
import { FeaturesFromObject } from '@supashiphq/sdk-react'
import { FEATURE_FLAGS } from './features'

declare module '@supashiphq/sdk-react' {
  interface Features extends FeaturesFromObject<typeof FEATURE_FLAGS> {}
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
