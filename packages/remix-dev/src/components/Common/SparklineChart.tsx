import React, { useRef, useEffect, useCallback } from 'react'

interface SparklineChartProps {
  data: number[]
  width: number
  height: number
  color: string
  className?: string
  minValue?: number
  maxValue?: number
}

const SparklineChartComponent: React.FC<SparklineChartProps> = ({ 
  data, 
  width, 
  height, 
  color, 
  className = "performance-sparkline",
  minValue,
  maxValue
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawSparkline = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    if (data.length < 2) return

    // Use provided min/max or calculate from data
    const min = minValue !== undefined ? minValue : Math.min(...data)
    const max = maxValue !== undefined ? maxValue : Math.max(...data)
    const range = max - min || 1

    // Draw line
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()

    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw fill area
    ctx.globalAlpha = 0.2
    ctx.fillStyle = color
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1

  }, [data, width, height, color, minValue, maxValue])

  useEffect(() => {
    drawSparkline()
  }, [drawSparkline])

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height}
      className={className}
    />
  )
}

export const SparklineChart = React.memo(SparklineChartComponent)