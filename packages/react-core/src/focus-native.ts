import { useEffect } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import type { UseFocusRefetchEffect } from './focus-types'

export const useNativeFocusRefetchEffect: UseFocusRefetchEffect = ({
  refetchOnWindowFocus,
  enabled,
  isStale,
  executeFetch,
}) => {
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleAppStateChange = (nextState: AppStateStatus): void => {
      if (nextState === 'active' && enabled && isStale) {
        void executeFetch()
      }
    }

    const sub = AppState.addEventListener('change', handleAppStateChange)
    return () => sub.remove()
  }, [enabled, isStale, executeFetch, refetchOnWindowFocus])
}
