import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useDashboard } from '../../contexts'
import { PerformanceData } from '../../types'
import { PerformancePanel } from '../Panels/PerformancePanel'
import { tw } from '../../utils/tw'

interface OptimisticDataPoint extends PerformanceData {
  isReal?: boolean
  isProjected?: boolean
  confidence?: number
}

interface TrendData {
  fpsTrend: number
  frameTimeTrend: number
}

export const PerformanceChart: React.FC = () => {
  const { state } = useDashboard()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [showDetailPanel, setShowDetailPanel] = useState(false)

  const calculateTrend = useCallback((recentData: PerformanceData[]): TrendData => {
    if (recentData.length < 2) {
      return { fpsTrend: 0, frameTimeTrend: 0 }
    }
    
    // Simple linear regression for trend
    const timeSpan = recentData[recentData.length - 1].timestamp - recentData[0].timestamp
    if (timeSpan === 0) {
      return { fpsTrend: 0, frameTimeTrend: 0 }
    }
    
    const fpsChange = recentData[recentData.length - 1].fps - recentData[0].fps
    const frameTimeChange = recentData[recentData.length - 1].frameTime - recentData[0].frameTime
    
    // Extrapolate trend per second, but dampen it to prevent wild swings
    const fpsTrend = (fpsChange / timeSpan) * 1000 * 0.3 // Dampen by 70%
    const frameTimeTrend = (frameTimeChange / timeSpan) * 1000 * 0.3
    
    return { fpsTrend, frameTimeTrend }
  }, [])

  // Memoize the expensive optimistic data calculation
  const optimisticData = useMemo((): OptimisticDataPoint[] => {
    const rawData = state.performance.data
    if (rawData.length === 0) return []
    
    const now = performance.now()
    const interval = 1000 // 1 second intervals
    
    // Start with all real data
    const optimisticData: OptimisticDataPoint[] = rawData.map(d => ({ ...d, isReal: true }))
    
    // Find the most recent real data point
    const latestRealData = rawData[rawData.length - 1]
    if (!latestRealData) return []
    
    // Calculate trend from recent data for projection
    const recentData = rawData.slice(-3) // Last 3 points for trend
    const trend = calculateTrend(recentData)
    
    // Always add a point at "now" to fill the gap to the right edge
    const timeSinceLatest = (now - latestRealData.timestamp) / 1000 // seconds
    if (timeSinceLatest > 0.5) { // Only if there's a meaningful gap
      const dampening = Math.max(0.3, 1 - (timeSinceLatest * 0.1))
      optimisticData.push({
        timestamp: now,
        fps: Math.max(15, Math.min(120, latestRealData.fps + (trend.fpsTrend * timeSinceLatest * dampening))),
        frameTime: Math.max(8, Math.min(67, latestRealData.frameTime + (trend.frameTimeTrend * timeSinceLatest * dampening))),
        isJank: false,
        isReal: false,
        isProjected: true,
        confidence: dampening
      })
    }
    
    // Add future optimistic data points
    const futureStartTime = latestRealData.timestamp + interval
    const futureEndTime = now + (10 * 1000) // Project 10 seconds into the future
    
    for (let timestamp = futureStartTime; timestamp <= futureEndTime; timestamp += interval) {
      const timeDelta = (timestamp - latestRealData.timestamp) / 1000 // seconds
      
      // Project future performance with trend dampening over time
      const dampening = Math.max(0.1, 1 - (timeDelta * 0.2)) // Reduce confidence over time
      
      optimisticData.push({
        timestamp: timestamp,
        fps: Math.max(15, Math.min(120, latestRealData.fps + (trend.fpsTrend * timeDelta * dampening))),
        frameTime: Math.max(8, Math.min(67, latestRealData.frameTime + (trend.frameTimeTrend * timeDelta * dampening))),
        isJank: false,
        isReal: false,
        isProjected: true,
        confidence: dampening
      })
    }
    
    return optimisticData
  }, [state.performance.data, calculateTrend])

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rawData = state.performance.data
    const width = canvas.width
    const height = canvas.height
    const leftMargin = 15 // Reserve space for scale text
    
    // Draw background first (always needed)
    ctx.fillStyle = 'rgba(26, 26, 26, 0.8)'
    ctx.fillRect(0, 0, width, height)

    if (rawData.length === 0) {
      // Show animated "Connecting..." message while waiting for data
      const time = performance.now()
      
      // Base text with gentle opacity pulse
      const baseOpacity = 0.5 + 0.2 * Math.sin(time * 0.004)
      ctx.fillStyle = `rgba(255, 255, 255, ${baseOpacity})`
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      
      // Draw "Connecting..." text
      ctx.fillText('Connecting...', width / 2, height / 2 + 2)
      
      // Add subtle progress indicator bar
      const progressWidth = 60
      const progressHeight = 2
      const progressX = (width - progressWidth) / 2
      const progressY = height / 2 + 15
      
      // Background bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.fillRect(progressX, progressY, progressWidth, progressHeight)
      
      // Animated progress
      const progress = (time * 0.002) % 2 // 2-second cycle
      const progressPos = progress < 1 ? progress : 2 - progress // Bounce back and forth
      const indicatorWidth = 20
      const indicatorX = progressX + (progressWidth - indicatorWidth) * progressPos
      
      ctx.fillStyle = 'rgba(34, 197, 94, 0.6)'
      ctx.fillRect(indicatorX, progressY, indicatorWidth, progressHeight)
      
      // Continue animation even without data
      animationRef.current = requestAnimationFrame(drawChart)
      return
    }

    // Use memoized optimistic data with future projections
    const data = optimisticData
    const chartWidth = width - leftMargin
    const maxFPS = 60 // Always cap at 60fps for consistent scale

    // Get current performance data
    const latestRealData = rawData[rawData.length - 1]
    const currentFPS = latestRealData ? latestRealData.fps : 60

    // Draw subtle grid lines (only in chart area)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.lineWidth = 1
    
    // Horizontal grid lines at 15, 30, 45fps
    const gridLines = [15, 30, 45]
    gridLines.forEach(fps => {
      const y = height - ((fps / maxFPS) * height)
      ctx.beginPath()
      ctx.moveTo(leftMargin, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    })

    // Draw FPS area chart with dynamic fill
    if (data.length > 1) {
      const now = performance.now()
      // Use a fixed time window that scrolls smoothly
      const timeWindow = 60 * 1000 // 60 seconds
      const maxTimestamp = now
      const minTimestamp = now - timeWindow
      const timeSpan = timeWindow
      
      // Filter data to only show points within the time window
      const visibleData = data.filter(d => d.timestamp >= minTimestamp && d.timestamp <= maxTimestamp)

      if (visibleData.length > 1) {
        // Ensure we have data points at the exact boundaries to prevent gaps
        const boundaryData = [...visibleData]
        
        // Add a point at the left boundary if needed
        if (boundaryData[0].timestamp > minTimestamp) {
          boundaryData.unshift({
            ...boundaryData[0],
            timestamp: minTimestamp,
            isReal: false
          })
        }
        
        // Add a point at the right boundary if needed
        if (boundaryData[boundaryData.length - 1].timestamp < maxTimestamp) {
          const lastPoint = boundaryData[boundaryData.length - 1]
          boundaryData.push({
            ...lastPoint,
            timestamp: maxTimestamp,
            isReal: false
          })
        }
        
        // Create path for filled area
        ctx.beginPath()
        
        // Start from bottom left of chart area
        ctx.moveTo(leftMargin, height)
        
        // Draw to first point
        const firstPoint = boundaryData[0]
        const firstDisplayFPS = Math.min(firstPoint.fps, maxFPS)
        const firstY = height - ((firstDisplayFPS / maxFPS) * height)
        ctx.lineTo(leftMargin, firstY)
      
        // Draw the performance line path
        boundaryData.forEach((point, index) => {
          const x = leftMargin + ((point.timestamp - minTimestamp) / timeSpan) * chartWidth
          const displayFPS = Math.min(point.fps, maxFPS)
          const y = height - ((displayFPS / maxFPS) * height)
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
      
        // Close the path at bottom right - always extend to full width
        ctx.lineTo(leftMargin + chartWidth, height)
        ctx.lineTo(leftMargin, height)
        ctx.closePath()
          
        // Create gradient based on overall performance
        const recentData = boundaryData.slice(-10)
        const avgFPS = recentData.length > 0 
          ? recentData.reduce((sum, p) => sum + p.fps, 0) / recentData.length
          : currentFPS
        let gradient = ctx.createLinearGradient(0, 0, 0, height)
        
        if (avgFPS >= 55) {
          // Good performance - green gradient
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)')
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)')
        } else if (avgFPS >= 30) {
          // OK performance - yellow/orange gradient
          gradient.addColorStop(0, 'rgba(234, 179, 8, 0.4)')
          gradient.addColorStop(1, 'rgba(234, 179, 8, 0.1)')
        } else {
          // Poor performance - red gradient
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)')
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)')
        }
        
        // Fill the area
        ctx.fillStyle = gradient
        ctx.fill()
        
        // Draw performance line
        ctx.beginPath()
        boundaryData.forEach((point, index) => {
          const x = leftMargin + ((point.timestamp - minTimestamp) / timeSpan) * chartWidth
          const displayFPS = Math.min(point.fps, maxFPS)
          const y = height - ((displayFPS / maxFPS) * height)
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        
        // Line color based on current FPS
        if (currentFPS >= 55) {
          ctx.strokeStyle = '#22c55e'
        } else if (currentFPS >= 30) {
          ctx.strokeStyle = '#eab308'
        } else {
          ctx.strokeStyle = '#ef4444'
        }
        
        ctx.lineWidth = 2
        ctx.stroke()
      }
      
      // Draw jank markers (frame spikes) - only for visible timeframe
      const jankEvents = rawData.filter(
        jankPoint => jankPoint.timestamp >= minTimestamp && jankPoint.timestamp <= maxTimestamp && jankPoint.isJank
      )
      jankEvents.forEach(jankPoint => {
        const x = leftMargin + ((jankPoint.timestamp - minTimestamp) / timeSpan) * chartWidth
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(x, 8, 2, 0, 2 * Math.PI)
        ctx.fill()
        
        // Add small exclamation mark
        ctx.fillStyle = '#ffffff'
        ctx.font = '8px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('!', x, 6)
      })
    }

    // Draw current FPS indicator and scale
    if (latestRealData) {
      const color = currentFPS >= 60 ? '#22c55e' : 
                   currentFPS >= 30 ? '#eab308' : '#ef4444'
      
      // Draw scale indicators first (left side) - now they have proper space
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.font = '8px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('60', 2, 10)
      ctx.fillText('30', 2, Math.round(height / 2) + 3)
      ctx.fillText('0', 2, height - 3)
      
      // Draw FPS badge in bottom right corner
      const fpsText = `${Math.round(currentFPS)}fps`
      ctx.font = '9px monospace'
      
      // Measure text for badge sizing
      const textMetrics = ctx.measureText(fpsText)
      const textWidth = textMetrics.width
      const textHeight = 9
      
      // Badge positioning and sizing
      const padding = 4
      const badgeWidth = textWidth + (padding * 2)
      const badgeHeight = textHeight + (padding * 2)
      const badgeX = width - badgeWidth - 2
      const badgeY = height - badgeHeight - 2
      const radius = 2
      
      // Draw badge background with rounded corners
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.beginPath()
      ctx.moveTo(badgeX + radius, badgeY)
      ctx.lineTo(badgeX + badgeWidth - radius, badgeY)
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + radius)
      ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - radius)
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - radius, badgeY + badgeHeight)
      ctx.lineTo(badgeX + radius, badgeY + badgeHeight)
      ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - radius)
      ctx.lineTo(badgeX, badgeY + radius)
      ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY)
      ctx.closePath()
      ctx.fill()
      
      // Draw border
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.stroke()
      
      // Draw text
      ctx.fillStyle = color
      ctx.fillText(fpsText, badgeX + padding, badgeY + padding + textHeight - 2)
    }

    // Continue animation
    animationRef.current = requestAnimationFrame(drawChart)
  }, [state.performance.data, optimisticData])

  useEffect(() => {
    drawChart()
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [drawChart])

  const handleMouseEnter = () => {
    setShowDetailPanel(true)
  }

  const handleMouseLeave = () => {
    setShowDetailPanel(false)
  }

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={200}
        height={50}
        className={tw`
          cursor-pointer rounded-sm transition-all duration-fast
          hover:opacity-80
          focus-visible:outline-2 focus-visible:outline-accent-green focus-visible:outline-offset-2
          border border-white/10
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      
      <PerformancePanel
        show={showDetailPanel}
        data={state.performance.data}
        stats={state.performance.stats}
        tier={state.performance.tier}
        isMonitoring={state.performance.isMonitoring}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  )
}