# Supaship JavaScript SDK

A type-safe JavaScript SDK for Supaship that provides a simple way to manage feature flags in your JavaScript applications.

## Installation

```bash
npm install @supashiphq/sdk-javascript
# or
yarn add @supashiphq/sdk-javascript
# or
pnpm add @supashiphq/sdk-javascript
```

## Quick Start

```typescript
import { SupaClient, createFeatures } from '@supashiphq/sdk-javascript'

// Define your features with fallback values
const features = createFeatures({
  'new-ui': false,
  'premium-features': true,
  'theme-config': {
    primaryColor: '#007bff',
    darkMode: false,
  },
})

// Create client with features
const client = new SupaClient({
  apiKey: 'your-api-key',
  environment: 'production',
  features,
  context: {
    userID: '123',
    email: 'user@example.com',
    plan: 'premium',
  },
})

// Get a single feature flag (fully typed!)
const isNewUIEnabled = await client.getFeature('new-ui')
// Type: boolean

// Get theme configuration (fully typed!)
const themeConfig = await client.getFeature('theme-config')
// Type: { primaryColor: string; darkMode: boolean; }

// Get multiple features at once
const allFeatures = await client.getFeatures(['new-ui', 'premium-features'])
// Type: Record<string, FeatureValue>
```

## Type-Safe Features

The SDK enforces type safety through the `createFeatures()` helper. This ensures:

- ✅ Features must be defined before use
- ✅ Feature names are validated at compile-time
- ✅ Feature values are properly typed
- ✅ No typos in feature names

### Defining Features

```typescript
import { createFeatures } from '@supashiphq/sdk-javascript'

const features = createFeatures({
  // Boolean flags
  'dark-mode': false,
  'beta-access': true,

  // Object configurations
  'ui-config': {
    theme: 'light' as 'light' | 'dark',
    maxItems: 100,
    enableAnimations: true,
  },

  // Arrays
  'allowed-regions': ['us-east', 'eu-west'],

  // Null for disabled/unset features
  'experimental-feature': null,
})

const client = new SupaClient({
  apiKey: 'your-api-key',
  environment: 'production',
  features,
})

// ✅ TypeScript knows 'dark-mode' exists and returns boolean
const darkMode = await client.getFeature('dark-mode')

// ❌ TypeScript error: 'unknown-feature' doesn't exist
const value = await client.getFeature('unknown-feature')
```

## API Reference

### SupaClient

#### Constructor

```typescript
new SupaClient(config: SupaClientConfig)
```

**Configuration Options:**

| Option          | Type             | Required | Description                                                     |
| --------------- | ---------------- | -------- | --------------------------------------------------------------- |
| `apiKey`        | `string`         | Yes      | Your Supaship API key (Project Settings -> API Keys)            |
| `environment`   | `string`         | Yes      | Environment slug (e.g., `production`, `staging`, `development`) |
| `features`      | `Features<T>`    | Yes      | Feature definitions (created via `createFeatures()`)            |
| `context`       | `FeatureContext` | No       | Default context for feature evaluation                          |
| `networkConfig` | `NetworkConfig`  | No       | Network settings (endpoints, retry, timeout, custom fetch)      |
| `plugins`       | `SupaPlugin[]`   | No       | Plugins for observability, caching, etc.                        |

**Feature Context:**

| Field           | Type                               | Description                                 |
| --------------- | ---------------------------------- | ------------------------------------------- |
| `[key: string]` | `string` `number` `boolean` `null` | Key value pairs for feature flag evaluation |

**Network Configuration:**

| Field              | Type                                                                   | Required | Default                                 | Description                                                   |
| ------------------ | ---------------------------------------------------------------------- | -------- | --------------------------------------- | ------------------------------------------------------------- |
| `featuresAPIUrl`   | `string`                                                               | No       | `https://edge.supaship.com/v1/features` | Override features API URL                                     |
| `eventsAPIUrl`     | `string`                                                               | No       | `https://edge.supaship.com/v1/events`   | Override events/analytics API URL                             |
| `requestTimeoutMs` | `number`                                                               | No       | `10000`                                 | Abort requests after N ms (uses AbortController if available) |
| `fetchFn`          | `(input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>` | No       | —                                       | Custom fetch (pass in Node < 18 or specialized runtimes)      |
| `retry`            | `RetryConfig`                                                          | No       | see below                               | Retry behavior for network requests                           |

