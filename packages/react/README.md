# DarkFeature React SDK

A React SDK for DarkFeature that provides hooks and components for feature flag management in React applications.

## Installation

```bash
npm install @darkfeature/sdk-react
# or
yarn add @darkfeature/sdk-react
# or
pnpm add @darkfeature/sdk-react
```

## Quick Start

```tsx
import { DarkFeatureProvider, useFeature, DarkFeature } from '@darkfeature/sdk-react'

function App() {
  return (
    <DarkFeatureProvider
      config={{
        apiKey: 'your-api-key',
        context: {
          userId: '123',
          email: 'user@example.com',
          version: '1.0.0',
        },
      }}
    >
      <YourApp />
    </DarkFeatureProvider>
  )
}

function YourApp() {
  return (
    <div>
      {/* Component-based approach - declarative and clean */}
      <DarkFeature
        feature="my-feature"
        fallback={false}
        variations={{
          true: <NewFeatureComponent />,
          false: <OldFeatureComponent />,
        }}
      />
    </div>
  )
}

function YourAppWithHooks() {
  // Hook-based approach - programmatic control
  const { feature: isEnabled } = useFeature('my-feature', { fallback: false })

  const { feature: expFeature } = useFeature('experiment-feature', {
    fallback: 'control',
    context: { segment: 'premium' },
  })

  // Multiple features at once
  const { features } = useFeatures({
    features: {
      'feature-1': false,
      'feature-2': 'default-value',
      'feature-3': null,
    },
    context: { page: 'dashboard' },
  })

  return (
    <div>
      {isEnabled && <NewFeatureComponent />}
      <ExperimentComponent variant={expFeature} />
      {features['feature-1'] && <Feature1Component />}
    </div>
  )
}
```

## API Reference

### DarkFeatureProvider

The provider component that makes feature flags available to your React component tree.

```tsx
<DarkFeatureProvider config={config}>{children}</DarkFeatureProvider>
```

**Props:**

| Prop       | Type                | Required | Description                  |
| ---------- | ------------------- | -------- | ---------------------------- |
| `config`   | `DarkFeatureConfig` | Yes      | Configuration for the client |
| `children` | `React.ReactNode`   | Yes      | Child components             |

**Configuration Options:**

```tsx
interface DarkFeatureConfig {
  apiKey: string // Your DarkFeature API key (Project Settings -> Environments)
  baseUrl?: string // Custom API endpoint
  context?: FeatureContext // Default context for feature evaluation
  retry?: RetryConfig // Retry configuration for network requests
}

interface FeatureContext {
  [key: string]: string | number | boolean | null | undefined // key value pairs
}

interface RetryConfig {
  enabled?: boolean // Enable/disable retries (default: true)
  maxAttempts?: number // Maximum retry attempts (default: 3)
  backoff?: number // Base backoff delay in ms (default: 1000)
}
```

Common context properties:

- `userId`: User identifier
- `email`: User email
- `plan`: Membership plan (e.g., 'premium', 'free')
- `version`: Application version (e.g., 1.0.0)

> Note: The above are just common examples. You can use any properties in your context object that make sense for your application's feature targeting needs.

### useFeature Hook

Retrieves a single feature flag value with React state management.

```tsx
const { feature, isLoading, error }: UseFeatureResult = useFeature(featureName: string, options?: UseFeatureOptions)
```

**UseFeatureOptions:**

```tsx
interface UseFeatureOptions {
  fallback?: FeatureValue // Fallback value if feature not found
  context?: FeatureContext // Context override for this request
  shouldFetch?: boolean // Whether to fetch the feature (default: true)
}
```

**Examples:**

```tsx
function MyComponent() {
  // Simple boolean feature
  const { feature: isEnabled } = useFeature('my-feature', { fallback: false })

  // String variant with fallback
  const { feature: btnColor } = useFeature('button-color', { fallback: 'blue' })

  // With context override
  const { feature: showPremium } = useFeature('premium-feature', {
    fallback: false,
    context: { userPlan: 'premium' },
  })

  // Conditional fetching
  const { user, isLoading } = useUser()
  const { feature: personalizedDashboard } = useFeature('personalized-dashboard', {
    fallback: false,
    context: { userId: user?.id },
    shouldFetch: !isLoading && !!user,
  })

  return (
    <div>
      {isEnabled && <NewFeature />}
      <Button color={variant} />
      {showPremium && <PremiumContent />}
    </div>
  )
}
```

### useFeatures Hook

Retrieves multiple feature flags in a single request with React state management.

