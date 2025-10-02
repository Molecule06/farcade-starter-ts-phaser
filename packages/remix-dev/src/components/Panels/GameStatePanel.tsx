import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDashboard } from '../../contexts'
import { cn, tw } from '../../utils/tw'
import { safeLocalStorage } from '../../utils/safeLocalStorage'

interface SavedState {
  id: string
  label: string
  timestamp: number
  gameState: any
}

interface GameStatePanelProps {
  isOpen: boolean
}

function normalizeGameState(raw: any) {
  if (!raw || typeof raw !== 'object') {
    return raw
  }

  if ('gameState' in raw) {
    const { data: _deprecatedData, ...rest } = raw as any
    return rest.gameState === undefined && _deprecatedData !== undefined
      ? {
          ...rest,
          gameState: _deprecatedData,
        }
      : rest
  }

  if ('data' in raw) {
    const { data, ...rest } = raw as any
    return {
      ...rest,
      gameState: data,
    }
  }

  return raw
}

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

// Get a unique key for this game based on the package.json name
function getGameStateKey(gameName: string = 'unknown-game') {
  if (typeof window === 'undefined') return null
  const cleanName = gameName.replace(/[^a-zA-Z0-9-_]/g, '_')
  return `remix_game_state_${cleanName}`
}

// Get the key for saved states list
function getSavedStatesKey(gameName: string = 'unknown-game') {
  if (typeof window === 'undefined') return null
  const cleanName = gameName.replace(/[^a-zA-Z0-9-_]/g, '_')
  return `remix_saved_states_${cleanName}`
}

// Generate a short hash for saved state ID
function generateShortHash(): string {
  return Math.random().toString(36).substring(2, 10)
}

// Load game state from localStorage
async function loadGameStateFromStorage() {
  try {
    const storage = safeLocalStorage()
    if (!storage) return null
    const gameName = await getGameName()
    const key = getGameStateKey(gameName)
    if (!key) return null
    const stored = storage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Handle different formats of stored state
      if (parsed?.gameState) {
        return normalizeGameState(parsed.gameState)
      } else if (parsed?.moves) {
        // Direct game state object
        return normalizeGameState(parsed)
      }
      return null
    }
  } catch (e) {
    console.error('GameStatePanel: Failed to load state from storage:', e)
  }
  return null
}

