# @supashiphq/react-core

Shared React layer for [Supaship](https://supashp.com): provider wiring, feature hooks infrastructure, and query cache. It is a **dependency** of the published framework packages below—not the primary package you install in an app.

## Use these instead

| Platform             | Package                        | npm                                                               |
| -------------------- | ------------------------------ | ----------------------------------------------------------------- |
| Web / React / NextJS | `@supashiphq/react-sdk`        | [npm](https://www.npmjs.com/package/@supashiphq/react-sdk)        |
| React Native         | `@supashiphq/react-native-sdk` | [npm](https://www.npmjs.com/package/@supashiphq/react-native-sdk) |

Install the SDK that matches your stack. Those packages re-export the API you need (`SupashipProvider`, `useFeature`, etc.) and pin the correct focus/refetch behavior (browser vs app lifecycle).

The `focus-native` export is for React Native apps only; it imports `AppState` from `react-native`, which must be supplied by your app (not listed as a peer here to keep this package’s dev graph free of the full native SDK).

## When to depend on this package directly

Only for advanced or custom integrations (e.g. building another renderer on top of `createSupashipReact` or `createQueryHooks`). Most applications should **not** add `@supashiphq/react-core` explicitly.

## License

MIT — see [LICENSE](./LICENSE).
