import { SupaPlugin, SupaPluginConfig } from './types'
import { FeatureContext, FeatureValue } from '../types'

export interface ToolbarPosition {
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  offset?: { x: string; y: string }
}

export type ToolbarOverrideChange = {
  feature: string
  value: FeatureValue
}

export type ToolbarOverrideChangeCallback = (
  featureOverride: ToolbarOverrideChange,
  allOverrides: Record<string, FeatureValue>
) => void

export interface ToolbarPluginConfig extends SupaPluginConfig {
  show?: boolean | 'auto' // auto means show only on localhost
  position?: ToolbarPosition
  onOverrideChange?: ToolbarOverrideChangeCallback
}

interface ToolbarState {
  overrides: Record<string, FeatureValue>
  features: Set<string>
  featureValues: Record<string, FeatureValue>
  context?: FeatureContext
  searchQuery: string
  useLocalOverrides: boolean
}

const DEFAULT_STORAGE_KEY = 'supaship-feature-overrides'

/**
 * Toolbar plugin for local feature flag testing
 * Provides a visual interface to override feature flags during development
 */
export class ToolbarPlugin implements SupaPlugin {
  name = 'toolbar'
  private config: Required<Omit<ToolbarPluginConfig, 'enabled' | 'onOverrideChange'>> & {
    onOverrideChange?: ToolbarOverrideChangeCallback
  }
  private state: ToolbarState

  constructor(config: ToolbarPluginConfig = {}) {
    this.config = {
      show: config.show ?? 'auto',
      position: {
        placement: config.position?.placement ?? 'bottom-right',
        offset: config.position?.offset ?? { x: '1rem', y: '1rem' },
      },
      onOverrideChange: config.onOverrideChange,
    }

    this.state = {
      overrides: this.loadOverrides(),
      features: new Set(),
      featureValues: {},
      searchQuery: '',
      useLocalOverrides: true,
    }

    // Inject toolbar immediately if conditions are met
    if (this.shouldShowToolbar()) {
      this.injectToolbar()
    }
  }

  cleanup(): void {
    this.removeToolbar()
  }

  private shouldShowToolbar(): boolean {
    if (this.config.show === true) return true
    if (this.config.show === false) return false

    // Auto mode: show only on localhost
    if (typeof window !== 'undefined') {
      return (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '' ||
        window.location.hostname.endsWith('.local') ||
        window.location.hostname.endsWith('.localhost')
      )
    }
    return false
  }

  async beforeGetFeatures(featureNames: string[], context?: FeatureContext): Promise<void> {
    // Track all feature names we've seen
    featureNames.forEach(name => this.state.features.add(name))
    this.state.context = context

    // Update toolbar UI if it exists
    this.updateToolbarUI()
  }

  async afterGetFeatures(
    results: Record<string, FeatureValue>,
    context?: FeatureContext
  ): Promise<void> {
    // Store original feature values before applying overrides
    Object.keys(results).forEach(name => {
      if (!(name in this.state.featureValues)) {
        this.state.featureValues[name] = results[name]
      }
    })

    // Apply overrides to results only if local overrides are enabled
    if (this.state.useLocalOverrides) {
      Object.keys(this.state.overrides).forEach(featureName => {
        if (featureName in results) {
          results[featureName] = this.state.overrides[featureName]
        }
      })
    }

    // Track features and update UI
    Object.keys(results).forEach(name => this.state.features.add(name))
    this.state.context = context
    this.updateToolbarUI()
  }

