import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { useFeature } from '../useFeature'
import { DarkFeatureProvider } from '../DarkFeatureProvider'

// Mock the DarkFeatureClient
const mockGetFeature = jest.fn()
jest.mock('@darkfeature/sdk-javascript', () => ({
  DarkFeatureClient: jest.fn().mockImplementation(() => ({
    getFeature: mockGetFeature,
  })),
}))

describe('useFeature', () => {
  const apiKey = 'test-api-key'
  const featureKey = 'test-feature'

  const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
    <DarkFeatureProvider apiKey={apiKey}>{children}</DarkFeatureProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetFeature.mockClear()
  })

  it('should return default value when client is not initialized', () => {
    const { result } = renderHook(() => useFeature(featureKey, false), { wrapper })
    expect(result.current).toBe(false)
  })

  it('should return feature value from client', async () => {
    mockGetFeature.mockResolvedValue(true)

    const { result } = renderHook(() => useFeature(featureKey, false), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe(true)
    })
    expect(mockGetFeature).toHaveBeenCalledWith(featureKey, false)
  })

  it('should return default value on error', async () => {
    mockGetFeature.mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useFeature(featureKey, true), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe(true)
    })
    expect(mockGetFeature).toHaveBeenCalledWith(featureKey, true)
  })
})
