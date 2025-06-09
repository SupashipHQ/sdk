import { DarkFeaturePlugin, PluginConfig } from "./types";
import { FeatureContext, FeatureValue } from "../types";

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface LoggingPluginConfig extends PluginConfig {
  level?: "debug" | "info" | "warn" | "error";
}

export class LoggingPlugin implements DarkFeaturePlugin {
  name = "logging";
  private logger: DefaultLogger;
  private enabled: boolean;

  constructor(config: LoggingPluginConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.logger = new DefaultLogger(config.level);
  }

  async beforeGetFeature(
    featureName: string,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled) return;
    this.logger.debug("Getting feature", { featureName, context });
  }

  async afterGetFeature(
    featureName: string,
    value: FeatureValue,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled) return;
    this.logger.debug("Got feature value", { featureName, value, context });
  }

  async beforeGetFeatures(
    featureNames: string[],
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled) return;
    this.logger.debug("Getting features", { featureNames, context });
  }

  async afterGetFeatures(
    results: Record<string, FeatureValue>,
    context?: FeatureContext
  ): Promise<void> {
    if (!this.enabled) return;
    this.logger.debug("Got feature values", { results, context });
  }

  async onError(error: Error, context?: FeatureContext): Promise<void> {
    if (!this.enabled) return;
    this.logger.error("Error occurred", { error, context });
  }
}

class DefaultLogger implements Logger {
  private level: "debug" | "info" | "warn" | "error";
  private enabled: boolean;

  constructor(
    level: "debug" | "info" | "warn" | "error" = "info",
    enabled: boolean = true
  ) {
    this.level = level;
    this.enabled = enabled;
  }

  private shouldLog(level: "debug" | "info" | "warn" | "error"): boolean {
    if (!this.enabled) return false;
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog("debug")) {
      console.debug(`[DarkFeature] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      console.info(`[DarkFeature] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog("warn")) {
      console.warn(`[DarkFeature] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog("error")) {
      console.error(`[DarkFeature] ${message}`, ...args);
    }
  }
}
