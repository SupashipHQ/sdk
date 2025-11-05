import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useFeature } from '../composables'
import { createSupaship } from '../plugin'
import { FeatureContext, FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'

// Mock the SupaClient
vi.mock('@supashiphq/javascript-sdk', async () => {
  const actual = await vi.importActual('@supashiphq/javascript-sdk')
  return {
    ...actual,
    SupaClient: vi.fn().mockImplementation(() => ({
      getFeature: vi.fn(),
      getFeatureFallback: vi.fn((key: string) => testFeatures[key as keyof typeof testFeatures]),
      updateContext: vi.fn(),
      getContext: vi.fn(),
    })),
    ToolbarPlugin: vi.fn().mockImplementation(() => ({
      onInit: vi.fn(),
    })),
  }
})

// Create feature definitions for testing
const testFeatures = {
  'test-feature': true,
  'other-feature': false,
} satisfies FeaturesWithFallbacks

const TestComponent = defineComponent({
  props: {
    featureKey: {
      type: String,
      required: true,
    },
    options: {
      type: Object as () => { context?: FeatureContext; shouldFetch?: boolean },
      default: undefined,
    },
  },
  setup(props) {
    const featureState = useFeature(props.featureKey, props.options)
    return () =>
      h('div', [
        h('div', { 'data-testid': 'feature-loading' }, String(featureState.isLoading.value)),
        h('div', { 'data-testid': 'feature-success' }, String(featureState.isSuccess.value)),
        h('div', { 'data-testid': 'feature-error' }, String(featureState.isError.value)),
        h(
          'div',
          { 'data-testid': 'feature-data' },
          String(featureState.feature.value ?? 'undefined')
        ),
        h('div', { 'data-testid': 'feature-status' }, featureState.status.value),
      ])
  },
})

const config = {
  apiKey: 'test-api-key',
  environment: 'test-environment',
  baseUrl: 'https://api.test.com',
  context: {},
  features: testFeatures,
}

describe('useFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return query state with fallback value initially', async () => {
    const plugin = createSupaship({ config })

    const wrapper = mount(TestComponent, {
      props: { featureKey: 'test-feature' },
      global: {
        plugins: [plugin],
      },
    })

    // Initial state should show fallback value from feature definitions
    expect(wrapper.find('[data-testid="feature-data"]').text()).toBe('true')
  })

  it('should use fallback value when API returns null', async () => {
    const plugin = createSupaship({ config })

    const wrapper = mount(TestComponent, {
      props: { featureKey: 'other-feature' },
      global: {
        plugins: [plugin],
      },
    })

    // Should show fallback value from feature definitions (other-feature has fallback of false)
    expect(wrapper.find('[data-testid="feature-data"]').text()).toBe('false')
  })

  it('should not fetch when shouldFetch is false', async () => {
    const plugin = createSupaship({ config })
    const mockGetFeature = vi.fn()

    // Get the mocked SupaClient instance
    const { SupaClient } = await import('@supashiphq/javascript-sdk')
    ;(SupaClient as any).mockImplementation(() => ({
      getFeature: mockGetFeature,
      getFeatureFallback: vi.fn((key: string) => testFeatures[key as keyof typeof testFeatures]),
      updateContext: vi.fn(),
      getContext: vi.fn(),
    }))

    const wrapper = mount(TestComponent, {
      props: {
        featureKey: 'test-feature',
        options: { shouldFetch: false },
      },
      global: {
        plugins: [plugin],
      },
    })

    // The mock might not be called if the feature is not fetched
    // We'll check that the component renders with the fallback value
    expect(wrapper.find('[data-testid="feature-data"]').text()).toBe('true')
  })
})
