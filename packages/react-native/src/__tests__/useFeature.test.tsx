import React from 'react'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useFeature } from '../hooks'
import { SupashipProvider } from '../supaship'
import { FeatureValue, FeatureContext, FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'
import { jest, describe, it, expect, beforeEach } from '@jest/globals'

type GetFeatureFn = (
  key: string,
  options?: { context?: FeatureContext }
) => Promise<FeatureValue | null>

const testFeatures = {
  'test-feature': true,
  'other-feature': false,
}

const mockGetFeature = jest.fn<GetFeatureFn>()
const mockGetFeatureFallback = jest.fn(
  (key: string) => testFeatures[key as keyof typeof testFeatures]
)
jest.mock('@supashiphq/javascript-sdk', () => ({
  SupashipClient: jest.fn().mockImplementation(() => ({
    getFeature: mockGetFeature,
    getFeatureFallback: mockGetFeatureFallback,
    updateContext: jest.fn(),
    getContext: jest.fn(),
  })),
  ToolbarPlugin: jest.fn().mockImplementation(() => ({
    onInit: jest.fn(),
  })),
}))

const TestComponent = ({
  featureKey,
  options,
}: {
  featureKey: string
  options?: { context?: FeatureContext; shouldFetch?: boolean }
}): JSX.Element => {
  const featureState = useFeature(featureKey, options)
  return (
    <div>
      <div data-testid="feature-loading">{featureState.isLoading.toString()}</div>
      <div data-testid="feature-success">{featureState.isSuccess.toString()}</div>
      <div data-testid="feature-error">{featureState.isError.toString()}</div>
      <div data-testid="feature-data">{featureState.feature?.toString() || 'undefined'}</div>
      <div data-testid="feature-status">{featureState.status}</div>
    </div>
  )
}

const config = {
  sdkKey: 'test-sdk-key',
  environment: 'test-environment',
  baseUrl: 'https://api.test.com',
  context: {},
  features: testFeatures satisfies FeaturesWithFallbacks,
}

describe('useFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it('should return query state with fallback value initially', async () => {
    let resolve: (value: FeatureValue | null) => void = () => {}
    const promise = new Promise<FeatureValue | null>(res => {
      resolve = res
    })
    mockGetFeature.mockReturnValueOnce(promise)

    render(
      <SupashipProvider config={config}>
        <TestComponent featureKey="test-feature" />
      </SupashipProvider>
    )

    expect(screen.getByTestId('feature-data').textContent).toBe('true')
    expect(screen.getByTestId('feature-loading').textContent).toBe('true')
    expect(screen.getByTestId('feature-success').textContent).toBe('false')

    await act(async () => {
      resolve(false)
      await promise
    })

    expect(screen.getByTestId('feature-data').textContent).toBe('false')
    expect(screen.getByTestId('feature-loading').textContent).toBe('false')
    expect(screen.getByTestId('feature-success').textContent).toBe('true')
  })

  it('should use fallback value when API returns null', async () => {
    let resolve: (value: FeatureValue | null) => void = () => {}
    const promise = new Promise<FeatureValue | null>(res => {
      resolve = res
    })
    mockGetFeature.mockReturnValueOnce(promise)

    render(
      <SupashipProvider config={config}>
        <TestComponent featureKey="other-feature" />
      </SupashipProvider>
    )

    await act(async () => {
      resolve(null)
      await promise
    })

    expect(screen.getByTestId('feature-data').textContent).toBe('false')
  })

  it('should pass context to the client', async () => {
    const context = { userId: '123' }
    let resolve: (value: FeatureValue | null) => void = () => {}
    const promise = new Promise<FeatureValue | null>(res => {
      resolve = res
    })
    mockGetFeature.mockReturnValueOnce(promise)

    render(
      <SupashipProvider config={config}>
        <TestComponent featureKey="test-feature" options={{ context }} />
      </SupashipProvider>
    )

    await act(async () => {
      resolve(true)
      await promise
    })

    expect(mockGetFeature).toHaveBeenCalledWith('test-feature', { context })
  })

  it('should not fetch when shouldFetch is false', async () => {
    render(
      <SupashipProvider config={config}>
        <TestComponent featureKey="test-feature" options={{ shouldFetch: false }} />
      </SupashipProvider>
    )

    expect(mockGetFeature).not.toHaveBeenCalled()
  })
})
