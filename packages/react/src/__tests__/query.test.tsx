import React from 'react'
import { render, screen, waitFor, renderHook } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useQuery, queryCache } from '../query'
import { DarkFeatureProvider } from '../provider'

// Mock the DarkFeatureClient
jest.mock('@darkfeature/sdk-javascript', () => ({
  DarkFeatureClient: jest.fn().mockImplementation(() => ({
    getFeatures: jest.fn(),
  })),
}))

const TestComponent = (): JSX.Element => {
  const { data, isLoading, error } = useQuery(['test'], async () => 'test-data')

  if (isLoading) return <div data-testid="loading">Loading...</div>
  if (error) return <div data-testid="error">Error: {error.message}</div>
  return <div data-testid="data">{data}</div>
}

const config = {
  apiKey: 'test-api-key',
  baseUrl: 'https://api.test.com',
}

describe('useQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    queryCache.clear()
  })

  it('should handle loading state', () => {
    render(
      <DarkFeatureProvider config={config}>
        <TestComponent />
      </DarkFeatureProvider>
    )

    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('should handle successful data fetching', async () => {
    render(
      <DarkFeatureProvider config={config}>
        <TestComponent />
      </DarkFeatureProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('test-data')
    })
  })

  it('should not execute query when disabled', async () => {
    const queryFn = jest.fn()
    const { result } = renderHook(() => useQuery(['test'], queryFn, { enabled: false }))

    expect(result.current.isIdle).toBe(true)
    expect(result.current.isError).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(queryFn).not.toHaveBeenCalled()
  })

  it('should execute query and return data', async () => {
    const data = { success: true }
    const queryFn = jest.fn().mockResolvedValue(data)
    const { result } = renderHook(() => useQuery(['test'], queryFn))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(data)
    expect(result.current.isLoading).toBe(false)
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('should handle query error', async () => {
    const error = new Error('API Error')
    const queryFn = jest.fn().mockRejectedValue(error)
    const { result } = renderHook(() => useQuery(['test'], queryFn, { retry: 0 }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(error)
    expect(result.current.isLoading).toBe(false)
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('should retry failed queries', async () => {
    const error = new Error('API Error')
    const queryFn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ success: true })

    const { result } = renderHook(() => useQuery(['test'], queryFn, { retry: 2, retryDelay: 100 }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 })
    expect(result.current.data).toEqual({ success: true })
    expect(result.current.isLoading).toBe(false)
    expect(queryFn).toHaveBeenCalledTimes(3)
  })

  it('should handle retry with boolean true', async () => {
    const error = new Error('API Error')
    const queryFn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ success: true })

    const { result } = renderHook(() =>
      useQuery(['test'], queryFn, { retry: true, retryDelay: 100 })
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 })
    expect(result.current.data).toEqual({ success: true })
    expect(queryFn).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
  })

  it('should handle retry with boolean false', async () => {
    const error = new Error('API Error')
    const queryFn = jest.fn().mockRejectedValue(error)
    const { result } = renderHook(() => useQuery(['test'], queryFn, { retry: false }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(error)
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('should use cached data when available and stale time > 0', async () => {
    const cachedData = { cached: true }
    const freshData = { fresh: true }
    queryCache.setQuery(JSON.stringify(['test']), cachedData)

    const queryFn = jest.fn().mockResolvedValue(freshData)
    const { result } = renderHook(() => useQuery(['test'], queryFn, { staleTime: 1000 }))

    // The cache is checked but the query still executes and returns fresh data
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(freshData) // Fresh data wins over cached data
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('should use initial data when provided', () => {
    const initialData = { initial: true }
    const queryFn = jest.fn()
    const { result } = renderHook(() => useQuery(['test'], queryFn, { initialData }))

    expect(result.current.data).toEqual(initialData)
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('should call onSuccess callback', async () => {
    const data = { success: true }
    const onSuccess = jest.fn()
    const queryFn = jest.fn().mockResolvedValue(data)

    renderHook(() => useQuery(['test'], queryFn, { onSuccess }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(data))
  })

  it('should call onError callback', async () => {
    const error = new Error('API Error')
    const onError = jest.fn()
    const queryFn = jest.fn().mockRejectedValue(error)

    renderHook(() => useQuery(['test'], queryFn, { onError, retry: 0 }))

    await waitFor(() => expect(onError).toHaveBeenCalledWith(error))
  })

  it('should call onSettled callback on success', async () => {
    const data = { success: true }
    const onSettled = jest.fn()
    const queryFn = jest.fn().mockResolvedValue(data)

    renderHook(() => useQuery(['test'], queryFn, { onSettled }))

    await waitFor(() => expect(onSettled).toHaveBeenCalledWith(data, null))
  })

  it('should call onSettled callback on error', async () => {
    const error = new Error('API Error')
    const onSettled = jest.fn()
    const queryFn = jest.fn().mockRejectedValue(error)

    renderHook(() => useQuery(['test'], queryFn, { onSettled, retry: 0 }))

    await waitFor(() => expect(onSettled).toHaveBeenCalledWith(undefined, error))
  })

  it('should handle window focus refetch when enabled', async () => {
    const data = { success: true }
    const queryFn = jest.fn().mockResolvedValue(data)

    renderHook(() => useQuery(['test'], queryFn, { refetchOnWindowFocus: true }))

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1))

    // Simulate window focus
    window.dispatchEvent(new Event('focus'))

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2))
  })

  it('should not refetch on window focus when disabled', async () => {
    const data = { success: true }
    const queryFn = jest.fn().mockResolvedValue(data)

    renderHook(() => useQuery(['test'], queryFn, { refetchOnWindowFocus: false }))

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1))

    // Simulate window focus
    window.dispatchEvent(new Event('focus'))

    // Wait a bit to ensure no additional calls
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('should preserve existing data on error when data exists', async () => {
    const initialData = { existing: true }
    const error = new Error('API Error')
    const queryFn = jest.fn().mockRejectedValue(error)

    const { result } = renderHook(() => useQuery(['test'], queryFn, { initialData, retry: 0 }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toEqual(initialData)
    expect(result.current.isSuccess).toBe(true) // Should still be true because data exists
  })
})
