export type * from './types'
export { SupaClient } from './client'
export { createFeatures } from './helpers'
export type { SupaPlugin, SupaPluginConfig } from './plugins/types'
export { SupaToolbarPlugin as ToolbarPlugin } from './plugins/toolbar-plugin'
export type {
  SupaToolbarPluginConfig,
  SupaToolbarPosition,
  SupaToolbarOverrideChange,
  SupaToolbarOverrideChangeCallback,
} from './plugins/toolbar-plugin'
// export { LoggingPlugin } from "./plugins/logging-plugin";
// export { CachingPlugin } from "./plugins/caching-plugin";
// export { AnalyticsPlugin } from "./plugins/analytics-plugin";
// export { LocalDevPlugin } from "./plugins/local-dev-plugin";
