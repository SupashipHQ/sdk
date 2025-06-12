export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  backoff: number = 1000,
  onRetry?: (attempt: number, error: Error, willRetry: boolean) => void
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      const willRetry = attempt < maxAttempts

      if (onRetry) {
        onRetry(attempt, lastError, willRetry)
      }

      if (!willRetry) break
      await sleep(backoff * Math.pow(2, attempt - 1))
    }
  }

  throw lastError!
}
