import { renderHook, act } from '@testing-library/react'
import { useQuery } from '../query'
import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Mock the DarkFeatureClient
jest.mock('@darkfeature/sdk-javascript', () => ({
  DarkFeatureClient: jest.fn().mockImplementation(() => ({
    getFeatures: jest.fn(),
  })),
}))

type TestData = { success: boolean }

describe('useQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it('should show loading state initially', () => {
    const queryFn = jest.fn<() => Promise<TestData>>()
    const { result } = renderHook(() => useQuery(['test'], queryFn))
    expect(result.current.isLoading).toBe(true)
  })

  it('should show data when query succeeds', async () => {
    const data: TestData = { success: true }
    let resolve: (value: TestData) => void = () => {}
    const promise = new Promise<TestData>(res => {
      resolve = res
    })
    const queryFn = jest.fn<() => Promise<TestData>>().mockReturnValueOnce(promise)

    const { result } = renderHook(() => useQuery(['test'], queryFn))

    await act(async () => {
      resolve(data)
      await promise
    })

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual(data)
  })

  it('should not execute query when enabled is false', () => {
    const queryFn = jest.fn<() => Promise<TestData>>()
    const { result } = renderHook(() => useQuery(['test'], queryFn, { enabled: false }))

    expect(queryFn).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle query success', async () => {
    const data: TestData = { success: true }
    let resolve: (value: TestData) => void = () => {}
    const promise = new Promise<TestData>(res => {
      resolve = res
    })
    const queryFn = jest.fn<() => Promise<TestData>>().mockReturnValueOnce(promise)
    const onSuccess = jest.fn()

    const { result } = renderHook(() =>
      useQuery(['test'], queryFn, {
        onSuccess,
      })
    )

    await act(async () => {
      resolve(data)
      await promise
    })

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual(data)
    expect(onSuccess).toHaveBeenCalledWith(data)
  })

  it('should handle query error', async () => {
    const error = new Error('Test error')
    let reject: (reason?: any) => void = () => {}
    const promise = new Promise<TestData>((_, rej) => {
      reject = rej
    })
    const queryFn = jest.fn<() => Promise<TestData>>().mockReturnValueOnce(promise)
    const onError = jest.fn()

    const { result } = renderHook(() =>
      useQuery(['test'], queryFn, {
        onError,
        retry: 0,
      })
    )

    await act(async () => {
      reject(error)
      try {
        await promise
      } catch (e) {
        // ignore
      }
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.error).toBe(error)
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('should handle query settled on success', async () => {
    const data: TestData = { success: true }
    let resolve: (value: TestData) => void = () => {}
    const promise = new Promise<TestData>(res => {
      resolve = res
    })
    const queryFn = jest.fn<() => Promise<TestData>>().mockReturnValueOnce(promise)
    const onSettled = jest.fn()

    const { result } = renderHook(() =>
      useQuery(['test'], queryFn, {
        onSettled,
      })
    )

    await act(async () => {
      resolve(data)
      await promise
    })

    expect(result.current.isSuccess).toBe(true)
    expect(onSettled).toHaveBeenCalledWith(data, null)
  })

  it('should handle query settled with error', async () => {
    const error = new Error('Test error')
    let reject: (reason?: any) => void = () => {}
    const promise = new Promise<TestData>((_, rej) => {
      reject = rej
    })
    const queryFn = jest.fn<() => Promise<TestData>>().mockReturnValueOnce(promise)
    const onSettled = jest.fn()

    const { result } = renderHook(() =>
      useQuery(['test'], queryFn, {
        onSettled,
        retry: 0,
      })
    )

    await act(async () => {
      reject(error)
      try {
        await promise
      } catch (e) {
        // ignore
      }
    })

    expect(result.current.isError).toBe(true)
    expect(onSettled).toHaveBeenCalledWith(undefined, error)
  })

  it('should not retry when retry is false', async () => {
    const error = new Error('Test error')
    let reject: (reason?: any) => void = () => {}
    const promise = new Promise<TestData>((_, rej) => {
      reject = rej
    })
    const queryFn = jest.fn<() => Promise<TestData>>().mockReturnValue(promise)

    const { result } = renderHook(() =>
      useQuery(['test'], queryFn, {
        retry: false,
      })
    )
    await act(async () => {
      reject(error)
      try {
        await promise
      } catch (e) {
        // ignore
      }
    })

    expect(result.current.isError).toBe(true)
    expect(queryFn).toHaveBeenCalledTimes(1)
  })
})
