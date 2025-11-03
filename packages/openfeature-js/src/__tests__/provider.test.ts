import { SupashipProvider } from '../provider'
import { SupaClient, createFeatures } from '@supashiphq/sdk-javascript'
import { Logger, ProviderStatus } from '@openfeature/server-sdk'

// Mock the SupaClient
jest.mock('@supashiphq/sdk-javascript', () => ({
  ...jest.requireActual('@supashiphq/sdk-javascript'),
  SupaClient: jest.fn(),
}))

describe('SupashipProvider', () => {
  const mockFeatures = createFeatures({
    'boolean-flag': true,
    'string-flag': 'test-value',
    'number-flag': 42,
    'object-flag': { key: 'value' },
  })

  let mockClient: jest.Mocked<SupaClient<typeof mockFeatures>>
  let provider: SupashipProvider<typeof mockFeatures>
  let mockLogger: Logger

  beforeEach(() => {
    mockClient = {
      getFeature: jest.fn(),
      getFeatures: jest.fn(),
      updateContext: jest.fn(),
      getContext: jest.fn(),
    } as unknown as jest.Mocked<SupaClient<typeof mockFeatures>>

    provider = new SupashipProvider({ client: mockClient })

    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger
  })

  describe('metadata', () => {
    it('should have correct provider metadata', () => {
      expect(provider.metadata.name).toBe('Supaship Provider')
    })

    it('should specify that it runs on server', () => {
      expect(provider.runsOn).toBe('server')
    })
  })

  describe('initialization', () => {
    it('should initialize with NOT_READY status', () => {
      expect(provider.status).toBe(ProviderStatus.NOT_READY)
    })

    it('should transition to READY status after initialization', async () => {
      await provider.initialize()
      expect(provider.status).toBe(ProviderStatus.READY)
    })

    it('should emit READY event after initialization', async () => {
      const readyListener = jest.fn()
      provider.events.addHandler(ProviderStatus.READY, readyListener)

      await provider.initialize()

      expect(readyListener).toHaveBeenCalled()
    })
  })

  describe('resolveBooleanEvaluation', () => {
    it('should resolve a boolean flag', async () => {
      mockClient.getFeature.mockResolvedValue(true)

      const result = await provider.resolveBooleanEvaluation('boolean-flag', false, {}, mockLogger)

      expect(result.value).toBe(true)
      expect(mockClient.getFeature).toHaveBeenCalledWith('boolean-flag', {
        context: {},
      })
    })

    it('should return default value on error', async () => {
      mockClient.getFeature.mockRejectedValue(new Error('Network error'))

      const result = await provider.resolveBooleanEvaluation('boolean-flag', false, {}, mockLogger)

      expect(result.value).toBe(false)
      expect(result.reason).toBe('ERROR')
      expect(result.errorCode).toBe('GENERAL')
    })

    it('should throw TypeMismatchError for non-boolean values', async () => {
      mockClient.getFeature.mockResolvedValue('not-a-boolean')

      await expect(
        provider.resolveBooleanEvaluation('boolean-flag', false, {}, mockLogger)
      ).rejects.toThrow('not a boolean')
    })
  })

  describe('resolveStringEvaluation', () => {
    it('should resolve a string flag', async () => {
      mockClient.getFeature.mockResolvedValue('test-value')

      const result = await provider.resolveStringEvaluation(
        'string-flag',
        'default',
        {},
        mockLogger
      )

      expect(result.value).toBe('test-value')
    })

    it('should return default value on error', async () => {
      mockClient.getFeature.mockRejectedValue(new Error('Network error'))

      const result = await provider.resolveStringEvaluation(
        'string-flag',
        'default',
        {},
        mockLogger
      )

      expect(result.value).toBe('default')
      expect(result.reason).toBe('ERROR')
    })

    it('should throw TypeMismatchError for non-string values', async () => {
      mockClient.getFeature.mockResolvedValue(123)

      await expect(
        provider.resolveStringEvaluation('string-flag', 'default', {}, mockLogger)
      ).rejects.toThrow('not a string')
    })
  })

  describe('resolveNumberEvaluation', () => {
    it('should resolve a number flag', async () => {
      mockClient.getFeature.mockResolvedValue(42)

      const result = await provider.resolveNumberEvaluation('number-flag', 0, {}, mockLogger)

      expect(result.value).toBe(42)
    })

    it('should return default value on error', async () => {
      mockClient.getFeature.mockRejectedValue(new Error('Network error'))

      const result = await provider.resolveNumberEvaluation('number-flag', 0, {}, mockLogger)

      expect(result.value).toBe(0)
      expect(result.reason).toBe('ERROR')
    })

    it('should throw TypeMismatchError for non-number values', async () => {
      mockClient.getFeature.mockResolvedValue('not-a-number')

      await expect(
        provider.resolveNumberEvaluation('number-flag', 0, {}, mockLogger)
      ).rejects.toThrow('not a number')
    })
  })

  describe('resolveObjectEvaluation', () => {
    it('should resolve an object flag', async () => {
      const mockObject = { key: 'value' }
      mockClient.getFeature.mockResolvedValue(mockObject)

      const result = await provider.resolveObjectEvaluation('object-flag', {}, {}, mockLogger)

      expect(result.value).toEqual(mockObject)
    })

    it('should return default value on error', async () => {
      mockClient.getFeature.mockRejectedValue(new Error('Network error'))

      const result = await provider.resolveObjectEvaluation(
        'object-flag',
        { default: true },
        {},
        mockLogger
      )

      expect(result.value).toEqual({ default: true })
      expect(result.reason).toBe('ERROR')
    })

    it('should throw TypeMismatchError for non-object values', async () => {
      mockClient.getFeature.mockResolvedValue(123)

      await expect(
        provider.resolveObjectEvaluation('object-flag', {}, {}, mockLogger)
      ).rejects.toThrow('not an object')
    })
  })

  describe('context conversion', () => {
    it('should pass context to the Supaship client', async () => {
      const context = { userId: '123', email: 'test@example.com' }
      mockClient.getFeature.mockResolvedValue(true)

      await provider.resolveBooleanEvaluation('boolean-flag', false, context, mockLogger)

      expect(mockClient.getFeature).toHaveBeenCalledWith('boolean-flag', {
        context,
      })
    })
  })

  describe('onClose', () => {
    it('should set status to NOT_READY when closed', async () => {
      await provider.initialize()
      expect(provider.status).toBe(ProviderStatus.READY)

      await provider.onClose()
      expect(provider.status).toBe(ProviderStatus.NOT_READY)
    })
  })
})
