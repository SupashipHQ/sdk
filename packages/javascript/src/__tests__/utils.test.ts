import { sleep, retry } from '../utils'

describe('Utils', () => {
  describe('sleep', () => {
    it('should wait for the specified time', async () => {
      const start = Date.now()
      await sleep(100)
      const end = Date.now()
      expect(end - start).toBeGreaterThanOrEqual(100)
    })
  })

  describe('retry', () => {
    it('should retry a function until it succeeds', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('Success')

      const result = await retry(mockFn, 2, 100)
      expect(result).toBe('Success')
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('should throw the last error if all retries fail', async () => {
      const mockError = new Error('All attempts failed')
      const mockFn = jest.fn().mockRejectedValue(mockError)

      await expect(retry(mockFn, 2, 100)).rejects.toThrow('All attempts failed')
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('should succeed on first attempt without retries', async () => {
      const mockFn = jest.fn().mockResolvedValue('Success')

      const result = await retry(mockFn, 3, 100)
      expect(result).toBe('Success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should use default parameters when not provided', async () => {
      const mockFn = jest.fn().mockResolvedValue('Success')

      const result = await retry(mockFn)
      expect(result).toBe('Success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple failures with retries', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce('Success')

      // Use a very small backoff for fast testing
      const result = await retry(mockFn, 3, 1)

      expect(result).toBe('Success')
      expect(mockFn).toHaveBeenCalledTimes(3)
    })
  })
})