```tsx
const { features, isLoading, error }: UseFeaturesResult = useFeatures(options: UseFeaturesOptions)
```

**UseFeaturesOptions:**

```tsx
interface UseFeaturesOptions {
  features: Record<string, FeatureValue> // Feature names with fallback values
  context?: FeatureContext // Context override for this request
  shouldFetch?: boolean // Whether to fetch features (default: true)
}
```

**Example:**

```tsx
function Dashboard() {
  const { user, isLoading } = useUser()

  const { features } = useFeatures({
    features: {
      'new-dashboard': false,
      'sidebar-variant': 'default',
      'max-items': 10,
      'premium-widgets': false,
    },
    context: {
      userId: user?.id,
      plan: user?.plan,
      version: '2.0.0',
    },
    shouldFetch: !isLoading && !!user,
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className={features['new-dashboard'] ? 'new-layout' : 'old-layout'}>
      <Sidebar variant={features['sidebar-variant']} />
      <MainContent maxItems={features['max-items']} />
      {features['premium-widgets'] && <PremiumWidgets />}
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
    updateContext({
      userId: newUser.id,
      plan: newUser.subscriptionPlan,
      segment: newUser.segment,
    })
  }

  return <form onSubmit={handleUserUpdate}>{/* User profile form */}</form>
}
```

## Components

### DarkFeature Component

A declarative component for conditional rendering based on feature flags using a compact variations approach.

```tsx
<DarkFeature
  feature="my-feature"
  fallback={false}
  loading="spinner"
  variations={{
    true: <div>Feature is enabled!</div>,
    false: <div>Feature is disabled!</div>,
    spinner: <div>Loading...</div>,
  }}
/>
```

**Props:**

```tsx
interface DarkFeatureProps {
  feature: string // The feature flag key to evaluate
  fallback?: FeatureValue // Fallback value to use when feature is not available (string | number | boolean | null)
  context?: FeatureContext // Context for feature evaluation
  shouldFetch?: boolean // Whether to fetch the feature (default: true)
  variations: Record<string, ReactNode> // Variations object mapping feature values/keys to JSX elements
  loading?: string // Key in variations object to use for loading state
}
```

**FeatureValue Type Support:**

The `variations` object keys must be strings, but they correspond to all supported `FeatureValue` types:

| FeatureValue Type | Example Value | Variation Key | Description                 |
| ----------------- | ------------- | ------------- | --------------------------- |
| `string`          | `"variant-a"` | `"variant-a"` | Direct string match         |
| `boolean`         | `true`        | `"true"`      | Boolean converted to string |
| `boolean`         | `false`       | `"false"`     | Boolean converted to string |
| `number`          | `42`          | `"42"`        | Number converted to string  |
| `null`            | `null`        | `"null"`      | Null converted to string    |

**Examples:**

#### String Feature Values

```tsx
<DarkFeature
  feature="theme-variant"
  fallback="auto"
  loading="spinner"
  variations={{
    light: <LightTheme />,
    dark: <DarkTheme />,
    auto: <AutoTheme />,
    spinner: <ThemeLoader />,
  }}
/>
```

#### Boolean Feature Values

```tsx
<DarkFeature
  feature="new-header"
  fallback="false"
  loading="skeleton"
  variations={{
    // Boolean type
    true: <NewHeader />,
    false: <OldHeader />,
    skeleton: <HeaderSkeleton />,
  }}
/>

<DarkFeature
  feature="show-banner"
  variations={{
    true: <PromoBanner />,
    false: null, // Render nothing when false
  }}
/>
```

#### Number Feature Values

```tsx
<DarkFeature
  feature="max-items"
  fallback="10"
  loading="spinner"
  variations={{
    // Number type
    '5': <ItemList maxItems={5} />,
    '10': <ItemList maxItems={10} />,
    '20': <ItemList maxItems={20} />,
    spinner: <ItemListSpinner />,
  }}
/>
```

### Simple Usage Patterns

For simple show/hide scenarios, you can use the DarkFeature component with compact variations:

