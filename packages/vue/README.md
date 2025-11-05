# Supaship Vue SDK

Supaship SDK for Vue 3 that provides composables for feature flag management with full TypeScript type safety.

## Installation

```bash
npm install @supashiphq/vue-sdk
# or
yarn add @supashiphq/vue-sdk
# or
pnpm add @supashiphq/vue-sdk
```

## Quick Start

```ts
// main.ts
import { createApp } from 'vue'
import { createSupaship, FeaturesWithFallbacks } from '@supashiphq/vue-sdk'
import App from './App.vue'

// Define your features with type safety
const FEATURE_FLAGS = {
  'new-header': false,
  'theme-config': { mode: 'dark' as const, showLogo: true },
  'beta-features': [] as string[],
} satisfies FeaturesWithFallbacks

// REQUIRED: for type safety
declare module '@supashiphq/vue-sdk' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Features extends InferFeatures<typeof FEATURE_FLAGS> {}
}

const supaship = createSupaship({
  config: {
    apiKey: 'your-api-key',
    environment: 'production',
    features: FEATURE_FLAGS,
    context: {
      userID: '123',
      email: 'user@example.com',
    },
  },
})

const app = createApp(App)

// Configure the Supaship plugin
app.use(supaship)

app.mount('#app')
```

### Using the Composable

```vue
<script setup lang="ts">
import { useFeature } from '@supashiphq/vue-sdk'

const { feature: newHeader, isLoading } = useFeature('new-header')
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <NewHeader v-else-if="newHeader" />
  <OldHeader v-else />
</template>
```

## API Reference

### createSupaship

Creates a Vue plugin for Supaship. This is the standard Vue way to set up the SDK globally.

```ts
// main.ts
import { createApp } from 'vue'
import { createSupaship } from '@supashiphq/vue-sdk'

const supaship = createSupaship(options)

const app = createApp(App)
app.use(supaship)
app.mount('#app')
```

**Options:**

| Option    | Type               | Required | Description                  |
| --------- | ------------------ | -------- | ---------------------------- |
| `config`  | `SupaClientConfig` | Yes      | Configuration for the client |
| `toolbar` | `ToolbarConfig`    | No       | Development toolbar settings |

**Configuration Options:**

```ts
const config = {
  apiKey: 'your-api-key',
  environment: 'production',
  features: {
    // Required: define all feature flags with fallback values
    'my-feature': false,
    config: { theme: 'light' },
  },
  context: {
    // Optional: targeting context
    userID: 'user-123',
    email: 'user@example.com',
    plan: 'premium',
  },
  networkConfig: {
    // Optional: network settings
    featuresAPIUrl: 'https://api.supashiphq.com/features',
    retry: {
      enabled: true,
      maxAttempts: 3,
      backoff: 1000,
    },
    requestTimeoutMs: 5000,
  },
}
```

**Supported Feature Value Types:**

| Type      | Example                             | Description               |
| --------- | ----------------------------------- | ------------------------- |
| `boolean` | `false`                             | Simple on/off flags       |
| `object`  | `{ theme: 'dark', showLogo: true }` | Configuration objects     |
| `array`   | `['feature-a', 'feature-b']`        | Lists of values           |
| `null`    | `null`                              | Disabled/unavailable flag |

> **Note:** Strings and numbers are not supported as standalone feature values. Use objects instead: `{ value: 'string' }` or `{ value: 42 }`.

### useFeature Composable

Retrieves a single feature flag value with Vue reactivity and full TypeScript type safety.

```ts
const result = useFeature(featureName, options?)
```

**Parameters:**

- `featureName: string` - The feature flag key
- `options?: object`
  - `context?: Record<string, unknown>` - Context override for this request
  - `shouldFetch?: boolean` - Whether to fetch the feature (default: true)

**Return Value:**

```ts
{
  feature: ComputedRef<T>,      // The feature value (typed based on your Features interface)
  isLoading: ComputedRef<boolean>,  // Loading state
  isSuccess: ComputedRef<boolean>,  // Success state
  isError: ComputedRef<boolean>,    // Error state
  error: Ref<Error | null>,         // Error object if failed
  status: Ref<'idle' | 'loading' | 'success' | 'error'>,
  refetch: () => Promise<void>,     // Function to manually refetch
  // ... other query state properties
}
```

**Examples:**

