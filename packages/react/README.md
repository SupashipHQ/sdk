# Supaship React SDK

A React SDK for Supaship that provides hooks and components for feature flag management in React applications.

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
import { SupaProvider, useFeature, useFeatures, SupaFeature } from '@supashiphq/sdk-react'

function App() {
  return (
    <SupaProvider
      config={{
        apiKey: 'your-api-key',
        environment: 'production',
        context: {
          userID: '123',
          email: 'user@example.com',
          version: '1.0.0',
        },
      }}
    >
      <YourApp />
    </SupaProvider>
  )
}

function YourApp() {
  return (
    <div>
      {/* Component-based approach - declarative and clean */}
      <SupaFeature
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

  // Boolean features only (current API)
  const { feature: showPremium } = useFeature('premium-feature', {
    fallback: false,
    context: { plan: 'premium' },
  })

  // Multiple features at once
  const { features } = useFeatures({
    features: {
      'feature-1': false,
      'feature-2': false,
      'feature-3': true,
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

**Configuration Options:**

```tsx
interface SupaClientConfig {
  apiKey: string
  environment: string
  context?: Record<string, unknown>
  networkConfig?: {
    featuresAPIUrl?: string
    eventsAPIUrl?: string
    retry?: { enabled?: boolean; maxAttempts?: number; backoff?: number }
    requestTimeoutMs?: number
    fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  }
}
```

Common context properties:

- `userID`: User identifier
- `email`: User email
- `plan`: Membership plan (e.g., 'premium', 'free')
- `version`: Application version (e.g., 1.0.0)

> Note: The above are just common examples. You can use any properties in your context object that make sense for your application's feature targeting needs.

### useFeature Hook

Retrieves a single feature flag value with React state management and full TypeScript type safety.

```tsx
const { feature, isLoading, error }: UseFeatureResult<T> = useFeature<T>(featureName: string, options?: UseFeatureOptions<T>)
```

**UseFeatureOptions:**

```tsx
interface UseFeatureOptions<T extends FeatureValue = FeatureValue> {
  fallback?: T // Type-safe fallback value
  context?: FeatureContext // Context override for this request
  shouldFetch?: boolean // Whether to fetch the feature (default: true)
}
```

**Examples:**

```tsx
function MyComponent() {
  // Simple boolean feature
  const { feature: isEnabled } = useFeature<boolean>('my-feature', { fallback: false })

  // With context override
  const { feature: showPremium } = useFeature<boolean>('premium-feature', {
    fallback: false,
    context: { userPlan: 'premium' },
  })

  // Conditional fetching
  const { user, isLoading } = useUser()
  // Boolean-only API; variant examples removed

  return (
    <div>
      {isEnabled && <NewFeature />}
      <Button color={buttonColor} />
      <ItemList maxItems={maxItems} />
      {showPremium && <PremiumContent />}
      <Dashboard variant={dashboardVariant} />
    </div>
  )
}
```

### useFeatures Hook

Retrieves multiple feature flags in a single request with React state management.

```tsx
const { features, isLoading, error }: UseFeaturesResult<T> = useFeatures<T>(options: UseFeaturesOptions<T>)
```

**UseFeaturesOptions:**

```tsx
interface UseFeaturesOptions<T extends Record<string, FeatureValue>> {
  features: T // Feature names with fallback values
  context?: FeatureContext // Context override for this request
  shouldFetch?: boolean // Whether to fetch features (default: true)
}
```

**Examples:**

```tsx
function Dashboard() {
  const { user, isLoading } = useUser()

  type DashboardFeatures = {
    'new-dashboard': boolean
    'beta-mode': boolean
    'show-sidebar': boolean
  }

  const { features } = useFeatures<DashboardFeatures>({
    features: {
      'new-dashboard': false,
      'beta-mode': false,
      'show-sidebar': true,
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
      {features['show-sidebar'] && <Sidebar />}
      <MainContent />
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

### SupashipFeature Component

A declarative component for conditional rendering based on feature flags using a compact variations approach.

```tsx
<SupashipFeature
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
interface SupashipFeatureProps {
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
<SupashipFeature
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
<SupashipFeature
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

<SupashipFeature
  feature="show-banner"
  variations={{
    true: <PromoBanner />,
    false: null, // Render nothing when false
  }}
/>
```

#### Number Feature Values

```tsx
<SupashipFeature
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

For simple show/hide scenarios, you can use the SupashipFeature component with compact variations:

```tsx
// Simple show/hide based on boolean
<SupashipFeature
  feature="new-feature"
  variations={{
    true: <NewFeatureContent />,
  }}
/>

// With loading state
<SupashipFeature
  feature="beta-banner"
  loading="skeleton"
  variations={{
    true: <BetaBanner />,
    skeleton: <BannerSkeleton />,
  }}
/>

// Conditional rendering with multiple possible values
<SupashipFeature
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
<SupashipFeature
  feature="theme"
  fallback="light"
  variations={{
    dark: <DarkModeStyles />,
    light: <LightModeStyles />,
  }}
/>

// Conditional fetching - only fetch when user is authenticated
<SupashipFeature
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
    <SupashipProvider
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
    </SupashipProvider>
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
import { SupaProvider } from '@supashiphq/sdk-react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupaProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_SUPASHIP_API_KEY!,
        environment: process.env.NODE_ENV!,
        context: {
          version: process.env.NEXT_PUBLIC_APP_VERSION,
        },
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
import { SupaFeature } from '@supashiphq/sdk-react'

export default function HomePage() {
  return (
    <main>
      <SupaFeature
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
import { SupaProvider } from '@supashiphq/sdk-react'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SupaProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_SUPASHIP_API_KEY!,
        environment: process.env.NODE_ENV!,
      }}
    >
      <Component {...pageProps} />
    </SupaProvider>
  )
}

// pages/index.tsx
import { SupaFeature } from '@supashiphq/sdk-react'

export default function HomePage() {
  return (
    <div>
      <SupaFeature
        feature="new-homepage"
        fallback={false}
        variations={{
          true: <NewHomePage />,
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
import { SupashipClient } from '@supashiphq/sdk-javascript'

export const serverFeatureClient = new SupashipClient({
  apiKey: process.env.SUPASHIP_API_KEY!,
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
import { SupaProvider } from '@supashiphq/sdk-react'
import { Platform } from 'react-native'

export default function App() {
  return (
    <SupashipProvider
      config={{
        apiKey: 'your-api-key',
        context: {
          platform: Platform.OS,
          version: Platform.Version,
        },
      }}
    >
      <YourApp />
    </SupashipProvider>
  )
}

// components/HomePage.tsx
import React from 'react'
import { View } from 'react-native'
import { SupashipFeature } from '@supashiphq/sdk-react'

export function HomePage() {
  return (
    <View>
      <SupashipFeature
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
import { SupashipProvider } from '@supashiphq/sdk-react'

export const wrapRootElement = ({ element }) => (
  <SupaProvider
    config={{
      apiKey: process.env.SUPASHIP_API_KEY,
      environment: process.env.NODE_ENV,
      context: {
        site: 'gatsby-site',
      },
    }}
  >
    {element}
  </SupaProvider>
)

// src/components/Layout.tsx
import { SupaFeature } from '@supashiphq/sdk-react'

export function Layout({ children }) {
  return (
    <SupaFeature
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

      <SupashipFeature
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
// __mocks__/@supashiphq/sdk-react.ts
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

export const SupashipProvider = ({ children }: any) => children
```

### Test Utilities

```tsx
// test-utils/feature-flag-utils.tsx
import { mockFeatures } from '../__mocks__/@supashiphq/sdk-react'

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

## Troubleshooting

### Common Issues

#### 1. Provider Not Found Error

```
Error: useFeature must be used within a SupashipProvider
```

**Solution:** Ensure your component is wrapped in a `SupashipProvider`:

```tsx
// ✅ Correct
function App() {
  return (
    <SupashipProvider config={{ apiKey: 'your-key' }}>
      <MyComponent />
    </SupashipProvider>
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
