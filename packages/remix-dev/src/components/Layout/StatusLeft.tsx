import React from 'react'
import { useDashboard } from '../../contexts'
import { useUIState } from '../../hooks'
import { StatusIndicator } from '../Common'
import { cn, tw } from '../../utils/tw'
import '../../styles/app.css'

const StatusLeftComponent: React.FC = () => {
  const { state } = useDashboard()
  const { toggleStatusPanel, isStatusPanelOpen } = useUIState()

  return (
    <div className="relative flex items-center">
      <button
        className={tw`
          flex items-center gap-2 px-3 py-[6px]
          border border-border-default rounded-lg
          transition-all duration-fast
          select-none h-8 box-border
          cursor-pointer
          hover:bg-[rgba(255,255,255,0.05)]
        `}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          toggleStatusPanel()
        }}
        aria-label="Toggle SDK status panel"
        aria-expanded={isStatusPanelOpen}
        aria-controls="sdk-status-panel"
      >
        <div className={tw`
          grid grid-cols-2 gap-[3px] p-[1px]
          w-4 h-4
        `} aria-hidden="true">
          <StatusIndicator status={state.sdk.flags.ready} size="mini" />
          <StatusIndicator status={state.sdk.flags.gameOver} size="mini" />
          <StatusIndicator status={state.sdk.flags.playAgain} size="mini" />
          <StatusIndicator status={state.sdk.flags.toggleMute} size="mini" />
        </div>
        <span className="hidden md:inline text-sm font-medium">Remix SDK integration</span>
      </button>
      
      <div
        id="sdk-status-panel"
        className={cn(
          tw`
            absolute bottom-full left-0 mb-2
            bg-[#1f1f1f] border border-border-default
            rounded-lg p-3 min-w-[180px]
            shadow-xl z-[400]
            opacity-0 translate-y-[10px] pointer-events-none
            transition-all duration-fast
            select-none
          `,
          isStatusPanelOpen && tw`
            opacity-100 translate-y-0 pointer-events-auto
          `
        )}
        data-open={isStatusPanelOpen.toString()}
        role="region"
        aria-label="SDK integration status details"
      >
        <StatusIndicator status={state.sdk.flags.ready} label="ready" />
        <StatusIndicator status={state.sdk.flags.gameOver} label="game_over" />
        <StatusIndicator status={state.sdk.flags.playAgain} label="play_again" />
        <StatusIndicator status={state.sdk.flags.toggleMute} label="toggle_mute" />
      </div>
    </div>
  )
}

export const StatusLeft = React.memo(StatusLeftComponent)