  private loadOverrides(): Record<string, FeatureValue> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {}
    }

    try {
      const stored = window.localStorage.getItem(DEFAULT_STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  private saveOverrides(
    feature?: string,
    value?: FeatureValue,
    allOverrides?: Record<string, FeatureValue>
  ): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    try {
      window.localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(allOverrides))
      this.config.onOverrideChange?.(
        { feature: feature ?? '', value: value ?? null },
        allOverrides ?? {}
      )
    } catch (error) {
      console.error('Supaship: Failed to save feature overrides:', error)
    }
  }

  public setOverride(featureName: string, value: FeatureValue): void {
    this.state.overrides[featureName] = value
    this.saveOverrides(featureName, value, this.state.overrides)
    this.updateToolbarUI()
  }

  public removeOverride(featureName: string): void {
    delete this.state.overrides[featureName]
    this.saveOverrides(featureName, null, this.state.overrides)
    this.updateToolbarUI()
  }

  public clearAllOverrides(): void {
    this.state.overrides = {}
    this.saveOverrides('', null, this.state.overrides)
    this.updateToolbarUI()
  }

  public getOverrides(): Record<string, FeatureValue> {
    return { ...this.state.overrides }
  }

  private injectToolbar(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    // Check if toolbar already exists
    if (document.getElementById('supaship-toolbar')) {
      return
    }

    // Create toolbar container
    const toolbar = document.createElement('div')
    toolbar.id = 'supaship-toolbar'
    toolbar.innerHTML = this.getToolbarHTML()

    // Add styles
    this.injectStyles()

    // Add to DOM
    document.body.appendChild(toolbar)

    // Add event listeners
    this.attachEventListeners()
  }

  private removeToolbar(): void {
    if (typeof document === 'undefined') {
      return
    }

    const toolbar = document.getElementById('supaship-toolbar')
    if (toolbar) {
      toolbar.remove()
    }

    const styles = document.getElementById('supaship-toolbar-styles')
    if (styles) {
      styles.remove()
    }
  }

  private getToolbarHTML(): string {
    const { placement, offset } = this.config.position
    const positionClass = `supaship-toolbar-${placement}`
    const offsetX = offset?.x ?? '1rem'
    const offsetY = offset?.y ?? '1rem'

    return `
      <div class="supaship-toolbar-container ${positionClass}" style="--offset-x: ${offsetX}; --offset-y: ${offsetY};">
        <button class="supaship-toolbar-toggle" id="supaship-toolbar-toggle" aria-label="Toggle feature flags">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            width="24"
            style="vertical-align: middle;">
            <rect width="256" height="256" rx="16" fill="none"></rect>
            <line
              x1="40"
              y1="128"
              x2="128"
              y2="40"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="16"></line>
            <line
              x1="216"
              y1="40"
              x2="40"
              y2="216"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="16"></line>
            <line
              x1="216"
              y1="128"
              x2="128"
              y2="216"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="16"></line>
          </svg>
          <span class="supaship-badge" id="supaship-override-count">0</span>
        </button>
        <div class="supaship-toolbar-panel" id="supaship-toolbar-panel">
          <div class="supaship-toolbar-header">
            <input
              type="text"
              class="supaship-search-input"
              id="supaship-search-input"
              placeholder="Search features"
            />
            <button
              class="supaship-header-btn"
              id="supaship-toggle-source"
              aria-label="Toggle local/cloud"
              title="Toggle between local overrides and cloud values"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="18" height="18">
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.6,87.6,0,0,1-3.33,24H174.16a157.44,157.44,0,0,0,0-48h38.51A87.6,87.6,0,0,1,216,128ZM102,168H154a115.11,115.11,0,0,1-26,45A115.27,115.27,0,0,1,102,168Zm-3.9-16a140.84,140.84,0,0,1,0-48h59.88a140.84,140.84,0,0,1,0,48ZM40,128a87.6,87.6,0,0,1,3.33-24H81.84a157.44,157.44,0,0,0,0,48H43.33A87.6,87.6,0,0,1,40,128ZM154,88H102a115.11,115.11,0,0,1,26-45A115.27,115.27,0,0,1,154,88Zm52.33,0H170.71a135.28,135.28,0,0,0-22.3-45.6A88.29,88.29,0,0,1,206.37,88ZM107.59,42.4A135.28,135.28,0,0,0,85.29,88H49.63A88.29,88.29,0,0,1,107.59,42.4ZM49.63,168H85.29a135.28,135.28,0,0,0,22.3,45.6A88.29,88.29,0,0,1,49.63,168Zm98.78,45.6a135.28,135.28,0,0,0,22.3-45.6h35.66A88.29,88.29,0,0,1,148.41,213.6Z" fill="currentColor"/>
              </svg>
            </button>
            <button
              class="supaship-header-btn"
              id="supaship-clear-all"
              aria-label="Clear all overrides"
              title="Clear all local overrides"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="18" height="18">
                <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="supaship-toolbar-content" id="supaship-toolbar-content">
            <div class="supaship-toolbar-empty">No feature flags detected yet</div>
          </div>
        </div>
      </div>
    `
  }

  private injectStyles(): void {
    if (typeof document === 'undefined') {
      return
    }

    if (document.getElementById('supaship-toolbar-styles')) {
      return
    }

    const styles = document.createElement('style')
    styles.id = 'supaship-toolbar-styles'
    styles.textContent = `
      .supaship-toolbar-container {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        font-size: 14px;
      }

      .supaship-toolbar-bottom-right {
        bottom: var(--offset-y);
        right: var(--offset-x);
      }

      .supaship-toolbar-bottom-left {
        bottom: var(--offset-y);
        left: var(--offset-x);
      }

      .supaship-toolbar-top-right {
        top: var(--offset-y);
        right: var(--offset-x);
      }

      .supaship-toolbar-top-left {
        top: var(--offset-y);
        left: var(--offset-x);
      }

      .supaship-toolbar-toggle {
        position: relative;
        width: 48px;
        height: 48px;
        border-radius: 24px;
        background: #000;
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .supaship-toolbar-toggle:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .supaship-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        border-radius: 10px;
        min-width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
        padding: 0 6px;
      }

      .supaship-badge:empty {
        display: none;
      }

      .supaship-toolbar-panel {
        position: absolute;
        bottom: 60px;
        right: 0;
        width: 300px;
        max-height: 600px;
        background: #1a1a1a;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        display: none;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #333;
      }

      .supaship-toolbar-bottom-left .supaship-toolbar-panel,
      .supaship-toolbar-top-left .supaship-toolbar-panel {
        right: auto;
        left: 0;
      }

      .supaship-toolbar-top-right .supaship-toolbar-panel,
      .supaship-toolbar-top-left .supaship-toolbar-panel {
        bottom: auto;
        top: 60px;
      }

      .supaship-toolbar-panel.open {
        display: flex;
      }

      .supaship-toolbar-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        border-bottom: 1px solid #333;
        background: #0f0f0f;
      }

      .supaship-search-input {
        flex: 1;
        background: #2a2a2a;
        border: 1px solid #444;
        color: #e5e5e5;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s;
      }

      .supaship-search-input::placeholder {
        color: #888;
      }

      .supaship-search-input:focus {
        border-color: #667eea;
      }

      .supaship-header-btn {
        background: #2a2a2a;
        border: 1px solid #444;
        color: #e5e5e5;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .supaship-header-btn:hover {
        background: #333;
        border-color: #555;
      }

      .supaship-header-btn.active {
        background: #667eea;
        border-color: #667eea;
      }

      .supaship-toolbar-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .supaship-toolbar-empty {
        padding: 32px 16px;
        text-align: center;
        color: #888;
      }

      .supaship-feature-item {
        padding: 12px;
        margin: 4px 0;
        border-radius: 8px;
        background: #2a2a2a;
        border: 1px solid #444;
      }

      .supaship-feature-item.has-override {
        background: #2d2416;
        border-color: #fbbf24;
      }

      .supaship-feature-item.disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      .supaship-feature-boolean {
        padding: 10px 12px;
      }

      .supaship-feature-boolean-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .supaship-feature-name-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
      }

      .supaship-feature-toggle-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .supaship-feature-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .supaship-feature-name {
        font-weight: 500;
        color: #e5e5e5;
        font-size: 13px;
      }

      .supaship-feature-controls {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .supaship-feature-input {
        flex: 1;
        padding: 6px 8px;
        background: #1a1a1a;
        border: 1px solid #555;
        color: #e5e5e5;
        border-radius: 4px;
        font-size: 13px;
        font-family: 'Monaco', 'Courier New', monospace;
        outline: none;
      }

      .supaship-feature-input:focus {
        border-color: #667eea;
      }

      .supaship-btn {
        padding: 4px 12px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }

      .supaship-btn-primary {
        background: #667eea;
        color: white;
      }

      .supaship-btn-primary:hover {
        background: #5568d3;
      }

      .supaship-btn-secondary {
        background: #444;
        color: #e5e5e5;
      }

      .supaship-btn-secondary:hover {
        background: #555;
      }

      .supaship-override-badge {
        font-size: 11px;
        background: #fbbf24;
        color: #78350f;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }

      .supaship-toggle {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 20px;
        flex-shrink: 0;
      }

      .supaship-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .supaship-toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #555;
        transition: 0.2s;
        border-radius: 20px;
      }

      .supaship-toggle-slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
        background-color: #e5e5e5;
        transition: 0.2s;
        border-radius: 50%;
      }

      .supaship-toggle input:checked + .supaship-toggle-slider {
        background-color: #667eea;
      }

      .supaship-toggle input:checked + .supaship-toggle-slider:before {
        transform: translateX(20px);
      }

      .supaship-toggle input:disabled + .supaship-toggle-slider {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .supaship-btn-icon {
        background: transparent;
        border: none;
        color: #e5e5e5;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        cursor: pointer;
        padding: 0;
        transition: all 0.2s;
      }

      .supaship-btn-icon:hover {
        background: #444;
        color: #ef4444;
      }
    `
    document.head.appendChild(styles)
  }

  private attachEventListeners(): void {
    if (typeof document === 'undefined') {
      return
    }

    const toggle = document.getElementById('supaship-toolbar-toggle')
    const panel = document.getElementById('supaship-toolbar-panel')
    const clearAll = document.getElementById('supaship-clear-all')
    const toggleSource = document.getElementById('supaship-toggle-source')
    const searchInput = document.getElementById('supaship-search-input') as HTMLInputElement

    toggle?.addEventListener('click', () => {
      panel?.classList.toggle('open')
    })

    clearAll?.addEventListener('click', () => {
      if (confirm('Clear all feature flag overrides?')) {
        this.clearAllOverrides()
      }
    })

    toggleSource?.addEventListener('click', () => {
      this.state.useLocalOverrides = !this.state.useLocalOverrides
      this.updateToolbarUI()
    })

    searchInput?.addEventListener('input', e => {
      this.state.searchQuery = (e.target as HTMLInputElement).value.toLowerCase()
      this.updateToolbarUI()
    })
  }

  private updateToolbarUI(): void {
    if (typeof document === 'undefined') {
      return
    }

    const content = document.getElementById('supaship-toolbar-content')
    const badge = document.getElementById('supaship-override-count')
    const toggleSource = document.getElementById('supaship-toggle-source')

    if (!content) return

    // Update badge
    const overrideCount = Object.keys(this.state.overrides).length
    if (badge) {
      badge.textContent = overrideCount > 0 ? String(overrideCount) : ''
    }

    // Update toggle source button state
    if (toggleSource) {
      if (this.state.useLocalOverrides) {
        toggleSource.classList.remove('active')
        toggleSource.title = 'Using local overrides (click to use cloud values)'
      } else {
        toggleSource.classList.add('active')
        toggleSource.title = 'Using cloud values (click to use local overrides)'
      }
    }

    const features = Array.from(this.state.features).sort()

    // Filter features based on search query
    const filteredFeatures = features.filter(name =>
      name.toLowerCase().includes(this.state.searchQuery)
    )

    if (filteredFeatures.length === 0) {
      content.innerHTML = this.state.searchQuery
        ? '<div class="supaship-toolbar-empty">No matching features found</div>'
        : '<div class="supaship-toolbar-empty">No feature flags detected yet</div>'
      return
    }

    content.innerHTML = filteredFeatures
      .map(featureName => {
        const hasOverride = featureName in this.state.overrides
        const currentValue = this.state.featureValues[featureName]
        const overrideValue = hasOverride ? this.state.overrides[featureName] : currentValue
        const isDisabled = !this.state.useLocalOverrides
        const itemClass = `supaship-feature-item ${hasOverride ? 'has-override' : ''} ${isDisabled ? 'disabled' : ''}`

        // Check if the feature is boolean
        const isBoolean =
          typeof currentValue === 'boolean' || (hasOverride && typeof overrideValue === 'boolean')

        if (isBoolean) {
          // Render toggle switch for boolean values (single row layout)
          const isChecked = hasOverride ? overrideValue === true : currentValue === true
          return `
          <div class="${itemClass} supaship-feature-boolean">
            <div class="supaship-feature-boolean-row">
              <div class="supaship-feature-name-wrapper">
                <span class="supaship-feature-name">${this.escapeHtml(featureName)}</span>
                ${hasOverride ? '<span class="supaship-override-badge">OVERRIDE</span>' : ''}
              </div>
              <div class="supaship-feature-toggle-group">
                <label class="supaship-toggle">
                  <input
                    type="checkbox"
                    ${isChecked ? 'checked' : ''}
                    data-feature="${this.escapeHtml(featureName)}"
                    data-type="boolean"
                  />
                  <span class="supaship-toggle-slider"></span>
                </label>
                ${
                  hasOverride
                    ? `
                  <button
                    class="supaship-btn-icon"
                    data-feature="${this.escapeHtml(featureName)}"
                    data-action="remove"
                    title="Reset to default"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="14" height="14">
                      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z" fill="currentColor"/>
                    </svg>
                  </button>
                `
                    : ''
                }
              </div>
            </div>
          </div>
        `
        } else {
          // Render text input for non-boolean values
          return `
          <div class="${itemClass}">
            <div class="supaship-feature-header">
              <span class="supaship-feature-name">${this.escapeHtml(featureName)}</span>
              ${hasOverride ? '<span class="supaship-override-badge">OVERRIDE</span>' : ''}
            </div>
            <div class="supaship-feature-controls">
              <input
                type="text"
                class="supaship-feature-input"
                placeholder="Override value (e.g., 'value', 123)"
                value="${hasOverride ? this.escapeHtml(JSON.stringify(overrideValue)) : ''}"
                data-feature="${this.escapeHtml(featureName)}"
              />
              <button
                class="supaship-btn ${hasOverride ? 'supaship-btn-secondary' : 'supaship-btn-primary'}"
                data-feature="${this.escapeHtml(featureName)}"
                data-action="${hasOverride ? 'remove' : 'set'}"
              >
                ${hasOverride ? 'Reset' : 'Set'}
              </button>
            </div>
          </div>
        `
        }
      })
      .join('')

    // Attach event listeners to buttons
    content.querySelectorAll('button[data-action]').forEach(button => {
      button.addEventListener('click', e => {
        const target = e.target as HTMLButtonElement
        const featureName = target.dataset.feature!
        const action = target.dataset.action

        if (action === 'remove') {
          this.removeOverride(featureName)
        } else if (action === 'set') {
          const input = content.querySelector(
            `input[type="text"][data-feature="${featureName}"]`
          ) as HTMLInputElement
          if (input && input.value.trim()) {
            try {
              const value = JSON.parse(input.value)
              this.setOverride(featureName, value)
            } catch {
              // If not valid JSON, treat as string
              this.setOverride(featureName, input.value)
            }
          }
        }
      })
    })

    // Allow Enter key to set override for text inputs
    content.querySelectorAll('input[type="text"][data-feature]').forEach(input => {
      input.addEventListener('keypress', e => {
        if ((e as KeyboardEvent).key === 'Enter') {
          const target = e.target as HTMLInputElement
          const featureName = target.dataset.feature!
          if (target.value.trim()) {
            try {
              const value = JSON.parse(target.value)
              this.setOverride(featureName, value)
            } catch {
              this.setOverride(featureName, target.value)
            }
          }
        }
      })
    })

    // Handle toggle switches for boolean values
    content.querySelectorAll('input[type="checkbox"][data-type="boolean"]').forEach(checkbox => {
      checkbox.addEventListener('change', e => {
        const target = e.target as HTMLInputElement
        const featureName = target.dataset.feature!
        const newValue = target.checked
        this.setOverride(featureName, newValue)
      })
    })
  }

  private escapeHtml(text: string): string {
    const div = typeof document !== 'undefined' ? document.createElement('div') : null
    if (div) {
      div.textContent = text
      return div.innerHTML
    }
    return text.replace(/[&<>"']/g, char => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }
      return escapeMap[char]
    })
  }
}
