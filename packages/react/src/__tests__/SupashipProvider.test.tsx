import React from 'react'
import { render } from '@testing-library/react'
import { SupaProvider, useClient, useFeatureContext } from '../provider'
import { SupaClient } from '@supashiphq/sdk-javascript'
import { jest, describe, it, expect } from '@jest/globals'

// Mock the SupaClient
const mockUpdateContext = jest.fn()
const mockGetContext = jest.fn()
jest.mock('@supashiphq/sdk-javascript', () => ({
  SupaClient: jest.fn().mockImplementation(() => ({
    getFeature: jest.fn(),
    updateContext: mockUpdateContext,
    getContext: mockGetContext,
  })),
}))

describe('SupaProvider', () => {
  const config = {
    baseUrl: 'https://api.test.com',
    apiKey: 'test-api-key',
    environment: 'test-environment',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize client with config', () => {
    render(
      <SupaProvider config={config}>
        <div>Test</div>
      </SupaProvider>
    )

    expect(SupaClient).toHaveBeenCalledWith({
      ...config,
      plugins: [],
    })
  })

  it('should initialize client with config and plugins', () => {
    const mockPlugin = { name: 'test-plugin' }

    render(
      <SupaProvider config={config} plugins={[mockPlugin]}>
        <div>Test</div>
      </SupaProvider>
    )

    expect(SupaClient).toHaveBeenCalledWith({
      ...config,
      plugins: [mockPlugin],
    })
  })

  it('should merge plugins from config and props', () => {
    const configPlugin = { name: 'config-plugin' }
    const propPlugin = { name: 'prop-plugin' }
    const configWithPlugins = { ...config, plugins: [configPlugin] }

    render(
      <SupaProvider config={configWithPlugins} plugins={[propPlugin]}>
        <div>Test</div>
      </SupaProvider>
    )

    expect(SupaClient).toHaveBeenCalledWith({
      ...configWithPlugins,
      plugins: [configPlugin, propPlugin],
    })
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
      <SupaProvider config={config}>
        <TestComponent />
      </SupaProvider>
    )

    // Simulate updating context
    getByTestId('update-context').click()
    expect(mockUpdateContext).toHaveBeenCalledWith({ userId: '123' }, true)

    // Simulate getting context
    getByTestId('get-context').click()
    expect(mockGetContext).toHaveBeenCalled()
  })
})
