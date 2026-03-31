# Supaship React Native SDK

React Native bindings for Supaship: the same hooks and patterns as [`@supashiphq/react-sdk`](https://www.npmjs.com/package/@supashiphq/react-sdk), without browser-only APIs.

## Installation

```bash
npm install @supashiphq/react-native-sdk
# peers: react, react-native (@supashiphq/javascript-sdk is bundled as a dependency)
```

## Quick start

```tsx
import { SupaProvider, useFeature, FeaturesWithFallbacks } from '@supashiphq/react-native-sdk'
import { View, Text } from 'react-native'

const features = {
  'new-header': false,
  'theme-config': { mode: 'dark' as const, showLogo: true },
} satisfies FeaturesWithFallbacks

export function App() {
  return (
    <SupaProvider
      config={{
        sdkKey: 'your-sdk-key',
        environment: 'production',
        features,
        context: { userId: '123' },
        // Optional: disable toolbar explicitly (dev toolbar is web-only; native apps never show it)
        toolbar: false,
      }}
    >
      <Home />
    </SupaProvider>
  )
}

function Home() {
  const { feature: newHeader, isLoading } = useFeature('new-header')
  if (isLoading) return <Text>Loading…</Text>
  return <View>{newHeader ? <Text>New</Text> : <Text>Old</Text>}</View>
}
```

## Type-safe feature flags

Same module augmentation as the React SDK; use `@supashiphq/react-native-sdk` in your `declare module`:

```ts
import { FeaturesWithFallbacks, InferFeatures } from '@supashiphq/react-native-sdk'

export const FEATURE_FLAGS = {
  'new-header': false,
} satisfies FeaturesWithFallbacks

declare module '@supashiphq/react-native-sdk' {
  interface Features extends InferFeatures<typeof FEATURE_FLAGS> {}
}
```

## API

Exports match the React SDK where applicable:

- `SupaProvider`, `useClient`, `useFeatureContext`
- `useFeature`, `useFeatures`
- `SupaFeature` (boolean-style variations; children are `ReactNode`, e.g. RN `View` / `Text`)

### Query behavior / `refetchOnWindowFocus`

The underlying `useQuery` option **`refetchOnWindowFocus`** keeps the same name as the web SDK. On React Native it triggers a refetch when the app moves to **`AppState` `active`** (foreground), not browser window focus. The default in `useFeature` / `useFeatures` remains `false`, same as React.

## Sensitive context hashing

If you use `sensitiveContextProperties` on the client, evaluation uses the Web Crypto API when available. In some Hermes/React Native setups you may need a `crypto.subtle` polyfill for hashing; feature fetching without that path is unaffected. See `@supashiphq/javascript-sdk` for details.

## License

MIT — see [LICENSE](./LICENSE).
