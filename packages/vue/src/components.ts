import { defineComponent, computed, VNode, PropType } from 'vue'
import { useFeature } from './composables'
import { FeatureValue } from '@darkfeature/sdk-javascript'
import { hasValue } from './utils'

export interface DarkFeatureProps {
  /**
   * The feature flag key to evaluate
   */
  feature: string

  /**
   * Key in variations object to use when no feature value matches
   */
  fallback?: FeatureValue

  /**
   * Context for feature evaluation
   */
  context?: Record<string, unknown>

  /**
   * Whether to fetch the feature (default: true)
   */
  shouldFetch?: boolean

  /**
   * Variations object mapping feature values/keys to render functions or VNodes
   */
  variations: Record<string, () => VNode | VNode[] | string>

  /**
   * Key in variations object to use for loading state
   */
  loading?: string
}

/**
 * DarkFeature component that conditionally renders variations based on feature flag values.
 *
 * Supports all FeatureValue types (string | number | boolean | null) as variation keys.
 * Feature values are automatically converted to strings for object key matching:
 * - boolean `true` → `"true"`
 * - boolean `false` → `"false"`
 * - number `42` → `"42"`
 * - string `"variant-a"` → `"variant-a"`
 * - `null` → `"null"`
 *
 * @example
 * String variations:
 * ```vue
 * <DarkFeature
 *   feature="theme-variant"
 *   :fallback="'default'"
 *   loading="spinner"
 *   :variations="{
 *     light: () => h(LightTheme),
 *     dark: () => h(DarkTheme),
 *     auto: () => h(AutoTheme),
 *     default: () => h(DefaultTheme),
 *     spinner: () => h(ThemeLoader)
 *   }"
 * />
 * ```
 *
 * @example
 * Boolean variations:
 * ```vue
 * <DarkFeature
 *   feature="new-header"
 *   :fallback="false"
 *   loading="skeleton"
 *   :variations="{
 *     'true': () => h(NewHeader),
 *     'false': () => h(OldHeader),
 *     skeleton: () => h(HeaderSkeleton)
 *   }"
 * />
 * ```
 */
export const DarkFeature = defineComponent<DarkFeatureProps>({
  name: 'DarkFeature',
  props: {
    feature: {
      type: String,
      required: true,
    },
    fallback: {
      type: [String, Number, Boolean, Object] as PropType<FeatureValue>,
      default: undefined,
    },
    context: {
      type: Object as () => Record<string, unknown>,
      default: undefined,
    },
    shouldFetch: {
      type: Boolean,
      default: true,
    },
    variations: {
      type: Object as () => Record<string, () => VNode | VNode[] | string>,
      required: true,
    },
    loading: {
      type: String,
      default: undefined,
    },
  },
  setup(props): () => unknown {
    const { feature: featureValue, isLoading } = useFeature(props.feature, {
      context: props.context,
      shouldFetch: props.shouldFetch,
      fallback: props.fallback,
    })

    const renderContent = computed(() => {
      // Show loading state if provided and currently loading
      if (isLoading.value && props.loading && props.variations[props.loading]) {
        const renderer = props.variations[props.loading]
        return typeof renderer === 'function' ? renderer() : renderer
      }

      // Don't render anything if still loading and no loader provided
      if (isLoading.value) {
        return null
      }

      // Use fallback if data is undefined/null and fallback is provided
      const effectiveValue = hasValue(featureValue.value)
        ? featureValue.value
        : (props.fallback ?? null)

      // Don't render anything if no effective value
      if (!hasValue(effectiveValue)) {
        return null
      }

      // Convert effective value to string for object key lookup
      const valueKey = String(effectiveValue)

      // Find matching variation by exact key match
      if (props.variations[valueKey]) {
        const renderer = props.variations[valueKey]
        return typeof renderer === 'function' ? renderer() : renderer
      }

      // Don't render anything if no variation matches
      return null
    })

    return () => renderContent.value
  },
})

// Export as both named and default
export default DarkFeature
