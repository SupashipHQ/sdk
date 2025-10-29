import { SupaPlugin, SupaPluginConfig } from './types'
import { FeatureContext, FeatureValue } from '../types'

export interface SupaToolbarPosition {
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  offset?: { x: string; y: string }
}

export type SupaToolbarOverrideChange = {
  feature: string
  value: FeatureValue
}

export type SupaToolbarOverrideChangeCallback = (
  featureOverride: SupaToolbarOverrideChange,
  allOverrides: Record<string, FeatureValue>
) => void

export interface SupaToolbarPluginConfig extends Omit<SupaPluginConfig, 'enabled'> {
  enabled?: boolean | 'auto' // auto means show only on localhost
  position?: SupaToolbarPosition
  onOverrideChange?: SupaToolbarOverrideChangeCallback
}

interface SupaToolbarState {
  overrides: Record<string, FeatureValue>
  features: Set<string>
  featureValues: Record<string, FeatureValue>
  context?: FeatureContext
  searchQuery: string
  useLocalOverrides: boolean
}

const DEFAULT_STORAGE_KEY = 'supaship-feature-overrides'

const NO_FEATURES_MESSAGE = `No feature flags configured in the client.`

/**
 * Toolbar plugin for local feature flag testing
 * Provides a visual interface to override feature flags during development
 */
export class SupaToolbarPlugin implements SupaPlugin {
  name = 'toolbar-plugin'
  private config: {
    enabled: boolean | 'auto'
    position: Required<SupaToolbarPosition>
    onOverrideChange?: SupaToolbarOverrideChangeCallback
  }
  private state: SupaToolbarState
  private clientId?: string
  private storageKey: string = DEFAULT_STORAGE_KEY

  constructor(config: SupaToolbarPluginConfig = {}) {
    this.config = {
      enabled: config.enabled ?? 'auto',
      position: {
        placement: config.position?.placement ?? 'bottom-right',
        offset: config.position?.offset ?? { x: '1rem', y: '1rem' },
      },
      onOverrideChange: config.onOverrideChange,
    }

    this.state = {
      overrides: {},
      features: new Set(),
      featureValues: {},
      searchQuery: '',
      useLocalOverrides: true,
    }
  }

  cleanup(): void {
    this.removeToolbar()
  }

