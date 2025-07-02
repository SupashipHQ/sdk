import { DarkFeaturePlugin, PluginConfig } from './types'
import { FeatureValue } from '../types'

export interface LocalDevPluginConfig extends PluginConfig {
  configPath?: string
  watchForChanges?: boolean
  fallbackFeatures?: Record<string, FeatureValue>
  storageKey?: string // For browser environments
  // UI options for browser environments
  showUI?: boolean
  uiPosition?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  hotkey?: string
}

interface DevConfigFile {
  overrides?: Record<string, FeatureValue>
  features?: Record<string, FeatureValue>
  disabled?: boolean
}

interface FeatureState {
  name: string
  value: FeatureValue
  source: 'api' | 'override' | 'fallback'
  hasOverride: boolean
}

export class LocalDevPlugin implements DarkFeaturePlugin {
  name = 'local-dev'
  private enabled: boolean
  private configPath: string
  private storageKey: string
  private watchForChanges: boolean
  private fallbackFeatures: Record<string, FeatureValue>
  private currentConfig: DevConfigFile = {}
  private fileWatcher?: { close: () => void }
  private lastConfigMtime: Date | null = null
  private isBrowser: boolean

  // UI properties
  private showUI: boolean
  private uiPosition: string
  private hotkey: string
  private isUIVisible: boolean = false
  private features: Map<string, FeatureState> = new Map()
  private container: HTMLElement | null = null
  private isDevelopment: boolean

  constructor(config: LocalDevPluginConfig = {}) {
    this.enabled = config.enabled ?? true
    this.watchForChanges = config.watchForChanges ?? true
    this.fallbackFeatures = config.fallbackFeatures || {}
    this.storageKey = config.storageKey || 'darkfeature:local-config'

    // Detect environment
    this.isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

    // Development mode detection
    this.isDevelopment =
      this.isBrowser &&
      (process.env.NODE_ENV === 'development' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.port !== '')

    // UI configuration
    this.showUI = config.showUI ?? this.isDevelopment
    this.uiPosition = config.uiPosition || 'bottom-right'
    this.hotkey = config.hotkey || 'Ctrl+Shift+F'

    if (this.isBrowser) {
      // Browser environment - use localStorage
      this.configPath = '' // Not used in browser
    } else {
      // Node.js environment - use file system
      this.configPath = config.configPath || this.findConfigFile()
    }

    // Load initial configuration
    this.loadConfig()
  }

  async initialize(): Promise<void> {
    if (!this.enabled) return

    this.loadConfig()

    if (!this.isBrowser && this.watchForChanges && this.configFileExists()) {
      this.setupFileWatcher()
    }

    // Initialize UI for browser environments
    if (this.isBrowser && this.showUI) {
      this.createUI()
      this.setupHotkeys()
    }
  }

  async cleanup(): Promise<void> {
    if (this.fileWatcher) {
      this.fileWatcher.close()
      this.fileWatcher = undefined
    }

    // Cleanup UI
    if (this.container) {
      this.container.remove()
      this.container = null
    }
    this.removeHotkeys()
  }

