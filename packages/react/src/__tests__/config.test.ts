import { describe, expect, it, jest } from '@jest/globals'
import { defineSupashipConfig } from '../config'
import { createSupashipServerClient } from '../server-client'

jest.mock('@supashiphq/javascript-sdk', () => {
  return {
    SupashipClient: class MockClient {
      lastConfig: unknown
      constructor(config: unknown) {
        this.lastConfig = config
      }
    },
  }
})

describe('defineSupashipConfig', () => {
  it('returns the same object reference', () => {
    const input = {
      sdkKey: 'k',
      environment: 'dev',
      features: { a: false },
      context: {},
    }
    const cfg = defineSupashipConfig(input)
    expect(cfg).toBe(input)
  })
})

describe('createSupashipServerClient', () => {
  it('passes toolbar: false', () => {
    const client = createSupashipServerClient(
      defineSupashipConfig({
        sdkKey: 'k',
        environment: 'dev',
        features: { f: true },
        context: {},
      })
    )
    expect((client as unknown as { lastConfig: { toolbar: boolean } }).lastConfig.toolbar).toBe(
      false
    )
  })
})
