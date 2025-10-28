import React from 'react'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useFeature } from '../hooks'
import { SupaProvider } from '../provider'
import { FeatureValue, createFeatures } from '@supashiphq/sdk-javascript'
import { jest, describe, it, expect, beforeEach } from '@jest/globals'

type GetFeatureFn = (
  key: string,
  options?: { context?: Record<string, unknown> }
) => Promise<FeatureValue | null>

// Create feature definitions for testing
const testFeatures = {
  'test-feature': true,
  'other-feature': false,
}

// Mock the SupaClient
const mockGetFeature = jest.fn<GetFeatureFn>()
const mockGetFeatureFallback = jest.fn(
  (key: string) => testFeatures[key as keyof typeof testFeatures]
)
jest.mock('@supashiphq/sdk-javascript', () => ({
  SupaClient: jest.fn().mockImplementation(() => ({
    getFeature: mockGetFeature,
    getFeatureFallback: mockGetFeatureFallback,
    updateContext: jest.fn(),
    getContext: jest.fn(),
  })),
  createFeatures: jest.fn(features => features),
  ToolbarPlugin: jest.fn().mockImplementation(() => ({
    onInit: jest.fn(),
  })),
}))

const TestComponent = ({
  featureKey,
  options,
}: {
  featureKey: string
  options?: { context?: Record<string, unknown>; shouldFetch?: boolean }
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
  apiKey: 'test-api-key',
  environment: 'test-environment',
  baseUrl: 'https://api.test.com',
  features: createFeatures(testFeatures),
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
      <SupaProvider config={config}>
        <TestComponent featureKey="test-feature" />
      </SupaProvider>
    )

    // Initial state should show fallback value from feature definitions while loading
    expect(screen.getByTestId('feature-data').textContent).toBe('true')
    expect(screen.getByTestId('feature-loading').textContent).toBe('true')
    expect(screen.getByTestId('feature-success').textContent).toBe('false')

    // After resolving, should show fetched value
    await act(async () => {
      resolve(false) // API returns false
      await promise
    })

    // Should now show API value (false) instead of fallback
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
      <SupaProvider config={config}>
        <TestComponent featureKey="other-feature" />
      </SupaProvider>
    )

    await act(async () => {
      resolve(null)
      await promise
    })

    // Should show fallback value from feature definitions (other-feature has fallback of false)
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
      <SupaProvider config={config}>
        <TestComponent featureKey="test-feature" options={{ context }} />
      </SupaProvider>
    )

    await act(async () => {
      resolve(true)
      await promise
    })

    expect(mockGetFeature).toHaveBeenCalledWith('test-feature', { context })
  })

  it('should not fetch when shouldFetch is false', async () => {
    render(
      <SupaProvider config={config}>
        <TestComponent featureKey="test-feature" options={{ shouldFetch: false }} />
      </SupaProvider>
    )

    expect(mockGetFeature).not.toHaveBeenCalled()
  })
})
