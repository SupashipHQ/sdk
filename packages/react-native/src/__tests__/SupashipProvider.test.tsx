import React from 'react'
import { render } from '@testing-library/react'
import { SupaProvider, useClient, useFeatureContext } from '../supaship'
import { SupaClient, FeaturesWithFallbacks } from '@supashiphq/javascript-sdk'
import { jest, describe, it, expect } from '@jest/globals'

const mockUpdateContext = jest.fn()
const mockGetContext = jest.fn()
const mockGetFeatureFallback = jest.fn()
jest.mock('@supashiphq/javascript-sdk', () => ({
  SupaClient: jest.fn().mockImplementation(() => ({
    getFeature: jest.fn(),
    getFeatureFallback: mockGetFeatureFallback,
    updateContext: mockUpdateContext,
    getContext: mockGetContext,
  })),
  ToolbarPlugin: jest.fn().mockImplementation(() => ({
    onInit: jest.fn(),
  })),
}))

describe('SupaProvider', () => {
  const config = {
    baseUrl: 'https://api.test.com',
    sdkKey: 'test-sdk-key',
    environment: 'test-environment',
    context: {},
    features: {} satisfies FeaturesWithFallbacks,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize client with config', () => {
    render(
      <SupaProvider config={config} toolbar={false}>
        <div>Test</div>
      </SupaProvider>
    )

    expect(SupaClient).toHaveBeenCalledWith({
      ...config,
      toolbar: false,
    })
  })

  it('should initialize client with default toolbar configuration', () => {
    render(
      <SupaProvider config={config}>
        <div>Test</div>
      </SupaProvider>
    )

    expect(SupaClient).toHaveBeenCalledWith(
      expect.objectContaining({
        ...config,
        toolbar: expect.objectContaining({ onOverrideChange: expect.any(Function) }),
      })
    )
  })

  it('should show error when useClient is used outside provider', () => {
    const TestComponent = (): JSX.Element => {
      try {
        useClient()
        return <div>No error</div>
      } catch (error) {
        return <div>Error: {(error as Error).message}</div>
      }
    }

    const { container } = render(<TestComponent />)
    expect(container.textContent).toContain('useClient must be used within a SupaProvider')
  })

  it('should show error when useFeatureContext is used outside provider', () => {
    const TestComponent = (): JSX.Element => {
      try {
        useFeatureContext()
        return <div>No error</div>
      } catch (error) {
        return <div>Error: {(error as Error).message}</div>
      }
    }

    const { container } = render(<TestComponent />)
    expect(container.textContent).toContain('useFeatureContext must be used within a SupaProvider')
  })

  it('should provide context update functionality', () => {
    const TestComponent = (): JSX.Element => {
      const { updateContext, getContext } = useFeatureContext()

      const handleUpdate = (): void => {
        updateContext({ userId: '123' })
      }

      const handleGet = (): void => {
        getContext()
      }

      return (
        <div>
          <button onClick={handleUpdate} data-testid="update-context">
            Update
          </button>
          <button onClick={handleGet} data-testid="get-context">
            Get
          </button>
        </div>
      )
    }

    const { getByTestId } = render(
      <SupaProvider config={config} toolbar={false}>
        <TestComponent />
      </SupaProvider>
    )

    getByTestId('update-context').click()
    expect(mockUpdateContext).toHaveBeenCalledWith({ userId: '123' }, true)

    getByTestId('get-context').click()
    expect(mockGetContext).toHaveBeenCalled()
  })
})
