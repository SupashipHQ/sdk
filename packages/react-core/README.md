# @supashiphq/react-core

Shared React layer for Supaship: provider wiring, feature hooks infrastructure, and query cache. It is a **dependency** of the published framework packages below—not the primary package you install in an app.

## Use these instead

| Platform             | Package                        | npm                                                               |
| -------------------- | ------------------------------ | ----------------------------------------------------------------- |
| Web / React / NextJS | `@supashiphq/react-sdk`        | [npm](https://www.npmjs.com/package/@supashiphq/react-sdk)        |
| React Native         | `@supashiphq/react-native-sdk` | [npm](https://www.npmjs.com/package/@supashiphq/react-native-sdk) |

Install the SDK that matches your stack. Those packages re-export the API you need (`SupaProvider`, `useFeature`, etc.) and pin the correct focus/refetch behavior (browser vs app lifecycle).

## When to depend on this package directly

Only for advanced or custom integrations (e.g. building another renderer on top of `createSupashipReact` or `createQueryHooks`). Most applications should **not** add `@supashiphq/react-core` explicitly.

## License

MIT — see [LICENSE](./LICENSE).
