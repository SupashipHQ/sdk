# Supaship JavaScript SDK

A JavaScript SDK for Supaship that provides a simple way to manage feature flags in your JavaScript applications.

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
import { SupaClient } from '@supashiphq/sdk-javascript'

const client = new SupaClient({
  apiKey: 'your-api-key',
  environment: 'production',
  context: {
    userID: '123',
    email: 'user@example.com',
    version: '1.0.0',
  },
})

// Get a single boolean feature flag with fallback
const isEnabled = await client.getFeature<boolean>('my-feature', { fallback: false })

// Get multiple boolean features at once
type FeatureFlags = {
  'feature-1': boolean
  'feature-2': boolean
  'feature-3': boolean
}

const features = await client.getFeatures<FeatureFlags>({
  features: {
    'feature-1': false,
    'feature-2': false,
    'feature-3': true,
  },
  context: {
    userID: '456', // Override default context for this request
  },
})

console.log(features)
// { 'feature-1': true, 'feature-2': false, 'feature-3': true }
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
| `context`       | `FeatureContext` | No       | Default context for feature evaluation                          |
| `networkConfig` | `NetworkConfig`  | No       | Network settings (endpoints, retry, timeout, custom fetch)      |

**Feature Context:**

| Field           | Type                               | Description                                 |
| --------------- | ---------------------------------- | ------------------------------------------- |
| `[key: string]` | `string` `number` `boolean` `null` | Key value pairs for feature flag evaluation |

**Network Configuration:**

| Field              | Type                                                                   | Required | Default                                 | Description                                                   |
| ------------------ | ---------------------------------------------------------------------- | -------- | --------------------------------------- | ------------------------------------------------------------- |
| `featuresAPIUrl`   | `string`                                                               | No       | `https://edge.supaship.com/v1/features` | Override features API URL                                     |
| `eventsAPIUrl`     | `string`                                                               | No       | `https://edge.supaship.com/v1/events`   | Override events/analytics API URL                             |
| `requestTimeoutMs` | `number`                                                               | No       | —                                       | Abort requests after N ms (uses AbortController if available) |
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
getFeature<T extends FeatureValue = FeatureValue>(featureName: string, options?: FeatureOptions<T>): Promise<T>
```

**Parameters:**

- `featureName`: The name of the feature flag
- `options`: A `FeatureOptions<T>` object for configuration

**FeatureOptions:**

```typescript
interface FeatureOptions<T extends FeatureValue = FeatureValue> {
  fallback?: T // Fallback value if feature not found or error occurs
  context?: FeatureContext // Context override for this request
}
```

**Examples:**

```typescript
// With boolean fallback value
const isEnabled = await client.getFeature<boolean>('my-feature', { fallback: false })
```

##### getFeatures()

Retrieves multiple feature flags in a single request.

```typescript
getFeatures<T extends Record<string, FeatureValue> = Record<string, FeatureValue>>(options: FeaturesOptions<T>): Promise<T>
```

**FeaturesOptions:**

```typescript
interface FeaturesOptions<T extends Record<string, FeatureValue> = Record<string, FeatureValue>> {
  features: T // Feature names with fallback values
  context?: FeatureContext // Context override for this request
}
```

**Examples:**

```typescript
type FeatureFlags = {
  'enable-new-ui': boolean
  'premium-content': boolean
  'beta-mode': boolean
}

const myFeatures = await client.getFeatures<FeatureFlags>({
  features: {
    'enable-new-ui': false,
    'premium-content': false,
    'beta-mode': false,
  },
  context: {
    userID: '123',
    plan: 'premium',
  },
})
// myFeatures value
// { 'enable-new-ui': true, 'premium-content': false, 'beta-mode': true }

// You can access with full type safety
const isUIEnabled: boolean = myFeatures['enable-new-ui']
const isPremium: boolean = myFeatures['premium-content']
const betaMode: boolean = myFeatures['beta-mode']