```tsx
// Simple show/hide based on boolean
<DarkFeature
  feature="new-feature"
  variations={{
    true: <NewFeatureContent />,
  }}
/>

// With loading state
<DarkFeature
  feature="beta-banner"
  loading="skeleton"
  variations={{
    true: <BetaBanner />,
    skeleton: <BannerSkeleton />,
  }}
/>

// Conditional rendering with multiple possible values
<DarkFeature
  feature="user-limit"
  fallback="default"
  variations={{
    '5': <BasicUserList />,
    '10': <StandardUserList />,
    '20': <AdvancedUserList />,
    default: <DefaultUserList />,
  }}
/>

// String matching
<DarkFeature
  feature="theme"
  fallback="light"
  variations={{
    dark: <DarkModeStyles />,
    light: <LightModeStyles />,
  }}
/>

// Conditional fetching - only fetch when user is authenticated
<DarkFeature
  feature="user-dashboard"
  fallback="public"
  shouldFetch={isAuthenticated}
  variations={{
    true: <UserDashboard />,
    public: <PublicDashboard />,
  }}
/>
```

## Error Handling

The React SDK handles errors gracefully by returning fallback values when provided.

## Best Practices

### 1. Always Provide Fallbacks

```tsx
// ✅ Good - provides fallback
const { feature: isEnabled } = useFeature('new-feature', { fallback: false })

// ❌ Risky - no fallback, may cause issues
const { feature: isEnabled } = useFeature('new-feature')
```

### 2. Use Context for User Targeting

```tsx
function App() {
  const { user } = useAuth()

  return (
    <DarkFeatureProvider
      config={{
        apiKey: 'your-api-key',
        context: {
          userId: user?.id,
          email: user?.email,
          plan: user?.subscriptionPlan,
          version: process.env.REACT_APP_VERSION,
        },
      }}
    >
      <YourApp />
    </DarkFeatureProvider>
  )
}
```

### 3. Batch Feature Requests

```tsx
// ✅ Good - single API call
const { features } = useFeatures({
  features: {
    'feature-1': false,
    'feature-2': 'default',
    'feature-3': null,
  },
})

// ❌ Less efficient - multiple API calls
const feature1 = useFeature('feature-1', { fallback: false })
const feature2 = useFeature('feature-2', { fallback: 'default' })
const feature3 = useFeature('feature-3', { fallback: null })
```

### 4. Handle Loading States

```tsx
function MyComponent() {
  const { user, isLoading: userLoading } = useUser()

  const { features } = useFeatures({
    features: { 'user-specific-feature': false },
    context: { userId: user?.id },
    shouldFetch: !userLoading && !!user,
  })

  if (userLoading) return <UserLoadingSkeleton />

  return <div>{features['user-specific-feature'] && <SpecialContent />}</div>
}
```

### 5. Update Context Reactively

```tsx
function UserDashboard() {
  const { context, updateContext } = useFeatureContext()
  const [currentPage, setCurrentPage] = useState('dashboard')

  // Update context when navigation changes
  useEffect(() => {
    updateContext({ currentPage })
  }, [currentPage, updateContext])

  const handlePageChange = page => {
    setCurrentPage(page)
  }

  return (
    <div>
      <Navigation onPageChange={handlePageChange} />
      <PageContent page={currentPage} />
    </div>
  )
}
```

## Framework Integration

### Next.js Integration

#### App Router (Next.js 13+)

```tsx
// app/providers.tsx
'use client'
import { DarkFeatureProvider } from '@darkfeature/sdk-react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DarkFeatureProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_DARKFEATURE_API_KEY!,
        context: {
          environment: process.env.NODE_ENV,
          version: process.env.NEXT_PUBLIC_APP_VERSION,
        },
      }}
    >
      {children}
    </DarkFeatureProvider>
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
import { DarkFeature } from '@darkfeature/sdk-react'

export default function HomePage() {
  return (
    <main>
      <DarkFeature
        feature="new-hero-section"
        fallback={false}
        loading="skeleton"
        variations={{
          true: <NewHeroSection />,
          false: <OldHeroSection />,
          skeleton: <HeroSkeleton />,
        }}
      />
    </main>
  )
}
```

#### Pages Router (Next.js 12 and below)

```tsx
// pages/_app.tsx
import { DarkFeatureProvider } from '@darkfeature/sdk-react'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <DarkFeatureProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_DARKFEATURE_API_KEY!,
        context: {
          environment: process.env.NODE_ENV,
        },
      }}
    >
      <Component {...pageProps} />
    </DarkFeatureProvider>
  )
}

// pages/index.tsx
import { DarkFeature } from '@darkfeature/sdk-react'

export default function HomePage() {
  return (
    <div>
      <DarkFeature
        feature="new-homepage"
        fallback={false}
        variations={{
          true: (
            <DarkFeature
              feature="hero-variant"
              fallback="default"
              variations={{
                default: <NewHomePage variant="default" />,
                'variant-a': <NewHomePage variant="variant-a" />,
                'variant-b': <NewHomePage variant="variant-b" />,
              }}
            />
          ),
          false: <OldHomePage />,
        }}
      />
    </div>
  )
}
```

