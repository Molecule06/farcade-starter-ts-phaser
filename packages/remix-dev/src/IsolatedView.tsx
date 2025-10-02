import React, { useEffect, useState, useRef } from 'react'
import { tw, cn } from './utils/tw'
import { ensureDevHost } from './mocks/RemixSDKMock'
import { isDevEnvironment } from './utils/environment'
import './main.css'

export const IsolatedView: React.FC = () => {
  const [dimensions, setDimensions] = useState({ width: '100vw', height: '100vh' })
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<1 | 2>(1)
  const [isHostReady, setIsHostReady] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Initialize SDK mock for development
  useEffect(() => {
    if (isDevEnvironment()) {
      // Ensure host is set up in parent window
      const host = ensureDevHost(true)
      // Small delay to ensure host is fully initialized
      setTimeout(() => {
        setIsHostReady(true)
      }, 100)
    } else {
      // Not in dev environment, no SDK needed
      setIsHostReady(true)
    }
  }, [])

  // Handle iframe load to set up SDK communication
  const handleIframeLoad = () => {
    if (iframeRef.current && isDevEnvironment()) {
      // The SDK mock handles communication via postMessage
      // Just need to ensure the iframe can communicate with parent
      const iframe = iframeRef.current

      // Send a message to let the iframe know the SDK is available
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'sdk_ready' }, '*')
        }
      }, 100)
    }
  }

  // Check multiplayer flag
  useEffect(() => {
    fetch('/package.json')
      .then(res => res.json())
      .then(pkg => setIsMultiplayer(pkg.multiplayer === true))
      .catch(() => setIsMultiplayer(false))
  }, [])

  useEffect(() => {
    const calculateDimensions = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const aspectRatio = 2 / 3

      // Calculate dimensions to fit within viewport while maintaining aspect ratio
      let width = vw
      let height = vw * (3/2) // Height based on width with 2:3 ratio

      if (height > vh) {
        // If calculated height exceeds viewport, scale based on height instead
        height = vh
        width = vh * aspectRatio
      }

      setDimensions({
        width: `${width}px`,
        height: `${height}px`
      })
    }

    calculateDimensions()
    window.addEventListener('resize', calculateDimensions)
    window.addEventListener('orientationchange', calculateDimensions)

    return () => {
      window.removeEventListener('resize', calculateDimensions)
      window.removeEventListener('orientationchange', calculateDimensions)
    }
  }, [])

  return (
    <div className={tw`
      fixed inset-0 bg-black
      flex flex-col items-center justify-center
    `}>
      {/* Controls header */}
      {isMultiplayer ? (
        /* Multiplayer tab switcher and reset button */
        <div className={tw`
          flex gap-2 mb-2 z-10
        `}>
          <button
            onClick={() => setActiveTab(1)}
            className={cn(
              tw`
                px-4 py-2 text-sm font-medium rounded-md
                transition-all duration-200 border
                bg-[#1a1a1a] text-gray-300
              `,
              activeTab === 1
                ? tw`border-green-400 text-white`
                : tw`border-gray-600`
            )}
          >
            Player 1
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={cn(
              tw`
                px-4 py-2 text-sm font-medium rounded-md
                transition-all duration-200 border
                bg-[#1a1a1a] text-gray-300
              `,
              activeTab === 2
                ? tw`border-green-400 text-white`
                : tw`border-gray-600`
            )}
          >
            Player 2
          </button>
          <button
            onClick={() => {
              // Clear all game state from localStorage
              if (typeof window !== 'undefined' && window.localStorage) {
                const keysToRemove: string[] = []
                for (let i = 0; i < window.localStorage.length; i++) {
                  const key = window.localStorage.key(i)
                  if (key && (key.includes('remix') || key.includes('game') || key.includes('rack'))) {
                    keysToRemove.push(key)
                  }
                }
                keysToRemove.forEach(key => window.localStorage.removeItem(key))
              }
              // Reload both iframes to reset the game
              window.location.reload()
            }}
            className={tw`
              px-4 py-2 text-sm font-medium rounded-md
              transition-all duration-200 border
              bg-red-600 text-white border-red-700
              hover:bg-red-700 hover:border-red-800
              ml-4
            `}
          >
            RESET
          </button>
        </div>
      ) : (
        /* Single player reset button */
        <div className={tw`
          flex gap-2 mb-2 z-10
        `}>
          <button
            onClick={() => {
              // Clear all game state from localStorage
              if (typeof window !== 'undefined' && window.localStorage) {
                const keysToRemove: string[] = []
                for (let i = 0; i < window.localStorage.length; i++) {
                  const key = window.localStorage.key(i)
                  if (key && (key.includes('remix') || key.includes('game') || key.includes('rack'))) {
                    keysToRemove.push(key)
                  }
                }
                keysToRemove.forEach(key => window.localStorage.removeItem(key))
              }
              // Reload to reset the game
              window.location.reload()
            }}
            className={tw`
              px-4 py-2 text-sm font-medium rounded-md
              transition-all duration-200 border
              bg-red-600 text-white border-red-700
              hover:bg-red-700 hover:border-red-800
            `}
          >
            RESET
          </button>
        </div>
      )}

      <div
        style={{
          width: dimensions.width,
          height: dimensions.height,
          position: 'relative'
        }}
      >
        {/* Only render iframes after host is ready */}
        {!isHostReady ? (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '14px'
          }}>
            Initializing...
          </div>
        ) : !isMultiplayer ? (
          <iframe
            ref={iframeRef}
            src="/"
            title="Game"
            onLoad={handleIframeLoad}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            sandbox="allow-scripts allow-forms allow-pointer-lock allow-same-origin"
          />
        ) : (
          <iframe
            ref={iframeRef}
            key={activeTab} // Force remount on tab change
            src={activeTab === 1 ? "/?player=1&instance=1" : "/?player=2&instance=2"}
            title={`Player ${activeTab} Game`}
            onLoad={handleIframeLoad}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            sandbox="allow-scripts allow-forms allow-pointer-lock allow-same-origin"
          />
        )}
      </div>
    </div>
  )
}