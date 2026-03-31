/**
 * Dependencies passed to the platform-specific focus / visibility refetch hook.
 * `refetchOnWindowFocus` matches the React SDK option name; on React Native it maps to app foreground.
 */
export interface FocusRefetchDeps {
  refetchOnWindowFocus: boolean
  enabled: boolean
  isStale: boolean
  executeFetch: () => Promise<void>
}

/**
 * Platform hook invoked from `useQuery` to subscribe to visibility/focus refetch.
 */
export type UseFocusRefetchEffect = (deps: FocusRefetchDeps) => void