#### Server-Side Feature Flags

```tsx
// lib/feature-flags.ts
import { DarkFeatureClient } from '@darkfeature/sdk-javascript'

export const serverFeatureClient = new DarkFeatureClient({
  apiKey: process.env.DARKFEATURE_API_KEY!,
})

// pages/products/[id].tsx
import { GetServerSideProps } from 'next'
import { serverFeatureClient } from '../../lib/feature-flags'

export default function ProductPage({ product, features }) {
  return (
    <div>
      {features['new-product-layout'] ? (
        <NewProductLayout product={product} />
      ) : (
        <OldProductLayout product={product} />
      )}
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async context => {
  const { id } = context.params!

  // Get product data
  const product = await getProduct(id)

  // Get feature flags server-side
  const features = await serverFeatureClient.getFeatures({
    features: {
      'new-product-layout': false,
      'show-related-products': true,
    },
    context: {
      productId: id,
      userAgent: context.req.headers['user-agent'],
    },
  })

  return {
    props: {
      product,
      features,
    },
  }
}
```

### React Native Integration

```tsx
// App.tsx
import { DarkFeatureProvider } from '@darkfeature/sdk-react'
import { Platform } from 'react-native'

export default function App() {
  return (
    <DarkFeatureProvider
      config={{
        apiKey: 'your-api-key',
        context: {
          platform: Platform.OS,
          version: Platform.Version,
        },
      }}
    >
      <YourApp />
    </DarkFeatureProvider>
  )
}

// components/HomePage.tsx
import React from 'react'
import { View } from 'react-native'
import { DarkFeature } from '@darkfeature/sdk-react'

export function HomePage() {
  return (
    <View>
      <DarkFeature
        feature="new-onboarding-flow"
        fallback={false}
        loading="skeleton"
        variations={{
          true: <NewOnboardingFlow />,
          false: <OldOnboardingFlow />,
          skeleton: <OnboardingSkeleton />,
        }}
      />
    </View>
  )
}
```

### Gatsby Integration

```tsx
// gatsby-browser.js
import { DarkFeatureProvider } from '@darkfeature/sdk-react'

export const wrapRootElement = ({ element }) => (
  <DarkFeatureProvider
    config={{
      apiKey: process.env.GATSBY_DARKFEATURE_API_KEY,
      context: {
        site: 'gatsby-site',
      },
    }}
  >
    {element}
  </DarkFeatureProvider>
)

// src/components/Layout.tsx
import { DarkFeature } from '@darkfeature/sdk-react'

export function Layout({ children }) {
  return (
    <DarkFeature
      feature="new-layout-design"
      fallback={false}
      variations={{
        true: <div className="new-layout">{children}</div>,
        false: <div className="old-layout">{children}</div>,
      }}
    />
  )
}
```

## Advanced Usage

### Dynamic Feature Loading

```tsx
function DynamicFeatureComponent() {
  const [featureName, setFeatureName] = useState('feature-a')

  return (
    <div>
      <select onChange={e => setFeatureName(e.target.value)}>
        <option value="feature-a">Feature A</option>
        <option value="feature-b">Feature B</option>
        <option value="feature-c">Feature C</option>
      </select>

      <DarkFeature
        feature={featureName}
        fallback={false}
        loading="skeleton"
        variations={{
          true: <DynamicContent featureName={featureName} />,
          false: <DisabledMessage />,
          skeleton: <ContentSkeleton />,
        }}
      />
    </div>
  )
}
```

### Feature Flag Composition

```tsx
function useCompositeFeature() {
  const { feature: newUI } = useFeature('new-ui', { fallback: false })
  const { feature: darkMode } = useFeature('dark-mode', { fallback: false })
  const { feature: animations } = useFeature('animations', { fallback: true })

  return {
    showNewUIWithDarkMode: newUI && darkMode,
    showAnimatedNewUI: newUI && animations,
    legacyMode: !newUI && !darkMode,
  }
}

function App() {
  const { showNewUIWithDarkMode, legacyMode } = useCompositeFeature()

  return (
    <div className={showNewUIWithDarkMode ? 'new-ui dark' : legacyMode ? 'legacy' : 'default'}>
      <MainContent />
    </div>
  )
}
```

## Testing

### Mocking Feature Flags in Tests

