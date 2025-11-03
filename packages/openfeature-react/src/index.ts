export { SupashipOpenFeatureProvider, type SupashipOpenFeatureProviderProps } from './provider'

// Re-export OpenFeature React hooks for convenience
export {
  useFlag,
  useBooleanFlagValue,
  useBooleanFlagDetails,
  useStringFlagValue,
  useStringFlagDetails,
  useNumberFlagValue,
  useNumberFlagDetails,
  useObjectFlagValue,
  useObjectFlagDetails,
  useOpenFeatureClient,
  useWhenProviderReady,
} from '@openfeature/react-sdk'
