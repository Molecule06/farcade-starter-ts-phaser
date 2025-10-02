import React from 'react'
import { PerformanceChart } from './PerformanceChart'
import { StatusLeft } from './StatusLeft'
import { StatusRight } from './StatusRight'
import { cn, tw } from '../../utils/tw'
import '../../styles/app.css'

export const StatusBar: React.FC = () => {
  return (
    <div className={tw`
      flex justify-between items-center
      px-4 py-3 min-h-[46px]
      bg-bg-secondary border-t border-border-default
      text-text-secondary text-sm
      relative z-[300]
    `}>
      <StatusLeft />
      
      <div className="mx-auto">
        <PerformanceChart />
      </div>
      
      <div className={tw`
        opacity-100 text-[13px] text-right
        flex items-center justify-end gap-2
      `}>
        <StatusRight />
      </div>
    </div>
  )
}