import GameSettings from "../config/GameSettings"

// Declare the FarcadeSDK type on window
declare global {
  interface Window {
    FarcadeSDK: any
    debugLogs: string[]
  }
}


interface Ball {
  sprite: Phaser.GameObjects.Arc
  velocityX: number
  velocityY: number
  radius: number
  isPopped: boolean
}

export class DemoScene extends Phaser.Scene {
  private balls: Ball[] = []
  private clickCount: number = 0
  private clickText?: Phaser.GameObjects.Text
  private gameOver: boolean = false
  private elementsCreated: boolean = false
  
  // Color selection state
  private selectedColor: 'green' | 'blue' | 'red' = 'green'
  private colorSwatches: Phaser.GameObjects.Container | undefined
  private colorValues = {
    green: 0x33ff00,
    blue: 0x0099ff,
    red: 0xff3333
  }
  
  // Multiplayer support
  private isMultiplayer: boolean = false
  private players: Array<{id: string, name: string, imageUrl?: string}> = []
  private meId: string = '1'
  private otherPlayerClicks: number = 0
  private allClickCounts: {[key: string]: number} = {}

  constructor() {
    super({ key: "DemoScene" })
  }

  preload(): void {
  }

  create(): void {
    // Initialize SDK first and wait for it to be ready before creating game elements
    this.initializeSDK()
  }

