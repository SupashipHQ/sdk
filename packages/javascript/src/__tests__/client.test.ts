import { DarkFeatureClient } from '../client'

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

  it('should parse boolean values correctly', (): void => {
    expect(client['parseValue']('true')).toBe(true)
    expect(client['parseValue']('false')).toBe(false)
  })

  it('should parse numeric values correctly', (): void => {
    expect(client['parseValue']('123')).toBe(123)
  })

  it('should return string values as is', (): void => {
    expect(client['parseValue']('test')).toBe('test')
  })

  it('should get a feature with fallback', async (): Promise<void> => {
    const mockResponse = { features: { testFeature: { variation: 'true' } } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as MockResponse) as jest.MockedFunction<typeof fetch>

    const result = await client.getFeature('testFeature', { fallback: false })
    expect(result).toBe(true)
  })

  it('should get a feature with context', async (): Promise<void> => {
    const mockResponse = { features: { testFeature: { variation: 'true' } } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as MockResponse) as jest.MockedFunction<typeof fetch>

    const result = await client.getFeature('testFeature', { context: { userId: '123' } })
    expect(result).toBe(true)
  })

  it('should handle errors and return fallback', async (): Promise<void> => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
      typeof fetch
    >

    const result = await client.getFeature('testFeature', { fallback: false })
    expect(result).toBe(false)
  })

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

  it('should handle errors in getFeatures and return fallbacks', async (): Promise<void> => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
      typeof fetch
    >

    const result = await client.getFeatures({
      features: { feature1: true, feature2: false },
    })
    expect(result).toEqual({ feature1: true, feature2: false })
  })

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

  it('should handle multiple plugins cleanup', async (): Promise<void> => {
    const mockPlugin1 = { name: 'testPlugin1', cleanup: jest.fn() }
    const mockPlugin2 = { name: 'testPlugin2', cleanup: jest.fn() }
    client = new DarkFeatureClient({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
      plugins: [mockPlugin1, mockPlugin2],
    })

    await client.cleanup()
    expect(mockPlugin1.cleanup).toHaveBeenCalled()
    expect(mockPlugin2.cleanup).toHaveBeenCalled()
  })

  it('should handle errors in getFeature without fallback', async (): Promise<void> => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
      typeof fetch
    >

    const result = await client.getFeature('testFeature')
    expect(result).toBeNull()
  })

  it('should handle errors in getFeatures without fallbacks', async (): Promise<void> => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
      typeof fetch
    >

    await expect(client.getFeatures({ features: {} })).rejects.toThrow('Network error')
  })

  it('should merge context correctly in getFeature', async (): Promise<void> => {
    const mockResponse = { features: { testFeature: { variation: 'true' } } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as MockResponse) as jest.MockedFunction<typeof fetch>

    client = new DarkFeatureClient({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
      context: { defaultKey: 'defaultValue' },
    })

    const result = await client.getFeature('testFeature', { context: { userId: '123' } })
    expect(result).toBe(true)
  })

  it('should merge context correctly in getFeatures', async (): Promise<void> => {
    const mockResponse = { features: { feature1: { variation: 'true' } } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as MockResponse) as jest.MockedFunction<typeof fetch>

    client = new DarkFeatureClient({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
      context: { defaultKey: 'defaultValue' },
    })

    const result = await client.getFeatures({
      features: { feature1: null },
      context: { userId: '123' },
    })
    expect(result).toEqual({ feature1: true })
  })

  it('should handle plugin beforeGetFeatures hook', async (): Promise<void> => {
    const mockPlugin = {
      name: 'testPlugin',
      beforeGetFeatures: jest.fn().mockResolvedValue(undefined),
      afterGetFeatures: jest.fn().mockResolvedValue(undefined),
    }

    client = new DarkFeatureClient({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
      plugins: [mockPlugin],
    })

    const mockResponse = { features: { feature1: { variation: 'true' } } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as MockResponse) as jest.MockedFunction<typeof fetch>

    const result = await client.getFeatures({
      features: { feature1: null },
    })

    expect(mockPlugin.beforeGetFeatures).toHaveBeenCalledWith(['feature1'], {})
    expect(mockPlugin.afterGetFeatures).toHaveBeenCalledWith({ feature1: true }, {})
    expect(result).toEqual({ feature1: true })
  })

  it('should handle plugin onError hook in getFeature', async (): Promise<void> => {
    const mockError = new Error('Network error')
    const mockPlugin = {
      name: 'testPlugin',
      onError: jest.fn().mockResolvedValue(undefined),
    }

    client = new DarkFeatureClient({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
      plugins: [mockPlugin],
    })

    global.fetch = jest.fn().mockRejectedValue(mockError) as jest.MockedFunction<typeof fetch>

    const result = await client.getFeature('testFeature', { fallback: 'defaultValue' })

    expect(mockPlugin.onError).toHaveBeenCalledWith(mockError, {})
    expect(result).toBe('defaultValue')
  })

  it('should handle plugin onError hook in getFeatures', async (): Promise<void> => {
    const mockError = new Error('Network error')
    const mockPlugin = {
      name: 'testPlugin',
      onError: jest.fn().mockResolvedValue(undefined),
    }

    client = new DarkFeatureClient({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
      plugins: [mockPlugin],
    })

    global.fetch = jest.fn().mockRejectedValue(mockError) as jest.MockedFunction<typeof fetch>

    const result = await client.getFeatures({
      features: { feature1: 'fallback' },
    })

    expect(mockPlugin.onError).toHaveBeenCalledWith(mockError, {})
    expect(result).toEqual({ feature1: 'fallback' })
  })

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

  it('should handle direct value parameter that is not an options object', async (): Promise<void> => {
    const mockResponse = { features: { testFeature: { variation: 'true' } } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as MockResponse) as jest.MockedFunction<typeof fetch>

    const result = await client.getFeature('testFeature', 'fallback-value')
    expect(result).toBe(true)
  })

  it('should handle undefined context in getFeature', async (): Promise<void> => {
    const mockResponse = { features: { testFeature: { variation: 'true' } } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as MockResponse) as jest.MockedFunction<typeof fetch>

    const result = await client.getFeature('testFeature', { context: undefined })
    expect(result).toBe(true)
  })

  it('should handle retry configuration with custom values', async (): Promise<void> => {
    client = new DarkFeatureClient({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
      retry: { enabled: true, maxAttempts: 5, backoff: 500 },
    })

    const mockResponse = { features: { testFeature: { variation: 'true' } } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as MockResponse) as jest.MockedFunction<typeof fetch>

    const result = await client.getFeature('testFeature')
    expect(result).toBe(true)
  })

  it('should throw error in getFeatures when no fallback provided and error occurs', async (): Promise<void> => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.MockedFunction<
      typeof fetch
    >

    await expect(client.getFeatures({ features: {} })).rejects.toThrow('Network error')
  })

  it('should throw error in getFeature when getFeatures fails and no fallback', async (): Promise<void> => {
    // Create a mock that simulates a specific case where getFeatures throws
    const mockGetFeatures = jest.fn().mockRejectedValue(new Error('Network error'))
    client['getFeatures'] = mockGetFeatures

    // Call getFeature with undefined fallback
    await expect(client.getFeature('testFeature', { fallback: undefined })).rejects.toThrow(
      'Network error'
    )
  })

  it('should handle cleanup with no plugins', async (): Promise<void> => {
    client = new DarkFeatureClient({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
    })

    await expect(client.cleanup()).resolves.toBeUndefined()
  })
})