Retry (networkConfig.retry):

| Field         | Type      | Required | Default | Description                            |
| ------------- | --------- | -------- | ------- | -------------------------------------- |
| `enabled`     | `boolean` | No       | `true`  | Enable/disable retries                 |
| `maxAttempts` | `number`  | No       | `3`     | Maximum retry attempts                 |
| `backoff`     | `number`  | No       | `1000`  | Base backoff delay in ms (exponential) |

#### Methods

##### getFeature()

Retrieves a single feature flag value with full TypeScript type safety.

```typescript
getFeature<TKey extends keyof TFeatures>(
  featureName: TKey,
  options?: { context?: FeatureContext }
): Promise<TFeatures[TKey]>
```

**Parameters:**

- `featureName`: The name of the feature flag (must be defined in your features config)
- `options.context`: Context override for this request

**Examples:**

```typescript
const features = createFeatures({
  'dark-mode': false,
  'theme-config': { primary: '#007bff' },
})

const client = new SupaClient({
  apiKey: 'key',
  environment: 'production',
  features,
})

// Get boolean feature
const darkMode = await client.getFeature('dark-mode')
// Type: boolean

// Get object feature
const theme = await client.getFeature('theme-config')
// Type: { primary: string }

// With context override
const darkMode = await client.getFeature('dark-mode', {
  context: { userID: '123', plan: 'premium' },
})
```

##### getFeatures()

Retrieves multiple feature flags in a single request.

```typescript
getFeatures(
  featureNames: (keyof TFeatures)[],
  options?: { context?: FeatureContext }
): Promise<Record<string, FeatureValue>>
```

**Parameters:**

- `featureNames`: Array of feature flag names (must be defined in your features config)
- `options.context`: Context override for this request

**Examples:**

```typescript
const features = createFeatures({
  'new-ui': false,
  'premium-content': false,
  'beta-mode': false,
})

const client = new SupaClient({
  apiKey: 'key',
  environment: 'prod',
  features,
})

// Get multiple features
const results = await client.getFeatures(['new-ui', 'premium-content'])
// { 'new-ui': true, 'premium-content': false }

// With context override
const results = await client.getFeatures(['new-ui', 'beta-mode'], {
  context: { userID: '123', plan: 'premium' },
})
```

##### updateContext()

Updates the default context for the client.

```typescript
updateContext(context: FeatureContext, mergeWithExisting?: boolean): void
```

**Parameters:**

- `context`: New context data
- `mergeWithExisting`: Whether to merge with existing context (default: `true`)

**Examples:**

```typescript
// Merge with existing context
client.updateContext({ userID: '456' })

// Replace entire context
client.updateContext({ userID: '456', newField: 'value' }, false)
```

##### getContext()

Retrieves the current default context.

```typescript
getContext(): FeatureContext | undefined
```

## Types

### FeatureValue

Supported feature flag value types:

```typescript
type FeatureValue = boolean | null | Record<string, unknown> | unknown[]
```

- **`boolean`** - Simple on/off flags
- **`object`** - Structured configuration data (e.g., `{ theme: 'dark', size: 'large' }`)
- **`array`** - Lists of values (e.g., `['feature-a', 'feature-b']`)
- **`null`** - Disabled or unset state

> **Note:** Strings and numbers are not supported as standalone feature values. Use objects or arrays for complex data.

### FeatureContext

Context object for feature evaluation:

```typescript
interface FeatureContext {
  [key: string]: string | number | boolean | null | undefined
}
```

Common context properties:

- `userID`: User identifier
- `email`: User email
- `plan`: Membership plan (e.g., 'premium', 'free')
- `version`: Application version (e.g., 1.0.0)

> Note: The above are just common examples. You can use any properties in your context object that make sense for your application's feature targeting needs.

## Best Practices

### 1. Define Features Centrally

```typescript
// features.ts
import { createFeatures } from '@supashiphq/sdk-javascript'

export const features = createFeatures({
  'new-dashboard': false,
  'premium-features': false,
  'ui-settings': {
    theme: 'light' as 'light' | 'dark',
    sidebarCollapsed: false,
  },
  'enabled-regions': ['us', 'eu'],
})

// client.ts
import { SupaClient } from '@supashiphq/sdk-javascript'
import { features } from './features'

export const client = new SupaClient({
  apiKey: process.env.SUPASHIP_API_KEY!,
  environment: process.env.ENVIRONMENT!,
  features,
})
```

