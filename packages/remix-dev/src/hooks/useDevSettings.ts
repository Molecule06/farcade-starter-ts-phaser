import { useCallback, useEffect } from 'react'
import { useDashboard } from '../contexts'
import { DevSettings } from '../types'
import { safeLocalStorage } from '../utils/safeLocalStorage'

// Dynamic storage key based on game name from package.json
const getStorageKey = async (): Promise<string> => {
  try {
    const response = await fetch('/package.json')
    if (response.ok) {
      const packageJson = await response.json()
      const gameName = packageJson.name || 'unknown-game'
      // Clean the name to be localStorage-safe
      const cleanName = gameName.replace(/[^a-zA-Z0-9-_]/g, '_')
      return `${cleanName}-dev-settings`
    }
  } catch (error) {
    console.warn('Failed to fetch game name, using fallback storage key')
  }
  return 'unknown-game-dev-settings'
}

let STORAGE_KEY = 'unknown-game-dev-settings' // Fallback

export function useDevSettings() {
  const { state, dispatch } = useDashboard()


  const getDefaultSettings = useCallback((): DevSettings => {
    return {
      backgroundPattern: true,
      fullSize: false
    }
  }, [])

  const loadSettings = useCallback((): DevSettings => {
    try {
      const storage = safeLocalStorage()
      if (!storage) return getDefaultSettings()
      const saved = storage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed === 'object' && parsed !== null && 'canvasGlow' in parsed) {
          delete parsed.canvasGlow
        }
        return { ...getDefaultSettings(), ...parsed }
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error)
    }
    return getDefaultSettings()
  }, [getDefaultSettings])

  const saveSettings = useCallback((settings: Partial<DevSettings>) => {
    try {
      const currentSettings = state.settings
      const newSettings = { ...currentSettings, ...settings }
      const { canvasGlow, ...cleanSettings } = newSettings as typeof newSettings & { canvasGlow?: unknown }
      const storage = safeLocalStorage()
      if (!storage) return
      storage.setItem(STORAGE_KEY, JSON.stringify(cleanSettings))
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error)
    }
  }, [state.settings])

  const updateSetting = useCallback(<K extends keyof DevSettings>(
    key: K, 
    value: DevSettings[K]
  ) => {
    const update = { [key]: value }
    
    dispatch({
      type: 'SETTINGS_UPDATE',
      payload: update
    })
    
    saveSettings(update)
    
    // Apply settings immediately
    applySettings({ ...state.settings, ...update })
  }, [dispatch, saveSettings, state.settings])

  const applyBackgroundPatternWithCrossfade = useCallback((enabled: boolean) => {
    const body = document.body
    const duration = 300 // 300ms crossfade
    
    if (enabled) {
      // Turning on: Add the class and trigger fade in
      if (!body.classList.contains('show-background-pattern')) {
        // Start with element visible but transparent
        body.classList.add('background-pattern-transitioning')
        body.classList.add('show-background-pattern')
        body.style.setProperty('--background-pattern-opacity', '0')
        
        // Force reflow to ensure initial state is applied
        body.offsetHeight
        
        // Start fade in
        requestAnimationFrame(() => {
          body.style.setProperty('--background-pattern-opacity', '0.08')
        })
        
        // Clean up transition class after animation
        setTimeout(() => {
          body.classList.remove('background-pattern-transitioning')
          body.style.setProperty('--background-pattern-opacity', '0.08')
        }, duration)
      }
    } else {
      // Turning off: Fade out then remove class
      if (body.classList.contains('show-background-pattern')) {
        body.classList.add('background-pattern-transitioning')
        body.style.setProperty('--background-pattern-opacity', '0.08')
        
        // Force reflow
        body.offsetHeight
        
        // Start fade out
        requestAnimationFrame(() => {
          body.style.setProperty('--background-pattern-opacity', '0')
        })
        
        // Remove the class after fade out completes
        setTimeout(() => {
          body.classList.remove('show-background-pattern')
          body.classList.remove('background-pattern-transitioning')
          body.style.removeProperty('--background-pattern-opacity')
        }, duration)
      }
    }
  }, [])

  const applySettings = useCallback((settings: DevSettings) => {
    // Apply background pattern setting with crossfade transition
    applyBackgroundPatternWithCrossfade(settings.backgroundPattern)

    // Apply size setting to React UI state
    // fullSize=true means isMini=false (just like the original)
    dispatch({
      type: 'UI_SET_MINI_MODE',
      payload: !settings.fullSize
    })
  }, [dispatch, applyBackgroundPatternWithCrossfade])

  // Initialize storage key and load settings on mount
  useEffect(() => {
    const initializeSettings = async () => {
      STORAGE_KEY = await getStorageKey()
      const initialSettings = loadSettings()
      dispatch({
        type: 'SETTINGS_UPDATE',
        payload: initialSettings
      })
      applySettings(initialSettings)
    }
    initializeSettings()
  }, [loadSettings, applySettings, dispatch])

  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultSettings()
    dispatch({
      type: 'SETTINGS_UPDATE',
      payload: defaults
    })
    saveSettings(defaults)
    applySettings(defaults)
  }, [getDefaultSettings, dispatch, saveSettings, applySettings])

  return {
    settings: state.settings,
    updateSetting,
    resetToDefaults,
  }
}

// Extend window type for global access
declare global {
  interface Window {
    __remixDevOverlay?: {
      setSize(isMini: boolean): void
    }
  }
}
