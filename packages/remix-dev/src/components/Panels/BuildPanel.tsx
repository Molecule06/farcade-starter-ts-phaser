import React, { useState, useEffect, useRef } from 'react'
import { useBuildSystem, useUIState, useSDKIntegration, useSyntaxHighlighting, useCodeBlockResizing } from '../../hooks'
import { cn, tw } from '../../utils/tw'

export const BuildPanel: React.FC = () => {
  const { 
    buildState, 
    startBuild, 
    copyToClipboard, 
    formatFileSize, 
    formatTimeAgo,
    isBuilding,
    canBuild
  } = useBuildSystem()
  
  const { isBuildPanelOpen } = useUIState()
  const { sdkStatus } = useSDKIntegration()
  const { highlightHTML } = useSyntaxHighlighting()
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const codeDisplayRef = useRef<HTMLPreElement>(null)
  const buildOutputCodeRef = useRef<HTMLDivElement>(null)
  
  // Setup sophisticated code block resizing like the reference version
  const isOutputVisible = buildState.output && buildState.status === 'success'
  useCodeBlockResizing(panelRef, buildOutputCodeRef, !!isOutputVisible)

  // Build panel is controlled only by the build button - no outside click or escape key handling

  // Apply syntax highlighting when build output changes OR when panel becomes visible
  useEffect(() => {
    if (buildState.output && codeDisplayRef.current && buildState.status === 'success' && isBuildPanelOpen) {
      // Small delay to ensure DOM is ready after panel animation
      const timeoutId = setTimeout(() => {
        if (codeDisplayRef.current) {
          highlightHTML(codeDisplayRef.current, buildState.output)
        }
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [buildState.output, buildState.status, highlightHTML, isBuildPanelOpen])

  const handleBuild = async () => {
    if (!canBuild) return
    await startBuild()
  }

  const handleCopyOutput = async () => {
    if (!buildState.output) return
    
    try {
      await copyToClipboard(buildState.output)
      setCopied(true)
      
      // Restore after 1.5 seconds (like reference version)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <div 
      ref={panelRef} 
      className={tw`
        fixed top-0 right-0 w-96 h-[calc(100%-70px)]
        bg-bg-secondary border-l border-border-default
        ${isBuildPanelOpen ? 'translate-x-0' : 'translate-x-full'}
        transition-transform duration-300 ease-in-out
        flex flex-col overflow-hidden z-[100]
        md:w-96 max-md:w-full
      `}
      role="region"
      aria-label="Build panel"
      aria-expanded={isBuildPanelOpen}
    >
      <div className={tw`
        flex-1 p-6 overflow-hidden
        flex flex-col gap-6 min-h-0
      `}>
        {/* Build Controls */}
        <div className="flex flex-col gap-4 w-full flex-shrink-0">
          {/* Build Game Button */}
          <button 
            id="build-game-btn"
            onClick={handleBuild}
            disabled={!canBuild}
            aria-label={isBuilding ? 'Building game' : 'Build game'}
            aria-busy={isBuilding}
            title={!canBuild ? 'Code unchanged since last build' : 'Build the current game code'}
            className={tw`
              flex items-center justify-center gap-2
              px-6 py-4 bg-gradient-to-br from-green-500 to-green-600
              text-white border-none rounded-lg
              text-base font-semibold cursor-pointer
              transition-all duration-200 relative min-h-[52px]
              hover:from-green-600 hover:to-green-700 hover:-translate-y-0.5
              hover:shadow-[0_4px_12px_rgba(34,197,94,0.3)]
              disabled:from-neutral-700 disabled:to-neutral-800 disabled:text-neutral-500
              disabled:cursor-not-allowed disabled:transform-none
              disabled:shadow-none disabled:hover:from-neutral-700 disabled:hover:to-neutral-800
            `}
          >
            <span>{isBuilding ? 'Building...' : 'Build Game'}</span>
            <div className={cn(
              'w-4 h-4 border-2 border-white/30 border-t-white rounded-full',
              'animate-spin',
              isBuilding ? 'block' : 'hidden'
            )} />
          </button>

          {/* Build Button Message */}
          {!canBuild && !isBuilding && (
            <div role="status" aria-live="polite" className={tw`
              text-center text-xs text-text-secondary
              py-2 px-3 bg-bg-tertiary border border-border-light
              rounded-md -mt-2
            `}>
              Code unchanged since last build
            </div>
          )}

          {/* SDK Integration Warning */}
          {!sdkStatus.isComplete && (
            <div role="alert" aria-live="polite" className={tw`
              flex gap-4 p-4 rounded-lg mb-2
              bg-yellow-400/10 border border-yellow-400/20
            `}>
              <div aria-hidden="true" className="text-base flex-shrink-0">⚠️</div>
              <div>
                <strong className="text-yellow-400 block text-sm mb-1.5">SDK Integration Incomplete</strong>
                <p className="text-gray-300 text-sm m-0 leading-[1.4]">Missing SDK handlers: {sdkStatus.missingHandlers.join(', ')}</p>
              </div>
            </div>
          )}

          {/* Build Success */}
          {buildState.status === 'success' && buildState.output && (
            <div role="status" aria-live="polite" className={tw`
              flex gap-4 p-4 rounded-lg mb-2
              bg-green-500/10 border border-green-500/20
            `}>
              <div aria-hidden="true" className="text-base flex-shrink-0">✅</div>
              <div>
                <strong className="text-green-500 block text-sm mb-1.5">Build Successful</strong>
                <p className="text-gray-300 text-sm m-0 leading-[1.4]">Game code has been copied to your clipboard</p>
              </div>
            </div>
          )}

          {/* Build Info - Only show when SDK integration is complete and has previous build */}
          {sdkStatus.isComplete && buildState.status !== 'success' && buildState.status !== 'building' && 
           buildState.lastBuildTime > 0 && buildState.fileSize > 0 && (
            <div aria-label="Build information" className="text-sm text-gray-400 text-center">
              Last build: {formatTimeAgo(buildState.lastBuildTime)} • {formatFileSize(buildState.fileSize)}
            </div>
          )}
        </div>

        {/* Build Output - Generated Code */}
        {buildState.output && buildState.status === 'success' && (
          <div id="build-output" role="region" aria-label="Generated code output" className={tw`
            flex flex-col gap-0.5 flex-1 min-h-0
          `}>
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex flex-col gap-0.5">
                <h4 className="m-0 text-white text-sm font-semibold">Generated Code</h4>
                <span className="text-xs text-gray-400">Built {formatTimeAgo(buildState.lastBuildTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  role="status"
                  aria-live="polite"
                  className={cn(
                    'text-xs font-medium',
                    copied ? 'text-green-500' : 'text-gray-400'
                  )}
                >
                  {copied ? 'Code Copied!' : formatFileSize(buildState.fileSize)}
                </span>
              </div>
            </div>
            <div ref={buildOutputCodeRef} className={tw`
              border border-border-default rounded-md overflow-hidden
              flex-1 flex flex-col relative min-h-0 bg-bg-primary
            `}>
              <button 
                onClick={handleCopyOutput}
                aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
                title={copied ? 'Copied!' : 'Copy code'}
                className={tw`
                  absolute top-3 right-3 flex items-center justify-center
                  w-8 h-8 ${copied ? 'bg-green-500' : 'bg-black/80'}
                  text-gray-300 border border-white/20 rounded
                  cursor-pointer transition-all duration-200
                  backdrop-blur-sm z-10
                  hover:bg-black/80 hover:text-white
                `}
              >
                {copied ? (
                  // Checkmark icon when copied
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                ) : (
                  // Copy icon when not copied
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
                )}
              </button>
              <pre 
                ref={codeDisplayRef}
                className={tw`
                  font-mono text-xs leading-[1.5] p-4 m-0
                  text-gray-300 bg-transparent whitespace-pre-wrap
                  break-all overflow-y-auto overflow-x-auto
                  h-full box-border language-html
                `}
                aria-label="Generated HTML code"
              >
                {buildState.output}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}