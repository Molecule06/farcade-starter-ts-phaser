/**
 * Core initialization for Remix games
 */

export interface RemixConfig {
  multiplayer: boolean
  saveState?: boolean
}

/**
 * Initialize Remix framework for a Phaser game
 */
export async function initRemix(game: Phaser.Game, config: RemixConfig): Promise<void> {
  // Expose game globally for performance plugin
  ;(window as any).game = game

  // Initialize Remix SDK
  initializeRemixSDK(game)
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

