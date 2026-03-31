/**
 * Minimal stub for Jest. Real `react-native` is provided by the app at runtime.
 */
export type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension'

export const AppState = {
  currentState: 'active' as AppStateStatus,
  addEventListener(
    _type: 'change',
    _listener: (state: AppStateStatus) => void
  ): { remove: () => void } {
    return { remove: (): void => {} }
  },
}