```tsx
// __mocks__/@darkfeature/sdk-react.ts
export const mockFeatures = new Map()

export const useFeature = jest.fn((featureName: string, options: any) => {
  return mockFeatures.get(featureName) ?? options?.fallback
})

export const useFeatures = jest.fn((options: any) => {
  const result = {}
  Object.keys(options.features).forEach(feature => {
    result[feature] = mockFeatures.get(feature) ?? options.features[feature]
  })
  return result
})

export const DarkFeatureProvider = ({ children }: any) => children
```

### Test Utilities

```tsx
// test-utils/feature-flag-utils.tsx
import { mockFeatures } from '../__mocks__/@darkfeature/sdk-react'

export function setMockFeature(featureName: string, value: any) {
  mockFeatures.set(featureName, value)
}

export function clearMockFeatures() {
  mockFeatures.clear()
}

export function setMockFeatures(features: Record<string, any>) {
  clearMockFeatures()
  Object.entries(features).forEach(([name, value]) => {
    setMockFeature(name, value)
  })
}
```

### Example Test

```tsx
// MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import { setMockFeatures, clearMockFeatures } from '../test-utils/feature-flag-utils'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  afterEach(() => {
    clearMockFeatures()
  })

  it('shows new feature when enabled', () => {
    setMockFeatures({ 'new-feature': true })

    render(<MyComponent />)

    expect(screen.getByText('New Feature Content')).toBeInTheDocument()
  })

  it('shows old feature when disabled', () => {
    setMockFeatures({ 'new-feature': false })

    render(<MyComponent />)

    expect(screen.getByText('Old Feature Content')).toBeInTheDocument()
  })
})
```

## TypeScript Support

The SDK is written in TypeScript and provides full type safety:

```tsx
import {
  DarkFeatureProvider,
  useFeature,
  useFeatures,
  FeatureValue,
  FeatureContext,
  DarkFeatureConfig,
} from '@darkfeature/sdk-react'

// Type-safe configuration
const config: DarkFeatureConfig = {
  apiKey: 'your-api-key',
  context: {
    userId: '123',
    plan: 'premium',
  },
}

// Type-safe feature values
const isEnabled: boolean = useFeature('boolean-feature', { fallback: false })
const variant: string = useFeature('string-feature', { fallback: 'default' })
const count: number = useFeature('number-feature', { fallback: 0 })

// Type-safe context
const context: FeatureContext = {
  userId: '123',
  segment: 'premium',
  version: '1.0.0',
}
```

### Custom Type Definitions

```tsx
// types/features.ts
export interface AppFeatureContext {
  userId?: string
  plan?: 'free' | 'premium' | 'enterprise'
  segment?: string
  version?: string
  region?: string
}

export type AppFeatureFlags = {
  'new-dashboard': boolean
  'theme-variant': 'light' | 'dark' | 'auto'
  'max-file-size': number
  'beta-features': boolean
}

// Custom hooks with strict typing
export function useAppFeature<K extends keyof AppFeatureFlags>(
  featureName: K,
  fallback: AppFeatureFlags[K],
  context?: AppFeatureContext
): AppFeatureFlags[K] {
  return useFeature(featureName, { fallback, context })
}
```

## Troubleshooting

### Common Issues

#### 1. Provider Not Found Error

```
Error: useFeature must be used within a DarkFeatureProvider
```

**Solution:** Ensure your component is wrapped in a `DarkFeatureProvider`:

```tsx
// ✅ Correct
function App() {
  return (
    <DarkFeatureProvider config={{ apiKey: 'your-key' }}>
      <MyComponent />
    </DarkFeatureProvider>
  )
}

// ❌ Incorrect
function App() {
  return <MyComponent /> // Missing provider
}
```

#### 2. Features Not Loading

**Check network requests:** Open browser dev tools and verify API calls are being made.

**Verify API key:** Ensure your API key is correct and has proper permissions.

**Check context:** Verify the context being sent matches your targeting rules.

#### 3. Stale Feature Values

**Solution:** Restart your application or clear cache to get fresh values.

#### 4. Performance Issues

**Solution:** Use `useFeatures` for multiple flags and implement proper caching:

```tsx
// ✅ Efficient
const features = useFeatures({
  features: { 'feature-1': false, 'feature-2': false, 'feature-3': false },
})

// ❌ Inefficient
const feature1 = useFeature('feature-1', { fallback: false })
const feature2 = useFeature('feature-2', { fallback: false })
const feature3 = useFeature('feature-3', { fallback: false })
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
