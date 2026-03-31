/**
 * Minimal surface for {@link ./focus-native.ts}. Lets this package build without installing
 * `react-native` (and transitive DevTools bundles) in the SDK monorepo.
 * Consumer apps resolve the real `react-native` module at runtime.
 */
declare module 'react-native' {
  export type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension'

  export const AppState: {
    addEventListener(
      type: 'change',
      listener: (state: AppStateStatus) => void
    ): { remove: () => void }
  }
}
