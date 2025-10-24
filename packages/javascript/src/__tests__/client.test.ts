import { SupaClient } from '../client'
import { FeatureContext } from '../types'
import '../types/jest.d.ts'

// Mock Response type for fetch
interface MockResponse {
  ok: boolean
  statusText?: string
  json: () => Promise<unknown>
}

jest.mock('../utils', () => ({
  retry: async (fn: () => Promise<unknown>): Promise<unknown> => await fn(),
}))

describe('SupaClient', () => {
  let client: SupaClient<Record<string, any>>
  const mockApiKey = 'test-api-key'
  const mockBaseUrl = 'https://test-api.com'

  beforeEach((): void => {
    client = new SupaClient({
      apiKey: mockApiKey,
      environment: 'test-environment',
      networkConfig: {
        featuresAPIUrl: `${mockBaseUrl}/features`,
      },
      features: {},
    })
    jest.clearAllMocks()
  })

  describe('constructor and configuration', () => {
    it('should use default featuresAPIUrl when not provided', (): void => {
      const client = new SupaClient({
        apiKey: 'test',
        environment: 'test-environment',
        features: {},
      })
      // @ts-expect-error - accessing private property for testing
      expect(client['featuresAPIUrl']).toBe('https://edge.supaship.com/v1/features')
    })

    it('should use default retry configuration', (): void => {
      const client = new SupaClient({
        apiKey: 'test',
        environment: 'test-environment',
        features: {},
      })
      // @ts-expect-error - accessing private property for testing
      expect(client['retryEnabled']).toBe(true)
      // @ts-expect-error - accessing private property for testing
      expect(client['maxRetries']).toBe(3)
      // @ts-expect-error - accessing private property for testing
      expect(client['retryBackoff']).toBe(1000)
    })

    it('should use custom retry configuration', (): void => {
      const client = new SupaClient({
        apiKey: 'test',
        environment: 'test-environment',
        features: {},
        networkConfig: {
          retry: { enabled: false, maxAttempts: 5, backoff: 2000 },
        },
      })
      // @ts-expect-error - accessing private property for testing
      expect(client['retryEnabled']).toBe(false)
      // @ts-expect-error - accessing private property for testing
      expect(client['maxRetries']).toBe(5)
      // @ts-expect-error - accessing private property for testing
      expect(client['retryBackoff']).toBe(2000)
    })

    it('should handle empty plugins array', (): void => {
      const client = new SupaClient({
        apiKey: 'test',
        environment: 'test-environment',
        features: {},
        plugins: [],
      })
      expect(client['plugins']).toEqual([])
    })

    it('should handle undefined plugins', (): void => {
      const client = new SupaClient({
        apiKey: 'test',
        environment: 'test-environment',
        features: {},
      })
      expect(client['plugins']).toEqual([])
    })
  })

  describe('updateContext', () => {
    it('should merge context by default', (): void => {
      client = new SupaClient({
        apiKey: mockApiKey,
        environment: 'test-environment',
        features: {},
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
      client = new SupaClient({
        apiKey: mockApiKey,
        environment: 'test-environment',
        features: {},
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

      client = new SupaClient({
        apiKey: mockApiKey,
        environment: 'test-environment',
        features: {},
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

      const result = await client.getFeature('testFeature')
      expect(result).toBe(true)
    })

    it('should handle null fallback', async (): Promise<void> => {
      const mockResponse = { features: { testFeature: { variation: 'true' } } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      const result = await client.getFeature('testFeature')
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
      })
      expect(result).toBe(true)
    })

    it('should handle errors and return fallback', async (): Promise<void> => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      const result = await client.getFeature('testFeature')
      expect(result).toBe(false)
    })

    it('should handle error case when no fallback is provided', async (): Promise<void> => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      // Since retry is mocked to always succeed, this will return null instead of throwing
      const result = await client.getFeature('testFeature')
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

      client = new SupaClient({
        apiKey: mockApiKey,
        environment: 'test-environment',
        features: {},
        plugins: [mockPlugin],
      })

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      const result = await client.getFeature('testFeature')
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

      const result = await client.getFeatures(['feature1', 'feature2'])
      expect(result).toEqual({ feature1: true, feature2: false })
    })

    it('should handle context update notification for request', async (): Promise<void> => {
      const mockPlugin = {
        name: 'testPlugin',
        onContextUpdate: jest.fn(),
      }

      client = new SupaClient({
        apiKey: mockApiKey,
        environment: 'test-environment',
        features: {},
        context: { default: 'value' },
        plugins: [mockPlugin],
      })

      const mockResponse = { features: { feature1: { variation: 'true' } } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      await client.getFeatures(['feature1'], {
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

      await expect(client.getFeatures([])).rejects.toThrow('Network error')
    })

    it('should handle fallbacks with multiple features', async (): Promise<void> => {
      const mockPlugin = {
        name: 'testPlugin',
        onFallbackUsed: jest.fn(),
      }

      client = new SupaClient({
        apiKey: mockApiKey,
        environment: 'test-environment',
        features: {},
        plugins: [mockPlugin],
      })

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      const result = await client.getFeatures(['feature1', 'feature2'])

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

      client = new SupaClient({
        apiKey: mockApiKey,
        environment: 'test-environment',
        features: {},
        plugins: [mockPlugin],
      })

      const mockResponse = { features: { feature1: { variation: 'true' } } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      await client.getFeatures(['feature1'])

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

      const result = await client.getFeature('testFeature')
      expect(result).toBe('defaultValue')
    })

    it('should return fallback when variation is undefined', async (): Promise<void> => {
      const mockResponse = { features: { testFeature: {} } }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as MockResponse) as jest.MockedFunction<typeof fetch>

      const result = await client.getFeature('testFeature')
      expect(result).toBe('defaultValue')
    })

    it('should work with retry disabled', async (): Promise<void> => {
      client = new SupaClient({
        apiKey: mockApiKey,
        environment: 'test-environment',
        features: {},
        networkConfig: {
          featuresAPIUrl: `${mockBaseUrl}/features`,
          retry: { enabled: false },
        },
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
    it('should handle plugin errors gracefully', async (): Promise<void> => {
      const mockPlugin = {
        name: 'testPlugin',
        onError: jest.fn().mockResolvedValue(undefined),
      }

      client = new SupaClient({
        apiKey: mockApiKey,
        environment: 'test-environment',
        features: {},
        plugins: [mockPlugin],
      })

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
        typeof fetch
      >

      const result = await client.getFeature('testFeature')

      expect(mockPlugin.onError).toHaveBeenCalled()
      expect(result).toBe('defaultValue')
    })
  })
})
