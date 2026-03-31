import { useEffect } from 'react'
import type { UseFocusRefetchEffect } from './focus-types'

export const useWebFocusRefetchEffect: UseFocusRefetchEffect = ({
  refetchOnWindowFocus,
  enabled,
  isStale,
  executeFetch,
}) => {
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = (): void => {
      if (enabled && isStale) {
        void executeFetch()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [enabled, isStale, executeFetch, refetchOnWindowFocus])
}