```vue
<script setup lang="ts">
import { useFeature } from '@supashiphq/vue-sdk'

// Simple boolean feature
const { feature: isEnabled, isLoading } = useFeature('new-ui')
</script>

<template>
  <Skeleton v-if="isLoading" />
  <NewUI v-else-if="isEnabled" />
  <OldUI v-else />
</template>
```

```vue
<script setup lang="ts">
import { useFeature } from '@supashiphq/vue-sdk'

// Object feature
const { feature: config } = useFeature('theme-config')
</script>

<template>
  <div v-if="config" :class="config.theme">
    <Logo v-if="config.showLogo" />
    <div :style="{ color: config.primaryColor }">Content</div>
  </div>
</template>
```

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useFeature } from '@supashiphq/vue-sdk'
import { useUser } from './composables/user'

const { user, isLoading: userLoading } = useUser()

// Only fetch when user is loaded
const { feature } = useFeature('user-specific-feature', {
  context: computed(() => ({ userId: user.value?.id })),
  shouldFetch: computed(() => !userLoading.value && !!user.value),
})
</script>

<template>
  <SpecialContent v-if="feature" />
</template>
```

### useFeatures Composable

Retrieves multiple feature flags in a single request with type safety.

```ts
const result = useFeatures(featureNames, options?)
```

**Parameters:**

- `featureNames: readonly string[]` - Array of feature flag keys
- `options?: object`
  - `context?: Record<string, unknown>` - Context override for this request
  - `shouldFetch?: boolean` - Whether to fetch features (default: true)

**Return Value:**

```ts
{
  features: ComputedRef<{ [key: string]: T }>, // Object with feature values (typed based on keys)
  isLoading: ComputedRef<boolean>,
  isSuccess: ComputedRef<boolean>,
  isError: ComputedRef<boolean>,
  error: Ref<Error | null>,
  status: Ref<'idle' | 'loading' | 'success' | 'error'>,
  refetch: () => Promise<void>,
  // ... other query state properties
}
```

**Examples:**

```vue
<script setup lang="ts">
import { useFeatures } from '@supashiphq/vue-sdk'
import { useUser } from './composables/user'

const { user } = useUser()

// Fetch multiple features at once (more efficient than multiple useFeature calls)
const { features, isLoading } = useFeatures(['new-dashboard', 'beta-mode', 'show-sidebar'], {
  context: computed(() => ({
    userId: user.value?.id,
    plan: user.value?.plan,
  })),
})
</script>

<template>
  <LoadingSpinner v-if="isLoading" />
  <div v-else :class="features['new-dashboard'] ? 'new-layout' : 'old-layout'">
    <Sidebar v-if="features['show-sidebar']" />
    <BetaBadge v-if="features['beta-mode']" />
    <MainContent />
  </div>
</template>
```

### useFeatureContext Composable

Access and update the feature context within components.

```ts
const { updateContext, getContext } = useFeatureContext()
```

**Example:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFeatureContext } from '@supashiphq/vue-sdk'

const { updateContext } = useFeatureContext()
const user = ref(null)

const handleUserUpdate = newUser => {
  user.value = newUser

  // Update feature context when user changes
  // This will trigger refetch of all features
  updateContext({
    userId: newUser.id,
    plan: newUser.subscriptionPlan,
    segment: newUser.segment,
  })
}
</script>

<template>
  <form @submit="handleUserUpdate">
    <!-- User profile form -->
  </form>
</template>
```

## Best Practices

### 1. Always Use `satisfies` for Feature Definitions

```ts
// ✅ Good - preserves literal types
const features = {
  'dark-mode': false,
  theme: { mode: 'light' as const, variant: 'compact' as const },
} satisfies FeaturesWithFallbacks

// ❌ Bad - loses literal types (don't use type annotation)
const features: FeaturesWithFallbacks = {
  'dark-mode': false,
  theme: { mode: 'light', variant: 'compact' }, // Types widened to string
}
```

### 2. Centralize Feature Definitions

```ts
// ✅ Good - centralized feature definitions
// lib/features.ts
export const FEATURE_FLAGS = {
  'new-header': false,
  theme: { mode: 'light' as const },
  'beta-features': [] as string[],
} satisfies FeaturesWithFallbacks

// ❌ Bad - scattered feature definitions
const config1 = { features: { 'feature-1': false } satisfies FeaturesWithFallbacks }
const config2 = { features: { 'feature-2': true } satisfies FeaturesWithFallbacks }
```