  private findConfigFile(): string {
    if (this.isBrowser) return ''

    // Only for Node.js environment
    const possiblePaths = ['.darkfeature.json', 'darkfeatures.config.json']

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path')
      const cwd = process.cwd()

      for (const configFile of possiblePaths) {
        const fullPath = path.resolve(cwd, configFile)
        if (this.fileExists(fullPath)) {
          return fullPath
        }
      }

      return path.resolve(cwd, '.darkfeature.json')
    } catch {
      return '.darkfeature.json'
    }
  }

  private fileExists(filePath: string): boolean {
    if (this.isBrowser) return false

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs')
      return fs.existsSync(filePath)
    } catch {
      return false
    }
  }

  private configFileExists(): boolean {
    if (this.isBrowser) {
      return localStorage.getItem(this.storageKey) !== null
    }
    return this.fileExists(this.configPath)
  }

  private loadConfig(): void {
    if (this.isBrowser) {
      this.loadConfigFromBrowser()
    } else {
      this.loadConfigFromFile()
    }
  }

  private loadConfigFromBrowser(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        this.currentConfig = JSON.parse(stored)
      } else {
        this.currentConfig = {}
      }
    } catch (error) {
      console.warn('Failed to load dark features config from localStorage:', error)
      this.currentConfig = {}
    }
  }

  private loadConfigFromFile(): void {
    if (!this.configFileExists()) {
      this.currentConfig = {}
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs')
      const stat = fs.statSync(this.configPath)

      // Only reload if file has been modified
      if (this.lastConfigMtime && stat.mtime <= this.lastConfigMtime) {
        return
      }

      this.lastConfigMtime = stat.mtime

      const content = fs.readFileSync(this.configPath, 'utf-8')
      this.currentConfig = JSON.parse(content)
    } catch (error) {
      console.warn(`Failed to load dark features config from ${this.configPath}:`, error)
      this.currentConfig = {}
    }
  }

  private setupFileWatcher(): void {
    if (this.isBrowser) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs')
      fs.watchFile(this.configPath, (curr: any, prev: any) => {
        if (curr.mtime !== prev.mtime) {
          this.loadConfig()
        }
      })
      // Store a reference to unwatchFile for cleanup
      this.fileWatcher = {
        close: () => fs.unwatchFile(this.configPath),
      }
    } catch (error) {
      console.warn('Failed to setup file watcher for dark features config:', error)
    }
  }

  async beforeGetFeatures(featureNames: string[]): Promise<void> {
    if (!this.enabled || this.currentConfig.disabled) return

    this.loadConfig() // Refresh config before each request

    // If any feature has an override, throw an error to prevent the API call
    const overrides = this.currentConfig.overrides || {}
    if (featureNames.some(name => name in overrides)) {
      throw new Error('LOCAL_OVERRIDE')
    }
  }

  async afterGetFeatures(results: Record<string, FeatureValue>): Promise<void> {
    if (!this.enabled || this.currentConfig.disabled) return

    // Priority order: overrides > local features > fallback features
    const overrides = this.currentConfig.overrides || {}
    const features = this.currentConfig.features || {}

    // Apply overrides first (highest priority)
    Object.entries(overrides).forEach(([name, value]) => {
      results[name] = value
    })

    // For any feature not in the API response, use local config values
    Object.entries(features).forEach(([name, value]) => {
      if (results[name] === null || results[name] === undefined) {
        results[name] = value
      }
    })

    // Finally, use fallback features from constructor
    Object.entries(this.fallbackFeatures).forEach(([name, value]) => {
      if (results[name] === null || results[name] === undefined) {
        results[name] = value
      }
    })

    // Update UI features if in browser
    if (this.isBrowser && this.showUI) {
      this.updateFeaturesState(results)
    }
  }

  // Runtime configuration methods
  setOverride(featureName: string, value: FeatureValue): void {
    if (!this.currentConfig.overrides) {
      this.currentConfig.overrides = {}
    }
    this.currentConfig.overrides[featureName] = value
    this.saveConfig()

    // Update UI if visible
    if (this.isBrowser && this.isUIVisible) {
      this.updateFeaturesList()
    }
  }

  removeOverride(featureName: string): void {
    if (this.currentConfig.overrides) {
      delete this.currentConfig.overrides[featureName]
      this.saveConfig()

      // Update UI if visible
      if (this.isBrowser && this.isUIVisible) {
        this.updateFeaturesList()
      }
    }
  }

  clearOverrides(): void {
    this.currentConfig.overrides = {}
    this.saveConfig()

    // Update UI if visible
    if (this.isBrowser && this.isUIVisible) {
      this.updateFeaturesList()
    }
  }

  setFeature(featureName: string, value: FeatureValue): void {
    if (!this.currentConfig.features) {
      this.currentConfig.features = {}
    }
    this.currentConfig.features[featureName] = value
    this.saveConfig()
  }

  private saveConfig(): void {
    if (this.isBrowser) {
      this.saveConfigToBrowser()
    } else {
      this.saveConfigToFile()
    }
  }

  private saveConfigToBrowser(): void {
    try {
      const content = JSON.stringify(this.currentConfig, null, 2)
      localStorage.setItem(this.storageKey, content)
    } catch (error) {
      console.warn('Failed to save dark features config to localStorage:', error)
    }
  }

  private saveConfigToFile(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs')
      const content = JSON.stringify(this.currentConfig, null, 2)
      fs.writeFileSync(this.configPath, content, 'utf-8')
    } catch (error) {
      console.warn('Failed to save dark features config:', error)
    }
  }

  // Utility methods for developers
  getConfigPath(): string {
    return this.isBrowser ? `localStorage:${this.storageKey}` : this.configPath
  }

  getCurrentConfig(): DevConfigFile {
    return { ...this.currentConfig }
  }

  createSampleConfig(): void {
    const sampleConfig: DevConfigFile = {
      overrides: {
        'feature-example': true,
        'another-feature': 'test-value',
      },
      features: {
        'default-feature': false,
        'dev-only-feature': 'development',
      },
      disabled: false,
    }

    this.currentConfig = sampleConfig
    this.saveConfig()

    if (this.isBrowser) {
      console.log(`Sample config created in localStorage at key: ${this.storageKey}`)
    } else {
      console.log(`Sample config created at: ${this.configPath}`)
    }
  }

  // Browser-specific helper methods
  exportConfig(): string {
    return JSON.stringify(this.currentConfig, null, 2)
  }

  importConfig(configJson: string): void {
    try {
      this.currentConfig = JSON.parse(configJson)
      this.saveConfig()

      // Update UI if visible
      if (this.isBrowser && this.isUIVisible) {
        setTimeout(() => this.updateFeaturesList(), 100)
      }
    } catch (error) {
      console.error('Failed to import config:', error)
    }
  }

  // For browser environments - clear localStorage
  clearBrowserConfig(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.storageKey)
      this.currentConfig = {}

      // Update UI if visible
      if (this.isUIVisible) {
        this.updateFeaturesList()
      }
    }
  }

  // UI Methods (Browser Only)
  private updateFeaturesState(results: Record<string, FeatureValue>): void {
    Object.entries(results).forEach(([name, value]) => {
      const hasOverride = this.currentConfig.overrides?.[name] !== undefined

      this.features.set(name, {
        name,
        value,
        source: hasOverride ? 'override' : value !== null ? 'api' : 'fallback',
        hasOverride,
      })
    })

    // Update UI if visible
    if (this.isUIVisible) {
      this.updateFeaturesList()
    }
  }

  private createUI(): void {
    if (this.container || !this.isBrowser) return

    // Create container
    this.container = document.createElement('div')
    this.container.id = 'darkfeature-devtools'
    this.container.style.cssText = this.getContainerStyles()

    // Create toggle button
    const toggleBtn = document.createElement('button')
    toggleBtn.innerHTML = '🚩'
    toggleBtn.title = 'Toggle Dark Feature DevTools'
    toggleBtn.style.cssText = this.getToggleButtonStyles()
    toggleBtn.onclick = () => this.toggleUI()

    // Create panel
    const panel = document.createElement('div')
    panel.id = 'darkfeature-panel'
    panel.style.cssText = this.getPanelStyles()
    panel.style.display = 'none'

    // Panel header
    const header = document.createElement('div')
    header.style.cssText = this.getHeaderStyles()
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: bold;">🚩 Dark Features</span>
        <span style="font-size: 11px; background: #333; color: white; padding: 2px 6px; border-radius: 3px;">DEV</span>
      </div>
      <button id="darkfeature-close" style="background: none; border: none; color: #666; cursor: pointer; font-size: 16px;">×</button>
    `

    // Features list container
    const featuresContainer = document.createElement('div')
    featuresContainer.id = 'darkfeature-features'
    featuresContainer.style.cssText = 'max-height: 300px; overflow-y: auto;'

    // Actions container
    const actions = document.createElement('div')
    actions.style.cssText =
      'padding: 12px; border-top: 1px solid #e0e0e0; display: flex; gap: 8px; flex-wrap: wrap;'
    actions.innerHTML = `
      <button id="darkfeature-clear" style="${this.getButtonStyles()}">Clear Overrides</button>
      <button id="darkfeature-export" style="${this.getButtonStyles()}">Export Config</button>
      <button id="darkfeature-import" style="${this.getButtonStyles()}">Import Config</button>
    `

    // Assemble panel
    panel.appendChild(header)
    panel.appendChild(featuresContainer)
    panel.appendChild(actions)

    // Assemble container
    this.container.appendChild(toggleBtn)
    this.container.appendChild(panel)

    // Add to DOM
    document.body.appendChild(this.container)

    // Setup event listeners
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    if (!this.container) return

    // Close button
    const closeBtn = this.container.querySelector('#darkfeature-close')
    closeBtn?.addEventListener('click', () => this.hideUI())

    // Action buttons
    const clearBtn = this.container.querySelector('#darkfeature-clear')
    clearBtn?.addEventListener('click', () => this.clearOverrides())

    const exportBtn = this.container.querySelector('#darkfeature-export')
    exportBtn?.addEventListener('click', () => this.exportConfigUI())

    const importBtn = this.container.querySelector('#darkfeature-import')
    importBtn?.addEventListener('click', () => this.importConfigUI())
  }

  private setupHotkeys(): void {
    const handleKeydown = (e: KeyboardEvent) => {
      const keys = this.hotkey.split('+').map(k => k.trim().toLowerCase())
      const pressed: string[] = []

      if (e.ctrlKey) pressed.push('ctrl')
      if (e.shiftKey) pressed.push('shift')
      if (e.altKey) pressed.push('alt')
      if (e.metaKey) pressed.push('meta')
      pressed.push(e.key.toLowerCase())

      if (keys.every(key => pressed.includes(key))) {
        e.preventDefault()
        this.toggleUI()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    this.removeHotkeys = () => document.removeEventListener('keydown', handleKeydown)
  }

  private removeHotkeys(): void {
    // Will be replaced by setupHotkeys
  }

  private toggleUI(): void {
    if (this.isUIVisible) {
      this.hideUI()
    } else {
      this.showUIPanel()
    }
  }

  private showUIPanel(): void {
    if (!this.container) return

    const panel = this.container.querySelector('#darkfeature-panel') as HTMLElement
    if (panel) {
      panel.style.display = 'block'
      this.isUIVisible = true
      this.updateFeaturesList()
    }
  }

  private hideUI(): void {
    if (!this.container) return

    const panel = this.container.querySelector('#darkfeature-panel') as HTMLElement
    if (panel) {
      panel.style.display = 'none'
      this.isUIVisible = false
    }
  }

  private updateFeaturesList(): void {
    const container = this.container?.querySelector('#darkfeature-features')
    if (!container) return

    if (this.features.size === 0) {
      container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: #666;">No features loaded yet</div>'
      return
    }

    const featuresHtml = Array.from(this.features.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(feature => this.renderFeature(feature))
      .join('')

    container.innerHTML = featuresHtml

    // Setup feature controls
    this.setupFeatureControls()
  }

  private renderFeature(feature: FeatureState): string {
    const valueDisplay = this.formatValue(feature.value)
    const sourceColor = this.getSourceColor(feature.source)
    const overrideIndicator = feature.hasOverride ? ' 🔧' : ''

    return `
      <div class="feature-item" data-feature="${feature.name}" style="${this.getFeatureItemStyles()}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 500; color: #333;">${feature.name}</span>
            <span style="font-size: 10px; background: ${sourceColor}; color: white; padding: 1px 4px; border-radius: 2px;">
              ${feature.source.toUpperCase()}${overrideIndicator}
            </span>
          </div>
          ${
            feature.hasOverride
              ? `<button class="remove-override" data-feature="${feature.name}" style="${this.getSmallButtonStyles()}" title="Remove override">🗑️</button>`
              : ''
          }
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input 
            class="feature-input" 
            data-feature="${feature.name}"
            value="${valueDisplay}" 
            placeholder="Override value..."
            style="${this.getInputStyles()}"
          />
          <button 
            class="set-override" 
            data-feature="${feature.name}"
            style="${this.getSmallButtonStyles()}"
            title="Set override"
          >✓</button>
        </div>
      </div>
    `
  }

  private setupFeatureControls(): void {
    if (!this.container) return

    // Set override buttons
    this.container.querySelectorAll('.set-override').forEach(btn => {
      btn.addEventListener('click', e => {
        const featureName = (e.target as HTMLElement).dataset.feature!
        const input = this.container!.querySelector(
          `input[data-feature="${featureName}"]`
        ) as HTMLInputElement
        const value = this.parseValue(input.value)
        this.setOverrideUI(featureName, value)
      })
    })

    // Remove override buttons
    this.container.querySelectorAll('.remove-override').forEach(btn => {
      btn.addEventListener('click', e => {
        const featureName = (e.target as HTMLElement).dataset.feature!
        this.removeOverrideUI(featureName)
      })
    })

    // Enter key on inputs
    this.container.querySelectorAll('.feature-input').forEach(input => {
      input.addEventListener('keypress', e => {
        if ((e as KeyboardEvent).key === 'Enter') {
          const featureName = (e.target as HTMLElement).dataset.feature!
          const value = this.parseValue((e.target as HTMLInputElement).value)
          this.setOverrideUI(featureName, value)
        }
      })
    })
  }

  private setOverrideUI(featureName: string, value: FeatureValue): void {
    this.setOverride(featureName, value)

    // Update local state
    const feature = this.features.get(featureName)
    if (feature) {
      feature.value = value
      feature.source = 'override'
      feature.hasOverride = true
      this.updateFeaturesList()
    }
  }

  private removeOverrideUI(featureName: string): void {
    this.removeOverride(featureName)

    // Update local state
    const feature = this.features.get(featureName)
    if (feature) {
      feature.hasOverride = false
      feature.source = feature.value !== null ? 'api' : 'fallback'
      this.updateFeaturesList()
    }
  }

  private exportConfigUI(): void {
    const config = this.exportConfig()
    navigator.clipboard.writeText(config).then(() => {
      this.showToast('Configuration copied to clipboard!')
    })
  }

  private importConfigUI(): void {
    const config = prompt('Paste configuration JSON:')
    if (config) {
      try {
        this.importConfig(config)
        this.showToast('Configuration imported successfully!')
      } catch (error) {
        this.showToast('Invalid configuration format!', 'error')
      }
    }
  }

  private parseValue(value: string): FeatureValue {
    if (value === 'true') return true
    if (value === 'false') return false
    if (value === 'null') return null
    if (!isNaN(Number(value))) return Number(value)
    return value
  }

  private formatValue(value: FeatureValue): string {
    if (value === null) return 'null'
    if (typeof value === 'string') return value
    return String(value)
  }

  private getSourceColor(source: string): string {
    switch (source) {
      case 'override':
        return '#ff6b35'
      case 'api':
        return '#4caf50'
      case 'fallback':
        return '#9e9e9e'
      default:
        return '#9e9e9e'
    }
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const toast = document.createElement('div')
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4caf50' : '#f44336'};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      z-index: 1000000;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `
    toast.textContent = message
    document.body.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  // UI Styles
  private getContainerStyles(): string {
    const positions = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
    }

    return `
      position: fixed;
      ${positions[this.uiPosition as keyof typeof positions]}
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    `
  }

  private getToggleButtonStyles(): string {
    return `
      background: #2196F3;
      border: none;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `
  }

  private getPanelStyles(): string {
    return `
      position: absolute;
      bottom: 60px;
      right: 0;
      width: 400px;
      max-width: 90vw;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      overflow: hidden;
    `
  }

  private getHeaderStyles(): string {
    return `
      padding: 12px 16px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `
  }

  private getFeatureItemStyles(): string {
    return `
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
      background: white;
    `
  }

  private getButtonStyles(): string {
    return `
      background: #2196F3;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `
  }

  private getSmallButtonStyles(): string {
    return `
      background: #f0f0f0;
      border: none;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `
  }

  private getInputStyles(): string {
    return `
      flex: 1;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 12px;
    `
  }
}