### 2. Use Type Inference

```typescript
const features = createFeatures({
  'dark-mode': false,
  config: {
    maxItems: 50,
    theme: 'light' as 'light' | 'dark',
  },
})

const client = new SupaClient({
  apiKey: 'key',
  environment: 'prod',
  features,
})

// TypeScript knows the exact type!
const config = await client.getFeature('config')
// Type: { maxItems: number; theme: 'light' | 'dark'; }

const maxItems: number = config.maxItems // ✅ Type-safe
const theme: 'light' | 'dark' = config.theme // ✅ Type-safe
```

### 3. Use Context for Targeting

```typescript
const client = new SupaClient({
  apiKey: 'your-api-key',
  environment: 'production',
  features,
  context: {
    userID: user.id,
    email: user.email,
    plan: user.subscriptionPlan,
    version: process.env.APP_VERSION,
  },
})

// Update context when user state changes
function onUserLogin(user) {
  client.updateContext({
    userID: user.id,
    email: user.email,
    plan: user.plan,
  })
}
```

### 4. Batch Feature Requests

```typescript
// ✅ Good - single API call
const results = await client.getFeatures(['feature-1', 'feature-2', 'feature-3'])

// ❌ Less efficient - multiple API calls
const feature1 = await client.getFeature('feature-1')
const feature2 = await client.getFeature('feature-2')
const feature3 = await client.getFeature('feature-3')
```

## Plugin System

The SDK supports plugins for observability, caching, logging, and more.

### Built-in Plugins

#### Toolbar Plugin

Visual toolbar for local development and testing.

```typescript
import { SupaClient, ToolbarPlugin, createFeatures } from '@supashiphq/sdk-javascript'

const features = createFeatures({
  'new-ui': false,
  premium: false,
})

const client = new SupaClient({
  apiKey: 'your-api-key',
  environment: 'development',
  features,
  plugins: [
    new ToolbarPlugin({
      show: 'auto', // Shows only on localhost
      position: {
        placement: 'bottom-right',
        offset: { x: '1rem', y: '1rem' },
      },
    }),
  ],
})
```

**Features:**

- 🎯 Visual interface showing all configured feature flags
- 🔄 Override feature flag values locally
- 💾 Persistent storage in localStorage
- 🎨 Customizable position
- 🏠 Auto-detection (shows only on localhost by default)

**Programmatic Control:**

```typescript
const toolbar = new ToolbarPlugin({ show: true })

// Set override
toolbar.setOverride('new-feature', true)

// Remove override
toolbar.removeOverride('new-feature')

// Clear all
toolbar.clearAllOverrides()

// Get current overrides
const overrides = toolbar.getOverrides()
```

### Custom Plugins

Create custom plugins by implementing the `SupaPlugin` interface:

```typescript
import { SupaPlugin, FeatureValue, FeatureContext } from '@supashiphq/sdk-javascript'

class LoggingPlugin implements SupaPlugin {
  name = 'logging-plugin'

  onInit(availableFeatures: Record<string, FeatureValue>, context?: FeatureContext): void {
    console.log('Features initialized:', Object.keys(availableFeatures))
    console.log('Initial context:', context)
  }

  async beforeGetFeatures(featureNames: string[], context?: FeatureContext): Promise<void> {
    console.log('Fetching features:', featureNames, 'with context:', context)
  }

  async afterGetFeatures(
    results: Record<string, FeatureValue>,
    context?: FeatureContext
  ): Promise<void> {
    console.log('Features fetched:', results)
  }

  async onError(error: Error, context?: FeatureContext): Promise<void> {
    console.error('Feature fetch error:', error, 'context:', context)
  }
}

const client = new SupaClient({
  apiKey: 'key',
  environment: 'prod',
  features,
  plugins: [new LoggingPlugin()],
})
```

**Available Hooks:**

- `onInit(availableFeatures, context)` - Called when client initializes
- `beforeGetFeatures(featureNames, context)` - Before fetching features
- `afterGetFeatures(results, context)` - After fetching features
- `onError(error, context)` - When an error occurs
- `beforeRequest(url, body, headers)` - Before HTTP request
- `afterResponse(response, timing)` - After HTTP response
- `onContextUpdate(oldContext, newContext, source)` - When context changes
- `onRetryAttempt(attempt, error, willRetry)` - During retry attempts
- `onFallbackUsed(featureName, fallbackValue, reason)` - When fallback is used

