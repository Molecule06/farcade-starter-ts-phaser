import { useCallback, useEffect, useState } from 'react'
import { useDashboard } from '../contexts'
import { safeLocalStorage } from '../utils/safeLocalStorage'
import { isDevEnvironment } from '../utils/environment'

interface BuildData {
  code: string
  buildTime: number
  codeTimestamp: number
  savedAt: number
  fileSize: number
}

export function useBuildSystem() {
  const { state, dispatch } = useDashboard()
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now())
  const [lastBuildCodeTimestamp, setLastBuildCodeTimestamp] = useState(0)
  const [gameId] = useState('game-1') // In a real app, this would be dynamic

  const updateBuildStatus = useCallback((status: any) => {
    dispatch({
      type: 'BUILD_UPDATE_STATUS',
      payload: status
    })
  }, [dispatch])

  // Save build code to localStorage per-game
  const saveBuildCode = useCallback((code: string, buildTime: number, fileSize: number) => {
    try {
      const storage = safeLocalStorage()
      if (!storage) return
      const buildData: BuildData = {
        code,
        buildTime,
        codeTimestamp: lastUpdateTime,
        savedAt: Date.now(),
        fileSize
      }
      storage.setItem(`remix-build-${gameId}`, JSON.stringify(buildData))
      setLastBuildCodeTimestamp(lastUpdateTime)
    } catch (error) {
      console.warn('Failed to save build code to localStorage:', error)
    }
  }, [gameId, lastUpdateTime])

  // Load saved build code if game code hasn't changed
  const loadSavedBuildCode = useCallback((): boolean => {
    try {
      const storage = safeLocalStorage()
      if (!storage) return false
      const saved = storage.getItem(`remix-build-${gameId}`)
      if (!saved) return false

      const buildData: BuildData = JSON.parse(saved)

      // Check if the saved build matches the current code timestamp
      if (buildData.codeTimestamp === lastUpdateTime && buildData.code) {
        // Ensure we have a valid fileSize
        const fileSize = buildData.fileSize > 0 ? buildData.fileSize : new Blob([buildData.code]).size
        updateBuildStatus({
          output: buildData.code,
          fileSize: fileSize,
          lastBuildTime: buildData.savedAt,
          status: 'success'
        })
        setLastBuildCodeTimestamp(buildData.codeTimestamp)
        return true
      }
    } catch (error) {
      console.warn('Failed to load build code from localStorage:', error)
    }
    return false
  }, [gameId, lastUpdateTime, updateBuildStatus])

  // Check if build button should be disabled
  const canBuildCode = useCallback((): boolean => {
    const codeHasChanged = lastBuildCodeTimestamp !== lastUpdateTime
    const hasExistingBuild = state.build.output !== ''
    return codeHasChanged || !hasExistingBuild
  }, [lastBuildCodeTimestamp, lastUpdateTime, state.build.output])

  // Load saved build on mount
  useEffect(() => {
    loadSavedBuildCode()
  }, [loadSavedBuildCode])

  const startBuild = useCallback(async () => {
    updateBuildStatus({ status: 'building', isBuilding: true, output: '' })
    
    try {
      // Track build start time for minimum delay (like the working version)
      const buildStartTime = Date.now()
      
      // Call the REAL build API endpoint (same as working version)
      const response = await fetch('/.remix/api/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      // Ensure at least 1 second has passed for better UX (like working version)
      const elapsed = Date.now() - buildStartTime
      const minBuildTime = 1000 // 1 second minimum
      if (elapsed < minBuildTime) {
        await new Promise(resolve => setTimeout(resolve, minBuildTime - elapsed))
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Build failed')
      }
      
      // Save the actual HTML code to localStorage with proper fileSize
      const buildCode = result.code || 'Build completed'
      const fileSize = result.fileSize || new Blob([buildCode]).size
      saveBuildCode(buildCode, result.buildTime, fileSize)
      
      // Copy code to clipboard automatically (like working version)
      try {
        await copyToClipboard(buildCode)
      } catch (error) {
        console.warn('Failed to copy build code to clipboard:', error)
      }
      
      updateBuildStatus({
        status: 'success',
        isBuilding: false,
        output: buildCode, // This is the REAL HTML code from the build system
        fileSize: fileSize,
        lastBuildTime: Date.now()
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown build error'
      updateBuildStatus({
        status: 'error',
        isBuilding: false,
        output: errorMessage
      })
    }
  }, [updateBuildStatus])

  const generateQRCode = useCallback(async () => {
    try {
      const currentUrl = window.location.href;
      const url = new URL(currentUrl);
      
      let finalUrl = `${window.location.protocol}//${window.location.host}/dist/`;
      
      // If using localhost, try to get the actual IP
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        try {
          const response = await fetch('/.remix/api/local-ip');
          if (response.ok) {
            let ipUrl = await response.text();
            ipUrl = ipUrl.trim();
            
            // Validate we got an actual IP, not localhost
            if (ipUrl && !ipUrl.includes('localhost') && !ipUrl.includes('127.0.0.1')) {
              // Replace the port with current port if needed and add /dist/
              const ipUrlObj = new URL(ipUrl);
              ipUrlObj.port = url.port || '3000';
              ipUrlObj.pathname = '/dist/';
              finalUrl = ipUrlObj.toString();
            } else {
              console.warn('Could not resolve network IP for build QR code');
              finalUrl = ''; // Don't show QR for localhost
            }
          }
        } catch (error) {
          console.warn('Could not resolve network IP for build QR code:', error);
          finalUrl = ''; // Don't show QR for localhost
        }
      }
      
      updateBuildStatus({
        qrCodeUrl: finalUrl
      })
      
      return finalUrl || null
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      return null
    }
  }, [updateBuildStatus])

  const getBuildInfo = useCallback(async () => {
    try {
      // In development, skip build info API since it's not available
      if (isDevEnvironment()) {
        // Don't overwrite existing build info in development
        // The actual build process will set the correct values
        return
      }
      
      const response = await fetch('/.remix/build-info')
      if (response.ok) {
        const info = await response.json()
        updateBuildStatus({
          lastBuildTime: info.lastBuildTime || 0,
          fileSize: info.fileSize || 0
        })
      }
    } catch (error) {
      // Silently fail - build info is optional
    }
  }, [updateBuildStatus])

  // Load initial build info on mount
  useEffect(() => {
    getBuildInfo()
  }, [getBuildInfo])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
        document.body.removeChild(textArea)
        return true
      } catch (fallbackError) {
        document.body.removeChild(textArea)
        return false
      }
    }
  }, [])

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }, [])

  const formatTimeAgo = useCallback((timestamp: number): string => {
    if (!timestamp) return 'Never'
    
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    if (seconds > 0) return `${seconds}s ago`
    return 'Just now'
  }, [])

  return {
    buildState: state.build,
    startBuild,
    generateQRCode,
    copyToClipboard,
    formatFileSize,
    formatTimeAgo,
    isBuilding: state.build.isBuilding,
    canBuild: !state.build.isBuilding && canBuildCode(),
    saveBuildCode,
    loadSavedBuildCode
  }
}
