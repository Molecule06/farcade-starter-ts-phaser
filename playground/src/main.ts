import { initRemix } from "@insidethesim/remix-dev"
import { GameScene } from "./scenes/GameScene"
import GameSettings from "./config/GameSettings"

// Game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GameSettings.canvas.width,
  height: GameSettings.canvas.height,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: document.body,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GameSettings.canvas.width,
    height: GameSettings.canvas.height,
  },
  backgroundColor: "#1a1a1a",
  scene: [GameScene],
  physics: {
    default: "arcade",
  },
  fps: {
    target: 60,
  },
  pixelArt: false,
  antialias: true
}

// Create the game instance
const game = new Phaser.Game(config)

// Initialize Remix framework
game.events.once("ready", () => {
  initRemix(game, {
    multiplayer: false
  })
})
