# Supaship OpenFeature Provider for React

OpenFeature React provider for Supaship feature flags. This package provides React-specific hooks and components to use Supaship with OpenFeature, offering a standardized interface for feature flag management in React applications.

## Installation

```bash
npm install @supashiphq/openfeature-react-provider @openfeature/react-sdk
```

Or with your preferred package manager:

```bash
pnpm add @supashiphq/openfeature-react-provider @openfeature/react-sdk
yarn add @supashiphq/openfeature-react-provider @openfeature/react-sdk
```

## Usage

### Setup

Wrap your app with both `SupaProvider` and `SupashipOpenFeatureProvider`:

```tsx
import { SupaProvider, createFeatures } from '@supashiphq/sdk-react'
import { SupashipOpenFeatureProvider } from '@supashiphq/openfeature-react-provider'

// Define your features
const features = createFeatures({
  'dark-mode': false,
  'new-ui': true,
  'max-users': 100,
  'ui-config': {
    theme: 'light',
    layout: 'grid',
  },
})

const config = {
  apiKey: 'your-api-key',
  environment: 'production',
  features,
}

function App() {
  return (
    <SupaProvider config={config}>
      <SupashipOpenFeatureProvider>
        <YourApp />
      </SupashipOpenFeatureProvider>
    </SupaProvider>
  )
}
```

### Using Hooks

#### Boolean Flags

```tsx
import { useBooleanFlagValue } from '@supashiphq/openfeature-react-provider'

function DarkModeToggle() {
  const darkMode = useBooleanFlagValue('dark-mode', false)

  return (
    <div className={darkMode ? 'dark' : 'light'}>
      Dark mode is {darkMode ? 'enabled' : 'disabled'}
    </div>
  )
}
```

#### String Flags

```tsx
import { useStringFlagValue } from '@supashiphq/openfeature-react-provider'

function ThemeSelector() {
  const theme = useStringFlagValue('theme', 'light')

  return <div>Current theme: {theme}</div>
}
```

#### Number Flags

```tsx
import { useNumberFlagValue } from '@supashiphq/openfeature-react-provider'

function UserLimitDisplay() {
  const maxUsers = useNumberFlagValue('max-users', 10)

  return <div>Maximum users: {maxUsers}</div>
}
```

#### Object Flags

```tsx
import { useObjectFlagValue } from '@supashiphq/openfeature-react-provider'

interface UIConfig {
  theme: string
  layout: string
}

function ConfigDisplay() {
  const config = useObjectFlagValue<UIConfig>('ui-config', {
    theme: 'light',
    layout: 'list',
  })

  return (
    <div>
      Theme: {config.theme}
      <br />
      Layout: {config.layout}
    </div>
  )
}
```

### Detailed Flag Information

Get detailed information about flag evaluation:

```tsx
import { useBooleanFlagDetails } from '@supashiphq/openfeature-react-provider'

function FeatureStatus() {
  const details = useBooleanFlagDetails('dark-mode', false)

  return (
    <div>
      <p>Value: {details.value ? 'enabled' : 'disabled'}</p>
      <p>Reason: {details.reason}</p>
      {details.errorCode && <p>Error: {details.errorCode}</p>}
    </div>
  )
}
```

### Using Evaluation Context

Pass context to flag evaluation:

```tsx
import { useBooleanFlagValue } from '@supashiphq/openfeature-react-provider'
import { useEvaluationContext } from '@openfeature/react-sdk'

function PremiumFeature() {
  // Set context for all flag evaluations
  useEvaluationContext({
    userId: '123',
    email: 'user@example.com',
    plan: 'premium',
  })

  const hasFeature = useBooleanFlagValue('premium-feature', false)

  return hasFeature ? <PremiumContent /> : <UpgradePrompt />
}
```

### Using with Multiple Domains

OpenFeature supports multiple domains for different providers:

```tsx
import { SupashipOpenFeatureProvider } from '@supashiphq/openfeature-react-provider'

function App() {
  return (
    <SupaProvider config={config}>
      <SupashipOpenFeatureProvider domain="my-domain">
        <YourApp />
      </SupashipOpenFeatureProvider>
    </SupaProvider>
  )
}

// In your components
function MyComponent() {
  const value = useBooleanFlagValue('my-flag', false, { domain: 'my-domain' })
  return <div>{value ? 'On' : 'Off'}</div>
}
```

### Waiting for Provider Ready

Execute code when the provider is ready:

```tsx
import { useWhenProviderReady } from '@supashiphq/openfeature-react-provider'

function MyComponent() {
  const [ready, setReady] = useState(false)

  useWhenProviderReady(() => {
    setReady(true)
    console.log('Provider is ready!')
  })

  if (!ready) {
    return <div>Loading...</div>
  }

  return <div>Ready to evaluate flags!</div>
}
```

## Available Hooks

All hooks from `@openfeature/react-sdk` are re-exported for convenience:

- `useFlag` - Generic flag hook
- `useBooleanFlagValue` - Get boolean flag value
- `useBooleanFlagDetails` - Get boolean flag with details
- `useStringFlagValue` - Get string flag value
- `useStringFlagDetails` - Get string flag with details
- `useNumberFlagValue` - Get number flag value
- `useNumberFlagDetails` - Get number flag with details
- `useObjectFlagValue` - Get object flag value
- `useObjectFlagDetails` - Get object flag with details
- `useOpenFeatureClient` - Get OpenFeature client instance
- `useTrackingEventDetails` - Track evaluation events
- `useWhenProviderReady` - Execute callback when provider is ready

## Features

- ✅ Full OpenFeature React SDK compatibility
- ✅ React 18+ support with Suspense
- ✅ Type-safe feature flag hooks
- ✅ Automatic context management
- ✅ Support for all flag types
- ✅ Provider ready detection
- ✅ Multiple domain support
- ✅ SSR compatible

## Requirements

- React 18+
- `@openfeature/react-sdk` ^1.0.0
- `@supashiphq/sdk-react` workspace package
- `@supashiphq/openfeature-js-provider` workspace package

## Example Project

```tsx
import React from 'react'
import { createFeatures, SupaProvider } from '@supashiphq/sdk-react'
import {
  SupashipOpenFeatureProvider,
  useBooleanFlagValue,
  useObjectFlagValue,
} from '@supashiphq/openfeature-react-provider'

// Define features
const features = createFeatures({
  'dark-mode': false,
  'new-dashboard': true,
  'ui-config': {
    theme: 'light',
    sidebarPosition: 'left',
  },
})

// Configuration
const config = {
  apiKey: process.env.SUPASHIP_API_KEY!,
  environment: 'production',
  features,
}

// App component
function App() {
  return (
    <SupaProvider config={config}>
      <SupashipOpenFeatureProvider>
        <Dashboard />
      </SupashipOpenFeatureProvider>
    </SupaProvider>
  )
}

// Dashboard component using flags
function Dashboard() {
  const darkMode = useBooleanFlagValue('dark-mode', false)
  const newDashboard = useBooleanFlagValue('new-dashboard', false)
  const uiConfig = useObjectFlagValue('ui-config', {
    theme: 'light',
    sidebarPosition: 'left',
  })

  return (
    <div className={darkMode ? 'dark' : 'light'}>
      <h1>Dashboard</h1>
      {newDashboard ? <NewDashboard /> : <LegacyDashboard />}
      <Sidebar position={uiConfig.sidebarPosition} />
    </div>
  )
}

export default App
```

## License

MIT

## Support

For issues and questions:

- GitHub Issues: https://github.com/supashiphq/sdk/issues
- Documentation: https://docs.supaship.io
