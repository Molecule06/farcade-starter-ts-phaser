import React from 'react'
import { useDevSettings } from '../../hooks'
import { cn, tw } from '../../utils/tw'

interface SettingsPanelProps {
  isOpen: boolean
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen }) => {
  const { settings, updateSetting } = useDevSettings()

  const handleSettingChange = (key: keyof typeof settings) => {
    const newValue = !settings[key]
    updateSetting(key, newValue)
  }
  return (
    <div 
      className={cn(
        tw`
          absolute bottom-full right-0 mb-2
          bg-[#1f1f1f] border border-border-default
          rounded-lg p-3 min-w-[200px]
          opacity-0 translate-y-[10px] pointer-events-none
          transition-all duration-fast
          shadow-xl select-none z-[500]
        `,
        isOpen && tw`
          opacity-100 translate-y-0 pointer-events-auto
        `
      )}
      id="settings-panel" 
      role="region" 
      aria-label="Developer settings panel"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Background Pattern */}
      <div className={tw`
        flex items-center gap-2 py-1 text-sm
        font-mono
        [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-default
        [&:not(:last-child)]:mb-1 [&:not(:last-child)]:pb-2
      `}>
        <label className={tw`
          flex items-center gap-3 cursor-pointer
          p-1 w-full
        `}>
          <input 
            type="checkbox"
            className={tw`
              appearance-none w-9 h-5 bg-[#333] border-2 border-[#555]
              rounded-xl cursor-pointer relative m-0
              transition-all duration-fast flex-shrink-0
              checked:bg-status-green checked:border-status-green
              disabled:opacity-50 disabled:cursor-not-allowed disabled:border-[#333]
              after:content-[''] after:absolute after:top-[2px] after:left-[2px]
              after:w-3 after:h-3 after:bg-white after:rounded-full
              after:transition-all after:duration-fast
              after:shadow-[0_2px_4px_rgba(0,0,0,0.2)]
              checked:after:translate-x-4 checked:after:bg-black
              disabled:after:opacity-50
            `}
            checked={settings.backgroundPattern}
            onChange={() => handleSettingChange('backgroundPattern')}
            aria-label="Toggle background pattern"
          />
          <span className={tw`
            text-text-primary text-[13px] font-medium flex-1 text-left
            [input:disabled+&]:opacity-50 [input:disabled+&]:text-[#888]
          `}>Background Pattern</span>
        </label>
      </div>
      
      {/* Canvas Scaling */}
      <div className={tw`
        flex items-center gap-2 py-1 text-sm
        font-mono
        [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-default
        [&:not(:last-child)]:mb-1 [&:not(:last-child)]:pb-2
      `}>
        <label className={tw`
          flex items-center gap-3 cursor-pointer
          p-1 w-full
        `}>
          <input 
            type="checkbox"
            className={tw`
              appearance-none w-9 h-5 bg-[#333] border-2 border-[#555]
              rounded-xl cursor-pointer relative m-0
              transition-all duration-fast flex-shrink-0
              checked:bg-status-green checked:border-status-green
              disabled:opacity-50 disabled:cursor-not-allowed disabled:border-[#333]
              after:content-[''] after:absolute after:top-[2px] after:left-[2px]
              after:w-3 after:h-3 after:bg-white after:rounded-full
              after:transition-all after:duration-fast
              after:shadow-[0_2px_4px_rgba(0,0,0,0.2)]
              checked:after:translate-x-4 checked:after:bg-black
              disabled:after:opacity-50
            `}
            checked={settings.fullSize}
            onChange={() => handleSettingChange('fullSize')}
            aria-label="Toggle canvas scaling"
          />
          <span className={tw`
            text-text-primary text-[13px] font-medium flex-1 text-left
            [input:disabled+&]:opacity-50 [input:disabled+&]:text-[#888]
          `}>Canvas Scaling</span>
        </label>
      </div>
      
    </div>
  )
}
