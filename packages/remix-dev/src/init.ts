/**
 * Core initialization for Remix games
 */

import { initializeSDKMock } from './mocks/RemixSDKMock'
import { initializeDevelopment } from './utils/RemixUtils'

export interface RemixConfig {
  multiplayer: boolean
  saveState?: boolean
}

/**
 * Initialize Remix framework for a Phaser game
 */
export async function initRemix(game: Phaser.Game, config: RemixConfig): Promise<void> {
  // Initialize SDK mock in development
  if (process.env.NODE_ENV !== 'production') {
    await initializeSDKMock()
  }

  // Expose game globally for performance plugin
  ;(window as any).game = game

  // Initialize Remix SDK
  initializeRemixSDK(game)

  // Initialize development features (only active in dev mode)
  if (process.env.NODE_ENV !== 'production') {
    initializeDevelopment()
  }
}

function initializeRemixSDK(game: Phaser.Game): void {
  if (!("FarcadeSDK" in window && window.FarcadeSDK)) {
    return
  }

  // Make the game canvas focusable
  game.canvas.setAttribute("tabindex", "-1")

  // Set mute/unmute handler
  window.FarcadeSDK.on("toggle_mute", (data: { isMuted: boolean }) => {
    game.sound.mute = data.isMuted
    // Send toggle_mute event back to parent to update SDK flag
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'remix_sdk_event',
        event: { type: 'toggle_mute', data: { isMuted: data.isMuted } }
      }, '*')
    }
  })

  // Setup play_again handler
  window.FarcadeSDK.on("play_again", () => {
    // Attempt to bring focus back to the game canvas
    try {
      game.canvas.focus()
    } catch (e) {
      // Could not programmatically focus game canvas
    }
  })
}

// Re-export for advanced usage
export { initializeSDKMock } from './mocks/RemixSDKMock'
export { initializeDevelopment } from './utils/RemixUtils'