  private createGameElements(): void {
    // Prevent double creation
    if (this.elementsCreated) {
      return
    }
    this.elementsCreated = true
    
    // Add instructional text
    const title = this.add.text(GameSettings.canvas.width / 2, GameSettings.canvas.height / 2 - 100, 'Remix SDK Demo', {
      fontSize: '64px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(100)

    const instruction = this.add.text(GameSettings.canvas.width / 2, GameSettings.canvas.height / 2 - 20, 'Pop 3 balls to trigger Game Over!', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5).setDepth(100)

    // Add click counter text (left-aligned)
    this.clickText = this.add.text(50, 50, 'Score: 0/3', {
      fontSize: '36px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0, 0.5).setDepth(100)

    // Create color swatch selector in top right
    this.createColorSwatches()
    
    // Update UI to reflect loaded state
    if (this.clickText && this.clickCount > 0) {
      this.clickText.setText(`Score: ${this.clickCount}/3`)
    }

    // Add removal instructions at bottom
    const removeInstructions = this.add.text(
      GameSettings.canvas.width / 2,
      GameSettings.canvas.height - 60,
      'To remove this demo, ask your AI:\n"Remove the demo and create a minimal GameScene"',
      {
        fontSize: '24px',
        color: '#cccccc',
        fontFamily: 'Arial',
        align: 'center',
        wordWrap: { width: GameSettings.canvas.width - 40 }
      }
    ).setOrigin(0.5).setDepth(100)

    // Create bouncing balls
    this.createBalls(15)

    // Don't save state immediately - wait for SDK to be ready
    // The state will be saved after SDK initialization

    // Remove global click listener - clicks will be handled per ball
  }

  private createBalls(count: number): void {
    for (let i = 0; i < count; i++) {
      const radius = Phaser.Math.Between(25, 60)
      const x = Phaser.Math.Between(radius, GameSettings.canvas.width - radius)
      const y = Phaser.Math.Between(radius, GameSettings.canvas.height - radius)
      
      // Use selected color
      const color = this.colorValues[this.selectedColor]
      const ball = this.add.circle(x, y, radius, color)
      ball.setStrokeStyle(2, 0x000000)
      ball.setInteractive()
      
      
      const ballData: Ball = {
        sprite: ball,
        velocityX: Phaser.Math.Between(-300, 300),
        velocityY: Phaser.Math.Between(-300, 300),
        radius: radius,
        isPopped: false
      }
      
      // Add click handler to this specific ball
      ball.on('pointerdown', () => {
        if (!this.gameOver && !ballData.isPopped) {
          this.popBall(ballData)
        }
      })
      
      this.balls.push(ballData)
    }
  }


  update(_time: number, deltaTime: number): void {
    const dt = deltaTime / 1000


    this.balls.forEach(ball => {
      if (!ball.isPopped) {
        // Update position
        ball.sprite.x += ball.velocityX * dt
        ball.sprite.y += ball.velocityY * dt

        // Bounce off edges
        if (ball.sprite.x - ball.radius <= 0 || ball.sprite.x + ball.radius >= GameSettings.canvas.width) {
          ball.velocityX *= -1
          ball.sprite.x = Phaser.Math.Clamp(ball.sprite.x, ball.radius, GameSettings.canvas.width - ball.radius)
        }
        
        if (ball.sprite.y - ball.radius <= 0 || ball.sprite.y + ball.radius >= GameSettings.canvas.height) {
          ball.velocityY *= -1
          ball.sprite.y = Phaser.Math.Clamp(ball.sprite.y, ball.radius, GameSettings.canvas.height - ball.radius)
        }
      }
    })

    // Check ball-to-ball collisions
    this.checkBallCollisions()
  }

  private checkBallCollisions(): void {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const ball1 = this.balls[i]
        const ball2 = this.balls[j]
        
        // Skip popped balls
        if (ball1.isPopped || ball2.isPopped) continue
        
        const dx = ball2.sprite.x - ball1.sprite.x
        const dy = ball2.sprite.y - ball1.sprite.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const minDistance = ball1.radius + ball2.radius
        
        if (distance < minDistance) {
          // Collision detected - separate balls
          const overlap = minDistance - distance
          const separationX = (dx / distance) * (overlap / 2)
          const separationY = (dy / distance) * (overlap / 2)
          
          ball1.sprite.x -= separationX
          ball1.sprite.y -= separationY
          ball2.sprite.x += separationX
          ball2.sprite.y += separationY
          
          // Calculate collision response
          const angle = Math.atan2(dy, dx)
          const sin = Math.sin(angle)
          const cos = Math.cos(angle)
          
          // Rotate velocities to collision normal
          const vx1 = ball1.velocityX * cos + ball1.velocityY * sin
          const vy1 = ball1.velocityY * cos - ball1.velocityX * sin
          const vx2 = ball2.velocityX * cos + ball2.velocityY * sin
          const vy2 = ball2.velocityY * cos - ball2.velocityX * sin
          
          // Apply conservation of momentum (assuming equal mass)
          const newVx1 = vx2
          const newVx2 = vx1
          
          // Rotate velocities back
          ball1.velocityX = newVx1 * cos - vy1 * sin
          ball1.velocityY = vy1 * cos + newVx1 * sin
          ball2.velocityX = newVx2 * cos - vy2 * sin
          ball2.velocityY = vy2 * cos + newVx2 * sin
        }
      }
    }
  }

  private async initializeSDK(): Promise<void> {
    if (!window.FarcadeSDK) {
      // No SDK, create elements immediately
      this.createGameElements()
      return
    }

    // Verify SDK has the expected structure
    const hasValidAPI =
      typeof window.FarcadeSDK.on === 'function' &&
      window.FarcadeSDK.singlePlayer?.actions?.ready

    if (!hasValidAPI) {
      console.warn('FarcadeSDK found but has unexpected structure, starting game without SDK')
      this.createGameElements()
      return
    }

    // Determine multiplayer mode based on build configuration
    // In production, GAME_MULTIPLAYER_MODE will be replaced with true/false by build script
    try {
      // @ts-ignore - This will be replaced at build time
      this.isMultiplayer = GAME_MULTIPLAYER_MODE
    } catch (error) {
      // If GAME_MULTIPLAYER_MODE is not defined, we're in a Remix environment
      // Since package.json says multiplayer: false, we should use single-player mode
      this.isMultiplayer = false
    }

    // Set up SDK event listeners
    window.FarcadeSDK.on('play_again', () => {
      this.restartGame()
      // Send reset state to other player after restart
      if (this.isMultiplayer) {
        // Small delay to ensure state is reset before sending
        setTimeout(() => {
          this.sendGameState()
        }, 10)
      }
    })

    window.FarcadeSDK.on('toggle_mute', (data: { isMuted: boolean }) => {
      // Handle mute toggle if needed
      // Send toggle_mute event back to parent to update SDK flag
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'remix_sdk_event',
          event: { type: 'toggle_mute', data: { isMuted: data.isMuted } }
        }, '*')
      }
    })

