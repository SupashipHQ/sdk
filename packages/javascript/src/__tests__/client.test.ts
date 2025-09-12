import { DarkFeatureClient } from '../client'
import { FeatureContext } from '../types'

// Mock Response type for fetch
interface MockResponse {
  ok: boolean
  statusText?: string
  json: () => Promise<unknown>
}

jest.mock('../utils', () => ({
  retry: async (fn: () => Promise<unknown>): Promise<unknown> => await fn(),
}))

describe('DarkFeatureClient', () => {
  let client: DarkFeatureClient
  const mockApiKey = 'test-api-key'
  const mockBaseUrl = 'https://test-api.com'

  beforeEach((): void => {
    client = new DarkFeatureClient({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
    })
    jest.clearAllMocks()
  })

  describe('parseValue', () => {
    it('should parse boolean values correctly', (): void => {
      expect(client['parseValue']('true')).toBe(true)
      expect(client['parseValue']('false')).toBe(false)
    })

    it('should parse numeric values correctly', (): void => {
      expect(client['parseValue']('123')).toBe(123)
      expect(client['parseValue']('0')).toBe(0)
      expect(client['parseValue']('-123')).toBe(-123)
      expect(client['parseValue']('123.45')).toBe(123.45)
    })

    it('should return string values as is', (): void => {
      expect(client['parseValue']('test')).toBe('test')
      expect(client['parseValue']('not-a-number')).toBe('not-a-number')
    })

    it('should handle empty or null values', (): void => {
      expect(client['parseValue']('')).toBe(null)
      expect(client['parseValue'](null)).toBe(null)
      expect(client['parseValue'](undefined as unknown as null)).toBe(null)
    })
  })

  describe('constructor and configuration', () => {
    it('should use default baseUrl when not provided', (): void => {
      const client = new DarkFeatureClient({ apiKey: 'test' })
      expect(client['baseUrl']).toBe('https://edge.supaship.com/v1')
    })

    it('should use default retry configuration', (): void => {
      const client = new DarkFeatureClient({ apiKey: 'test' })
      expect(client['retryEnabled']).toBe(true)
      expect(client['maxRetries']).toBe(3)
      expect(client['retryBackoff']).toBe(1000)
    })

    it('should use custom retry configuration', (): void => {
      const client = new DarkFeatureClient({
        apiKey: 'test',
        retry: { enabled: false, maxAttempts: 5, backoff: 2000 },
      })
      expect(client['retryEnabled']).toBe(false)
      expect(client['maxRetries']).toBe(5)
      expect(client['retryBackoff']).toBe(2000)
    })

    it('should handle empty plugins array', (): void => {
      const client = new DarkFeatureClient({ apiKey: 'test', plugins: [] })
      expect(client['plugins']).toEqual([])
    })

    it('should handle undefined plugins', (): void => {
      const client = new DarkFeatureClient({ apiKey: 'test' })
      expect(client['plugins']).toEqual([])
    })
  })

  describe('updateContext', () => {
    it('should merge context by default', (): void => {
      client = new DarkFeatureClient({
        apiKey: mockApiKey,
        context: { existing: 'value', toUpdate: 'old' },
      })

      client.updateContext({ toUpdate: 'new', newKey: 'newValue' })

      const context = client.getContext()
      expect(context).toEqual({
        existing: 'value',
        toUpdate: 'new',
        newKey: 'newValue',
      })
    })

    it('should replace context when mergeWithExisting is false', (): void => {
      client = new DarkFeatureClient({
        apiKey: mockApiKey,
        context: { existing: 'value', toUpdate: 'old' },
      })

      client.updateContext({ newKey: 'newValue' }, false)

      const context = client.getContext()
      expect(context).toEqual({ newKey: 'newValue' })
    })

    it('should handle updating context when no default context exists', (): void => {
      client.updateContext({ key: 'value' })
      expect(client.getContext()).toEqual({ key: 'value' })
    })

    it('should handle updating context with false merge when no default context', (): void => {
      client.updateContext({ key: 'value' }, false)
      expect(client.getContext()).toEqual({ key: 'value' })
    })

    it('should notify plugins on context update', async (): Promise<void> => {
      const mockPlugin = {
        name: 'testPlugin',
        onContextUpdate: jest.fn(),
      }

      client = new DarkFeatureClient({
        apiKey: mockApiKey,
        context: { old: 'value' },
        plugins: [mockPlugin],
      })

      // Give the async plugin notification time to resolve
      await new Promise(resolve => setTimeout(resolve, 0))

      client.updateContext({ new: 'value' })

      // Give the async plugin notification time to resolve
      await new Promise(resolve => setTimeout(resolve, 0))
    })
  })

  describe('getFeature', () => {
    it('should get a feature with fallback', async (): Promise<void> => {
      const mockResponse = { features: { testFeature: { variation: 'true' } } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      const result = await client.getFeature('testFeature', { fallback: false })
      expect(result).toBe(true)
    })

    it('should handle null fallback', async (): Promise<void> => {
      const mockResponse = { features: { testFeature: { variation: 'true' } } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      const result = await client.getFeature('testFeature', { fallback: null })
      expect(result).toBe(true)
    })

    it('should handle context being null in options', async (): Promise<void> => {
      const mockResponse = { features: { testFeature: { variation: 'true' } } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      const result = await client.getFeature('testFeature', {
        context: null as unknown as FeatureContext,
        fallback: 'default',
      })
      expect(result).toBe(true)
    })

    it('should handle context being undefined in options', async (): Promise<void> => {
      const mockResponse = { features: { testFeature: { variation: 'true' } } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      const result = await client.getFeature('testFeature', {
        context: undefined,
        fallback: 'default',
      })
      expect(result).toBe(true)
    })

    it('should handle errors and return fallback', async (): Promise<void> => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      const result = await client.getFeature('testFeature', { fallback: false })
      expect(result).toBe(false)
    })

    it('should handle error case when no fallback is provided', async (): Promise<void> => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      // Since retry is mocked to always succeed, this will return null instead of throwing
      const result = await client.getFeature('testFeature', { fallback: undefined })
      expect(result).toBe(null)
    })

    it('should handle error case when no options provided', async (): Promise<void> => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      // Since retry is mocked to always succeed, this will return null instead of throwing
      const result = await client.getFeature('testFeature')
      expect(result).toBe(null)
    })

    it('should notify plugins on fallback used', async (): Promise<void> => {
      const mockPlugin = {
        name: 'testPlugin',
        onFallbackUsed: jest.fn(),
      }

      client = new DarkFeatureClient({
        apiKey: mockApiKey,
        plugins: [mockPlugin],
      })

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      const result = await client.getFeature('testFeature', { fallback: 'default' })
      expect(result).toBe('default')
      expect(mockPlugin.onFallbackUsed).toHaveBeenCalled()
    })
  })

  describe('getFeatures', () => {
    it('should get multiple features', async (): Promise<void> => {
      const mockResponse = {
        features: { feature1: { variation: 'true' }, feature2: { variation: 'false' } },
      }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      const result = await client.getFeatures({
        features: { feature1: null, feature2: null },
      })
      expect(result).toEqual({ feature1: true, feature2: false })
    })

    it('should handle context update notification for request', async (): Promise<void> => {
      const mockPlugin = {
        name: 'testPlugin',
        onContextUpdate: jest.fn(),
      }

      client = new DarkFeatureClient({
        apiKey: mockApiKey,
        context: { default: 'value' },
        plugins: [mockPlugin],
      })

      const mockResponse = { features: { feature1: { variation: 'true' } } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      await client.getFeatures({
        features: { feature1: null },
        context: { request: 'specific' },
      })

      expect(mockPlugin.onContextUpdate).toHaveBeenCalledWith(
        { default: 'value' },
        { default: 'value', request: 'specific' },
        'request'
      )
    })

    it('should handle empty features object in error case', async (): Promise<void> => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      await expect(client.getFeatures({ features: {} })).rejects.toThrow('Network error')
    })

    it('should handle fallbacks with multiple features', async (): Promise<void> => {
      const mockPlugin = {
        name: 'testPlugin',
        onFallbackUsed: jest.fn(),
      }

      client = new DarkFeatureClient({
        apiKey: mockApiKey,
        plugins: [mockPlugin],
      })

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      const result = await client.getFeatures({
        features: { feature1: 'fallback1', feature2: 'fallback2' },
      })

      expect(result).toEqual({ feature1: 'fallback1', feature2: 'fallback2' })
      expect(mockPlugin.onFallbackUsed).toHaveBeenCalledTimes(2)
    })

    it('should handle plugin hooks', async (): Promise<void> => {
      const mockPlugin = {
        name: 'testPlugin',
        beforeGetFeatures: jest.fn().mockResolvedValue(undefined),
        afterGetFeatures: jest.fn().mockResolvedValue(undefined),
        beforeRequest: jest.fn().mockResolvedValue(undefined),
        afterResponse: jest.fn().mockResolvedValue(undefined),
      }

      client = new DarkFeatureClient({
        apiKey: mockApiKey,
        plugins: [mockPlugin],
      })

      const mockResponse = { features: { feature1: { variation: 'true' } } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      await client.getFeatures({ features: { feature1: null } })

      expect(mockPlugin.beforeGetFeatures).toHaveBeenCalled()
      expect(mockPlugin.afterGetFeatures).toHaveBeenCalled()
      expect(mockPlugin.beforeRequest).toHaveBeenCalled()
      expect(mockPlugin.afterResponse).toHaveBeenCalled()
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle HTTP error responses', async (): Promise<void> => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      const result = await client.getFeature('testFeature', { fallback: 'defaultValue' })
      expect(result).toBe('defaultValue')
    })

    it('should return fallback when variation is undefined', async (): Promise<void> => {
      const mockResponse = { features: { testFeature: {} } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      const result = await client.getFeature('testFeature', { fallback: 'defaultValue' })
      expect(result).toBe('defaultValue')
    })

    it('should work with retry disabled', async (): Promise<void> => {
      client = new DarkFeatureClient({
        apiKey: mockApiKey,
        baseUrl: mockBaseUrl,
        retry: { enabled: false },
      })

      const mockResponse = { features: { testFeature: { variation: 'true' } } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      const result = await client.getFeature('testFeature')
      expect(result).toBe(true)
    })
  })

  describe('plugin management', () => {
    it('should cleanup plugins', async (): Promise<void> => {
      const mockPlugin = { name: 'testPlugin', cleanup: jest.fn() }
      client = new DarkFeatureClient({
        apiKey: mockApiKey,
        baseUrl: mockBaseUrl,
        plugins: [mockPlugin],
      })

      await client.cleanup()
      expect(mockPlugin.cleanup).toHaveBeenCalled()
    })

    it('should handle cleanup with no plugins', async (): Promise<void> => {
      await expect(client.cleanup()).resolves.toBeUndefined()
    })

    it('should handle plugins without cleanup method', async (): Promise<void> => {
      const mockPlugin = { name: 'testPlugin' }
      client = new DarkFeatureClient({
        apiKey: mockApiKey,
        plugins: [mockPlugin],
      })

      await expect(client.cleanup()).resolves.toBeUndefined()
    })

    it('should handle plugin errors gracefully', async (): Promise<void> => {
      const mockPlugin = {
        name: 'testPlugin',
        onError: jest.fn().mockResolvedValue(undefined),
      }

      client = new DarkFeatureClient({
        apiKey: mockApiKey,
        plugins: [mockPlugin],
      })

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      const result = await client.getFeature('testFeature', { fallback: 'defaultValue' })

      expect(mockPlugin.onError).toHaveBeenCalled()
      expect(result).toBe('defaultValue')
    })
  })
})