// without explicit generic (defaults to Record<string, FeatureValue>)
const features = await client.getFeatures({
  features: {
    'feature-1': false, // Boolean fallback
    'feature-2': false, // Boolean fallback
    'feature-3': true, // Boolean fallback
  },
  context: {
    userID: '123',
    plan: 'premium',
  },
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

The value of a feature flag returned by the API is currently boolean, JSON object or null:

```typescript
type FeatureValue = string | number | boolean | null | Record<string, unknown> | unknown[]
```

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

### 1. Always Provide Fallbacks

```typescript
// ✅ Good - provides fallback
const isEnabled = await client.getFeature('new-feature', { fallback: false })

// ❌ Risky - no fallback, throws error
const isEnabled = await client.getFeature('new-feature')
```

### 2. Use Context for Targeting

```typescript
const client = new SupaClient({
  apiKey: 'your-api-key',
  environment: 'staging',
  context: {
    userID: user.id,
    email: user.email,
    plan: user.subscriptionPlan,
    version: process.env.APP_VERSION,
  },
})
```

### 3. Batch Feature Requests

```typescript
// ✅ Good - single API call
const features = await client.getFeatures({
  features: { 'feature-1': false, 'feature-2': false },
})

// ❌ Less efficient - multiple API calls
const feature1 = await client.getFeature('feature-1', { fallback: false })
const feature2 = await client.getFeature('feature-2', { fallback: false })
```

### 4. Handle Context Updates

```typescript
// Update context when user state changes
function onUserLogin(user) {
  client.updateContext({
    userID: user.id,
    email: user.email,
    plan: user.plan,
  })
}

// Update context when navigating between features
function onRouteChange(route) {
  client.updateContext({
    currentPage: route.name,
    section: route.section,
  })
}
```

## Examples

### React Integration

For React applications, use our dedicated React SDK which provides hooks and components optimized for React:

📦 **[@supashiphq/sdk-react](http://npmjs.com/package/@supashiphq/sdk-react)**

### Vue Integration

```javascript
// plugins/feature-flags.js
import { SupaClient } from '@supashiphq/sdk-javascript'

export default {
  install(app, options) {
    const client = new SupaClient({
      apiKey: options.apiKey,
      environment: 'development',
      context: options.defaultContext || {}
    })

    app.config.globalProperties.$featureFlags = client
    app.provide('featureFlags', client)
  }
}

// main.js
import { createApp } from 'vue'
import App from './App.vue'
import FeatureFlagsPlugin from './plugins/feature-flags'

const app = createApp(App)

app.use(FeatureFlagsPlugin, {
  apiKey: process.env.SUPASHIP_API_KEY,
  defaultContext: { version: '1.0.0' }
})

app.mount('#app')

// components/MyComponent.vue
<template>
  <div>
    <NewFeature v-if="showNewFeature" />
    <OldFeature v-else />

    <PremiumContent v-if="isPremiumUser" />
  </div>
</template>

<script>
import { inject, ref, onMounted } from 'vue'

export default {
  name: 'MyComponent',
  setup() {
    const featureFlags = inject('featureFlags')
    const showNewFeature = ref(false)
    const isPremiumUser = ref(false)

    onMounted(async () => {
      const features = await featureFlags.getFeatures({
        features: {
          'new-feature': false,
          'premium-content': false
        },
        context: { page: 'dashboard' }
      })

      showNewFeature.value = features['new-feature']
      isPremiumUser.value = features['premium-content']
    })

    const updateUserContext = async (user) => {
      featureFlags.updateContext({
        userID: user.id,
        plan: user.plan
      })

      // Reload features
      const premium = await featureFlags.getFeature('premium-content', { fallback: false })
      isPremiumUser.value = premium
    }

    return {
      showNewFeature,
      isPremiumUser,
      updateUserContext
    }
  }
}
</script>
```

### Angular Integration

```typescript
// feature-flag.service.ts
import { Injectable } from '@angular/core'
import { SupaClient } from '@supashiphq/sdk-javascript'

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  private client: SupaClient

  constructor() {
    this.client = new SupaClient({
      apiKey: environment.SUPASHIP_API_KEY,
      environment: 'production',
      context: {
        userID: this.getCurrentUserId(),
        version: environment.version,
      },
    })
  }

  async getFeature(featureName: string, fallback: any = false) {
    return this.client.getFeature(featureName, { fallback })
  }

  async getFeatures(features: Record<string, any>, context?: any) {
    return this.client.getFeatures({ features, context })
  }

  updateContext(context: any) {
    this.client.updateContext(context)
  }

  private getCurrentUserId(): string {
    // Your user ID logic here
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
      <nav *ngIf="showNewNavigation">
        <!-- New navigation -->
      </nav>
      <nav *ngIf="!showNewNavigation">
        <!-- Old navigation -->
      </nav>

      <main>
        <premium-features *ngIf="showPremiumFeatures"></premium-features>
      </main>
    </div>
  `,
})
export class AppComponent implements OnInit {
  showNewNavigation = false
  showPremiumFeatures = false

  constructor(private featureFlags: FeatureFlagService) {}

  async ngOnInit() {
    const features = await this.featureFlags.getFeatures({
      'new-navigation': false,
      'premium-features': false,
    })

    this.showNewNavigation = features['new-navigation']
    this.showPremiumFeatures = features['premium-features']
  }

  async onUserLogin(user: any) {
    this.featureFlags.updateContext({
      userID: user.id,
      plan: user.subscriptionPlan,
    })

    // Reload features with new context
    const premiumEnabled = await this.featureFlags.getFeature('premium-features', {
      fallback: false,
    })
    this.showPremiumFeatures = premiumEnabled
  }
}
```

### Node.js Server

```typescript
import express from 'express'
import { SupaClient } from '@supashiphq/sdk-javascript'

const app = express()
const featureClient = new SupaClient({
  apiKey: process.env.SUPASHIP_API_KEY,
  environment: 'production',
})

app.get('/api/features', async (req, res) => {
  const features = await featureClient.getFeatures({
    features: {
      'new-api': false,
      'cache-enabled': true,
      'beta-mode': false,
    },
    context: {
      userID: req.user.id,
      plan: req.user.plan,
      region: req.headers['country'],
    },
  })

  res.json(features)
})
```

### jQuery Integration

```javascript
// Include the SDK in your HTML or bundle
const client = new SupaClient({
  apiKey: 'your-api-key',
  environment: 'production',
  context: { userID: getCurrentUserId() },
})

$(document).ready(async function () {
  // Get feature flags and update UI
  const features = await client.getFeatures({
    features: {
      'new-design': false,
      'premium-feature': false,
      'beta-mode': false,
    },
    context: { page: 'dashboard' },
  })

  // Toggle features based on flags
  if (features['new-design']) {
    $('body').addClass('new-design')
  }

  if (features['premium-feature']) {
    $('.premium-content').show()
  }

  if (features['beta-mode']) {
    $('#beta-banner').show()
  }
})

// Update context on user actions
$('#user-segment').change(async function () {
  client.updateContext({ segment: $(this).val() })

  // Reload features with new context
  const enabled = await client.getFeature('segment-specific-feature', { fallback: false })
  $('#special-feature').toggle(enabled)
})
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