    if (this.isMultiplayer) {
      // Multiplayer setup - Set up listeners BEFORE calling ready
      window.FarcadeSDK.on('game_state_updated', (gameState: any) => {

        // Handle it exactly like chess.js does
        if (!gameState) {
          this.setupNewGame()
        } else {
          this.handleGameStateUpdate(gameState)
        }
      })

      // Add listener for state loading
      window.FarcadeSDK.on('load_state', (state: any) => {
        if (state) {
          if (state.selectedColor) {
            this.selectColor(state.selectedColor)
          }
          if (typeof state.clickCount === 'number') {
            this.clickCount = state.clickCount
            if (this.clickText) {
              this.clickText.setText(`Score: ${this.clickCount}/3`)
            }
          }
        }
      })

      // Also listen for restore_game_state events
      window.FarcadeSDK.on('restore_game_state', (data: any) => {
        if (data?.gameState) {
          const state = data.gameState
          if (state.selectedColor) {
            this.selectColor(state.selectedColor)
          }
          if (typeof state.clickCount === 'number') {
            this.clickCount = state.clickCount
            if (this.clickText) {
              this.clickText.setText(`Score: ${this.clickCount}/3`)
            }
          }
        }
      })

      // Call multiplayer ready and await the response
      try {
        const data = await window.FarcadeSDK.multiplayer.actions.ready()
        if (data.players) {
          this.players = data.players
        }
        if (data.meId) {
          this.meId = data.meId
        }
        if (data.initialGameState?.gameState) {
          const state = data.initialGameState.gameState
          if (state.selectedColor) {
            this.selectedColor = state.selectedColor
          }
        }
        // Now create game elements after state is loaded
        this.createGameElements()
        // Send initial state after ready, like chess.js does in setupNewGame
        setTimeout(() => {
          this.sendGameState()
        }, 100)
      } catch (error) {
        console.error('Failed to initialize multiplayer SDK:', error)
        // Create game elements anyway if there's an error
        this.createGameElements()
      }
    } else {
      // Single player - call ready and await it
      try {
        const data = await window.FarcadeSDK.singlePlayer.actions.ready()

        // Handle any response, including null/undefined
        if (data?.initialGameState?.gameState) {
          const state = data.initialGameState.gameState
          if (state.selectedColor) {
            this.selectedColor = state.selectedColor
          }
        }
      } catch (error) {
        console.error('Failed to initialize single player SDK:', error)
      }

      // Always create game elements, regardless of SDK response
      this.createGameElements()
    }
  }

  private sendGameState(): void {
    if (!this.isMultiplayer || !window.FarcadeSDK) return
    
    // Wait until we have player info before sending state
    if (!this.players || this.players.length === 0) {
      return
    }

    const otherPlayerId = this.players.find(p => p.id !== this.meId)?.id

    // Include both players' click counts and selected color
    const stateData = {
      players: this.players,
      clickCounts: {
        [this.meId]: this.clickCount,
        [otherPlayerId || '2']: this.otherPlayerClicks
      },
      selectedColor: this.selectedColor,
      gameOver: this.gameOver
    }
    
    
    // Call updateGameState directly, no defensive checks - like chess.js
    window.FarcadeSDK.multiplayer.actions.updateGameState({
      data: stateData,
      alertUserIds: otherPlayerId ? [otherPlayerId] : []
    })
  }

  private setupNewGame(): void {
    this.restartGame()
    // Send initial state
    if (this.isMultiplayer) {
      this.sendGameState()
    }
  }

  private handleGameStateUpdate(gameState: any): void {
    // Handle the game state exactly like chess.js does
    if (!gameState) {
      this.setupNewGame()
      return
    }

    // Chess.js expects { id: string, data: { players, moves } }
    // We have { id: string, data: { players, clickCounts, gameOver } }
    const { id, data } = gameState
    
    if (!data) {
      this.setupNewGame()
      return
    }

    
    // Update game state from data
    if (data.players) {
      this.players = data.players
    }
    
    this.handleStateUpdate(data)
  }

  private handleStateUpdate(data: any): void {
    if (!data) {
      this.restartGame()
      return
    }

    // Update selected color if provided
    if (data.selectedColor && data.selectedColor !== this.selectedColor) {
      this.selectColor(data.selectedColor)
    }

    // Update all click counts
    if (data.clickCounts) {
      this.allClickCounts = { ...data.clickCounts }
      
      // Update other player's count specifically
      if (this.players && this.players.length > 0) {
        const otherPlayerId = this.players.find(p => p.id !== this.meId)?.id
        if (otherPlayerId && data.clickCounts[otherPlayerId] !== undefined) {
          this.otherPlayerClicks = data.clickCounts[otherPlayerId]
        }
      }
      
      // Also update our own count if it's different (in case of sync issues)
      if (data.clickCounts[this.meId] !== undefined && data.clickCounts[this.meId] !== this.clickCount) {
        // Only update if the other player has a higher count (they clicked more recently)
        if (data.clickCounts[this.meId] > this.clickCount) {
          this.clickCount = data.clickCounts[this.meId]
          if (this.clickText) {
            this.clickText.setText(`Score: ${this.clickCount}/3`)
          }
        }
      }
    }

    // Check game state changes
    if (data.gameOver === true && !this.gameOver) {
      // Store the scores before marking game over
      if (data.clickCounts) {
        // Update our knowledge of all click counts
        const otherPlayerId = this.players?.find(p => p.id !== this.meId)?.id
        if (otherPlayerId && data.clickCounts[otherPlayerId] !== undefined) {
          this.otherPlayerClicks = data.clickCounts[otherPlayerId]
        }
        // Also ensure our own count is up to date
        if (data.clickCounts[this.meId] !== undefined) {
          this.clickCount = data.clickCounts[this.meId]
        }
      }
      
      // Mark game over locally
      this.gameOver = true
      
      // Trigger game over in SDK for this player too (with the same scores)
      // This ensures both players see the game over screen
      if (window.FarcadeSDK) {
        if (this.isMultiplayer && this.players && this.players.length === 2) {
          // Build the complete click counts from the received data
          const scores = this.players.map(player => ({
            playerId: player.id,
            score: data.clickCounts?.[player.id] || 0
          }))
          
          window.FarcadeSDK.multiplayer.actions.gameOver({ scores })
        } else {
          // Fallback for single player mode
          window.FarcadeSDK.singlePlayer.actions.gameOver({ score: this.clickCount })
        }
      }
    }
  }

  private handleClick(): void {
    this.clickCount++
    if (this.clickText) {
      this.clickText.setText(`Score: ${this.clickCount}/3`)
    }
    
    // Check if this click triggers game over
    if (this.clickCount >= 3) {
      // Set game over state BEFORE sending state update
      this.gameOver = true
      
      // Send final state with gameOver = true
      if (this.isMultiplayer) {
        this.sendGameState()
      }
      
      // Small delay to ensure state is sent before triggering SDK game over
      setTimeout(() => {
        this.triggerGameOver()
      }, 50)
    } else {
      // Normal click - just send updated count
      if (this.isMultiplayer) {
        this.sendGameState()
      }
    }
  }

  private triggerGameOver(): void {
    // gameOver is already set in handleClick
    
    // Use SDK to trigger game over - simplified like chess.js
    if (!window.FarcadeSDK) return
    
    if (this.isMultiplayer) {
      // Build scores array for multiplayer - exactly like chess.js does
      const scores: Array<{ playerId: string; score: number }> = []
      
      // Ensure we have both players
      if (this.players && this.players.length >= 2) {
        scores.push({
          playerId: this.players[0].id,
          score: this.players[0].id === this.meId ? this.clickCount : this.otherPlayerClicks
        })
        scores.push({
          playerId: this.players[1].id, 
          score: this.players[1].id === this.meId ? this.clickCount : this.otherPlayerClicks
        })
      } else {
        // Fallback with default IDs
        scores.push({
          playerId: this.meId || '1',
          score: this.clickCount
        })
        scores.push({
          playerId: this.meId === '1' ? '2' : '1',
          score: this.otherPlayerClicks
        })
      }
      
      window.FarcadeSDK.multiplayer.actions.gameOver({ scores })
    } else {
      // Single player
      window.FarcadeSDK.singlePlayer.actions.gameOver({ score: this.clickCount })
    }
  }

  private restartGame(): void {
    this.clickCount = 0
    this.otherPlayerClicks = 0
    this.gameOver = false
    this.selectedColor = 'green' // Reset to default color
    
    if (this.clickText) {
      this.clickText.setText('Score: 0/3')
    }
    
    // Reset color selection UI
    this.selectColor('green')
    
    // Reset all balls to new positions and unpop them
    this.balls.forEach(ball => {
      ball.isPopped = false
      ball.sprite.setVisible(true)
      ball.sprite.setAlpha(1)
      ball.sprite.setScale(1)
      ball.sprite.x = Phaser.Math.Between(ball.radius, GameSettings.canvas.width - ball.radius)
      ball.sprite.y = Phaser.Math.Between(ball.radius, GameSettings.canvas.height - ball.radius)
      ball.velocityX = Phaser.Math.Between(-300, 300)
      ball.velocityY = Phaser.Math.Between(-300, 300)
    })
    
    // Focus the canvas to enable keyboard input
    this.game.canvas.focus()
  }

  private createColorSwatches(): void {
    // Container for color swatches
    this.colorSwatches = this.add.container(GameSettings.canvas.width - 150, 50)
    this.colorSwatches.setDepth(101)

    const colors: Array<'green' | 'blue' | 'red'> = ['green', 'blue', 'red']
    colors.forEach((colorName, index) => {
      const x = index * 45
      
      // Create circle swatch, highlighting the currently selected color
      const swatch = this.add.circle(x, 0, 18, this.colorValues[colorName])
      swatch.setStrokeStyle(3, colorName === this.selectedColor ? 0xffffff : 0x666666)
      swatch.setInteractive()
      swatch.setData('color', colorName)
      
      // Add click handler with stop propagation
      swatch.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.selectColor(colorName)
        pointer.event.stopPropagation()
      })
      
      // Add hover effect
      swatch.on('pointerover', () => {
        swatch.setScale(1.1)
      })
      
      swatch.on('pointerout', () => {
        swatch.setScale(1.0)
      })
      
      this.colorSwatches?.add(swatch)
    })
  }

  private selectColor(color: 'green' | 'blue' | 'red'): void {
    this.selectedColor = color
    
    // Update swatch borders to show selection
    if (this.colorSwatches) {
      this.colorSwatches.list.forEach(obj => {
        const swatch = obj as Phaser.GameObjects.Arc
        const swatchColor = swatch.getData('color')
        swatch.setStrokeStyle(3, swatchColor === color ? 0xffffff : 0x666666)
      })
    }
    
    // Update all existing balls to new color
    this.balls.forEach(ball => {
      ball.sprite.setFillStyle(this.colorValues[color])
    })
    
    // Save state after color change
    this.saveGameState()
  }

  private saveGameState(): void {
    // Save state to emulate SDK state saving
    const gameState = {
      selectedColor: this.selectedColor,
      timestamp: Date.now()
    }
    
    
    // Save through SDK only - no localStorage
    if (window.FarcadeSDK?.singlePlayer?.actions?.saveGameState) {
      window.FarcadeSDK.singlePlayer.actions.saveGameState({ gameState })
    } else if (window.FarcadeSDK?.multiplayer?.actions?.saveGameState && this.isMultiplayer) {
      // For multiplayer mode
      window.FarcadeSDK.multiplayer.actions.saveGameState({ 
        gameState,
        alertUserIds: this.players?.filter(p => p.id !== this.meId).map(p => p.id) || []
      })
    }
  }

  private loadGameState(): void {
    // Don't load from localStorage - only from SDK events
    // The SDK will send us restore_game_state events when needed
    // Waiting for SDK restore_game_state event
  }

  private popBall(ball: Ball): void {
    if (ball.isPopped) return
    
    ball.isPopped = true
    const x = ball.sprite.x
    const y = ball.sprite.y
    const color = ball.sprite.fillColor
    const radius = ball.radius
    
    // Create multiple small circles as particle effect
    for (let i = 0; i < 20; i++) {
      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 6), color)
      particle.setDepth(99)
      
      // Random velocity with gravity effect
      const angle = Phaser.Math.Between(0, 360) * Math.PI / 180
      const speed = Phaser.Math.Between(100, 400)
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed - 200 // Initial upward bias
      
      // Animate particle with physics-like motion
      let currentVY = vy
      const gravity = 800
      
      this.tweens.add({
        targets: particle,
        x: x + vx * 0.8,
        y: {
          value: () => {
            return particle.y
          },
          duration: 800
        },
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 0.2 },
        duration: 800,
        onUpdate: (tween) => {
          const delta = 1/60 // Assume 60 FPS
          currentVY += gravity * delta
          particle.y += currentVY * delta
        },
        onComplete: () => {
          particle.destroy()
        }
      })
    }
    
    // Fade out and destroy ball
    this.tweens.add({
      targets: ball.sprite,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        ball.sprite.setVisible(false)
      }
    })
    
    // Handle click count
    this.handleClick()
  }

  // --- Scene Shutdown Logic ---
  shutdown() {}
}