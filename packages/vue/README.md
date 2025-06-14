# @darkfeature/sdk-vue

DarkFeature SDK for Vue.js applications.

## Installation

```bash
npm install @darkfeature/sdk-vue
```

## Setup

Install the DarkFeature plugin in your Vue application:

```javascript
import { createApp } from 'vue'
import { DarkFeaturePlugin } from '@darkfeature/sdk-vue'
import App from './App.vue'

const app = createApp(App)

app.use(DarkFeaturePlugin, {
  config: {
    apiKey: 'your-api-key',
    endpoint: 'https://api.darkfeature.com',
  },
})

app.mount('#app')
```

## Usage

### Using Composables

```vue
<template>
  <div>
    <div v-if="isLoading.value">Loading...</div>
    <div v-else-if="feature.value === 'new-design'">New Design!</div>
    <div v-else>Old Design</div>
  </div>
</template>

<script setup>
import { useFeature } from '@darkfeature/sdk-vue'

const { feature, isLoading } = useFeature('homepage-variant', {
  fallback: 'default',
  context: { userId: '123' },
})
</script>
```

### Using Components

```vue
<template>
  <DarkFeature
    feature="homepage-variant"
    :fallback="'default'"
    :context="{ userId: '123' }"
    :variations="{
      'new-design': () => h(NewHomepage),
      default: () => h(OldHomepage),
      loading: () => h('div', 'Loading...'),
    }"
    loading="loading"
  />
</template>

<script setup>
import { h } from 'vue'
import { DarkFeature } from '@darkfeature/sdk-vue'
import NewHomepage from './components/NewHomepage.vue'
import OldHomepage from './components/OldHomepage.vue'
</script>
```

### Multiple Features

```vue
<script setup>
import { useFeatures } from '@darkfeature/sdk-vue'

const { features, isLoading } = useFeatures({
  features: {
    theme: 'light',
    sidebar: false,
    notifications: true,
  },
  context: { userId: '123' },
})
</script>
```

## API

### Composables

- `useFeature(key, options?)` - Get a single feature flag
- `useFeatures(options)` - Get multiple feature flags
- `useDarkFeature()` - Get the DarkFeature client instance
- `useFeatureContext()` - Manage feature evaluation context

### Components

- `<DarkFeature>` - Conditionally render content based on feature flags

## License

MIT
