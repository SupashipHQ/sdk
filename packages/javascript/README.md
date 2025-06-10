# DarkFeature JavaScript SDK

A JavaScript SDK for DarkFeature that provides a simple way to manage feature flags.

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
    email: 'user@test.com',
    version: '1.0.0',
  },
})

// Get a feature flag
const isEnabled = await client.getFeature('my-feature', false)

// Get multiple features
const features = await client.getFeatures({
  features: {
    'feature-1': false,
    'feature-2': 'default-value',
  },
  context: {
    // Optional context override
    userId: '123',
  },
})
```

## API Reference

### DarkFeatureClient

#### Constructor

```typescript
new DarkFeatureClient(config: DarkFeatureConfig)
```

Configuration options:

- `apiKey` (required): Your DarkFeature API key
- `baseUrl` (optional): Custom API endpoint
- `context` (optional): Default context for feature evaluation
- `retry` (optional): Retry configuration
- `plugins` (optional): Array of plugins to use

#### Methods

- `getFeature(featureName: string, context?: FeatureContext): Promise<FeatureValue>`
- `getFeatures(featureNames: string[], context?: FeatureContext): Promise<Record<string, FeatureValue>>`

## Plugins

### Built-in Plugins

#### LoggingPlugin

The LoggingPlugin provides configurable logging for feature flag operations.

```typescript
import { LoggingPlugin } from '@darkfeature/sdk-javascript'

new LoggingPlugin({
  enabled: true,
  level: 'debug', // "debug" | "info" | "warn" | "error"
})
```

#### CachingPlugin

The CachingPlugin caches feature flag results to improve performance and reduce API calls.

```typescript
import { CachingPlugin } from '@darkfeature/sdk-javascript'

new CachingPlugin({
  enabled: true,
  storage: 'localStorage', // "memory" | "localStorage" | "sessionStorage"
  ttl: 60000, // Time to live in milliseconds
})
```

#### AnalyticsPlugin

The AnalyticsPlugin tracks feature flag impressions and conversions for analytics.

```typescript
import { AnalyticsPlugin } from '@darkfeature/sdk-javascript'

new AnalyticsPlugin({
  endpoint: 'https://analytics.example.com', // Analytics endpoint
  batchSize: 10, // Number of events to batch before sending
  flushInterval: 5000, // Flush interval in milliseconds
  enabled: true,
})

// Track a feature impression
await client.trackImpression('my-feature', 'variant-a')

// Track a conversion
await client.trackConversion('my-feature', 'variant-a', 'purchase')
```

#### LocalDevPlugin

The LocalDevPlugin provides local development and testing capabilities.

```typescript
import { LocalDevPlugin } from '@darkfeature/sdk-javascript'

new LocalDevPlugin({
  // Override feature values for testing
  overrides: {
    'my-feature': true,
    'experiment-feature': 'variant-a',
  },
  // Fallback values when features are not found
  fallbacks: {
    'my-feature': false,
    'experiment-feature': 'control',
  },
  enabled: true,
})

// Runtime overrides
client.setFeatureOverride('my-feature', true)
client.removeFeatureOverride('my-feature')
client.clearFeatureOverrides()
```

## Plugin Architecture

The SDK supports a plugin architecture that allows you to extend its functionality. Plugins can hook into various lifecycle events of feature flag operations.

### Creating Custom Plugins

You can create custom plugins by implementing the `DarkFeaturePlugin` interface:

```typescript
import { DarkFeaturePlugin, PluginConfig } from '@darkfeature/sdk-javascript'

interface MyPluginConfig extends PluginConfig {
  // Add your plugin's configuration options
}

class MyPlugin implements DarkFeaturePlugin {
  name = 'my-plugin'
  private config: MyPluginConfig

  constructor(config: MyPluginConfig) {
    this.config = config
  }

  async beforeGetFeature(featureName: string, context?: FeatureContext): Promise<void> {
    // Called before getting a single feature
  }

  async afterGetFeature(
    featureName: string,
    value: FeatureValue,
    context?: FeatureContext
  ): Promise<void> {
    // Called after getting a single feature
  }

  async beforeGetFeatures(featureNames: string[], context?: FeatureContext): Promise<void> {
    // Called before getting multiple features
  }

  async afterGetFeatures(
    results: Record<string, FeatureValue>,
    context?: FeatureContext
  ): Promise<void> {
    // Called after getting multiple features
  }

  async onError(error: Error, context?: FeatureContext): Promise<void> {
    // Called when an error occurs
  }
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
