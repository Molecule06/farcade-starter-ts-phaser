import { useEffect, useRef, useCallback } from 'react'
import { useDashboard } from '../contexts'
import { PerformanceData, PerformanceStats } from '../types'

interface UsePerformanceMonitorOptions {
  iframe?: HTMLIFrameElement | null
  updateInterval?: number
  maxDataPoints?: number
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const { iframe, updateInterval = 1000, maxDataPoints = 60 } = options
  const { state, dispatch } = useDashboard()
  const rafId = useRef<number>()
  const lastFpsCalc = useRef<number>(0)
  const frameCount = useRef<number>(0)
  const lastUpdateTime = useRef<number>(0)

  const calculateStats = useCallback((data: PerformanceData[]): PerformanceStats => {
    if (data.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0 }
    }

    const fpsList = data.map(d => d.fps)
    const current = fpsList[fpsList.length - 1]
    const average = Math.round(fpsList.reduce((a, b) => a + b, 0) / fpsList.length)
    const min = Math.min(...fpsList)
    const max = Math.max(...fpsList)

    return { current, average, min, max }
  }, [])

  const addDataPoint = useCallback((newData: PerformanceData) => {
    // Use a functional dispatch pattern to access current state
    dispatch({
      type: 'PERFORMANCE_ADD_DATA_POINT',
      payload: { newData, maxDataPoints, calculateStats }
    })
  }, [maxDataPoints, calculateStats, dispatch])

  const isImageDataMostlyBlack = useCallback((imageData: ImageData): boolean => {
    const data = imageData.data
    let nonBlackPixels = 0
    const totalPixels = data.length / 4
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1] 
      const b = data[i + 2]
      
      if (r > 0 || g > 0 || b > 0) {
        nonBlackPixels++
      }
    }
    
    const nonBlackPercentage = nonBlackPixels / totalPixels
    return nonBlackPercentage < 0.001
  }, [])

  const handlePluginData = useCallback((data: any) => {
    // Always set tier to plugin when we receive plugin data
    dispatch({ type: 'PERFORMANCE_SET_TIER', payload: 'plugin' })
    
    // Filter out inaccurate initial readings from plugin
    if (data.fps && data.fps < 5) {
      return // Skip very low FPS readings that indicate initialization
    }
    
    const now = performance.now()
    const isJank = data.frameTime > 33.33 // >33ms is considered jank

    const performanceData: PerformanceData = {
      timestamp: now,
      fps: data.fps || 0,
      frameTime: data.frameTime || 0,
      updateTime: data.updateTime,
      renderTime: data.renderTime,
      memory: data.memory ? {
        used: data.memory.used || 0,
        total: data.memory.total || 0,
        textureMemory: data.memory.textureMemory
      } : undefined,
      rendering: data.rendering ? {
        drawCalls: data.rendering.drawCalls || 0,
        gameObjects: data.rendering.gameObjects || 0,
        physicsBodies: data.rendering.physicsBodies || 0,
        activeTweens: data.rendering.activeTweens || 0
      } : undefined,
      isJank
    }

    addDataPoint(performanceData)
  }, [addDataPoint, dispatch])

  const startIframeMonitoring = useCallback(() => {
    let lastTime = performance.now()
    let startTime = performance.now()
    frameCount.current = 0
    const warmupPeriod = 500 // 0.5 seconds warmup for faster connection

    const monitor = (currentTime: number) => {
      const deltaTime = currentTime - lastTime
      frameCount.current++

      // Only start collecting data after warmup period
      const isWarmedUp = (currentTime - startTime) >= warmupPeriod

      // Calculate FPS every second, but use shorter interval initially for faster feedback
      const currentUpdateInterval = isWarmedUp ? updateInterval : 250 // 250ms for initial quick feedback
      if (currentTime - lastFpsCalc.current >= currentUpdateInterval) {
        const fps = Math.round((frameCount.current * 1000) / (currentTime - lastFpsCalc.current))
        const isJank = deltaTime > 33.33

        // Only record data if we're warmed up and have reasonable FPS (>= 5 for faster connection)
        if (isWarmedUp && fps >= 5) {
          // Get memory info if available (Chrome only)
          let memory: PerformanceData['memory'] | undefined
          if ((performance as any).memory) {
            const mem = (performance as any).memory
            memory = {
              used: Math.round(mem.usedJSHeapSize / 1024 / 1024),
              total: Math.round(mem.totalJSHeapSize / 1024 / 1024)
            }
          }

          const performanceData: PerformanceData = {
            timestamp: currentTime,
            fps: Math.max(0, Math.min(fps, 120)),
            frameTime: deltaTime,
            memory,
            isJank
          }

          addDataPoint(performanceData)
        }

        frameCount.current = 0
        lastFpsCalc.current = currentTime
      }

      lastTime = currentTime

      if (state.performance.isMonitoring) {
        rafId.current = requestAnimationFrame(monitor)
      }
    }

    rafId.current = requestAnimationFrame(monitor)
  }, [updateInterval, addDataPoint, state.performance.isMonitoring])

  // Setup message listener for plugin data
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept performance data from any source (plugin or iframe)
      // The plugin sends directly from the game window which may not be the iframe contentWindow
      if (event.data?.type === 'remix_performance_data') {
        handlePluginData(event.data.data)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [iframe, handlePluginData])

  // Start monitoring when iframe is available
  useEffect(() => {
    if (!iframe || !state.performance.isMonitoring) return

    // Don't immediately set to iframe - wait to see if plugin connects
    // Give plugin time to connect, then start iframe monitoring if needed
    const timeoutId = setTimeout(() => {
      // Only set to iframe and start iframe monitoring if we haven't received plugin data yet
      if (state.performance.tier !== 'plugin') {
        dispatch({ type: 'PERFORMANCE_SET_TIER', payload: 'iframe' })
        startIframeMonitoring()
      }
    }, 500) // Wait 0.5 seconds for plugin to connect

    return () => {
      clearTimeout(timeoutId)
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [iframe, state.performance.isMonitoring, state.performance.tier, startIframeMonitoring, dispatch])

  const startMonitoring = useCallback(() => {
    dispatch({ type: 'PERFORMANCE_SET_MONITORING', payload: true })
    lastFpsCalc.current = performance.now()
  }, [dispatch])

  const stopMonitoring = useCallback(() => {
    dispatch({ type: 'PERFORMANCE_SET_MONITORING', payload: false })
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
      rafId.current = undefined
    }
  }, [dispatch])

  return {
    data: state.performance.data,
    stats: state.performance.stats,
    isMonitoring: state.performance.isMonitoring,
    tier: state.performance.tier,
    startMonitoring,
    stopMonitoring
  }
}