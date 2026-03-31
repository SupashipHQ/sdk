import { createSupashipReact } from '@supashiphq/react-core'
import { useNativeFocusRefetchEffect } from '@supashiphq/react-core/focus-native'

const supaship = createSupashipReact(useNativeFocusRefetchEffect)

export const {
  SupaProvider,
  useClient,
  useFeatureContext,
  useQuery,
  useQueryClient,
  queryCache,
  QueryClient,
  getInitialQueryState,
} = supaship

/** @internal widened hooks — use `useFeature` / `useFeatures` from this package’s public API */
export const useFeatureUntyped = supaship.useFeature
/** @internal */
export const useFeaturesUntyped = supaship.useFeatures