  private shouldShowToolbar(): boolean {
    if (this.config.enabled === true) return true
    if (this.config.enabled === false) return false

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

  onInit(params: {
    availableFeatures: Record<string, FeatureValue>
    context?: FeatureContext
    clientId: string
  }): void {
    const { availableFeatures, context, clientId } = params

    // Set client ID for DOM element IDs
    this.clientId = clientId

    // Use shared storage key (not client-specific) to persist across refreshes
    this.storageKey = DEFAULT_STORAGE_KEY

    // Load overrides from shared storage
    this.state.overrides = this.loadOverrides()

    // Initialize with all available features and their fallback values from config
    this.state.features = new Set(Object.keys(availableFeatures))
    this.state.featureValues = { ...availableFeatures }
    this.state.context = context

    // Inject toolbar if conditions are met
    if (this.shouldShowToolbar()) {
      this.injectToolbar()
    }

    // Update toolbar UI if it exists
    this.updateToolbarUI()
  }

  async beforeGetFeatures(_featureNames: string[], context?: FeatureContext): Promise<void> {
    // Update context if it changed
    this.state.context = context

    // Load overrides from shared storage
    this.state.overrides = this.loadOverrides()

    // Update toolbar UI if it exists
    this.updateToolbarUI()
  }

  async afterGetFeatures(
    results: Record<string, FeatureValue>,
    context?: FeatureContext
  ): Promise<void> {
    // Update feature values with fetched results (this replaces config fallback values)
    Object.keys(results).forEach(name => {
      this.state.featureValues[name] = results[name]
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
      const stored = window.localStorage.getItem(this.storageKey)
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
      window.localStorage.setItem(this.storageKey, JSON.stringify(allOverrides))
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

    // Check if toolbar with this client ID already exists
    const toolbarId = `supaship-toolbar-${this.clientId}`
    if (document.getElementById(toolbarId)) {
      return
    }

    // Create toolbar container
    const toolbar = document.createElement('div')
    toolbar.id = toolbarId
    toolbar.setAttribute('data-supaship-client', this.clientId || '')
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

    const toolbar = document.getElementById(`supaship-toolbar-${this.clientId}`)
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
    const toggleId = `supaship-toolbar-toggle-${this.clientId}`
    const panelId = `supaship-toolbar-panel-${this.clientId}`
    const searchId = `supaship-search-input-${this.clientId}`
    const clearId = `supaship-clear-all-${this.clientId}`
    const contentId = `supaship-toolbar-content-${this.clientId}`

    return `
      <div class="supaship-toolbar-container ${positionClass}" style="--offset-x: ${offsetX}; --offset-y: ${offsetY};">
        <button class="supaship-toolbar-toggle" id="${toggleId}" aria-label="Toggle feature flags">
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
        </button>
        <div class="supaship-toolbar-panel" id="${panelId}">
          <div class="supaship-toolbar-header">
            <input
              type="text"
              class="supaship-search-input"
              id="${searchId}"
              placeholder="Search features"
            />
            <button
              class="supaship-header-btn"
              id="${clearId}"
              aria-label="Reset all overrides"
              title="Reset all overrides to default"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="18" height="18">
                <path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="supaship-toolbar-content" id="${contentId}">
            <div class="supaship-toolbar-empty">${NO_FEATURES_MESSAGE}</div>
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
        width: 36px;
        height: 36px;
        border-radius: 100%;
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

      .supaship-toolbar-panel {
        position: absolute;
        bottom: 48px;
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
        gap: 12px;
        padding: 12px;
        border-bottom: 1px solid #333;
        background: #0f0f0f;
      }

      .supaship-search-input {
        flex: 1;
        background: transparent;
        border: none;
        color: #e5e5e5;
        padding: 0;
        font-size: 13px;
        outline: none;
      }

      .supaship-search-input::placeholder {
        color: #888;
      }

      .supaship-header-btn {
        background: transparent;
        border: none;
        color: #e5e5e5;
        width: 24px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0;
      }

      .supaship-header-btn:hover {
        color: #ef4444;
      }

      .supaship-toolbar-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        min-height: 200px;
      }

      .supaship-toolbar-empty {
        padding: 32px 16px;
        text-align: center;
        color: #888;
      }

      .supaship-feature-item {
        padding: 0 6px;
      }

      .supaship-feature-item.disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      .supaship-feature-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 32px;
      }

      .supaship-feature-name {
        font-weight: 500;
        color: #e5e5e5;
        font-size: 13px;
        flex: 1;
        min-width: 0;
      }

      .supaship-feature-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        min-height: 20px;
      }

      .supaship-feature-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
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
        resize: vertical;
        min-height: 60px;
        margin-bottom: 8px;
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
        background: #444;
        color: white;
      }

      .supaship-btn-primary:hover {
        background: #555;
      }

      .supaship-btn-secondary {
        background: #444;
        color: #e5e5e5;
      }

      .supaship-btn-secondary:hover {
        background: #555;
      }

      .supaship-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .supaship-btn:disabled:hover {
        background: #444;
      }

      .supaship-header-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .supaship-header-btn:disabled:hover {
        color: #e5e5e5;
      }

      .supaship-toggle {
        position: relative;
        display: inline-block;
        width: 32px;
        height: 18px;
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
        background-color: #333;
        border: 1px solid #555;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 20px;
      }

      .supaship-toggle-slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 2px;
        bottom: 1px;
        background-color: #666;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .supaship-toggle input:checked + .supaship-toggle-slider {
        background-color: #fff;
        border-color: #fff;
      }

      .supaship-toggle input:checked + .supaship-toggle-slider:before {
        transform: translateX(13px);
        background-color: #000;
      }

      .supaship-toggle input:disabled + .supaship-toggle-slider {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .supaship-toggle:hover .supaship-toggle-slider:before {
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      }

      .supaship-btn-icon {
        background: transparent;
        border: none;
        color: #e5e5e5;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        cursor: pointer;
        padding: 0;
        transition: all 0.2s;
        flex-shrink: 0;
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

    const toggleId = `supaship-toolbar-toggle-${this.clientId}`
    const panelId = `supaship-toolbar-panel-${this.clientId}`
    const clearId = `supaship-clear-all-${this.clientId}`
    const searchId = `supaship-search-input-${this.clientId}`
    const contentId = `supaship-toolbar-content-${this.clientId}`

    const toggle = document.getElementById(toggleId)
    const panel = document.getElementById(panelId)
    const clearAll = document.getElementById(clearId)
    const searchInput = document.getElementById(searchId) as HTMLInputElement
    const content = document.getElementById(contentId)

    toggle?.addEventListener('click', () => {
      panel?.classList.toggle('open')
    })

    clearAll?.addEventListener('click', () => {
      this.clearAllOverrides()
    })

    searchInput?.addEventListener('input', e => {
      this.state.searchQuery = (e.target as HTMLInputElement).value.toLowerCase()
      this.updateToolbarUI()
    })

    // Use event delegation on content element - survives innerHTML updates
    if (content) {
      // Handle button clicks (remove and set actions)
      content.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement
        const buttonElement = target.closest('button[data-action]') as HTMLButtonElement
        if (!buttonElement) return

        e.preventDefault()
        e.stopPropagation()

        const featureName = buttonElement.dataset.feature!
        const action = buttonElement.dataset.action

        if (action === 'remove') {
          this.removeOverride(featureName)
        } else if (action === 'set') {
          const textarea = content.querySelector(
            `textarea[data-feature="${featureName}"]`
          ) as HTMLTextAreaElement
          if (textarea && textarea.value.trim()) {
            try {
              const value = JSON.parse(textarea.value)
              this.setOverride(featureName, value)
            } catch {
              // If not valid JSON, wrap string in object
              this.setOverride(featureName, { value: textarea.value })
            }
          }
        }
      })

      // Handle checkbox changes for boolean toggles
      content.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement
        if (target.type === 'checkbox' && target.dataset.type === 'boolean') {
          const featureName = target.dataset.feature!
          const newValue = target.checked
          this.setOverride(featureName, newValue)
        }
      })

      // Handle textarea input to update button states
      content.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLTextAreaElement
        if (target.tagName === 'TEXTAREA' && target.dataset.feature) {
          const featureName = target.dataset.feature!
          const originalValue = target.dataset.original || ''
          const overrideBtn = content.querySelector(
            `button[data-action="set"][data-feature="${featureName}"]`
          ) as HTMLButtonElement

          if (overrideBtn) {
            const hasChanged = target.value !== originalValue
            const hasContent = target.value.trim().length > 0
            overrideBtn.disabled = !hasChanged || !hasContent
          }
        }
      })

      // Handle textarea paste events
      content.addEventListener('paste', (e: Event) => {
        const target = e.target as HTMLTextAreaElement
        if (target.tagName === 'TEXTAREA' && target.dataset.feature) {
          setTimeout(() => {
            const featureName = target.dataset.feature!
            const originalValue = target.dataset.original || ''
            const overrideBtn = content.querySelector(
              `button[data-action="set"][data-feature="${featureName}"]`
            ) as HTMLButtonElement

            if (overrideBtn) {
              const hasChanged = target.value !== originalValue
              const hasContent = target.value.trim().length > 0
              overrideBtn.disabled = !hasChanged || !hasContent
            }
          }, 0)
        }
      })

      // Handle Ctrl/Cmd+Enter to set override
      content.addEventListener('keydown', (e: KeyboardEvent) => {
        const target = e.target as HTMLTextAreaElement
        if (
          target.tagName === 'TEXTAREA' &&
          target.dataset.feature &&
          (e.ctrlKey || e.metaKey) &&
          e.key === 'Enter'
        ) {
          e.preventDefault()
          const featureName = target.dataset.feature!
          const overrideBtn = content.querySelector(
            `button[data-action="set"][data-feature="${featureName}"]`
          ) as HTMLButtonElement

          if (overrideBtn && !overrideBtn.disabled) {
            overrideBtn.click()
          }
        }
      })
    }
  }

  private updateToolbarUI(): void {
    if (typeof document === 'undefined') {
      return
    }

    const contentId = `supaship-toolbar-content-${this.clientId}`
    const clearId = `supaship-clear-all-${this.clientId}`

    const content = document.getElementById(contentId)
    const clearAllBtn = document.getElementById(clearId) as HTMLButtonElement

    if (!content) {
      console.warn('[Toolbar] Content element not found:', contentId)
      return
    }

    // Update clear all button state
    const hasOverrides = Object.keys(this.state.overrides).length > 0
    if (clearAllBtn) {
      clearAllBtn.disabled = !hasOverrides
    }

    const features = Array.from(this.state.features).sort()

    // Filter features based on search query
    const filteredFeatures = features.filter(name =>
      name.toLowerCase().includes(this.state.searchQuery)
    )

    if (filteredFeatures.length === 0) {
      content.innerHTML = this.state.searchQuery
        ? '<div class="supaship-toolbar-empty">No matching features found</div>'
        : `<div class="supaship-toolbar-empty">${NO_FEATURES_MESSAGE}</div>`
      return
    }

    const htmlContent = filteredFeatures
      .map(featureName => {
        const hasOverride = featureName in this.state.overrides
        const currentValue = this.state.featureValues[featureName]
        const overrideValue = hasOverride ? this.state.overrides[featureName] : currentValue
        const isDisabled = !this.state.useLocalOverrides
        const itemClass = `supaship-feature-item ${isDisabled ? 'disabled' : ''}`

        // Check if the feature is boolean
        const isBoolean =
          typeof currentValue === 'boolean' || (hasOverride && typeof overrideValue === 'boolean')

        if (isBoolean) {
          // Render toggle switch for boolean values (single row layout)
          const isChecked = hasOverride ? overrideValue === true : currentValue === true
          return `
          <div class="${itemClass}">
            <div class="supaship-feature-row">
              <span class="supaship-feature-name">${this.escapeHtml(featureName)}</span>
              <div class="supaship-feature-actions">
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
                      <path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z" fill="currentColor"/>
                    </svg>
                  </button>
                `
                    : ''
                }
                <label class="supaship-toggle">
                  <input
                    type="checkbox"
                    ${isChecked ? 'checked' : ''}
                    data-feature="${this.escapeHtml(featureName)}"
                    data-type="boolean"
                  />
                  <span class="supaship-toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        `
        } else {
          // Render textarea for non-boolean values
          const currentDisplayValue = hasOverride
            ? JSON.stringify(overrideValue)
            : currentValue !== undefined
              ? JSON.stringify(currentValue)
              : ''
          const escapedFeatureName = this.escapeHtml(featureName)
          const escapedCurrentDisplayValue = this.escapeHtml(currentDisplayValue)
          const escapedTextareaContent = hasOverride
            ? this.escapeHtml(JSON.stringify(overrideValue))
            : escapedCurrentDisplayValue

          return `
          <div class="${itemClass}">
            <div class="supaship-feature-row">
              <span class="supaship-feature-name">${escapedFeatureName}</span>
              <div class="supaship-feature-actions">
                ${
                  hasOverride
                    ? `
                    <button
                      class="supaship-btn-icon"
                      data-feature="${escapedFeatureName}"
                      data-action="remove"
                      title="Reset to default"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="14" height="14">
                        <path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z" fill="currentColor"/>
                      </svg>
                    </button>
                  `
                    : ''
                }
                <button
                  class="supaship-btn supaship-btn-primary"
                  data-feature="${escapedFeatureName}"
                  data-action="set"
                  disabled>
                  Override
                </button>
              </div>
            </div>
            <div class="supaship-feature-content">
              <textarea
                class="supaship-feature-input"
                placeholder="Override JSON value"
                data-feature="${escapedFeatureName}"
                data-original="${escapedCurrentDisplayValue}"
              >${escapedTextareaContent}</textarea>
            </div>
          </div>
        `
        }
      })
      .join('')

    requestAnimationFrame(() => {
      // Set innerHTML - event listeners are handled via delegation in attachEventListeners()
      content.innerHTML = htmlContent

      // Update button states for textareas that already have values
      content.querySelectorAll('textarea[data-feature]').forEach(textarea => {
        const textareaElement = textarea as HTMLTextAreaElement
        const featureName = textareaElement.dataset.feature!
        const originalValue = textareaElement.dataset.original || ''
        const overrideBtn = content.querySelector(
          `button[data-action="set"][data-feature="${featureName}"]`
        ) as HTMLButtonElement

        if (overrideBtn) {
          const hasChanged = textareaElement.value !== originalValue
          const hasContent = textareaElement.value.trim().length > 0
          overrideBtn.disabled = !hasChanged || !hasContent
        }
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