### 3. Use Type Augmentation for Type Safety

```ts
// ✅ Good - type augmentation for global type safety
declare module '@supashiphq/vue-sdk' {
  interface Features extends InferFeatures<typeof FEATURE_FLAGS> {}
}

// Now all useFeature calls are type-safe
const { feature } = useFeature('new-header') // ✅ TypeScript knows this is ComputedRef<boolean>
const { feature } = useFeature('invalid') // ❌ TypeScript error
```

### 4. Use Context for User Targeting

```ts
// main.ts
import { createApp } from 'vue'
import { createSupaship } from '@supashiphq/vue-sdk'

const supaship = createSupaship({
  config: {
    apiKey: 'your-api-key',
    features: FEATURE_FLAGS,
    context: {
      // Initial context - can be updated later with useFeatureContext
      version: import.meta.env.VITE_APP_VERSION,
      environment: import.meta.env.MODE,
    },
  },
})

const app = createApp(App)
app.use(supaship)
app.mount('#app')
```

Then update context dynamically in your components:

```vue
<script setup lang="ts">
import { watch } from 'vue'
import { useFeatureContext } from '@supashiphq/vue-sdk'
import { useAuth } from './composables/auth'

const { updateContext } = useFeatureContext()
const { user } = useAuth()

// Update context when user changes
watch(
  user,
  newUser => {
    if (newUser) {
      updateContext({
        userId: newUser.id,
        email: newUser.email,
        plan: newUser.plan,
      })
    }
  },
  { immediate: true }
)
</script>
```

### 5. Batch Feature Requests

```vue
<script setup lang="ts">
// ✅ Good - single API call
const { features } = useFeatures(['feature-1', 'feature-2', 'feature-3'])

// ❌ Less efficient - multiple API calls
const feature1 = useFeature('feature-1')
const feature2 = useFeature('feature-2')
const feature3 = useFeature('feature-3')
</script>
```

### 6. Handle Loading States

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useUser } from './composables/user'
import { useFeatures } from '@supashiphq/vue-sdk'

const { user, isLoading: userLoading } = useUser()

const { features, isLoading: featuresLoading } = useFeatures(['user-specific-feature'], {
  context: computed(() => ({ userId: user.value?.id })),
  shouldFetch: computed(() => !userLoading.value && !!user.value),
})

const isLoading = computed(() => userLoading.value || featuresLoading.value)
</script>

<template>
  <Skeleton v-if="isLoading" />
  <SpecialContent v-else-if="features['user-specific-feature']" />
</template>
```

### 7. Update Context Reactively

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFeatureContext } from '@supashiphq/vue-sdk'

const { updateContext } = useFeatureContext()
const currentPage = ref('dashboard')

// Update context when navigation changes
watch(currentPage, newPage => {
  updateContext({ currentPage: newPage })
})
</script>

<template>
  <div>
    <Navigation @page-change="page => (currentPage = page)" />
    <PageContent :page="currentPage" />
  </div>
</template>
```

## Framework Integration

### Vite

```ts
// main.ts
import { createApp } from 'vue'
import { createSupaship, FeaturesWithFallbacks } from '@supashiphq/vue-sdk'
import App from './App.vue'

const FEATURE_FLAGS = {
  'new-ui': false,
  theme: { mode: 'light' as const },
} satisfies FeaturesWithFallbacks

const supaship = createSupaship({
  config: {
    apiKey: import.meta.env.VITE_SUPASHIP_API_KEY,
    environment: import.meta.env.MODE,
    features: FEATURE_FLAGS,
  },
})

const app = createApp(App)
app.use(supaship)
app.mount('#app')
```

### Nuxt 3

```ts
// plugins/supaship.client.ts
import { defineNuxtPlugin } from '#app'
import { createSupaship, FeaturesWithFallbacks } from '@supashiphq/vue-sdk'

const FEATURE_FLAGS = {
  'new-homepage': false,
  'dark-mode': false,
} satisfies FeaturesWithFallbacks

export default defineNuxtPlugin(nuxtApp => {
  const config = useRuntimeConfig()
  const supaship = createSupaship({
    config: {
      apiKey: config.public.supashipApiKey as string,
      environment: process.env.NODE_ENV || 'production',
      features: FEATURE_FLAGS,
    },
  })

  nuxtApp.vueApp.use(supaship)
})
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      supashipApiKey: process.env.NUXT_PUBLIC_SUPASHIP_API_KEY || '',
    },
  },
})
```

