import React from 'react'
import { render } from '@testing-library/react'
import { DarkFeatureProvider, useDarkFeature, useFeatureContext } from '../provider'
import { DarkFeatureClient } from '@darkfeature/sdk-javascript'
import { jest, describe, it, expect } from '@jest/globals'

// Mock the DarkFeatureClient
const mockUpdateContext = jest.fn()
const mockGetContext = jest.fn()
jest.mock('@darkfeature/sdk-javascript', () => ({
  DarkFeatureClient: jest.fn().mockImplementation(() => ({
    getFeature: jest.fn(),
    updateContext: mockUpdateContext,
    getContext: mockGetContext,
  })),
}))

describe('DarkFeatureProvider', () => {
  const config = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.test.com',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize client with config', () => {
    render(
      <DarkFeatureProvider config={config}>
        <div>Test</div>
      </DarkFeatureProvider>
    )

    expect(DarkFeatureClient).toHaveBeenCalledWith({
      ...config,
      plugins: [],
    })
  })

  it('should initialize client with config and plugins', () => {
    const mockPlugin = { name: 'test-plugin' }

    render(
      <DarkFeatureProvider config={config} plugins={[mockPlugin]}>
        <div>Test</div>
      </DarkFeatureProvider>
    )

    expect(DarkFeatureClient).toHaveBeenCalledWith({
      ...config,
      plugins: [mockPlugin],
    })
  })

  it('should merge plugins from config and props', () => {
    const configPlugin = { name: 'config-plugin' }
    const propPlugin = { name: 'prop-plugin' }
    const configWithPlugins = { ...config, plugins: [configPlugin] }

    render(
      <DarkFeatureProvider config={configWithPlugins} plugins={[propPlugin]}>
        <div>Test</div>
      </DarkFeatureProvider>
    )

    expect(DarkFeatureClient).toHaveBeenCalledWith({
      ...configWithPlugins,
      plugins: [configPlugin, propPlugin],
    })
  })

  it('should show error when useDarkFeature is used outside provider', () => {
    const TestComponent = (): JSX.Element => {
      try {
        useDarkFeature()
        return <div>No error</div>
      } catch (error) {
        return <div>Error: {(error as Error).message}</div>
      }
    }

    const { container } = render(<TestComponent />)
    expect(container.textContent).toContain(
      'useDarkFeature must be used within a DarkFeatureProvider'
    )
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
    expect(container.textContent).toContain(
      'useFeatureContext must be used within a DarkFeatureProvider'
    )
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
      <DarkFeatureProvider config={config}>
        <TestComponent />
      </DarkFeatureProvider>
    )

    // Simulate updating context
    getByTestId('update-context').click()
    expect(mockUpdateContext).toHaveBeenCalledWith({ userId: '123' }, true)

    // Simulate getting context
    getByTestId('get-context').click()
    expect(mockGetContext).toHaveBeenCalled()
  })
})
