import { sleep, retry } from '../utils'

describe('Utils', () => {
  describe('sleep', () => {
    it('should wait for the specified time', async (): Promise<void> => {
      const start = Date.now()
      await sleep(100)
      const end = Date.now()
      expect(end - start).toBeGreaterThanOrEqual(90) // Allow some tolerance
    })

    it('should handle zero delay', async (): Promise<void> => {
      const start = Date.now()
      await sleep(0)
      const end = Date.now()
      expect(end - start).toBeLessThan(50) // Should be very fast
    })
  })

  describe('retry', () => {
    it('should retry a function until it succeeds', async (): Promise<void> => {
      let attempts = 0
      const mockFn = jest.fn(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`)
        }
        return 'success'
      })

      const result = await retry(mockFn, 5, 10)
      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should throw the last error if all retries fail', async (): Promise<void> => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'))

      await expect(retry(mockFn, 3, 10)).rejects.toThrow('Always fails')
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should succeed on first attempt without retries', async (): Promise<void> => {
      const mockFn = jest.fn().mockResolvedValue('immediate success')

      const result = await retry(mockFn, 3, 10)
      expect(result).toBe('immediate success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should use default parameters when not provided', async (): Promise<void> => {
      const mockFn = jest.fn().mockResolvedValue('success')

      const result = await retry(mockFn)
      expect(result).toBe('success')
    })

    it('should handle multiple failures with retries', async (): Promise<void> => {
      let attempts = 0
      const mockFn = jest.fn(async () => {
        attempts++
        if (attempts <= 2) {
          throw new Error(`Attempt ${attempts}`)
        }
        return `success after ${attempts} attempts`
      })

      const result = await retry(mockFn, 5, 1)
      expect(result).toBe('success after 3 attempts')
    })

    it('should call onRetry callback when provided', async (): Promise<void> => {
      let attempts = 0
      const mockFn = jest.fn(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`)
        }
        return 'success'
      })

      const onRetryCallback = jest.fn()

      const result = await retry(mockFn, 5, 1, onRetryCallback)

      expect(result).toBe('success')
      expect(onRetryCallback).toHaveBeenCalledTimes(2) // Called for first 2 failures

      // Check first retry call
      expect(onRetryCallback).toHaveBeenNthCalledWith(
        1,
        1,
        expect.any(Error),
        true // willRetry = true
      )

      // Check second retry call
      expect(onRetryCallback).toHaveBeenNthCalledWith(
        2,
        2,
        expect.any(Error),
        true // willRetry = true
      )
    })

    it('should call onRetry callback with willRetry=false on final attempt', async (): Promise<void> => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'))
      const onRetryCallback = jest.fn()

      await expect(retry(mockFn, 2, 1, onRetryCallback)).rejects.toThrow('Always fails')

      expect(onRetryCallback).toHaveBeenCalledTimes(2)

      // Check first retry call
      expect(onRetryCallback).toHaveBeenNthCalledWith(
        1,
        1,
        expect.any(Error),
        true // willRetry = true
      )

      // Check final retry call
      expect(onRetryCallback).toHaveBeenNthCalledWith(
        2,
        2,
        expect.any(Error),
        false // willRetry = false (final attempt)
      )
    })

    it('should not call onRetry callback when succeeding on first attempt', async (): Promise<void> => {
      const mockFn = jest.fn().mockResolvedValue('immediate success')
      const onRetryCallback = jest.fn()

      const result = await retry(mockFn, 3, 1, onRetryCallback)

      expect(result).toBe('immediate success')
      expect(onRetryCallback).not.toHaveBeenCalled()
    })

    it('should work without onRetry callback', async (): Promise<void> => {
      let attempts = 0
      const mockFn = jest.fn(async () => {
        attempts++
        if (attempts < 2) {
          throw new Error(`Attempt ${attempts} failed`)
        }
        return 'success'
      })

      // Test the branch where onRetry is undefined
      const result = await retry(mockFn, 3, 1, undefined)
      expect(result).toBe('success')
    })

    it('should handle single retry attempt', async (): Promise<void> => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Fails'))
      const onRetryCallback = jest.fn()

      await expect(retry(mockFn, 1, 1, onRetryCallback)).rejects.toThrow('Fails')

      expect(onRetryCallback).toHaveBeenCalledTimes(1)
      expect(onRetryCallback).toHaveBeenCalledWith(
        1,
        expect.any(Error),
        false // willRetry = false (only one attempt allowed)
      )
    })

    it('should handle exponential backoff correctly', async (): Promise<void> => {
      let attempts = 0
      const mockFn = jest.fn(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`)
        }
        return 'success'
      })

      const start = Date.now()
      const result = await retry(mockFn, 5, 10) // 10ms base backoff
      const elapsed = Date.now() - start

      expect(result).toBe('success')
      // Should have waited at least: 10ms (first retry) + 20ms (second retry) = 30ms
      expect(elapsed).toBeGreaterThanOrEqual(25) // Allow some tolerance
    })
  })
})