export const GameStatePanel: React.FC<GameStatePanelProps> = ({ isOpen }) => {
  const { state } = useDashboard()
  const [gameName, setGameName] = useState<string>('unknown-game')
  const [gameState, setGameState] = useState<any>(null)
  const [textContent, setTextContent] = useState<string>('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [savedStates, setSavedStates] = useState<SavedState[]>([])
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editingLabelValue, setEditingLabelValue] = useState<string>('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize game name and load initial state
  useEffect(() => {
    const initialize = async () => {
      const name = await getGameName()
      setGameName(name)

      // Load initial state after we have the game name
      const initialState = await loadGameStateFromStorage()
      if (initialState) {
        setGameState(initialState)
        setTextContent(JSON.stringify(initialState, null, 2))
      }
    }
    initialize()
  }, [])

  // Load saved states from localStorage
  const loadSavedStates = useCallback(() => {
    try {
      const storage = safeLocalStorage()
      if (!storage) return []
      const key = getSavedStatesKey(gameName)
      if (!key) return []
      const stored = storage.getItem(key)
      if (stored) {
        return JSON.parse(stored) as SavedState[]
      }
    } catch (e) {
      console.error('Failed to load saved states:', e)
    }
    return []
  }, [gameName])

  // Save states list to localStorage
  const saveSavedStatesToStorage = useCallback((states: SavedState[]) => {
    try {
      const storage = safeLocalStorage()
      if (!storage) return
      const key = getSavedStatesKey(gameName)
      if (!key) return
      storage.setItem(key, JSON.stringify(states))
    } catch (e) {
      console.error('Failed to save states list:', e)
    }
  }, [gameName])

  // Initialize saved states on mount
  useEffect(() => {
    setSavedStates(loadSavedStates())
  }, [loadSavedStates])

  // Auto-save function with validation
  const autoSave = useCallback((text: string) => {
    try {
      const parsedState = normalizeGameState(JSON.parse(text))
      setParseError(null)
      setGameState(parsedState)

      const stateBody = parsedState && typeof parsedState === 'object'
        ? parsedState.gameState ?? parsedState
        : null

      // Ensure the state has a timestamp
      if (stateBody && typeof stateBody === 'object' && !stateBody.timestamp) {
        stateBody.timestamp = Date.now()
      }

      // Save to localStorage
      const key = getGameStateKey(gameName)
      const stateToSave = {
        gameState: parsedState,
        players: stateBody?.players || [
          { id: '1', name: 'Player 1', imageUrl: undefined },
          { id: '2', name: 'Player 2', imageUrl: undefined }
        ],
        currentPlayerId: null
      }
      const storage = safeLocalStorage()
      if (storage && key) {
        storage.setItem(key, JSON.stringify(stateToSave))
      }

      // Update parent window state if accessible
      if (window.parent !== window) {
        try {
          const parentWindow = window.parent as any
          parentWindow.__remixGameState = stateToSave
        } catch (e) {
          console.error('Cannot update parent window state:', e)
        }
      }

      // Reload both iframes to ensure they properly initialize with the new state
      const iframes = document.querySelectorAll('iframe')
      iframes.forEach((iframe, index) => {
        if (iframe.contentWindow) {
          iframe.contentWindow.location.reload()
        }
      })

    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid JSON')
    }
  }, [gameName])

  // Handle text changes with debounce
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setTextContent(newText)
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Set new timer for auto-save (500ms delay)
    if (newText.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        autoSave(newText)
      }, 500)
    }
  }, [autoSave])

  // Listen for game state updates from both single player and multiplayer games
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'multiplayer_game_state_broadcast' ||
          event.data?.type === 'single_player_game_state_broadcast') {
        // Broadcast payload mirrors Farcade's { id, gameState } structure
        const newState = normalizeGameState(event.data.gameState)
        setGameState(newState)
        setTextContent(JSON.stringify(newState, null, 2))

        // Clear any pending autoSave to prevent stale text from being saved
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
  
  // Listen for localStorage changes from other windows/iframes
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      const gameKey = getGameStateKey(gameName)
      if (e.key === gameKey) {
        const storedState = await loadGameStateFromStorage()
        if (storedState) {
          setGameState(storedState)
          setTextContent(JSON.stringify(storedState, null, 2))

          // Clear any pending autoSave to prevent stale text from being saved
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [gameName])
  
  // Check for updates when panel opens
  useEffect(() => {
    if (!isOpen) return

    const checkForUpdates = async () => {
      const storedState = await loadGameStateFromStorage()
      if (storedState) {
        const currentStateStr = JSON.stringify(gameState)
        const storedStateStr = JSON.stringify(storedState)

        if (currentStateStr !== storedStateStr) {
          setGameState(storedState)
          setTextContent(JSON.stringify(storedState, null, 2))

          // Clear any pending autoSave to prevent stale text from being saved
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
          }
        }
      }
    }

    // Check immediately when panel opens
    checkForUpdates()

    // Also check periodically (less frequently - every 5 seconds)
    const interval = setInterval(checkForUpdates, 5000)

    return () => clearInterval(interval)
  }, [isOpen, gameState])

  // Also check SDK events for game state updates
  useEffect(() => {
    const gameStateEvents = state.sdk.events.filter(event =>
      event.type === 'game_state_updated' ||
      event.type === 'single_player_save_game_state'
    )
    const latestGameState = gameStateEvents[gameStateEvents.length - 1]
    if (latestGameState) {
      const normalized = normalizeGameState(latestGameState.data)

      if (normalized !== undefined) {
        setGameState(normalized)
        setTextContent(JSON.stringify(normalized, null, 2))

        // Clear any pending autoSave to prevent stale text from being saved
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
        }
      }
    }
  }, [state.sdk.events])

  const handleSave = () => {
    if (!textContent || parseError) {
      console.warn('Cannot save invalid or empty state')
      return
    }

    const newSavedState: SavedState = {
      id: generateShortHash(),
      label: 'Untitled',
      timestamp: Date.now(),
      gameState: gameState
    }

    const updatedStates = [newSavedState, ...savedStates]
    setSavedStates(updatedStates)
    saveSavedStatesToStorage(updatedStates)

    // Set this state as being edited for label
    setEditingLabelId(newSavedState.id)
    setEditingLabelValue('Untitled')

    // Focus will be handled by the input's useEffect
  }

  const handleLoadState = (savedState: SavedState) => {
    // Load the saved state into the editor
    const stateStr = JSON.stringify(savedState.gameState, null, 2)
    setTextContent(stateStr)
    setGameState(savedState.gameState)

    // Manually save to localStorage with proper formatting
    const parsedState = normalizeGameState(savedState.gameState)
    const stateBody = parsedState && typeof parsedState === 'object'
      ? parsedState.gameState ?? parsedState
      : null

    // Ensure the state has a timestamp
    if (stateBody && typeof stateBody === 'object' && !stateBody.timestamp) {
      stateBody.timestamp = Date.now()
    }

    // Save to localStorage FIRST
    const key = getGameStateKey(gameName)
    const stateToSave = {
      gameState: parsedState,
      players: stateBody?.players || [
        { id: '1', name: 'Player 1', imageUrl: undefined },
        { id: '2', name: 'Player 2', imageUrl: undefined }
      ],
      currentPlayerId: stateBody?.currentPlayer || null
    }

    const storage = safeLocalStorage()
    if (storage && key) {
      storage.setItem(key, JSON.stringify(stateToSave))
    }

    // Update parent window state if accessible
    if (window.parent !== window) {
      try {
        const parentWindow = window.parent as any
        parentWindow.__remixGameState = stateToSave
      } catch (e) {
        console.error('Cannot update parent window state:', e)
      }
    }

    // Set global window state as well for the mock to pick up
    if (window) {
      (window as any).__remixGameState = stateToSave
    }

    // Delay iframe reload slightly to ensure localStorage is committed
    setTimeout(() => {
      const iframes = document.querySelectorAll('iframe')
      iframes.forEach((iframe, index) => {
        if (iframe.contentWindow) {
          iframe.contentWindow.location.reload()
        }
      })
    }, 100)

  }

  const handleDeleteState = (id: string) => {
    if (confirm('Are you sure you want to delete this saved state?')) {
      const updatedStates = savedStates.filter(s => s.id !== id)
      setSavedStates(updatedStates)
      saveSavedStatesToStorage(updatedStates)
    }
  }

  const handleUpdateLabel = (id: string, newLabel: string) => {
    const updatedStates = savedStates.map(s =>
      s.id === id ? { ...s, label: newLabel || 'Untitled' } : s
    )
    setSavedStates(updatedStates)
    saveSavedStatesToStorage(updatedStates)
    setEditingLabelId(null)
    setEditingLabelValue('')
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the game state? This will start a new game.')) {
      // Clear the game state
      setGameState(null)
      setTextContent('')

      // Clear from localStorage FIRST before reloading
      const key = getGameStateKey(gameName)
      const storage = safeLocalStorage()
      if (storage && key) {
        storage.removeItem(key)
      }

      const host = (window as any).__remixDevHost
      if (host && typeof host.resetState === 'function') {
        host.resetState()
      } else {
        window.postMessage({ type: '__remix_dev_host_command__', command: 'reset_state' }, '*')
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: '__remix_dev_host_command__', command: 'reset_state' }, '*')
        }
      }

      // Clear any frame-level cached state reference
      try {
        delete (window as any).__remixGameState
      } catch (error) {
        console.warn('Unable to clear local frame state', error)
      }

      // Wait a moment to ensure storage is cleared, then reload iframes
      setTimeout(() => {
        const iframes = document.querySelectorAll('iframe')
        iframes.forEach((iframe, index) => {
          if (iframe.contentWindow) {
            iframe.contentWindow.location.reload()
          }
        })
      }, 100)

    }
  }

  return (
    <div
      className={tw`
        fixed top-0 right-0 w-96 h-[calc(100%-70px)]
        bg-bg-secondary border-l border-border-default
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        transition-transform duration-300 ease-in-out
        flex flex-col overflow-hidden z-[100]
        md:w-96 max-md:w-full
      `}
      role="region"
      aria-label="Game state panel"
      aria-expanded={isOpen}
    >
      <div className={tw`
        flex-1 p-6 pb-4 overflow-hidden
        flex flex-col gap-4 min-h-0
      `}>
        {/* Panel Header */}
        <div className="flex items-center justify-between w-full flex-shrink-0">
          <h3 className="text-white text-lg font-semibold m-0">Game State</h3>
          <div className={tw`flex items-center gap-2`}>
            <button
              onClick={handleSave}
              className={tw`
                text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded
                font-medium transition-colors cursor-pointer border-0
                ${(!textContent || parseError) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title="Save current game state"
              disabled={!textContent || !!parseError}
            >
              Save
            </button>
            <button
              onClick={() => {
                if (textContent) {
                  navigator.clipboard.writeText(textContent)
                }
              }}
              className={tw`
                text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded
                font-medium transition-colors cursor-pointer border-0
              `}
              title="Copy game state to clipboard"
            >
              Copy
            </button>
            <button
              onClick={handleClear}
              className={tw`
                text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded
                font-medium transition-colors cursor-pointer border-0
              `}
              title="Clear game state and start fresh"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Warning Banner for Default Game Name */}
        {gameName === 'GAME_NAME' && (
          <div className={tw`
            bg-yellow-500/20 border border-yellow-500/50 rounded-md p-3
            text-yellow-200 text-xs leading-relaxed
          `}>
            <div className={tw`font-semibold mb-1`}>⚠️ Default Game Name Detected</div>
            <div>
              Please update the <code className={tw`bg-black/30 px-1 py-0.5 rounded`}>name</code> field in{' '}
              <code className={tw`bg-black/30 px-1 py-0.5 rounded`}>package.json</code> to ensure your game state is stored separately from other games.
            </div>
          </div>
        )}

        {/* Content Area - State Editor */}
        <div className={tw`
          flex-1 overflow-hidden flex flex-col min-h-0
        `}>
          <div className={tw`
            h-full overflow-hidden flex flex-col
            font-mono text-xs leading-relaxed
          `}>
            <div className={tw`
              border border-border-default rounded-md overflow-hidden
              flex-1 flex flex-col relative bg-bg-primary
            `}>
              <textarea
                value={textContent}
                onChange={handleTextChange}
                placeholder="Game state will appear here when the game starts..."
                className={tw`
                  font-mono text-xs leading-[1.5] p-4 m-0
                  text-gray-300 bg-transparent whitespace-pre
                  resize-none outline-none border-0
                  h-full w-full box-border
                  ${parseError ? 'text-red-400' : ''}
                  placeholder:text-gray-600
                `}
                spellCheck={false}
              />
              {parseError && (
                <div className={tw`
                  absolute bottom-0 left-0 right-0
                  bg-red-500 text-white text-xs px-3 py-2
                `}>
                  JSON Error: {parseError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Saved States Section */}
      <div className={tw`
        h-[25%] min-h-[200px] max-h-[300px]
        bg-bg-primary border-t border-border-default
        flex flex-col
      `}>
        <div className={tw`
          px-6 py-3 border-b border-border-default flex-shrink-0
        `}>
          <h4 className={tw`text-white text-sm font-semibold m-0`}>Saved States</h4>
        </div>
        <div className={tw`
          flex-1 overflow-y-auto px-6 py-3
        `}>
          {savedStates.length === 0 ? (
            <div className={tw`text-gray-500 text-xs text-center py-4`}>
              No saved states yet. Click Save to create one.
            </div>
          ) : (
            <div className={tw`flex flex-col gap-2`}>
              {savedStates.map((state) => (
                <SavedStateItem
                  key={state.id}
                  state={state}
                  isEditing={editingLabelId === state.id}
                  editingValue={editingLabelValue}
                  onLoad={() => handleLoadState(state)}
                  onDelete={() => handleDeleteState(state.id)}
                  onStartEdit={() => {
                    setEditingLabelId(state.id)
                    setEditingLabelValue(state.label)
                  }}
                  onEditChange={setEditingLabelValue}
                  onEditSave={() => handleUpdateLabel(state.id, editingLabelValue)}
                  onEditCancel={() => {
                    setEditingLabelId(null)
                    setEditingLabelValue('')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// SavedStateItem component
interface SavedStateItemProps {
  state: SavedState
  isEditing: boolean
  editingValue: string
  onLoad: () => void
  onDelete: () => void
  onStartEdit: () => void
  onEditChange: (value: string) => void
  onEditSave: () => void
  onEditCancel: () => void
}

const SavedStateItem: React.FC<SavedStateItemProps> = ({
  state,
  isEditing,
  editingValue,
  onLoad,
  onDelete,
  onStartEdit,
  onEditChange,
  onEditSave,
  onEditCancel,
}) => {
  const [isHovered, setIsHovered] = useState(false)

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      className={tw`
        relative flex items-center justify-between
        p-3 rounded-md bg-bg-secondary border border-border-default
        hover:border-blue-500/30 transition-all
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={tw`flex-1 min-w-0`}>
        {isEditing ? (
          <input
            type="text"
            value={editingValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditSave()
              if (e.key === 'Escape') onEditCancel()
            }}
            onBlur={onEditSave}
            className={tw`
              bg-transparent border border-blue-500 rounded px-2 py-1
              text-white text-sm outline-none w-full
            `}
            autoFocus
            onFocus={(e) => e.target.select()}
            placeholder="Enter name..."
          />
        ) : (
          <div
            className={tw`text-white text-sm cursor-pointer hover:text-blue-400`}
            onClick={onStartEdit}
            title="Click to edit name"
          >
            {state.label}
          </div>
        )}
        <div className={tw`text-gray-500 text-xs mt-1`}>
          {formatTime(state.timestamp)}
        </div>
      </div>

      {isHovered && !isEditing && (
        <div className={tw`flex items-center gap-2 ml-2`}>
          <button
            onClick={onLoad}
            className={tw`
              text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded
              font-medium transition-colors cursor-pointer border-0
            `}
            title="Load this state"
          >
            Load
          </button>
          <button
            onClick={onDelete}
            className={tw`
              text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded
              font-medium transition-colors cursor-pointer border-0
            `}
            title="Delete this state"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
