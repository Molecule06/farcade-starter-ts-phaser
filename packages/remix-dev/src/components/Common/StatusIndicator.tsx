import React from 'react'
import { cn, tw } from '../../utils/tw'

interface StatusIndicatorProps {
  status: boolean
  size?: 'mini' | 'normal'
  label?: string
  className?: string
}

const StatusIndicatorComponent: React.FC<StatusIndicatorProps> = ({ 
  status, 
  size = 'normal', 
  label,
  className = '' 
}) => {
  const lightClasses = cn(
    "rounded-full transition-all duration-300 flex-shrink-0",
    size === 'mini' ? "w-1.5 h-1.5" : "w-2 h-2",
    status 
      ? "bg-green-500" + (size === 'mini' ? " shadow-[0_0_2px_rgba(34,197,94,0.6)]" : " shadow-[0_0_4px_rgba(34,197,94,0.6)]")
      : "bg-red-500" + (size === 'mini' ? " shadow-[0_0_2px_rgba(239,68,68,0.6)]" : " shadow-[0_0_4px_rgba(239,68,68,0.6)]"),
    className
  )

  if (label) {
    return (
      <div className={cn(
        tw`
          flex items-center gap-2 py-1 text-sm font-mono
          [&:not(:last-child)]:border-b [&:not(:last-child)]:border-white/10
          [&:not(:last-child)]:mb-1 [&:not(:last-child)]:pb-2
        `,
        className
      )}>
        <div
          className={lightClasses}
          role="status"
          aria-label={`Status: ${status ? 'active' : 'inactive'} for ${label}`}
        />
        <span className="text-gray-300">{label}</span>
      </div>
    )
  }

  return (
    <div
      className={lightClasses}
      role="status"
      aria-label={`Status: ${status ? 'active' : 'inactive'}`}
    />
  )
}

export const StatusIndicator = React.memo(StatusIndicatorComponent)