### Feature Flag Guards for Vue Router

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useClient } from '@supashiphq/vue-sdk'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/beta',
      component: () => import('./views/BetaFeature.vue'),
      meta: { requiresFeature: 'beta-access' },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const featureFlag = to.meta.requiresFeature as string | undefined

  if (featureFlag) {
    try {
      const client = useClient()
      const feature = await client.getFeature(featureFlag)

      if (!feature) {
        // Feature is disabled, redirect
        return next('/404')
      }
    } catch (error) {
      console.error('Error checking feature flag:', error)
      return next('/error')
    }
  }

  next()
})

export default router
```

## Development Toolbar

The SDK includes a development toolbar for testing and debugging feature flags locally.

```ts
app.use(
  createSupaship({
    config: { ... },
    toolbar: {
      enabled: 'auto', // 'auto' | 'always' | 'never'
      position: 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    },
  })
)
```

- `'auto'`: Shows toolbar in development environments only (default)
- `true`: Always shows toolbar
- `false`: Never shows toolbar

The toolbar allows you to:

- View all available feature flags
- Override feature values locally
- See feature value types and current values
- Clear local overrides

## Testing

### Mocking Feature Flags in Tests

The plugin approach makes testing straightforward - just install the plugin with test features:

```ts
// test-utils/setup.ts
import { createSupaship, FeaturesWithFallbacks } from '@supashiphq/vue-sdk'

export function createTestSupaship(features: FeaturesWithFallbacks) {
  return createSupaship({
    config: {
      apiKey: 'test-key',
      environment: 'test',
      features,
      context: {},
    },
  })
}
```

### Example Test with Vitest

```ts
// MyComponent.test.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { createTestSupaship } from '../test-utils/setup'
import MyComponent from './MyComponent.vue'

describe('MyComponent', () => {
  it('shows new feature when enabled', () => {
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [
          createTestSupaship({
            'new-feature': true,
          }),
        ],
      },
    })

    expect(wrapper.text()).toContain('New Feature Content')
  })

  it('shows old feature when disabled', () => {
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [
          createTestSupaship({
            'new-feature': false,
          }),
        ],
      },
    })

    expect(wrapper.text()).toContain('Old Feature Content')
  })

  it('handles multiple features', () => {
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [
          createTestSupaship({
            'feature-a': true,
            'feature-b': false,
            config: { theme: 'dark' },
          }),
        ],
      },
    })

    expect(wrapper.find('.feature-a').exists()).toBe(true)
    expect(wrapper.find('.feature-b').exists()).toBe(false)
  })
})
```

## Troubleshooting

### Common Issues

#### Type errors with FeaturesWithFallbacks

If you encounter type errors when defining features, ensure you're using the correct pattern:

**Solution:** Always use `satisfies FeaturesWithFallbacks` (not type annotation)

```ts
// ✅ Good - preserves literal types
const features = {
  'my-feature': false,
  config: { theme: 'dark' as const },
} satisfies FeaturesWithFallbacks

// ❌ Bad - loses literal types
const features: FeaturesWithFallbacks = {
  'my-feature': false,
  config: { theme: 'dark' }, // Widened to string
}
```

#### Plugin Not Installed Error

```
Error: useFeature must be used within a component tree that has the Supaship plugin installed
```

**Solution:** Ensure your app has the plugin installed in `main.ts`:

```ts
// ✅ Correct - main.ts
import { createApp } from 'vue'
import { createSupaship } from '@supashiphq/vue-sdk'
import App from './App.vue'

const app = createApp(App)
app.use(createSupaship({ config: { ... } }))  // Plugin installed
app.mount('#app')

// ❌ Incorrect - plugin not installed or installed after mount
const app = createApp(App)
app.mount('#app')  // Plugin missing!
```

#### Features Not Loading

- **Check API key:** Verify your API key is correct
- **Check network:** Open browser dev tools and check network requests
- **Check features config:** Ensure features are defined in the config

#### Type Errors

```
Property 'my-feature' does not exist on type 'Features'
```

**Solution:** Add type augmentation:

```ts
import { InferFeatures } from '@supashiphq/vue-sdk'
import { FEATURE_FLAGS } from './features'

declare module '@supashiphq/vue-sdk' {
  interface Features extends InferFeatures<typeof FEATURE_FLAGS> {}
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
