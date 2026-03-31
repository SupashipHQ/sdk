'use client'

import { createSupashipReact, useWebFocusRefetchEffect } from '@supashiphq/react-core'

const supaship = createSupashipReact(useWebFocusRefetchEffect)

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
