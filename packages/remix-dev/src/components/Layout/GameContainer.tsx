import React, { useRef, useEffect, useState, useCallback } from "react"
import { useDashboard } from "../../contexts"
import { usePerformanceMonitor } from "../../hooks"
import { CanvasControlBar } from "./CanvasControlBar"
import { GameOverlay } from "./GameOverlay"
import { cn, tw } from "../../utils/tw"
import "../../styles/app.css"

const CANVAS_MIN_WIDTH = 378
const DEFAULT_CANVAS_WIDTH = 392  // 392 * 1.5 = 588 (whole pixels)
const CANVAS_GAP = 24
const SAFE_PADDING = 10
const CANVAS_ASPECT_RATIO = "2 / 3"

// Simple hook to check multiplayer flag
function useMultiplayerFlag() {
  const [isMultiplayer, setIsMultiplayer] = useState<boolean | null>(null)

  useEffect(() => {
    fetch("/package.json")
      .then((res) => res.json())
      .then((pkg) => setIsMultiplayer(pkg.multiplayer === true))
      .catch(() => setIsMultiplayer(false))
  }, [])

  return isMultiplayer
}

interface GameContainerProps {
  // Props can be added as needed
}

export const GameContainer: React.FC<GameContainerProps> = () => {
  const { state, dispatch } = useDashboard()
  const isMultiplayerFlag = useMultiplayerFlag()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const iframe2Ref = useRef<HTMLIFrameElement>(null)
  const gameFrameRef = useRef<HTMLDivElement>(null)
  const [frameSize, setFrameSize] = useState({ width: 390, height: 844 })
  const [activeTab, setActiveTab] = useState<1 | 2>(1)
  const [useTabView, setUseTabView] = useState(false)
  const playerInstanceMap = useRef<Record<string, 1 | 2>>({})
  const tabControlsRef = useRef<HTMLDivElement>(null)

  const resolveFrameForUserId = useCallback(
    (userId: string | number | undefined | null): 1 | 2 | null => {
      if (userId === undefined || userId === null) {
        return null
      }

      const normalized = String(userId)
      const mapped = playerInstanceMap.current[normalized]
      if (mapped === 1 || mapped === 2) {
        return mapped
      }

      const numeric = Number(normalized)
      if (numeric === 1 || numeric === 2) {
        return numeric as 1 | 2
      }

      return null
    },
    []
  )

  const updateActivePlayerFromAlerts = useCallback(
    (alerts: unknown) => {
      if (!alerts) {
        return
      }

      const candidates = Array.isArray(alerts) ? alerts : [alerts]

      for (const candidate of candidates) {
        const frame = resolveFrameForUserId(candidate)
        if (frame) {
          playerInstanceMap.current[String(candidate)] = frame
          dispatch({
            type: "GAME_UPDATE",
            payload: {
              activePlayerFrame: frame,
              activePlayerUserId: String(candidate),
            },
          })
          break
        }
      }
    },
    [dispatch, resolveFrameForUserId]
  )

  // Set isMultiplayer with a default to avoid undefined state
  // While loading (null), treat as multiplayer to keep layout sizing consistent
  const isMultiplayer = isMultiplayerFlag === null ? true : isMultiplayerFlag

  // Initialize performance monitoring
  const { startMonitoring } = usePerformanceMonitor({
    iframe: iframeRef.current,
    updateInterval: 1000,
    maxDataPoints: 60,
  })

  // Get turn indicator for player - checks game state for active turn
  const activePlayerFrame = state.game.activePlayerFrame

  const getMutedState = useCallback(
    (playerId: string) => Boolean(state.game.mutedFrames?.[playerId]),
    [state.game.mutedFrames]
  )

  const getTurnIndicator = (playerId: 1 | 2): boolean => {
    if (activePlayerFrame === 1 || activePlayerFrame === 2) {
      return activePlayerFrame === playerId
    }

    const gameStateEvents = state.sdk.events.filter(
      (event) =>
        event.type === "game_state_updated" ||
        event.type === "multiplayer_game_state_broadcast" ||
        event.type === "single_player_save_game_state"
    )

    const latestGameState = gameStateEvents[gameStateEvents.length - 1]
    const gameData =
      latestGameState?.data?.gameState || latestGameState?.data || {}

    if (gameData.currentPlayer !== undefined) {
      return gameData.currentPlayer === playerId
    } else if (gameData.turn !== undefined) {
      return gameData.turn === playerId
    } else if (gameData.activePlayer !== undefined) {
      return gameData.activePlayer === playerId
    }

    return playerId === 1
  }

  const canvasBaseWidth = frameSize.width > 0 ? frameSize.width : CANVAS_MIN_WIDTH

  type CanvasCardConfig = {
    key: string
    playerId?: "1" | "2"
    iframeId: string
    iframeRef: React.RefObject<HTMLIFrameElement | null>
    src: string
    overlayPlayerId?: "1" | "2"
    showPlayerLabel: boolean
    visible: boolean
    onLoad?: () => void
  }

  const handleIframeLoad = () => {
    if (iframeRef.current) {
      startMonitoring()
    }
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const player1Window = iframeRef.current?.contentWindow
      const player2Window = iframe2Ref.current?.contentWindow
      const isFromPlayer1 = event.source === player1Window
      const isFromPlayer2 = isMultiplayer && event.source === player2Window

      if (!isFromPlayer1 && !isFromPlayer2) {
        return
      }

      const playerId = isFromPlayer1 ? '1' : '2'
      const frameNumber: 1 | 2 = playerId === '2' ? 2 : 1

      const isSdkEnvelope =
        event.data?.type === 'remix_sdk_event' || event.data?.type === 'game_event'
      if (isSdkEnvelope) {
        const { event: sdkEvent } = event.data ?? {}
        if (!sdkEvent || typeof sdkEvent.type !== 'string') {
          return
        }

        dispatch({
          type: 'SDK_ADD_EVENT',
          payload: {
            type: sdkEvent.type,
            data: sdkEvent.data,
            playerId,
            timestamp: Date.now(),
          },
        })

        const flagUpdates: Record<string, boolean> = {}

        switch (sdkEvent.type) {
          case 'ready':
            flagUpdates.ready = true
            break
          case 'game_state_updated':
            updateActivePlayerFromAlerts(
              sdkEvent.data?.alertUserIds ??
                sdkEvent.data?.gameState?.alertUserIds ??
                sdkEvent.data?.data?.alertUserIds
            )
            break
          case 'play_again':
            flagUpdates.playAgain = true
            dispatch({
              type: 'GAME_UPDATE',
              payload: {
                isGameOver: false,
                score: 0,
                playerId,
              },
            })
            break
          case 'game_over':
          case 'multiplayer_game_over': {
            flagUpdates.gameOver = true
            let gameOverScore =
              sdkEvent.data?.score || sdkEvent.data?.finalScore || 0

            if (
              sdkEvent.type === 'multiplayer_game_over' &&
              Array.isArray(sdkEvent.data?.scores)
            ) {
              const entry = sdkEvent.data.scores.find(
                (scoreEntry: any) => String(scoreEntry?.playerId) === playerId
              )
              if (entry && typeof entry.score === 'number') {
                gameOverScore = entry.score
              }
            }

            dispatch({
              type: 'GAME_UPDATE',
              payload: {
                isGameOver: true,
                score: gameOverScore,
                playerId,
              },
            })
            break
          }
          case 'toggle_mute': {
            flagUpdates.toggleMute = true
            const targetId = String(
              sdkEvent.data?.playerId ??
                sdkEvent.data?.player?.id ??
                playerId ??
                frameNumber
            )
            const eventMuted = sdkEvent.data?.isMuted
            const nextMuted =
              typeof eventMuted === 'boolean'
                ? eventMuted
                : !Boolean(state.game.mutedFrames?.[targetId])

            dispatch({
              type: 'GAME_UPDATE',
              payload: {
                mutedFrames: {
                  ...(state.game.mutedFrames || {}),
                  [targetId]: nextMuted,
                },
              },
            })
            break
          }
        }

        if (sdkEvent.type === 'game_info') {
          const localPlayerId =
            sdkEvent.data?.player?.id ??
            sdkEvent.data?.playerId ??
            sdkEvent.data?.meId ??
            sdkEvent.data?.player?.playerId

          if (localPlayerId) {
            playerInstanceMap.current[String(localPlayerId)] = frameNumber
          }

          const playersList = sdkEvent.data?.players
          if (Array.isArray(playersList)) {
            playersList.forEach((playerData: any) => {
              const candidateId = playerData?.id ?? playerData?.playerId
              if (!candidateId) return
              if (!playerInstanceMap.current[String(candidateId)]) {
                const resolved = resolveFrameForUserId(candidateId)
                if (resolved) {
                  playerInstanceMap.current[String(candidateId)] = resolved
                }
              }
            })
          }
        }

        if (Object.keys(flagUpdates).length > 0) {
          dispatch({
            type: 'SDK_UPDATE_FLAGS',
            payload: flagUpdates,
          })
        }
      } else if (event.data?.type === 'multiplayer_game_state_broadcast') {
        updateActivePlayerFromAlerts(event.data?.gameState?.alertUserIds)
        const otherIframe = isFromPlayer1
          ? iframe2Ref.current
          : iframeRef.current
        if (otherIframe?.contentWindow) {
          otherIframe.contentWindow.postMessage(event.data, '*')
        }
      } else if (event.data?.type === 'single_player_game_state_broadcast') {
        // For single player, still update the UI but no need to forward to other iframe
        dispatch({
          type: 'SDK_EVENT',
          payload: {
            type: 'single_player_save_game_state',
            data: event.data.gameState
          }
        })
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [
    dispatch,
    isMultiplayer,
    resolveFrameForUserId,
    updateActivePlayerFromAlerts,
    state.game.mutedFrames,
  ])

  const updateGameFrameSize = useCallback(() => {
    const container = gameFrameRef.current
    if (!container) return

    const hostElement = container.parentElement ?? container
    const hostBounds = hostElement.getBoundingClientRect()

    const fallbackWidth = Math.max(window.innerWidth - SAFE_PADDING * 2, 0)
    const rawAvailableWidth = hostBounds.width > 0 ? hostBounds.width : fallbackWidth
    const effectiveWidth = Math.max(rawAvailableWidth - SAFE_PADDING * 2, 0)
    if (effectiveWidth <= 0) return

    const tabHeight = tabControlsRef.current
      ? tabControlsRef.current.getBoundingClientRect().height
      : 0

    const controlBarElement = container.querySelector('[data-control-bar]') as HTMLElement | null
    const controlBarHeight = controlBarElement
      ? controlBarElement.getBoundingClientRect().height
      : 0

    const aspectRatio = 2 / 3
    const inverseAspectRatio = 3 / 2

    const totalCardCount = isMultiplayer ? 2 : 1

    const fallbackHeight = Math.max(window.innerHeight - SAFE_PADDING * 2, 0)
    const hostHeight = hostBounds.height
    const rawAvailableHeight = hostHeight > 0 ? hostHeight : fallbackHeight
    const effectiveHeight = Math.max(rawAvailableHeight - SAFE_PADDING * 2, 0)

    if (state.ui.isMiniMode) {
      let shouldUseTabView = false
      let cardCount = totalCardCount

      const baseCardWidth = DEFAULT_CANVAS_WIDTH
      const baseCardHeight = 590
      const totalWidthNeeded =
        cardCount === 2 ? baseCardWidth * 2 + CANVAS_GAP : baseCardWidth

      if (isMultiplayer && effectiveWidth < baseCardWidth * 2 + CANVAS_GAP) {
        shouldUseTabView = true
        cardCount = 1
      }

      const maxHeight = Math.max(effectiveHeight - tabHeight, 0)

      const widthScale = totalWidthNeeded > 0 ? effectiveWidth / totalWidthNeeded : 1
      const heightScale = baseCardHeight > 0 ? maxHeight / baseCardHeight : 1
      const scale = Math.min(widthScale, heightScale, 1)

      const scaledWidth = shouldUseTabView
        ? Math.min(baseCardWidth, effectiveWidth)
        : totalWidthNeeded * scale

      const widthPerCard = shouldUseTabView
        ? scaledWidth
        : Math.max(
            (scaledWidth - (cardCount - 1) * CANVAS_GAP) / Math.max(cardCount, 1),
            0
          )

      let finalWidth = Math.max(widthPerCard, CANVAS_MIN_WIDTH)
      finalWidth = Math.min(finalWidth, baseCardWidth)
      finalWidth = Math.min(finalWidth, effectiveWidth)
      
      // Ensure width is even for better 2:3 ratio calculations
      const evenWidth = Math.floor(finalWidth / 2) * 2

      setFrameSize({
        width: evenWidth,
        height: Math.floor(baseCardHeight),
      })
      setUseTabView(shouldUseTabView)
      return
    }

    let shouldUseTabView = false
    let visibleCardCount = totalCardCount

    const minWidthForTwoUp = DEFAULT_CANVAS_WIDTH * 2 + CANVAS_GAP
    if (isMultiplayer && effectiveWidth < minWidthForTwoUp) {
      shouldUseTabView = true
      visibleCardCount = 1
    }

    const horizontalGutters = (visibleCardCount - 1) * CANVAS_GAP
    const usableWidth = Math.max(effectiveWidth - horizontalGutters, 0)
    const widthPerCardFromWidth =
      visibleCardCount > 0 ? usableWidth / visibleCardCount : usableWidth

    const availableCanvasHeight = Math.max(
      effectiveHeight - tabHeight - controlBarHeight,
      0
    )

    let targetWidth = widthPerCardFromWidth

    if (availableCanvasHeight > 0) {
      const heightLimitedWidth = availableCanvasHeight * aspectRatio
      if (heightLimitedWidth > 0) {
        targetWidth = Math.min(targetWidth, heightLimitedWidth)
      }
    }

    targetWidth = Math.max(targetWidth, CANVAS_MIN_WIDTH)
    targetWidth = Math.min(targetWidth, effectiveWidth)

    // Ensure width is even for better 2:3 ratio calculations
    const evenWidth = Math.floor(targetWidth / 2) * 2
    const finalHeight = evenWidth * inverseAspectRatio + controlBarHeight
    
    setFrameSize({
      width: evenWidth,
      height: Math.floor(finalHeight),
    })
    setUseTabView(shouldUseTabView)
  }, [isMultiplayer, state.ui.isMiniMode])

  useEffect(() => {
    updateGameFrameSize()

    const handleResize = () => {
      updateGameFrameSize()
    }
    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  }, [updateGameFrameSize])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ResizeObserverCtor = window.ResizeObserver
    if (!ResizeObserverCtor) return
    if (!gameFrameRef.current) return

    const observer = new ResizeObserverCtor(() => updateGameFrameSize())
    observer.observe(gameFrameRef.current)

    return () => observer.disconnect()
  }, [updateGameFrameSize])

  useEffect(() => {
    updateGameFrameSize()
  }, [state.ui.isMiniMode, updateGameFrameSize])

  useEffect(() => {
    updateGameFrameSize()
  }, [
    state.ui.showBuildPanel,
    state.ui.showGameStatePanel,
    state.ui.showSettingsPanel,
    state.ui.showPerformancePanel,
    state.ui.showQrPanel,
    updateGameFrameSize,
  ])

  useEffect(() => {
    updateGameFrameSize()
  }, [useTabView, updateGameFrameSize])

  useEffect(() => {
    if (
      useTabView &&
      (state.game.activePlayerFrame === 1 || state.game.activePlayerFrame === 2)
    ) {
      setActiveTab(state.game.activePlayerFrame)
    }
  }, [useTabView, state.game.activePlayerFrame])

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      window.testSDKEvent = (eventType: string, data?: any) => {
        if (iframeRef.current?.contentWindow) {
          window.postMessage(
            {
              type: "remix_sdk_event",
              event: {
                type: eventType,
                data: data || {},
              },
            },
            window.location.origin
          )
        }
      }

      window.resetSDKFlags = () => {
        dispatch({
          type: "SDK_UPDATE_FLAGS",
          payload: {
            ready: false,
            gameOver: false,
            playAgain: false,
            toggleMute: false,
          },
        })
      }

      return () => {
        delete window.testSDKEvent
        delete window.resetSDKFlags
      }
    }
  }, [dispatch])

  // Show loading state while determining multiplayer mode
  if (isMultiplayerFlag === null) {
    return (
      <div
        className={tw`
          relative flex-1 flex flex-col h-full
          p-[10px] items-center justify-center
          min-h-0
        `}
      >
        <div className={tw`text-gray-500`}>Loading...</div>
      </div>
    )
  }

  const canvasCards: CanvasCardConfig[] = isMultiplayer
    ? [
        {
          key: "player-1",
          playerId: "1" as const,
          iframeId: "game-iframe-1",
          iframeRef,
          src: "/?player=1&instance=1",
          overlayPlayerId: "1" as const,
          showPlayerLabel: true,
          visible: !useTabView || activeTab === 1,
          onLoad: handleIframeLoad,
        },
        {
          key: "player-2",
          playerId: "2" as const,
          iframeId: "game-iframe-2",
          iframeRef: iframe2Ref,
          src: "/?player=2&instance=2",
          overlayPlayerId: "2" as const,
          showPlayerLabel: true,
          visible: !useTabView || activeTab === 2,
        },
      ]
    : [
        {
          key: "single",
          playerId: "1" as const,
          iframeId: "game-iframe",
          iframeRef,
          src: "/",
          overlayPlayerId: undefined,
          showPlayerLabel: false,
          visible: true,
          onLoad: handleIframeLoad,
        },
      ]

  const visibleCount = canvasCards.some((card) => card.visible)
    ? canvasCards.filter((card) => card.visible).length
    : 1
  const rowMaxWidthPx =
    visibleCount * canvasBaseWidth + (visibleCount - 1) * CANVAS_GAP

  const rowStyle: React.CSSProperties = {
    display: "flex",
    gap: `${CANVAS_GAP}px`,
    width: "100%",
    justifyContent: "center",
    maxWidth: `${rowMaxWidthPx}px`,
    margin: "0 auto",
    alignItems: "stretch",
    flexWrap: "nowrap",
  }

  const renderCanvasCard = (config: CanvasCardConfig) => {
    const {
      key,
      playerId,
      iframeId,
      iframeRef,
      src,
      overlayPlayerId,
      showPlayerLabel,
      visible,
      onLoad,
    } = config

    const numericPlayer = playerId === "2" ? 2 : 1
    const isActive = playerId ? activePlayerFrame === numericPlayer : true
    const isMuted = playerId ? getMutedState(playerId) : getMutedState("1")

    const computedWidth = Math.max(canvasBaseWidth, CANVAS_MIN_WIDTH)
    const cardWidthValue = `${computedWidth}px`

    return (
      <div
        key={key}
        className={tw`flex flex-col`}
        style={{
          flex: "0 0 auto",
          flexBasis: cardWidthValue,
          minWidth: state.ui.isMiniMode ? CANVAS_MIN_WIDTH : computedWidth,
          width: cardWidthValue,
          maxWidth: cardWidthValue,
          display: visible ? "flex" : "none",
        }}
      >
        <CanvasControlBar
          playerId={playerId}
          iframeId={iframeId}
          isActive={isActive}
          isMuted={isMuted}
          showPlayerLabel={showPlayerLabel}
        />
        <div
          className={tw`
            relative w-full
            transition-[width,height] duration-normal ease-out
            game-container flex-1
          `}
          style={{
            aspectRatio: CANVAS_ASPECT_RATIO,
          }}
        >
          <div
            className={tw`
              relative h-full w-full overflow-hidden rounded-lg
              shadow-[0_0_0_1px_rgba(38,38,38,1)]
            `}
          >
            <iframe
              ref={iframeRef}
              id={iframeId}
              src={src}
              title={
                playerId ? `Player ${playerId} game` : "Interactive game content"
              }
              aria-label={
                playerId ? `Player ${playerId} game frame` : "Game preview frame"
              }
              onLoad={onLoad}
              sandbox="allow-scripts allow-forms allow-pointer-lock allow-same-origin allow-top-navigation-by-user-activation"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
              }}
            />
          </div>
          {overlayPlayerId ? (
            <GameOverlay playerId={overlayPlayerId} />
          ) : (
            <GameOverlay />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={gameFrameRef}
      className={tw`
        relative flex-1 flex flex-col h-full
        p-[10px] items-center justify-center
        min-h-0
      `}
    >
      <style>{`
        .game-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url("");
          background-size: 150px 150px;
          background-repeat: repeat;
          opacity: 0;
          mix-blend-mode: overlay;
          pointer-events: none;
          z-index: 0;
          transition: none;
        }

        body.show-background-pattern .game-container::before {
          opacity: var(--background-pattern-opacity, 0);
        }

        body.background-pattern-transitioning .game-container::before {
          transition: opacity 300ms ease-in-out;
        }
      `}</style>

      <div
        className={tw`
          relative flex flex-col items-center justify-center flex-1
        `}
      >
        {/* Player controls - tabs for narrow, labels for wide */}
        {isMultiplayer && useTabView && (
          <div
            ref={tabControlsRef}
            className={tw`
              flex justify-center gap-2
              mb-3 z-10
            `}
          >
            <button
              onClick={() => setActiveTab(1)}
              className={cn(
                tw`
                  flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md
                  transition-all duration-200 border min-w-[80px] justify-center
                  bg-[#1a1a1a] text-gray-300 hover:text-white
                `,
                activeTab === 1
                  ? tw`border-green-400`
                  : tw`border-gray-600 hover:border-gray-500`
              )}
            >
              <span>Player 1</span>
              <div
                className={tw`
                  w-2 h-2 rounded-full
                  ${
                    getTurnIndicator(1)
                      ? "bg-green-400 animate-pulse"
                      : "bg-gray-600"
                  }
                `}
              />
            </button>
            <button
              onClick={() => setActiveTab(2)}
              className={cn(
                tw`
                  flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md
                  transition-all duration-200 border min-w-[80px] justify-center
                  bg-[#1a1a1a] text-gray-300 hover:text-white
                `,
                activeTab === 2
                  ? tw`border-green-400`
                  : tw`border-gray-600 hover:border-gray-500`
              )}
            >
              <span>Player 2</span>
              <div
                className={tw`
                  w-2 h-2 rounded-full
                  ${
                    getTurnIndicator(2)
                      ? "bg-green-400 animate-pulse"
                      : "bg-gray-600"
                  }
                `}
              />
            </button>
          </div>
        )}

        <div style={rowStyle}>{canvasCards.map(renderCanvasCard)}</div>
      </div>
    </div>
  )
}

// TypeScript declaration for development helpers
declare global {
  interface Window {
    testSDKEvent?: (eventType: string, data?: any) => void
    resetSDKFlags?: () => void
  }
}
