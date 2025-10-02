import React, { useMemo } from 'react'
import { PerformanceData, PerformanceStats } from '../../types'
import { formatMemory } from '../../utils'
import { SparklineChart } from '../Common'
import { cn, tw } from '../../utils/tw'

interface PerformancePanelProps {
  show: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  data: PerformanceData[]
  stats: PerformanceStats
  tier: string
  isMonitoring: boolean
}

export const PerformancePanel: React.FC<PerformancePanelProps> = ({ 
  show,
  onMouseEnter,
  onMouseLeave,
  data,
  stats,
  tier,
  isMonitoring
}) => {
  if (!show || data.length === 0) {
    return null
  }

  const performance = { data, stats, tier, isMonitoring }

  const latestData = performance.data[performance.data.length - 1]
  
  // Memoize expensive data transformations for sparklines
  // Cap FPS at 60 for chart display (shows as line at top for values > 60)
  const fpsData = useMemo(() => performance.data.map(d => Math.min(d.fps, 60)), [performance.data])
  const frameTimeData = useMemo(() => performance.data.map(d => d.frameTime), [performance.data])
  const memoryData = useMemo(() => performance.data.map(d => d.memory?.used || 0), [performance.data])
  
  // Memoize jank frame count calculation
  const jankFrameCount = useMemo(() => performance.data.filter(d => d.isJank).length, [performance.data])

  return (
    <div 
      className={tw`
        absolute bottom-full left-1/2 transform -translate-x-1/2
        mb-2 bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 rounded-xl
        p-5 min-w-[300px] max-w-[340px]
        shadow-[0_12px_32px_rgba(0,0,0,0.5)]
        select-none z-[500] backdrop-blur-xl
        animate-fade-in
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* FPS Statistics */}
      <div className={tw`
        mb-4 pb-4
        [&:not(:last-child)]:border-b [&:not(:last-child)]:border-white/[0.08]
        last:mb-0 last:pb-0
      `}>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col">
            <div className="text-[10px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">current</div>
            <div className="text-xl font-black text-white font-mono leading-none">{String(performance.stats.current).replace(' fps', '')}</div>
            <div className="text-[10px] text-gray-500 font-medium">fps</div>
          </div>
          <div className="flex flex-col">
            <div className="text-[10px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">average</div>
            <div className="text-xl font-black text-white font-mono leading-none">{String(performance.stats.average).replace(' fps', '')}</div>
            <div className="text-[10px] text-gray-500 font-medium">fps</div>
          </div>
          <div className="flex flex-col">
            <div className="text-[10px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">range</div>
            <div className="text-sm font-bold text-gray-300 font-mono leading-tight">{String(performance.stats.min).replace(' fps', '')}-{String(performance.stats.max).replace(' fps', '')}</div>
            <div className="text-[10px] text-gray-500 font-medium">fps</div>
          </div>
        </div>
      </div>

      {/* Frame Time Analysis */}
      <div className={tw`
        mb-4 pb-4
        [&:not(:last-child)]:border-b [&:not(:last-child)]:border-white/[0.08]
        last:mb-0 last:pb-0
      `}>
        <div className="flex justify-between items-center mb-3">
          <h4 className={tw`
            m-0 text-[11px] font-bold text-gray-500
            uppercase tracking-wider
          `}>FRAME TIMING (MS)</h4>
          <div className="flex-shrink-0 border border-white/10 rounded-md bg-black/40 overflow-hidden">
            <SparklineChart 
              data={frameTimeData} 
              width={70} 
              height={24}
              color="#3b82f6"
              minValue={0}
              maxValue={33.33}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className={tw`
            flex justify-between items-center
            bg-black/20 rounded-lg px-3 py-2
            border border-white/5 hover:border-white/10 transition-colors
          `}>
            <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">frame time</span>
            <span className="font-bold text-sm text-white font-mono">
              {latestData?.frameTime?.toFixed(1) || '0.0'} <span className="text-[10px] text-gray-500">ms</span>
            </span>
          </div>
        </div>
      </div>

      {/* Memory Usage - Only show if memory data is actually available (not 0) */}
      {latestData?.memory && latestData.memory.total > 0 && (
        <div className={tw`
          mb-4 pb-4
          [&:not(:last-child)]:border-b [&:not(:last-child)]:border-white/[0.08]
          last:mb-0 last:pb-0
        `}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <h4 className={tw`
                m-0 text-[11px] font-bold text-gray-500
                uppercase tracking-wider
              `}>MEMORY</h4>
              {(() => {
                const usage = (latestData.memory.used / latestData.memory.total) * 100
                if (usage < 70) {
                  return <><div className="w-2 h-2 bg-green-400 rounded-full" /><span className="text-[10px] text-green-400">Low</span></>
                } else if (usage < 85) {
                  return <><div className="w-2 h-2 bg-yellow-400 rounded-full" /><span className="text-[10px] text-yellow-400">Medium</span></>
                } else {
                  return <><div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" /><span className="text-[10px] text-red-400">High</span></>
                }
              })()}
            </div>
            <div className="flex-shrink-0 border border-white/10 rounded-md bg-black/40 overflow-hidden">
              <SparklineChart 
                data={memoryData} 
                width={70} 
                height={24}
                color="#f59e0b"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className={tw`
              flex justify-between items-center
              bg-black/20 rounded-lg px-3 py-2
              border border-white/5 hover:border-white/10 transition-colors
            `}>
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">JS Heap</span>
              <div className="flex items-center gap-1">
                {/* Memory trend indicator with fixed width */}
                <div className="w-12 text-right mr-2">
                  {memoryData.length > 10 && (() => {
                    const recentMemory = memoryData.slice(-10)
                    const avgRecent = recentMemory.slice(-5).reduce((a, b) => a + b, 0) / 5
                    const avgPrevious = recentMemory.slice(0, 5).reduce((a, b) => a + b, 0) / 5
                    const trend = avgRecent - avgPrevious
                    const trendPercent = avgPrevious > 0 ? (trend / avgPrevious) * 100 : 0
                    
                    if (Math.abs(trendPercent) < 2) {
                      return <span className="text-[10px] text-gray-500">stable</span>
                    } else if (trendPercent > 0) {
                      return (
                        <span className={cn(
                          "text-[10px] font-semibold",
                          trendPercent > 10 ? "text-red-400" : trendPercent > 5 ? "text-yellow-400" : "text-gray-400"
                        )}>
                          ↑{trendPercent.toFixed(0)}%
                        </span>
                      )
                    } else {
                      return <span className="text-[10px] text-green-400 font-semibold">↓{Math.abs(trendPercent).toFixed(0)}%</span>
                    }
                  })()}
                </div>
                <span className="font-bold text-sm text-white font-mono">
                  {formatMemory(latestData.memory.used)}
                </span>
              </div>
            </div>
            <div className={tw`
              flex justify-between items-center
              bg-black/20 rounded-lg px-3 py-2
              border border-white/5 hover:border-white/10 transition-colors
            `}>
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Allocated</span>
              <span className="font-bold text-sm text-white font-mono">
                {formatMemory(latestData.memory.total)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Rendering Statistics */}
      {latestData?.rendering && (
        <div className={tw`
          mb-0.5 pb-3
          [&:not(:last-child)]:border-b [&:not(:last-child)]:border-white/5
          last:mb-0 last:pb-0
        `}>
          <div className="flex justify-between items-center mb-2.5">
            <h4 className={tw`
              m-0 text-xs font-semibold text-gray-400
              uppercase tracking-wide
            `}>Rendering</h4>
          </div>
          <div className="flex flex-col gap-1">
            <div className={tw`
              flex justify-between items-center text-xs
              font-mono text-gray-300 min-h-4 leading-[1.2]
            `}>
              <span className="text-gray-400 flex-1 text-left font-medium">Draw Calls</span>
              <span className="font-bold text-green-500 text-right min-w-10 mr-1">
                {latestData.rendering.drawCalls}
              </span>
            </div>
            <div className={tw`
              flex justify-between items-center text-xs
              font-mono text-gray-300 min-h-4 leading-[1.2]
            `}>
              <span className="text-gray-400 flex-1 text-left font-medium">Game Objects</span>
              <span className="font-bold text-green-500 text-right min-w-10 mr-1">
                {latestData.rendering.gameObjects}
              </span>
            </div>
            <div className={tw`
              flex justify-between items-center text-xs
              font-mono text-gray-300 min-h-4 leading-[1.2]
            `}>
              <span className="text-gray-400 flex-1 text-left font-medium">Physics Bodies</span>
              <span className="font-bold text-green-500 text-right min-w-10 mr-1">
                {latestData.rendering.physicsBodies}
              </span>
            </div>
            <div className={tw`
              flex justify-between items-center text-xs
              font-mono text-gray-300 min-h-4 leading-[1.2]
            `}>
              <span className="text-gray-400 flex-1 text-left font-medium">Active Tweens</span>
              <span className="font-bold text-green-500 text-right min-w-10 mr-1">
                {latestData.rendering.activeTweens}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Performance Quality */}
      <div className={tw`
        mb-4 pb-4 pt-2
        [&:not(:last-child)]:border-b [&:not(:last-child)]:border-white/[0.08]
        last:mb-0 last:pb-0 
      `}>

        <div className="grid grid-cols-2 gap-2">
          <div className={tw`
            flex flex-col items-center justify-between
            bg-black/20 rounded-lg px-3 py-3
            border border-white/5 hover:border-white/10 transition-colors
            min-h-[64px]
          `}>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Current Frame</span>
            <span className={cn(
              'font-bold text-base font-mono mt-2 mb-auto',
              latestData?.isJank ? 'text-red-400' : 'text-green-400'
            )}>
              {latestData?.isJank ? 'Jank' : 'Smooth'}
            </span>
          </div>
          <div className={tw`
            flex flex-col items-center justify-center
            bg-black/20 rounded-lg px-3 py-3
            border border-white/5 hover:border-white/10 transition-colors
            min-h-[64px]
          `}>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Jank Events</span>
            <span className={cn(
              'font-bold text-base font-mono mt-1',
              jankFrameCount > 10 ? 'text-red-400' : jankFrameCount > 5 ? 'text-yellow-400' : 'text-green-400'
            )}>
              {jankFrameCount}
            </span>
            <span className="text-[9px] text-gray-600 mt-0.5">last 60s</span>
          </div>
        </div>
      </div>
    </div>
  )
}


