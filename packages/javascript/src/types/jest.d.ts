// Jest global type declarations for VS Code TypeScript support
// This ensures Jest globals like describe, it, expect, etc. are recognized

/// <reference types="jest" />

declare global {
  const describe: jest.Describe
  const it: jest.It
  const expect: jest.Expect
  const beforeEach: jest.Lifecycle
  const beforeAll: jest.Lifecycle
  const afterEach: jest.Lifecycle
  const afterAll: jest.Lifecycle
  const test: jest.It
}

export {}
