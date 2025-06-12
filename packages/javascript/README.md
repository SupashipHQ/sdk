# DarkFeature JavaScript SDK

A JavaScript SDK for DarkFeature that provides a simple way to manage feature flags in your JavaScript applications.

## Installation

```bash
npm install @darkfeature/sdk-javascript
# or
yarn add @darkfeature/sdk-javascript
# or
pnpm add @darkfeature/sdk-javascript
```

## Quick Start

```typescript
import { DarkFeatureClient } from '@darkfeature/sdk-javascript'

const client = new DarkFeatureClient({
  apiKey: 'your-api-key',
  context: {
    userId: '123',
    email: 'user@example.com',
    version: '1.0.0',
  },
})

// Get a single feature flag with fallback
const isEnabled = await client.getFeature('my-feature', { fallback: false })

// Get a feature flag with context override
const featureValue = await client.getFeature('experiment-feature', {
  fallback: 'control',
  context: { segment: 'premium' },
})

// Get multiple features at once
const features = await client.getFeatures({
  features: {
    'feature-1': false,
    'feature-2': 'default-value',
    'feature-3': null,
  },
  context: {
    userId: '456', // Override default context for this request
  },
})

console.log(features)
// { 'feature-1': true, 'feature-2': 'variant-a', 'feature-3': null }
```

## API Reference

### DarkFeatureClient

#### Constructor

```typescript
new DarkFeatureClient(config: DarkFeatureConfig)
```

**Configuration Options:**

| Option    | Type             | Required | Description                                         |
| --------- | ---------------- | -------- | --------------------------------------------------- |
| `apiKey`  | `string`         | Yes      | Your DarkFeature API key                            |
| `baseUrl` | `string`         | No       | Custom API endpoint (defaults to DarkFeature's API) |
| `context` | `FeatureContext` | No       | Default context for feature evaluation              |
| `retry`   | `RetryConfig`    | No       | Retry configuration for network requests            |

**Retry Configuration:**

```typescript
interface RetryConfig {
  enabled?: boolean // Enable/disable retries (default: true)
  maxAttempts?: number // Maximum retry attempts (default: 3)
  backoff?: number // Base backoff delay in ms (default: 1000)
}
```

#### Methods

##### getFeature()

Retrieves a single feature flag value.

```typescript
getFeature(featureName: string, options?: FeatureOptions | FeatureValue): Promise<FeatureValue>
```

**Parameters:**

- `featureName`: The name of the feature flag
- `options`: Either a `FeatureOptions` object or a direct fallback value

**FeatureOptions:**

```typescript
interface FeatureOptions {
  fallback?: FeatureValue // Fallback value if feature not found or error occurs
  context?: FeatureContext // Context override for this request
}
```

**Examples:**

```typescript
// Simple fallback
const isEnabled = await client.getFeature('my-feature', false)

// With options object
const value = await client.getFeature('my-feature', {
  fallback: 'default',
  context: { userId: '123' },
})

// No fallback (will return null if not found)
const value = await client.getFeature('my-feature')
```

##### getFeatures()

Retrieves multiple feature flags in a single request.

```typescript
getFeatures(options: FeaturesOptions): Promise<Record<string, FeatureValue>>
```

**FeaturesOptions:**

```typescript
interface FeaturesOptions {
  features: Record<string, FeatureValue> // Feature names with fallback values
  context?: FeatureContext // Context override for this request
}
```

**Example:**

```typescript
const features = await client.getFeatures({
  features: {
    'feature-1': false, // Boolean fallback
    'feature-2': 'control', // String fallback
    'feature-3': 42, // Number fallback
    'feature-4': null, // No fallback
  },
  context: {
    userId: '123',
    segment: 'premium',
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
client.updateContext({ userId: '456' })

// Replace entire context
client.updateContext({ userId: '456', newField: 'value' }, false)
```

##### getContext()

Retrieves the current default context.

```typescript
getContext(): FeatureContext | undefined
```

##### cleanup()

Cleanup method for resource management.

```typescript
cleanup(): Promise<void>
```

## Types

### FeatureValue

The value of a feature flag can be:

```typescript
type FeatureValue = string | number | boolean | null
```

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
- `segment`: User segment (e.g., 'premium', 'free')
- `version`: Application version
- `environment`: Environment name (e.g., 'production', 'staging')

## Error Handling

The SDK handles errors gracefully by returning fallback values when provided:

```typescript
try {
  // If the API is down, this will return the fallback value 'offline-mode'
  const feature = await client.getFeature('online-feature', { fallback: 'offline-mode' })
} catch (error) {
  // This only throws if no fallback is provided and an error occurs
  console.error('Feature flag request failed:', error)
}
```

## Best Practices

### 1. Always Provide Fallbacks

```typescript
// ✅ Good - provides fallback
const isEnabled = await client.getFeature('new-feature', { fallback: false })

// ❌ Risky - no fallback, may throw error
const isEnabled = await client.getFeature('new-feature')
```

### 2. Use Context for Targeting

```typescript
const client = new DarkFeatureClient({
  apiKey: 'your-api-key',
  context: {
    userId: user.id,
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
  features: { 'feature-1': false, 'feature-2': 'default' },
})

// ❌ Less efficient - multiple API calls
const feature1 = await client.getFeature('feature-1', false)
const feature2 = await client.getFeature('feature-2', 'default')
```

### 4. Handle Context Updates

```typescript
// Update context when user state changes
function onUserLogin(user) {
  client.updateContext({
    userId: user.id,
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

📦 **[@darkfeature/sdk-react](http://npmjs.com/package/@darkfeature/sdk-react)**

### Vue Integration

```javascript
// plugins/feature-flags.js
import { DarkFeatureClient } from '@darkfeature/sdk-javascript'

export default {
  install(app, options) {
    const client = new DarkFeatureClient({
      apiKey: options.apiKey,
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
  apiKey: process.env.VUE_APP_DARKFEATURE_API_KEY,
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
        userId: user.id,
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
import { DarkFeatureClient } from '@darkfeature/sdk-javascript'

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  private client: DarkFeatureClient

  constructor() {
    this.client = new DarkFeatureClient({
      apiKey: environment.darkfeatureApiKey,
      context: {
        userId: this.getCurrentUserId(),
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
      userId: user.id,
      plan: user.subscriptionPlan,
    })

    // Reload features with new context
    const premiumEnabled = await this.featureFlags.getFeature('premium-features', false)
    this.showPremiumFeatures = premiumEnabled
  }
}
```

### Node.js Server

```typescript
import express from 'express'
import { DarkFeatureClient } from '@darkfeature/sdk-javascript'

const app = express()
const featureClient = new DarkFeatureClient({
  apiKey: process.env.DARKFEATURE_API_KEY,
})

app.get('/api/features', async (req, res) => {
  const features = await featureClient.getFeatures({
    features: {
      'new-api': false,
      'rate-limit': 100,
      'cache-enabled': true,
    },
    context: {
      userId: req.user.id,
      plan: req.user.plan,
      region: req.headers['cf-ipcountry'],
    },
  })

  res.json(features)
})
```

### jQuery Integration

```javascript
// Include the SDK in your HTML or bundle
const client = new DarkFeatureClient({
  apiKey: 'your-api-key',
  context: { userId: getCurrentUserId() },
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

## TypeScript Support

This SDK is written in TypeScript and provides full type safety:

```typescript
import { DarkFeatureClient, FeatureValue, FeatureContext } from '@darkfeature/sdk-javascript'

// Types are automatically inferred
const client = new DarkFeatureClient({ apiKey: 'key' })
const value: FeatureValue = await client.getFeature('feature')
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
