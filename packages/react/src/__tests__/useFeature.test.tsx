import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useFeature } from '../useFeature'
import { DarkFeatureProvider } from '../provider'

// Mock the DarkFeatureClient
const mockGetFeature = jest.fn()
jest.mock('@darkfeature/sdk-javascript', () => ({
  DarkFeatureClient: jest.fn().mockImplementation(() => ({
    getFeature: mockGetFeature,
  })),
}))

const TestComponent = ({
  featureKey,
  defaultValue,
}: {
  featureKey: string
  defaultValue?: boolean
}): JSX.Element => {
  const featureValue = useFeature(featureKey, defaultValue)
  return <div data-testid="feature-value">{featureValue.toString()}</div>
}

const config = {
  apiKey: 'test-api-key',
  baseUrl: 'https://api.test.com',
}

describe('useFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return default value initially', () => {
    render(
      <DarkFeatureProvider config={config}>
        <TestComponent featureKey="test-feature" defaultValue={true} />
      </DarkFeatureProvider>
    )

    expect(screen.getByTestId('feature-value')).toHaveTextContent('true')
  })

  it('should fetch feature value from client', async () => {
    mockGetFeature.mockResolvedValue(false)

    render(
      <DarkFeatureProvider config={config}>
        <TestComponent featureKey="test-feature" defaultValue={true} />
      </DarkFeatureProvider>
    )

    await waitFor(() => {
      expect(mockGetFeature).toHaveBeenCalledWith('test-feature', { fallback: true })
    })

    await waitFor(() => {
      expect(screen.getByTestId('feature-value')).toHaveTextContent('false')
    })
  })

  it('should handle errors and use default value', async () => {
    mockGetFeature.mockRejectedValue(new Error('Network error'))

    render(
      <DarkFeatureProvider config={config}>
        <TestComponent featureKey="test-feature" defaultValue={true} />
      </DarkFeatureProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('feature-value')).toHaveTextContent('true')
    })
  })
})
