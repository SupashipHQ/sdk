import React from 'react'
import { render } from '@testing-library/react'
import { DarkFeatureProvider, useDarkFeature } from '../DarkFeatureProvider'
import { DarkFeatureClient } from '@darkfeature/sdk-javascript'

// Mock the DarkFeatureClient
jest.mock('@darkfeature/sdk-javascript', () => ({
  DarkFeatureClient: jest.fn().mockImplementation(() => ({
    getFeature: jest.fn(),
  })),
}))

describe('DarkFeatureProvider', () => {
  const apiKey = 'test-api-key'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize client with apiKey', () => {
    render(
      <DarkFeatureProvider apiKey={apiKey}>
        <div>Test</div>
      </DarkFeatureProvider>
    )

    expect(DarkFeatureClient).toHaveBeenCalledWith({
      apiKey,
      retry: {
        enabled: true,
        maxAttempts: 3,
        backoff: 1000,
      },
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
