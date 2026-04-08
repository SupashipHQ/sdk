/**
 * Re-exports the public API of `@supashiphq/javascript-sdk` from the React package
 * so apps only install `@supashiphq/react-sdk`.
 *
 * Prefer `import { ... } from '@supashiphq/react-sdk/server'` in Server Components
 * to keep server-only usage obvious; the root entry also re-exports these symbols.
 */
export type * from '@supashiphq/javascript-sdk'
export { SupashipClient } from '@supashiphq/javascript-sdk'
export type { SupashipPlugin, SupashipPluginConfig } from '@supashiphq/javascript-sdk'
export { ToolbarPlugin } from '@supashiphq/javascript-sdk'
export type {
  SupashipToolbarPluginConfig,
  SupashipToolbarPosition,
  SupashipToolbarOverrideChange,
  SupashipToolbarOverrideChangeCallback,
} from '@supashiphq/javascript-sdk'
