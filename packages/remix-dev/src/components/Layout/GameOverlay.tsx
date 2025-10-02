import React from 'react'
import { useDashboard } from '../../contexts'
import { sendRemixCommand } from '../../utils'
import { tw } from '../../utils/tw'

interface GameOverlayProps {
  playerId?: string
}

export const GameOverlay: React.FC<GameOverlayProps> = ({ playerId }) => {
  const { state, dispatch } = useDashboard()

  const handlePlayAgain = () => {
    if (playerId) {
      // Multiplayer: send play_again command to BOTH iframes
      // This ensures both players restart together
      const player1Iframe = document.getElementById(`game-iframe-1`) as HTMLIFrameElement
      const player2Iframe = document.getElementById(`game-iframe-2`) as HTMLIFrameElement
      
      // Send play_again to both players
      if (player1Iframe?.contentWindow) {
        player1Iframe.contentWindow.postMessage({
          type: 'remix_dev_command',
          data: { command: 'play_again' }
        }, '*')
      }
      
      if (player2Iframe?.contentWindow) {
        player2Iframe.contentWindow.postMessage({
          type: 'remix_dev_command',
          data: { command: 'play_again' }
        }, '*')
      }
      
      // Add play_again events for BOTH players to dismiss both overlays
      dispatch({
        type: 'SDK_ADD_EVENT',
        payload: {
          type: 'play_again',
          data: {},
          playerId: '1',
          timestamp: Date.now()
        }
      })
      
      dispatch({
        type: 'SDK_ADD_EVENT',
        payload: {
          type: 'play_again',
          data: {},
          playerId: '2',
          timestamp: Date.now()
        }
      })
      
      // Reset game state for BOTH players (hide both overlays)
      dispatch({
        type: 'GAME_UPDATE',
        payload: { isGameOver: false, score: 0, playerId: '1' }
      })
      
      dispatch({
        type: 'GAME_UPDATE',
        payload: { isGameOver: false, score: 0, playerId: '2' }
      })
    } else {
      // Single player: use global command
      sendRemixCommand('play_again')
      
      // Communicate with game iframe if SDK mock is available
      if (window.__remixSDKMock) {
        window.__remixSDKMock.triggerPlayAgain()
      }
      
      // Update dashboard state for single player
      dispatch({
        type: 'SDK_ADD_EVENT',
        payload: {
          type: 'play_again',
          data: {},
          playerId: playerId,
          timestamp: Date.now()
        }
      })
      
      // Reset game state (hide overlay) for single player
      dispatch({
        type: 'GAME_UPDATE',
        payload: { isGameOver: false, score: 0, playerId: playerId }
      })
    }

    // Update SDK flags
    dispatch({
      type: 'SDK_UPDATE_FLAGS',
      payload: { playAgain: true }
    })
  }


  // Determine if game over should be shown
  let isGameOver: boolean
  let score: number
  
  if (playerId) {
    // Multiplayer: use event-based logic for specific player
    const playerEvents = state.sdk.events.filter(event => event.playerId === playerId)
    
    const latestGameOverEvent = playerEvents
      .filter(event => event.type === 'game_over' || event.type === 'multiplayer_game_over')
      .pop()
    
    const latestPlayAgainEvent = playerEvents
      .filter(event => event.type === 'play_again')
      .pop()
    
    isGameOver = latestGameOverEvent !== undefined && 
      (!latestPlayAgainEvent || latestGameOverEvent.timestamp > latestPlayAgainEvent.timestamp)
    
    // For multiplayer_game_over, scores is an array
    if (latestGameOverEvent?.type === 'multiplayer_game_over' && latestGameOverEvent?.data?.scores) {
      const playerScore = latestGameOverEvent.data.scores.find((s: any) => s.playerId === playerId)
      score = playerScore?.score || 0
    } else {
      score = latestGameOverEvent?.data?.score || latestGameOverEvent?.data?.finalScore || 0
    }
  } else {
    // Single player: use simple game state logic (original behavior)
    isGameOver = state.game.isGameOver
    score = state.game.score || 0
  }

  if (!isGameOver) {
    return null
  }

  return (
    <div
      className={tw`
        absolute inset-0 flex flex-col items-center justify-center
        bg-black/50 backdrop-blur-sm opacity-100 pointer-events-auto
        transition-opacity duration-200 z-[3]
      `}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="overlay-title"
    >
      <div className={tw`
        text-center relative flex-grow flex flex-col
        justify-center w-full
      `}>
        <div className={tw`
          text-white font-extrabold uppercase mb-3 leading-none
          tracking-tight text-[clamp(48px,18cqw,144px)]
        `}>
          {score}
        </div>
        <div 
          id="overlay-title"
          className={tw`
            text-white font-semibold uppercase leading-none
            tracking-tight text-[clamp(24px,9cqw,56px)]
          `}
        >
          GAME OVER
        </div>
      </div>
      <div className={tw`
        flex flex-col justify-end mt-4 p-6 w-full
      `}>
        <button 
          onClick={handlePlayAgain}
          className={tw`
            flex items-center justify-center gap-2 bg-[#b7ff00] text-black
            border-0 rounded-md px-4 py-3 mx-4 h-[42px] text-sm font-semibold
            cursor-pointer transition-all duration-200 outline-none
            select-none hover:bg-[#a7f200] active:bg-[#95df00]
            focus-visible:ring-[3px] focus-visible:ring-[#b7ff00]/50
          `}
        >
          <svg
            className="w-4 h-4 flex-shrink-0 fill-current"
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 61.09 67.69" 
            fill="currentColor"
          >
            <path d="M56.43,41.91l-42.46,24.51c-6.21,3.59-13.97-.9-13.97-8.07V9.33C0,2.16,7.76-2.32,13.97,1.26l42.46,24.51c6.21,3.59,6.21,12.55,0,16.13Z" />
          </svg>
          <span>Play Again</span>
        </button>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    __remixSDKMock?: {
      triggerPlayAgain(): void
    }
  }
}