## Examples

### React Integration

For React applications, use our dedicated React SDK which provides hooks and components optimized for React:

📦 **[@supashiphq/sdk-react](https://npmjs.com/package/@supashiphq/sdk-react)**

### Node.js Server

```typescript
import express from 'express'
import { SupaClient, createFeatures } from '@supashiphq/sdk-javascript'

const features = createFeatures({
  'new-api': false,
  'cache-enabled': true,
  'rate-limit': { maxRequests: 100, windowMs: 60000 },
})

const featureClient = new SupaClient({
  apiKey: process.env.SUPASHIP_API_KEY!,
  environment: 'production',
  features,
})

const app = express()

app.get('/api/config', async (req, res) => {
  const rateLimit = await featureClient.getFeature('rate-limit')

  res.json({
    rateLimit: rateLimit,
    newApiEnabled: await featureClient.getFeature('new-api'),
  })
})

app.get('/api/user-features/:userId', async (req, res) => {
  const results = await featureClient.getFeatures(['new-api', 'cache-enabled'], {
    context: {
      userID: req.params.userId,
      plan: req.user.plan,
      region: req.headers['cloudfront-viewer-country'],
    },
  })

  res.json(results)
})
```

### Vue Integration

```typescript
// plugins/feature-flags.ts
import { SupaClient, createFeatures } from '@supashiphq/sdk-javascript'

const features = createFeatures({
  'new-nav': false,
  'dark-mode': false,
  'premium-content': false,
})

const client = new SupaClient({
  apiKey: import.meta.env.VITE_SUPASHIP_API_KEY,
  environment: 'production',
  features,
})

export default {
  install(app: App) {
    app.config.globalProperties.$featureFlags = client
    app.provide('featureFlags', client)
  }
}

// components/MyComponent.vue
<script setup lang="ts">
import { inject, ref, onMounted } from 'vue'
import type { SupaClient } from '@supashiphq/sdk-javascript'

const featureFlags = inject<SupaClient>('featureFlags')!
const showNewNav = ref(false)
const darkMode = ref(false)

onMounted(async () => {
  showNewNav.value = await featureFlags.getFeature('new-nav')
  darkMode.value = await featureFlags.getFeature('dark-mode')
})
</script>

<template>
  <div :class="{ dark: darkMode }">
    <NewNav v-if="showNewNav" />
    <OldNav v-else />
  </div>
</template>
```

### Angular Integration

```typescript
// feature-flag.service.ts
import { Injectable } from '@angular/core'
import { SupaClient, createFeatures } from '@supashiphq/sdk-javascript'
import { environment } from '../environments/environment'

const features = createFeatures({
  'new-dashboard': false,
  analytics: true,
  'theme-config': { mode: 'light' as 'light' | 'dark' },
})

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  private client: SupaClient<typeof features>

  constructor() {
    this.client = new SupaClient({
      apiKey: environment.SUPASHIP_API_KEY,
      environment: 'production',
      features,
      context: {
        userID: this.getCurrentUserId(),
        version: environment.version,
      },
    })
  }

  async getFeature<K extends keyof typeof features>(featureName: K): Promise<(typeof features)[K]> {
    return this.client.getFeature(featureName)
  }

  async getFeatures(featureNames: (keyof typeof features)[]): Promise<Record<string, any>> {
    return this.client.getFeatures(featureNames)
  }

  updateContext(context: Record<string, any>) {
    this.client.updateContext(context)
  }

  private getCurrentUserId(): string {
    return localStorage.getItem('userID') || 'anonymous'
  }
}

// app.component.ts
import { Component, OnInit } from '@angular/core'
import { FeatureFlagService } from './feature-flag.service'

@Component({
  selector: 'app-root',
  template: `
    <div>
      <new-dashboard *ngIf="showNewDashboard"></new-dashboard>
      <old-dashboard *ngIf="!showNewDashboard"></old-dashboard>
    </div>
  `,
})
export class AppComponent implements OnInit {
  showNewDashboard = false

  constructor(private featureFlags: FeatureFlagService) {}

  async ngOnInit() {
    this.showNewDashboard = await this.featureFlags.getFeature('new-dashboard')
  }
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
