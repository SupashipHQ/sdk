# Supaship JavaScript SDK

A type-safe [Supaship](https://supashp.com) for JavaScript, that provides a simple way to manage feature flags in your JavaScript applications.

## Installation

```bash
npm install @supashiphq/javascript-sdk
# or
yarn add @supashiphq/javascript-sdk
# or
pnpm add @supashiphq/javascript-sdk
```

## Quick Start

```typescript
import { SupaClient, FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'

// Define your features with fallback values
const features = {
  'new-ui': false,
  'premium-features': true,
  'theme-config': {
    primaryColor: '#007bff',
    darkMode: false,
  },
} satisfies FeaturesWithFallbacks

// Create client with features
const client = new SupaClient({
  sdkKey: 'your-sdk-key',
  environment: 'production',
  features,
  context: {
    userId: '123',
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

The SDK provides type safety through the `FeaturesWithFallbacks` type. This ensures:

- ✅ Features must be defined before use
- ✅ Feature names are validated at compile-time
- ✅ Feature values are properly typed
- ✅ No typos in feature names

### Defining Features

```typescript
import { FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'

// ✅ Recommended: satisfies (preserves exact literal types)
const features = {
  // Boolean flags
  'dark-mode': false,
  'beta-access': true,

  // Object configurations
  'ui-config': {
    theme: 'light' as const, // Preserves 'light' literal
    maxItems: 100,
    enableAnimations: true,
  },

  // Arrays
  'allowed-regions': ['us-east', 'eu-west'],

  // Null for disabled/unset features
  'experimental-feature': null,
} satisfies FeaturesWithFallbacks

// ⚠️ Avoid: Type annotation (widens types, loses precision)
const features: FeaturesWithFallbacks = {
  'dark-mode': false,
  'ui-config': {
    theme: 'light', // Widened to string, not 'light' literal
    maxItems: 100,
  },
}

const client = new SupaClient({
  sdkKey: 'your-sdk-key',
  environment: 'production',
  features,
  context: {},
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

| Option                       | Type                    | Required | Description                                                                        |
| ---------------------------- | ----------------------- | -------- | ---------------------------------------------------------------------------------- |
| `sdkKey`                     | `string`                | Yes      | Your Supaship SDK key (Project Settings -> SDK Keys)                               |
| `environment`                | `string`                | Yes      | Environment slug (e.g., `production`, `staging`, `development`)                    |
| `features`                   | `FeaturesWithFallbacks` | Yes      | Feature definitions with fallback values                                           |
| `context`                    | `FeatureContext`        | Yes      | Default context for feature evaluation                                             |
| `sensitiveContextProperties` | `string[]`              | No       | Hash sensitive context properties such as PII on the client before sending to Edge |
| `networkConfig`              | `NetworkConfig`         | No       | Network settings (endpoints, retry, timeout, custom fetch)                         |
| `plugins`                    | `SupaPlugin[]`          | No       | Plugins for observability, caching, etc.                                           |

**Feature Context:**

| Field           | Type                               | Description                                 |
| --------------- | ---------------------------------- | ------------------------------------------- |
| `[key: string]` | `string` `number` `boolean` `null` | Key value pairs for feature flag evaluation |

**Privacy / PII hashing (client-side):**

Use `sensitiveContextProperties` to hash selected context property values on the client before requests are sent to Edge.

```typescript
const client = new SupaClient({
  sdkKey: 'your-sdk-key',
  environment: 'production',
  features,
  context: {
    userID: 'user-123',
    email: 'user@example.com',
    plan: 'premium',
  },
  sensitiveContextProperties: ['email', 'userID'],
})
```

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
const features = {
  'dark-mode': false,
  'theme-config': { primary: '#007bff' },
} satisfies FeaturesWithFallbacks

const client = new SupaClient({
  sdkKey: 'key',
  environment: 'production',
  features,
  context: {},
})

// Get boolean feature
const darkMode = await client.getFeature('dark-mode')
// Type: boolean

// Get object feature
const theme = await client.getFeature('theme-config')
// Type: { primary: string }

// With context override
const darkMode = await client.getFeature('dark-mode', {
  context: { userId: '123', plan: 'premium' },
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
const features = {
  'new-ui': false,
  'premium-content': false,
  'beta-mode': false,
} satisfies FeaturesWithFallbacks

const client = new SupaClient({
  sdkKey: 'key',
  environment: 'prod',
  features,
  context: {},
})

// Get multiple features
const results = await client.getFeatures(['new-ui', 'premium-content'])
// { 'new-ui': true, 'premium-content': false }

// With context override
const results = await client.getFeatures(['new-ui', 'beta-mode'], {
  context: { userId: '123', plan: 'premium' },
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
client.updateContext({ userId: '456' })

// Replace entire context
client.updateContext({ userId: '456', newField: 'value' }, false)
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

- `userId`: User identifier
- `email`: User email
- `plan`: Membership plan (e.g., 'premium', 'free')
- `version`: Application version (e.g., 1.0.0)

> Note: The above are just common examples. You can use any properties in your context object that make sense for your application's feature targeting needs.

## Best Practices

### 1. Define Features Centrally

```typescript
// features.ts
import { FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'

export const features = {
  'new-dashboard': false,
  'premium-features': false,
  'ui-settings': {
    theme: 'light' as const,
    sidebarCollapsed: false,
  },
  'enabled-regions': ['us', 'eu'],
} satisfies FeaturesWithFallbacks

// client.ts
import { SupaClient } from '@supashiphq/javascript-sdk'
import { features } from './features'

export const client = new SupaClient({
  sdkKey: process.env.SUPASHIP_SDK_KEY!,
  environment: process.env.ENVIRONMENT!,
  features,
  context: {},
})
```

### 2. Use `satisfies` for Type Safety

Always use `satisfies` instead of type annotations to preserve literal types:

```typescript
// ✅ Good - preserves literal types
const features = {
  'dark-mode': false,
  config: {
    maxItems: 50,
    theme: 'light' as const,
  },
} satisfies FeaturesWithFallbacks

// ❌ Bad - loses literal types
const features: FeaturesWithFallbacks = {
  'dark-mode': false,
  config: {
    maxItems: 50,
    theme: 'light', // Widened to string
  },
}

const client = new SupaClient({
  sdkKey: 'key',
  environment: 'prod',
  features,
  context: {},
})

// With satisfies: TypeScript knows the exact literal type
const config = await client.getFeature('config')
// Type: { maxItems: number; theme: 'light'; }

const maxItems: number = config.maxItems // ✅ Type-safe
const theme = config.theme // ✅ Type-safe, inferred as 'light' literal
```

### 3. Use Context for Targeting

```typescript
const client = new SupaClient({
  sdkKey: 'your-sdk-key',
  environment: 'production',
  features,
  context: {
    userId: user.id,
    email: user.email,
    plan: user.subscriptionPlan,
    version: process.env.APP_VERSION!,
  },
})

// Update context when user state changes
function onUserLogin(user) {
  client.updateContext({
    userId: user.id,
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

**✨ Auto-enabled in browser environments!** The toolbar is automatically enabled in browsers with `enabled: 'auto'` (shows only on localhost). No manual configuration needed!

```typescript
import { SupaClient, FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'

const features = {
  'new-ui': false,
  premium: false,
} satisfies FeaturesWithFallbacks

// ✅ Automatic (recommended) - Toolbar auto-enabled in browser with 'auto' mode
const client = new SupaClient({
  sdkKey: 'your-sdk-key',
  environment: 'development',
  features,
  context: {},
})

// 🎨 Custom configuration
const client = new SupaClient({
  sdkKey: 'your-sdk-key',
  environment: 'development',
  features,
  context: {},
  toolbar: {
    enabled: true, // Always show
    position: {
      placement: 'bottom-right',
      offset: { x: '1rem', y: '1rem' },
    },
  },
})

// ❌ Opt-out (disable toolbar)
const client = new SupaClient({
  sdkKey: 'your-sdk-key',
  environment: 'production',
  features,
  context: {},
  toolbar: false,
})
```

**Features:**

- ✨ **Auto-enabled in browser** - No configuration needed!
- 🎯 Visual interface showing all configured feature flags
- 🔄 Override feature flag values locally
- 💾 Persistent storage in localStorage
- 🎨 Customizable position
- 🏠 Smart detection (shows only on localhost by default)
- 🚫 Easy opt-out with `toolbar: false`

## Examples

### React Integration

For React applications, use our dedicated React SDK which provides hooks and components optimized for React:

📦 **[@supashiphq/react-sdk](https://npmjs.com/package/@supashiphq/react-sdk)**

### Node.js Server

```typescript
import express from 'express'
import { SupaClient, FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'

const features = {
  'new-api': false,
  'cache-enabled': true,
  'rate-limit': { maxRequests: 100, windowMs: 60000 },
} satisfies FeaturesWithFallbacks

const featureClient = new SupaClient({
  sdkKey: process.env.SUPASHIP_SDK_KEY!,
  environment: 'production',
  features,
  context: {},
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
      userId: req.params.userId,
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
import { SupaClient, FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'

const features = {
  'new-nav': false,
  'dark-mode': false,
  'premium-content': false,
} satisfies FeaturesWithFallbacks

const client = new SupaClient({
  sdkKey: import.meta.env.VITE_SUPASHIP_SDK_KEY,
  environment: 'production',
  features,
  context: {},
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
import type { SupaClient } from '@supashiphq/javascript-sdk'

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
import { SupaClient, FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'
import { environment } from '../environments/environment'

const features = {
  'new-dashboard': false,
  analytics: true,
  'theme-config': { mode: 'light' as const },
} satisfies FeaturesWithFallbacks

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  private client: SupaClient

  constructor() {
    this.client = new SupaClient({
      sdkKey: environment.SUPASHIP_SDK_KEY,
      environment: 'production',
      features,
      context: {
        userId: this.getCurrentUserId(),
        version: environment.version,
      },
    })
  }

  async getFeature(featureName: string): Promise<any> {
    return this.client.getFeature(featureName)
  }

  async getFeatures(featureNames: string[]): Promise<Record<string, any>> {
    return this.client.getFeatures(featureNames)
  }

  updateContext(context: Record<string, any>) {
    this.client.updateContext(context)
  }

  private getCurrentUserId(): string {
    return localStorage.getItem('userId') || 'anonymous'
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
