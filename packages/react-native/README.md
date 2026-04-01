# Supaship React Native SDK

[Supaship](https://supashp.com) SDK for React Native: same hooks and provider model as [`@supashiphq/react-sdk`](https://www.npmjs.com/package/@supashiphq/react-sdk).

## Installation

```bash
npm install @supashiphq/react-native-sdk
```

**Peer dependencies:** `react`, `react-native` (≥ 0.71). The core HTTP client ships inside `@supashiphq/javascript-sdk` via this package’s dependencies.

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

Use `toolbar: false` in native apps (the dev toolbar targets browsers only).

## Type-safe feature flags

Declare flags once, then augment **this** package so hooks stay typed:

```ts
// features.ts
import { FeaturesWithFallbacks, InferFeatures } from '@supashiphq/react-native-sdk'

export const FEATURE_FLAGS = {
  'new-header': false,
  'theme-config': { mode: 'dark' as const, showLogo: true },
} satisfies FeaturesWithFallbacks

declare module '@supashiphq/react-native-sdk' {
  interface Features extends InferFeatures<typeof FEATURE_FLAGS> {}
}
```

After that, `useFeature('new-header')` and `useFeature('theme-config')` infer correct value types. Invalid keys are a TypeScript error.

## Use cases

### Several flags in one request

```tsx
import { useFeatures } from '@supashiphq/react-native-sdk'

function Dashboard() {
  const { features, isLoading } = useFeatures(['new-header', 'paywall-v2'] as const, {
    context: { plan: 'pro' },
  })
  if (isLoading) return <Text>…</Text>
  return <Text>{features['paywall-v2'] ? 'Paywall B' : 'Paywall A'}</Text>
}
```

### Declarative boolean gate (`SupaFeature`)

```tsx
import { SupaFeature } from '@supashiphq/react-native-sdk'
import { View, Text } from 'react-native'

function Header() {
  return (
    <SupaFeature
      feature="new-header"
      loading={<Text>…</Text>}
      variations={{
        true: <Text>New header</Text>,
        false: <Text>Legacy header</Text>,
      }}
    />
  )
}
```

Children are normal `ReactNode` values (`View`, `Text`, etc.).

### Update targeting context after login

```tsx
import { useFeatureContext } from '@supashiphq/react-native-sdk'
import { useEffect } from 'react'

function SessionBridge({ userId }: { userId: string | undefined }) {
  const { updateContext } = useFeatureContext()
  useEffect(() => {
    if (userId) updateContext({ userId })
  }, [userId, updateContext])
  return null
}
```

Merging behavior matches the web SDK (`mergeWithExisting` defaults to `true`).

### Advanced: `useClient` and `useQuery`

```tsx
import { useClient, useQuery } from '@supashiphq/react-native-sdk'

function RemoteConfig() {
  const client = useClient()
  const { data, isLoading } = useQuery(['remote-config'], () =>
    client.getFeature('theme-config').then(theme => ({ theme }))
  )
  if (isLoading || !data) return null
  return <Text>{JSON.stringify(data.theme)}</Text>
}
```

`refetchOnWindowFocus` on `useQuery` still uses that name for API parity; on native it refetches when the app becomes **`active`** again.

## `refetchOnWindowFocus` and AppState

| Platform | Trigger for refetch (when option is `true`) |
| -------- | ------------------------------------------- |
| Web SDK  | Browser `visibilitychange` / window focus   |
| Native   | `AppState` transitions to **`active`**      |

Defaults for `useFeature` / `useFeatures` keep network minimal (`refetchOnWindowFocus`: off unless you opt in).

## Sensitive context hashing

If you set `sensitiveContextProperties`, hashing uses Web Crypto where available. Some Hermes setups need a `crypto.subtle` polyfill; see `@supashiphq/javascript-sdk` for details.

## Unit testing in your app

Same idea as the React SDK: wrap in **`SupaProvider`** with test `config` and **`toolbar={false}`**, then `render` your screen.

If Jest resolves `react-native` from this package’s internals, add a tiny stub so tests do not need the full native binary:

```js
// jest.config.js
module.exports = {
  moduleNameMapper: {
    '^react-native$': '<rootDir>/test/react-native-stub.js',
  },
}
```

```js
// test/react-native-stub.js
exports.AppState = {
  addEventListener() {
    return { remove() {} }
  },
}
```

## License

MIT — see [LICENSE](./LICENSE).
