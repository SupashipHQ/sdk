# DarkFeature React SDK

A React SDK for DarkFeature that provides hooks and components for feature flag management.

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
import { DarkFeatureProvider, useFeature } from '@darkfeature/sdk-react'

function App() {
  return (
    <DarkFeatureProvider
      config={{
        apiKey: 'your-api-key',
        context: {
          userId: '123',
          environment: 'production',
        },
      }}
    >
      <YourApp />
    </DarkFeatureProvider>
  )
}

function YourApp() {
  const isEnabled = useFeature('my-feature')

  return <div>{isEnabled ? 'Feature is enabled!' : 'Feature is disabled'}</div>
}
```

## Hooks

### useFeature

The `useFeature` hook can be used in two ways:

1. With a fallback value:

```tsx
// Using a fallback value
const isEnabled = useFeature('feature-name', false)
const variation = useFeature('feature-name', 'default-value')
```

2. With an options object:

```tsx
function MyComponent() {
  const { user, isLoading } = useUser()

  const isEnabled = useFeature('feature-name', {
    context: {
      userId: user?.id,
    },
    shouldFetch: !isLoading && !!user, // Only fetch when user data is available
    fallback: false, // optional, defaults to null
  })

  return <div>{isEnabled ? 'Feature is enabled!' : 'Feature is disabled'}</div>
}
```

### useFeatures

```tsx
function MyComponent() {
  const { user, isLoading } = useUser()

  const features = useFeatures({
    features: {
      feature1: false, // fallback value
      feature2: true, // fallback value
    },
    context: {
      userId: user?.id,
    },
    shouldFetch: !isLoading && !!user, // Only fetch when user data is available
  })

  return (
    <div>
      {features.feature1 && <Feature1Component />}
      {features.feature2 && <Feature2Component />}
    </div>
  )
}
```

## Plugins

The React SDK supports plugins that can intercept and modify feature flag requests. Plugins can be used for:

- Logging
- Analytics
- Caching
- Custom validation
- Error handling
- And more!

### Creating a Plugin

```tsx
import { DarkFeaturePlugin } from '@darkfeature/sdk-javascript'

const loggingPlugin: DarkFeaturePlugin = {
  name: 'logging',
  beforeGetFeature: async (featureName, context) => {
    console.log(`Getting feature: ${featureName}`, context)
  },
  afterGetFeature: async (featureName, value, context) => {
    console.log(`Got feature: ${featureName}`, { value, context })
  },
}
```

### Using Plugins

```tsx
import { DarkFeatureProvider } from '@darkfeature/sdk-react'

function App() {
  return (
    <DarkFeatureProvider
      config={{
        apiKey: 'your-api-key',
      }}
      plugins={[loggingPlugin, analyticsPlugin]}
    >
      <YourApp />
    </DarkFeatureProvider>
  )
}
```

### Plugin Lifecycle

Plugins can implement the following lifecycle methods:

- `initialize?()`: Called when the plugin is registered
- `cleanup?()`: Called when the client is cleaned up
- `beforeGetFeature?(featureName, context)`: Called before getting a feature
- `afterGetFeature?(featureName, value, context)`: Called after getting a feature
- `beforeGetFeatures?(featureNames, context)`: Called before getting multiple features
- `afterGetFeatures?(results, context)`: Called after getting multiple features
- `onError?(error, context)`: Called when an error occurs

## TypeScript Support

The SDK is written in TypeScript and provides full type support.

## License

MIT
