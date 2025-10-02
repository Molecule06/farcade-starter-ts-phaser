/**
 * Development-only Farcade SDK mock.
 *
 * This file provides two pieces:
 * 1. A thin client-side shim that mirrors the public surface of
 *    @farcade/game-sdk@0.2.1 (the real production SDK).
 * 2. A dev-only "host" that emulates the Remix/Farcade runtime so our
 *    game can exercise the same handshake flow (ready, state updates, etc.).
 *
 * By splitting the responsibilities this way we keep the convenience of
 * local persistence and multi-instance testing while ensuring the game
 * only interacts with the SDK surface that exists in production.
 *
 * PROPER USAGE:
 * =============
 *
 * 1. INITIALIZATION FLOW:
 *    - Game calls SDK.multiplayer.actions.ready() (or singlePlayer equivalent)
 *    - MUST await the Promise<GameInfo> to get player data and initial state
 *    - Check gameInfo.initialGameState:
 *      • If null: game not started yet
 *        - Player 0 (first in players array) initiates with saveGameState()
 *        - Other players wait for game_state_updated event
 *      • If not null: game already in progress
 *        - All players load from initialGameState.gameState
 *    - Only call ready() ONCE per game instance
 *
 * 2. STATE UPDATES:
 *    - Listen to SDK.on('game_state_updated') for opponent moves
 *    - Save state with SDK.multiplayer.actions.saveGameState()
 *    - Never use localStorage directly - always use SDK methods
 *    - The SDK mock persists to localStorage (emulating server storage)
 *
 * 3. COMMON PITFALLS TO AVOID:
 *    - Don't call ready() without awaiting - you'll miss GameInfo
 *    - Don't use SDK.on('game_info') - it's not supported, await ready() instead
 *    - Don't call ready() multiple times
 *    - Don't use localStorage directly in game code
 *
 * 4. SINGLE VS MULTIPLAYER:
 *    - Single player: Only 1 player, simpler state management
 *    - Multiplayer: Multiple players, state shared via saveGameState()
 *    - Package.json "multiplayer" flag determines the mode
 */

import { safeLocalStorage } from '../utils/safeLocalStorage'
import { isDevEnvironment } from '../utils/environment'

interface GameStateEnvelope {
  id: string
  gameState: Record<string, unknown>
  alertUserIds?: string[]
}

interface Player {
  id: string
  name: string
  imageUrl?: string
}

interface GameInfo {
  players: Player[]
  player: Player
  viewContext: 'full_screen'
  initialGameState: GameStateEnvelope | null
}

interface StoredState {
  gameState: GameStateEnvelope | null
  players: Player[]
  currentPlayerId: string | null
}

interface InstanceHints {
  clientId: string
  playerId?: string
  playerName?: string
}

interface BroadcastEnvelope {
  senderId: string
  type: string
  data: any
  timestamp: number
}

const BROADCAST_STORAGE_KEY = '__remix_dev_host_broadcast__'
const PLAYER_ASSIGNMENTS_KEY = '__remix_dev_player_assignments__'

const DEFAULT_PLAYERS: Player[] = [
  { id: '1', name: 'Player 1' },
  { id: '2', name: 'Player 2' }
]

// Cache for the game name from package.json
let cachedGameName: string | null = null

// Fetch the game name from package.json
async function getGameName(): Promise<string> {
  if (cachedGameName) return cachedGameName

  try {
    const response = await fetch('/package.json')
    if (response.ok) {
      const packageJson = await response.json()
      cachedGameName = packageJson.name || 'unknown-game'
      return cachedGameName
    }
  } catch (error) {
    console.warn('Failed to fetch game name from package.json:', error)
  }

  cachedGameName = 'unknown-game'
  return cachedGameName
}

function createDefaultState(): StoredState {
  return {
    gameState: null,
    players: [...DEFAULT_PLAYERS],
    currentPlayerId: null
  }
}

function getGameStateKey(gameName: string = 'unknown-game'): string {
  const cleanName = gameName.replace(/[^a-zA-Z0-9-_]/g, '_')
  return `remix_game_state_${cleanName}`
}

function generateEnvelopeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function readPersistedState(): Promise<StoredState> {
  const storage = safeLocalStorage()
  if (!storage) {
    return createDefaultState()
  }

  try {
    const gameName = await getGameName()
    const raw = storage.getItem(getGameStateKey(gameName))
    if (!raw) {
      throw new Error('no state')
    }
    const parsed = JSON.parse(raw)
    return {
      gameState: parsed.gameState ?? null,
      players: Array.isArray(parsed.players) && parsed.players.length >= 2
        ? parsed.players
        : [...DEFAULT_PLAYERS],
      currentPlayerId: typeof parsed.currentPlayerId === 'string' ? parsed.currentPlayerId : null
    }
  } catch {
    return createDefaultState()
  }
}

async function persistState(state: StoredState): Promise<void> {
  const storage = safeLocalStorage()
  if (!storage) return
  const gameName = await getGameName()
  storage.setItem(getGameStateKey(gameName), JSON.stringify(state))
}

function getClientInstanceId(ctx: Window = window): string {
  const anyCtx = ctx as any
  if (typeof anyCtx.__remixDevClientId === 'string') {
    return anyCtx.__remixDevClientId
  }

  const id = `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  Object.defineProperty(anyCtx, '__remixDevClientId', {
    value: id,
    configurable: false,
    enumerable: false,
    writable: false
  })
  return id
}

function readInstanceHints(ctx: Window = window): InstanceHints {
  const hints: InstanceHints = {
    clientId: getClientInstanceId(ctx)
  }

  const globalHints = (ctx as any).__remixDevInstance || {}
  if (typeof globalHints.playerId === 'string') {
    hints.playerId = globalHints.playerId.trim()
  }
  if (typeof globalHints.playerName === 'string') {
    hints.playerName = globalHints.playerName.trim()
  }

  if (typeof (ctx as any).__remixDevPlayerId === 'string') {
    hints.playerId = (ctx as any).__remixDevPlayerId.trim()
  }
  if (typeof (ctx as any).__remixDevPlayerName === 'string') {
    hints.playerName = (ctx as any).__remixDevPlayerName.trim()
  }

  let frameElement: HTMLElement | null = null
  try {
    frameElement = ctx.frameElement as HTMLElement | null
  } catch {
    frameElement = null
  }
  if (frameElement && frameElement.dataset) {
    const { remixPlayerId, remixPlayer, playerId, player, remixPlayerName, playerName } = frameElement.dataset
    const idCandidate = remixPlayerId || remixPlayer || playerId || player
    if (idCandidate && !hints.playerId) {
      hints.playerId = idCandidate.trim()
    }
    const nameCandidate = remixPlayerName || playerName
    if (nameCandidate && !hints.playerName) {
      hints.playerName = nameCandidate.trim()
    }
  }

  if (ctx.name && !hints.playerId) {
    const match = ctx.name.match(/player(?:Id)?=(\w+)/i)
    if (match && match[1]) {
      hints.playerId = match[1]
    }
  }

  try {
    const params = new URLSearchParams(ctx.location?.search || '')
    const paramPlayer = params.get('player') || params.get('instance')
    if (paramPlayer) {
      hints.playerId = paramPlayer.trim()
    }
    const paramName = params.get('playerName')
    if (paramName) {
      hints.playerName = paramName.trim()
    }
  } catch {
    // ignore
  }

  return hints
}

function readPlayerAssignments(): Record<string, string> {
  const storage = safeLocalStorage()
  if (!storage) return {}
  try {
    const raw = storage.getItem(PLAYER_ASSIGNMENTS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writePlayerAssignments(assignments: Record<string, string>): void {
  const storage = safeLocalStorage()
  if (!storage) return
  storage.setItem(PLAYER_ASSIGNMENTS_KEY, JSON.stringify(assignments))
}

function clearPlayerAssignments(): void {
  const storage = safeLocalStorage()
  if (!storage) return
  storage.removeItem(PLAYER_ASSIGNMENTS_KEY)
}

/**
 * Minimal client-side SDK mock – mirrors the production SDK's behaviour.
 * 
 * ARCHITECTURE:
 * - This class provides the EXACT same API as the production @farcade/game-sdk
 * - Games interact with this mock identically to how they'd use the real SDK
 * - All platform-specific logic is hidden inside the mock implementation
 * 
 * KEY PRINCIPLES:
 * - Games should NEVER check if they're in dev/prod - just use the SDK
 * - The mock handles promise-based ready() flow just like production
 * - State persistence happens automatically through SDK methods
 * - The mock prevents common errors (duplicate ready calls, orphaned promises)
 */
class FarcadeSDKMock {
  private isClient: boolean
  private target: Window | null
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map()
  private readyPromiseResolve: ((info: GameInfo) => void) | null = null
  private hasHostReady = false
  private readyPromise: Promise<GameInfo> | null = null
  private readySent = false

  constructor() {
    this.isClient = typeof window !== 'undefined'
    // When running in an iframe, target the parent window for SDK communication
    // When running standalone, target self (window)
    this.target = this.isClient ? (window !== window.parent ? window.parent : window) : null

    if (this.isClient) {
      window.addEventListener('message', this.handleMessage)
      window.addEventListener('error', this.handleGlobalError)
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
    }
  }

  on(eventType: string, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(callback)

    if (eventType === 'ready' && this.hasHostReady) {
      queueMicrotask(() => {
        try {
          callback(undefined)
        } catch (error) {
          console.warn('[SDK Mock] ready listener error', error)
        }
      })
    }
  }

  off(eventType: string, callback: (data: unknown) => void): void {
    this.eventListeners.get(eventType)?.delete(callback)
  }

  setTarget(target: Window): void {
    this.target = target
  }

  /**
   * Core ready() method that initiates the SDK handshake.
   *
   * IMPORTANT: This method should only be called ONCE per game instance.
   * The SDK handles duplicate calls by returning the same promise.
   *
   * Flow:
   * 1. Game calls ready() and awaits the Promise<GameInfo>
   * 2. SDK sends 'ready' message to host
   * 3. Host responds with GameInfo containing:
   *    - players: array of all players
   *    - player: the current player's info
   *    - initialGameState: existing game state OR null if game not started
   * 4. SDK resolves the promise with the GameInfo
   * 5. Game checks initialGameState:
   *    - If null: Player 0 initiates game, others wait
   *    - If not null: All players load from initialGameState.gameState
   *
   * Games MUST await this promise and use the returned data directly.
   * Do NOT use SDK.on('game_info') - it's not supported.
   */
  private ready = (): Promise<GameInfo> => {
    // Return existing promise if already created (prevents orphaned promises)
    if (this.readyPromise) {
      // Silently return existing promise
      return this.readyPromise
    }
    
    // Create the promise that will be returned for all ready() calls
    this.readyPromise = new Promise<GameInfo>((resolve) => {
      this.readyPromiseResolve = resolve
    })
    
    // Only send the ready message once (prevents duplicate handshakes)
    if (!this.readySent) {
      this.readySent = true
      this.sendMessage('ready', undefined)
    }
    
    return this.readyPromise
  }

  singlePlayer = {
    actions: {
      ready: () => this.ready(),  // Make sure it returns the promise
      gameOver: ({ score }: { score: number }) => {
        this.sendMessage('game_over', { score })
      },
      hapticFeedback: () => {
        this.sendMessage('haptic_feedback', undefined)
      },
      reportError: (errorData: unknown) => {
        this.sendMessage('error', errorData)
      },
      saveGameState: ({ gameState }: { gameState: Record<string, unknown> }) => {
        this.sendMessage('save_game_state', { gameState })
      }
    }
  }

  multiplayer = {
    actions: {
      ready: () => this.ready(),  // Make sure it returns the promise for multiplayer too
      gameOver: ({ scores }: { scores: Array<{ playerId: string; score: number }> }) => {
        this.sendMessage('multiplayer_game_over', { scores })
      },
      refuteGameState: ({ gameStateId }: { gameStateId: string }) => {
        this.sendMessage('refute_game_state', { gameStateId })
      },
      saveGameState: ({ gameState, alertUserIds }: { gameState: Record<string, unknown>; alertUserIds?: string[] }) => {
        this.sendMessage('multiplayer_save_game_state', { gameState, alertUserIds })
      },
      hapticFeedback: () => {
        this.sendMessage('haptic_feedback', undefined)
      },
      reportError: (errorData: unknown) => {
        this.sendMessage('error', errorData)
      }
    }
  }

  private emit(eventType: string, data: unknown): void {
    if (eventType === 'ready') {
      this.hasHostReady = true
    }

    // game_info is handled exclusively through the ready() promise
    // Games should await ready() instead of using on('game_info')
    if (eventType === 'game_info' && this.readyPromiseResolve) {
      this.readyPromiseResolve(data as GameInfo)
      this.readyPromiseResolve = null
      return // Don't emit to listeners
    }

    const listeners = this.eventListeners.get(eventType)
    if (!listeners) return

    listeners.forEach((listener) => {
      try {
        listener(data)
      } catch {
        // ignore listener errors in dev
      }
    })
  }

  private handleMessage = (event: MessageEvent) => {
    const payload = event.data
    if (!payload || typeof payload !== 'object') return
    if (payload.__fromRemixDevHost === true && payload.type === 'game_event') {
      // Received message from DevHost
      this.emit(payload.event.type, payload.event.data)
      return
    }

    if (payload.type !== 'game_event') return
    this.emit(payload.event.type, payload.event.data)
  }

  private sendMessage(type: string, data: unknown): void {
    if (!this.isClient || !this.target) return
    const gameEvent = {
      type: 'game_event',
      event: { type, data }
    }
    // Send message to host
    this.target.postMessage(gameEvent, '*')
  }

  getStatus() {
    return {
      ready: this.hasHostReady,
      muted: this.isMuted
    }
  }

  private handleGlobalError = (event: ErrorEvent) => {
    this.sendMessage('error', {
      message: event.message || 'Unknown error',
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    })
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    this.sendMessage('error', {
      message: error.message,
      error
    })
  }
}

/**
 * Dev host controller – simulates the Remix runtime while keeping state
 * in localStorage so multiple windows / reloads stay in sync.
 */
class RemixDevHostController {
  private readonly hostId = Math.random().toString(36).slice(2, 10)
  private state: StoredState
  private readonly isMultiplayer: boolean
  private readonly clientWindows: Map<string, Window> = new Map()
  private readonly windowToClientId: Map<Window, string> = new Map()
  private readonly handledReadyClients: Set<string> = new Set()

  constructor(isMultiplayer: boolean) {
    this.isMultiplayer = isMultiplayer
    this.state = createDefaultState() // Initialize with default

    // Load initial state asynchronously (will be re-read on each ready() call)
    readPersistedState().then(state => {
      this.state = state
    })

    window.addEventListener('message', this.handleIncomingMessage)
    window.addEventListener('storage', this.handleStorageBroadcast)

    // Let dev tooling know the host is active
    this.publishDevEvent('host_initialized', { hostId: this.hostId })
  }

  triggerPlayAgain(): void {
    this.sendGameEvent('play_again', {})
    this.publishDevEvent('play_again', {})
  }

  triggerMute(isMuted: boolean): void {
    this.sendGameEvent('toggle_mute', { isMuted })
    this.publishDevEvent('toggle_mute', { isMuted })
  }

  registerClientWindow(targetWindow: Window, explicitClientId?: string): string {
    if (!targetWindow) {
      throw new Error('registerClientWindow called without targetWindow')
    }

    const existingId = this.windowToClientId.get(targetWindow)
    if (existingId) {
      this.clientWindows.set(existingId, targetWindow)
      return existingId
    }

    const clientId = explicitClientId && explicitClientId.trim().length > 0
      ? explicitClientId.trim()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    const isFirstClient = this.clientWindows.size === 0

    this.clientWindows.set(clientId, targetWindow)
    this.windowToClientId.set(targetWindow, clientId)

    // Don't send ready event here - it's not part of the flow
    // The game sends 'ready', we respond with 'game_info'
    // We don't send 'ready' back to the game
    this.publishDevEvent('client_registered', { clientId })

    // Demo mute toggle after first client registers (useful for verifying SDK integration)
    if (isFirstClient) {
      setTimeout(() => {
        this.sendGameEvent('toggle_mute', { isMuted: true })
        this.publishDevEvent('toggle_mute', { isMuted: true })

        setTimeout(() => {
          this.sendGameEvent('toggle_mute', { isMuted: false })
          this.publishDevEvent('toggle_mute', { isMuted: false })
        }, 500)
      }, 1500)
    }

    return clientId
  }

  private handleIncomingMessage = (event: MessageEvent) => {
    const payload = event.data
    if (!payload || typeof payload !== 'object') return
    if (payload.__fromRemixDevHost === true) return
    if (payload.type !== 'game_event') return

    const { type, data } = payload.event
    const sourceWindow = event.source as Window | null

    // Handle incoming game event

    switch (type) {
      case 'ready':
        this.handleReady(sourceWindow)
        break
      case 'save_game_state':
        // Single player save - convert to same format as multiplayer
        this.handleSaveGameState(data)
        // Also broadcast as single player event for the dashboard
        this.publishDevEvent('single_player_save_game_state', data)
        window.postMessage({
          type: 'single_player_game_state_broadcast',
          gameState: data?.gameState ? {
            id: generateEnvelopeId(),
            gameState: data.gameState
          } : null
        }, '*')
        break
      case 'multiplayer_save_game_state':
        this.handleSaveGameState(data)
        // Broadcast to GameStatePanel for immediate update
        window.postMessage({
          type: 'multiplayer_game_state_broadcast',
          gameState: data?.gameState ? {
            id: generateEnvelopeId(),
            gameState: data.gameState
          } : null
        }, '*')
        break
      case 'refute_game_state':
        this.publishDevEvent('game_state_refuted', data)
        break
      case 'multiplayer_game_over':
        this.handleMultiplayerGameOver(data)
        break
      case 'game_over':
      case 'haptic_feedback':
      case 'error':
        // No special handling needed in dev – forward to tooling for visibility
        this.publishDevEvent(type, data)
        break
      default:
        this.publishDevEvent('unhandled_game_event', { type, data })
    }
  }

  private handleStorageBroadcast = (event: StorageEvent) => {
    if (event.key !== BROADCAST_STORAGE_KEY || !event.newValue) return

    try {
      const envelope: BroadcastEnvelope = JSON.parse(event.newValue)
      if (envelope.senderId === this.hostId) return
      this.sendGameEvent(envelope.type, envelope.data)
    } catch (error) {
      console.warn('[Remix Dev Host] Failed to process storage broadcast', error)
    }
  }

  /**
   * Handles the 'ready' message from the game client.
   * This is the host's side of the handshake - it responds with game_info.
   *
   * Flow:
   * 1. Receives 'ready' from game
   * 2. Re-reads persisted state from localStorage (ensures fresh state)
   * 3. Assigns or retrieves player ID for this client
   * 4. Sends 'game_info' response with player data and initial state
   *
   * IMPORTANT: Guard against duplicate ready calls from the same client
   * to prevent player duplication and state corruption.
   */
  private async handleReady(sourceWindow: Window | null): Promise<void> {
    // Processing ready handshake

    const contextWindow = sourceWindow || window
    const hints = readInstanceHints(contextWindow)

    // Guard against duplicate ready calls from same client (prevents player duplication)
    if (this.handledReadyClients.has(hints.clientId)) {
      // Already handled ready for this client
      return
    }

    // Mark this client as handled
    this.handledReadyClients.add(hints.clientId)

    // CRITICAL: Always re-read from localStorage to get the latest state
    // This ensures state loaded from GameStatePanel is picked up
    this.state = await readPersistedState()

    const assignments = readPlayerAssignments()

    let resolvedPlayerId: string
    if (hints.playerId) {
      resolvedPlayerId = hints.playerId
    } else if (assignments[hints.clientId]) {
      resolvedPlayerId = assignments[hints.clientId]
    } else {
      // For single player mode, always use player 1
      // For multiplayer, assign available player
      if (!this.isMultiplayer) {
        resolvedPlayerId = '1'
      } else {
        const assignedIds = new Set(Object.values(assignments))
        const available = this.state.players.find((p) => !assignedIds.has(p.id))
        if (available) {
          resolvedPlayerId = available.id
        } else {
          // Don't create unlimited players - cap at 2 for typical multiplayer
          if (this.state.players.length >= 2) {
            // Reuse the first unassigned player or player 1
            resolvedPlayerId = '1'
          } else {
            const nextIndex = this.state.players.length + 1
            resolvedPlayerId = String(nextIndex)
            this.state.players = [
              ...this.state.players,
              {
                id: resolvedPlayerId,
                name: `Player ${nextIndex}`
              }
            ]
          }
        }
      }
    }

    assignments[hints.clientId] = resolvedPlayerId
    writePlayerAssignments(assignments)

    // Only add player if they don't exist
    const existingIndex = this.state.players.findIndex((p) => p.id === resolvedPlayerId)
    if (existingIndex === -1) {
      // Only add if we haven't exceeded reasonable player count
      if (this.state.players.length < 2 || this.isMultiplayer) {
        this.state.players = [
          ...this.state.players,
          {
            id: resolvedPlayerId,
            name: hints.playerName || `Player ${resolvedPlayerId}`
          }
        ]
      }
    } else if (hints.playerName && this.state.players[existingIndex].name !== hints.playerName) {
      const updatedPlayers = [...this.state.players]
      updatedPlayers[existingIndex] = {
        ...updatedPlayers[existingIndex],
        name: hints.playerName
      }
      this.state.players = updatedPlayers
    }

    // For single player, ensure we only have one player
    if (!this.isMultiplayer && this.state.players.length > 1) {
      this.state.players = [this.state.players[0]]
    }

    await persistState(this.state)

    if (sourceWindow) {
      const registeredId = this.registerClientWindow(sourceWindow, hints.clientId)
      hints.clientId = registeredId
    } else if (!this.clientWindows.has(hints.clientId)) {
      this.clientWindows.set(hints.clientId, window)
    }

    const player = this.state.players.find((p) => p.id === resolvedPlayerId) || this.state.players[0]

    // Match the real SDK's GameInfo structure
    // Real SDK provides 'player' (not 'meId')
    const gameInfo: any = {
      players: [...this.state.players],
      player, // This is what the real SDK provides
      viewContext: 'full_screen',
      initialGameState: this.state.gameState
    }

    this.publishDevEvent('game_info_assigned', {
      clientId: hints.clientId,
      playerId: resolvedPlayerId,
      playerName: player.name
    })

    // Send game_info response
    setTimeout(() => {
      this.sendGameEvent('game_info', gameInfo, hints.clientId)
      this.publishDevEvent('game_info', gameInfo)
    }, 50)
  }

  /**
   * Handles game state save requests from the game.
   * 
   * This emulates the server-side persistence that the real SDK would do.
   * In development, we persist to localStorage which allows:
   * - State to survive page refreshes
   * - GameStatePanel to inspect and modify state
   * - Multiple game instances to share state (for multiplayer testing)
   * 
   * The game should ONLY save state through SDK methods, never directly to localStorage.
   */
  private async handleSaveGameState(data: { gameState: Record<string, unknown>; alertUserIds?: string[] } | undefined): Promise<void> {
    if (!data || typeof data !== 'object') return

    const envelope: GameStateEnvelope | null = data.gameState
      ? {
          id: generateEnvelopeId(),
          gameState: data.gameState,
          alertUserIds: Array.isArray(data.alertUserIds) ? data.alertUserIds : undefined
        }
      : null

    this.state.gameState = envelope

    const typed = data.gameState as any
    if (typed && Array.isArray(typed.players) && typed.players.length >= 2) {
      this.state.players = typed.players.map((p: any, index: number) => ({
        id: String(p.id || p.playerId || index + 1),
        name: p.name || p.username || `Player ${index + 1}`
      }))
    }

    if (typed && typeof typed.currentPlayer === 'number') {
      this.state.currentPlayerId = String(typed.currentPlayer)
    } else if (typed && typeof typed.turn === 'string') {
      this.state.currentPlayerId = typed.turn === 'w' ? '1' : '2'
    }

    await persistState(this.state)

    this.sendGameEvent('game_state_updated', envelope)
    this.publishDevEvent('game_state_updated', envelope)
    this.broadcastToOtherWindows('game_state_updated', envelope)
  }

  private async handleMultiplayerGameOver(data: unknown): Promise<void> {
    this.state.gameState = null
    this.state.currentPlayerId = null
    await persistState(this.state)

    this.sendGameEvent('multiplayer_game_over', data)
    this.publishDevEvent('multiplayer_game_over', data)
    this.broadcastToOtherWindows('multiplayer_game_over', data)
    clearPlayerAssignments()
  }

  async resetState(): Promise<void> {
    this.state = createDefaultState()
    await persistState(this.state)
    clearPlayerAssignments()
    this.clientWindows.clear()
    this.windowToClientId.clear()
    this.handledReadyClients.clear()
    this.sendGameEvent('game_state_updated', null)
  }

  private sendGameEvent(type: string, data: unknown, targetClientId?: string): void {
    // Send game event to client(s)
    const payload = {
      __fromRemixDevHost: true,
      type: 'game_event',
      event: { type, data }
    }
    if (targetClientId) {
      const targetWindow = this.clientWindows.get(targetClientId)
      // Send to specific client window
      if (targetWindow) {
        this.postToClient(targetWindow, payload)
      }
      return
    }

    if (this.clientWindows.size === 0) {
      this.postToClient(window, payload)
      return
    }

    for (const clientWindow of this.clientWindows.values()) {
      this.postToClient(clientWindow, payload)
    }
  }

  private postToClient(targetWindow: Window, payload: unknown): void {
    try {
      targetWindow.postMessage(payload, '*')
    } catch (error) {
      console.warn('[Remix Dev Host] Failed to post message to client', error)
    }
  }

  private broadcastToOtherWindows(type: string, data: unknown): void {
    const storage = safeLocalStorage()
    if (!storage) return

    const envelope: BroadcastEnvelope = {
      senderId: this.hostId,
      type,
      data,
      timestamp: Date.now()
    }

    storage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(envelope))
  }

  private publishDevEvent(type: string, data: unknown): void {
    const payload = {
      type: 'remix_sdk_event',
      event: { type, data },
      hostId: this.hostId
    }
    window.postMessage(payload, '*')
  }
}

/**
 * Bootstraps the SDK mock + host bridge in development.
 * 
 * IMPORTANT: This should be called BEFORE creating the Phaser game instance.
 * This ensures the SDK is available when game scenes initialize.
 * 
 * The function:
 * 1. Creates the SDK mock and exposes it as window.FarcadeSDK
 * 2. Determines single/multiplayer mode from package.json
 * 3. Sets up the host controller (if running as top window)
 * 4. Handles iframe communication (if running in an iframe)
 * 
 * Games should call SDK methods exactly as they would in production.
 * The mock handles all the development-specific concerns internally.
 */
export async function initializeSDKMock(): Promise<void> {
  if (!isDevEnvironment()) {
    return
  }

  // Create SDK immediately to avoid race conditions on mobile
  const sdk = new FarcadeSDKMock()
  ;(window as any).FarcadeSDK = sdk

  const isMultiplayer = await determineMultiplayerFlag()

  let devHost: RemixDevHostController | undefined
  const clientId = getClientInstanceId(window)

  if (window === window.top) {
    devHost = ensureDevHost(isMultiplayer)
  } else {
    try {
      window.parent?.postMessage({
        type: '__remix_dev_host_request__',
        multiplayer: isMultiplayer,
        clientId
      }, '*')
    } catch {
      // ignore – if parent is unavailable, we're likely top-level already
    }
  }

  ;(window as any).__remixSDKMock = {
    sdk,
    host: devHost,
    triggerPlayAgain: (window === window.top && devHost)
      ? () => devHost!.triggerPlayAgain()
      : () => window.parent?.postMessage({ type: '__remix_dev_host_command__', command: 'play_again' }, '*'),
    triggerMute: (isMuted: boolean) => {
      if (window === window.top && devHost) {
        devHost.triggerMute(isMuted)
      } else {
        window.parent?.postMessage({
          type: '__remix_dev_host_command__',
          command: 'toggle_mute',
          data: { isMuted }
        }, '*')
      }
    }
  }
}

async function determineMultiplayerFlag(): Promise<boolean> {
  try {
    const response = await fetch('/package.json')
    if (!response.ok) return true
    const pkg = await response.json()
    return pkg?.multiplayer === true
  } catch {
    return true
  }
}

export function ensureDevHost(isMultiplayer: boolean): RemixDevHostController {
  const existing = (window as any).__remixDevHost
  if (existing) {
    return existing
  }
  const host = new RemixDevHostController(isMultiplayer)
  ;(window as any).__remixDevHost = host
  return host
}

if (typeof window !== 'undefined' && window === window.top && isDevEnvironment()) {
  window.addEventListener('message', (event) => {
    const payload = event.data
    if (!payload || typeof payload !== 'object') return
    if (payload.type === '__remix_dev_host_request__') {
      const host = ensureDevHost(payload.multiplayer !== false)
      if (event.source && typeof (event.source as Window).postMessage === 'function') {
        try {
          host.registerClientWindow(event.source as Window, payload.clientId)
        } catch (error) {
          console.warn('[Remix Dev Host] register client failed', error)
        }
      }
      window.postMessage({ type: '__remix_dev_host_ready__' }, '*')
    }
    if (payload.type === '__remix_dev_host_command__') {
      const host = ensureDevHost(true)
      if (payload.command === 'play_again') {
        host.triggerPlayAgain()
      } else if (payload.command === 'toggle_mute') {
        host.triggerMute(Boolean(payload.data?.isMuted))
      } else if (payload.command === 'reset_state') {
        host.resetState()
      }
    }
  })
}
