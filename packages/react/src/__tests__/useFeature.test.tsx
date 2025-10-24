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

// Mock the SupaProvider
const mockGetFeature = jest.fn<GetFeatureFn>()
jest.mock('@supashiphq/sdk-javascript', () => ({
  SupaProvider: jest.fn().mockImplementation(() => ({
    getFeature: mockGetFeature,
  })),
  createFeatures: jest.fn(features => features),
}))

const TestComponent = ({
  featureKey,
  options,
}: {
  featureKey: string
  options?: { fallback?: FeatureValue; context?: Record<string, unknown>; shouldFetch?: boolean }
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
  features: createFeatures({}),
}

describe('useFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it('should return query state with fallback value initially', async () => {
    render(
      <SupaProvider config={config}>
        <TestComponent featureKey="test-feature" options={{ fallback: true }} />
      </SupaProvider>
    )

    // Initial state should show fallback value
    expect(screen.getByTestId('feature-data').textContent).toBe('true')
    expect(screen.getByTestId('feature-success').textContent).toBe('true')
    expect(screen.getByTestId('feature-loading').textContent).toBe('false')
  })

  it('should use fallback value when API returns null', async () => {
    let resolve: (value: FeatureValue | null) => void = () => {}
    const promise = new Promise<FeatureValue | null>(res => {
      resolve = res
    })
    mockGetFeature.mockReturnValueOnce(promise)

    render(
      <SupaProvider config={config}>
        <TestComponent featureKey="test-feature" options={{ fallback: true }} />
      </SupaProvider>
    )

    await act(async () => {
      resolve(null)
      await promise
    })

    expect(screen.getByTestId('feature-data').textContent).toBe('true')
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
