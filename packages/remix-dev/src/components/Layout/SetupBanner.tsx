import React, { useState } from 'react'
import { tw } from '../../utils/tw'

interface SetupBannerProps {
  onClose?: () => void
  className?: string
}

export const SetupBanner: React.FC<SetupBannerProps> = ({ onClose, className }) => {
  const [isVisible, setIsVisible] = useState(true)

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) return null

  return (
    <div className={tw`
      absolute bottom-0 left-0 right-0 z-[100]
      bg-gradient-to-br from-amber-500 to-amber-600 text-black
      font-sans shadow-[0_-2px_8px_rgba(0,0,0,0.3)]
      animate-slide-up-banner
      ${className || ''}
    `}>
      <div className="flex items-center p-3 gap-3">
        <div className="text-2xl flex-shrink-0">
          ⚙️
        </div>
        <div className="flex-1 text-sm leading-[1.4]">
          <strong className="font-semibold">Setup Required:</strong> Configure your dashboard settings in{' '}
          <code className={tw`
            bg-black/20 px-1.5 py-0.5 rounded text-xs font-medium
            font-mono
          `}>
            .remix/config.json
          </code>
        </div>
        <button
          onClick={handleClose}
          className={tw`
            bg-black/10 border-0 rounded text-black cursor-pointer
            text-lg font-bold h-7 w-7 flex items-center justify-center
            transition-colors duration-200 flex-shrink-0
            hover:bg-black/20
          `}
          aria-label="Close setup banner"
        >
          ×
        </button>
      </div>
    </div>
  )
}