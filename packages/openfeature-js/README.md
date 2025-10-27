# Supaship OpenFeature Provider for JavaScript/TypeScript

OpenFeature provider for Supaship feature flags. This package allows you to use Supaship with the OpenFeature SDK, providing a standardized interface for feature flag management.

## Installation

```bash
npm install @supashiphq/openfeature-js-provider @openfeature/server-sdk
```

Or with your preferred package manager:

```bash
pnpm add @supashiphq/openfeature-js-provider @openfeature/server-sdk
yarn add @supashiphq/openfeature-js-provider @openfeature/server-sdk
```

## Usage

### Basic Setup

```typescript
import { OpenFeature } from '@openfeature/server-sdk'
import { SupashipProvider } from '@supashiphq/openfeature-js-provider'
import { SupaClient, createFeatures } from '@supashiphq/sdk-javascript'

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

// Initialize Supaship client
const supashipClient = new SupaClient({
  apiKey: 'your-api-key',
  environment: 'production',
  features,
})

// Create and set the provider
const provider = new SupashipProvider({
  client: supashipClient,
})

await OpenFeature.setProviderAndWait(provider)

// Get a client
const client = OpenFeature.getClient()
```

### Evaluating Flags

#### Boolean Flags

```typescript
const darkMode = await client.getBooleanValue('dark-mode', false, {
  userId: '123',
})
```

#### String Flags

```typescript
const theme = await client.getStringValue('theme', 'light', {
  userId: '123',
})
```

#### Number Flags

```typescript
const maxUsers = await client.getNumberValue('max-users', 10, {
  userId: '123',
})
```

#### Object Flags

```typescript
const uiConfig = await client.getObjectValue(
  'ui-config',
  { theme: 'light', layout: 'list' },
  {
    userId: '123',
  }
)
```

### Detailed Evaluation

Get detailed information about flag evaluation:

```typescript
const details = await client.getBooleanDetails('dark-mode', false, {
  userId: '123',
})

console.log(details.value) // true/false
console.log(details.reason) // 'DEFAULT', 'ERROR', etc.
console.log(details.errorCode) // Error code if applicable
```

### Using Evaluation Context

The evaluation context is passed directly to Supaship:

```typescript
const context = {
  userId: '123',
  email: 'user@example.com',
  plan: 'premium',
}

const value = await client.getBooleanValue('premium-feature', false, context)
```

### Type Safety

The provider maintains type safety from your Supaship features:

```typescript
const features = createFeatures({
  'dark-mode': false,
  'ui-config': {
    theme: 'light' as 'light' | 'dark',
    maxUsers: 100,
  },
})

const client = new SupaClient({ features, ... })
const provider = new SupashipProvider({ client })

// TypeScript knows 'dark-mode' is a boolean
const darkMode = await client.getBooleanValue('dark-mode', false)

// TypeScript knows 'ui-config' is an object with specific shape
const config = await client.getObjectValue('ui-config', { theme: 'light', maxUsers: 10 })
```

## Features

- ✅ Full OpenFeature specification compliance
- ✅ Support for all flag types (boolean, string, number, object)
- ✅ Type-safe feature flag evaluation
- ✅ Automatic context conversion
- ✅ Comprehensive error handling
- ✅ Provider lifecycle management
- ✅ Event emission for provider state changes

## Error Handling

The provider handles errors gracefully:

- **Type Mismatch**: Throws `TypeMismatchError` if the flag type doesn't match the requested type
- **Network Errors**: Returns default value with error details in the resolution
- **Missing Flags**: Returns default value with appropriate error reason

```typescript
try {
  const value = await client.getBooleanValue('my-flag', false)
} catch (error) {
  // Handle type mismatch errors
  console.error('Flag type mismatch:', error)
}
```

## Provider Lifecycle

```typescript
// Initialize the provider
await provider.initialize()

// Check provider status
console.log(provider.status) // ProviderStatus.READY

// Close the provider
await provider.onClose()
```

## Requirements

- Node.js 18+ or modern browser
- `@openfeature/server-sdk` ^1.0.0
- `@supashiphq/sdk-javascript` workspace package

## License

MIT

## Support

For issues and questions:

- GitHub Issues: https://github.com/supashiphq/sdk/issues
- Documentation: https://docs.supaship.io
