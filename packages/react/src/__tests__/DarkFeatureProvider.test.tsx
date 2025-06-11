import React from 'react'
import { render } from '@testing-library/react'
import { DarkFeatureProvider, useDarkFeature } from '../provider'
import { DarkFeatureClient } from '@darkfeature/sdk-javascript'

// Mock the DarkFeatureClient
jest.mock('@darkfeature/sdk-javascript', () => ({
  DarkFeatureClient: jest.fn().mockImplementation(() => ({
    getFeature: jest.fn(),
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
})
