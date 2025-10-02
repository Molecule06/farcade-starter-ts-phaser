import React, { useEffect, useState } from 'react'
import { DashboardProvider, useDashboard } from './contexts'
import { GameContainer, StatusBar } from './components/Layout'
import { BuildPanel, PerformancePanel, GameStatePanel } from './components/Panels'
import { 
  ErrorBoundaryWrapper,
  GameContainerErrorBoundary,
  BuildPanelErrorBoundary,
  PerformanceErrorBoundary
} from './components/Common'
import { useUIState } from './hooks'
import { tw } from './utils/tw'
import './main.css'

// Animated spacer component that smoothly transitions with either panel
const AnimatedSpacer: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  return (
    <div 
      className={tw`
        shrink-0 h-full
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-[384px]' : 'w-0'}
      `}
      aria-hidden="true"
    />
  )
}

interface RemixDashboardProps {
  // Future props will go here
}

function DashboardContent() {
  const { isBuildPanelOpen, isGameStatePanelOpen } = useUIState()
  const { dispatch } = useDashboard()
  
  // Set up SDK event listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'remix_dev_flags') {
        dispatch({ type: 'SDK_UPDATE_FLAGS', payload: event.data.flags })
      }
      if (event.data?.type === 'remix_sdk_event') {
        dispatch({ type: 'SDK_ADD_EVENT', payload: event.data })
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [dispatch])
  
  // CSS is now handled via styled-components, no external CSS loading needed

  return (
    <ErrorBoundaryWrapper componentName="Remix Dashboard">
      <div className={tw`
        fixed inset-0
        bg-bg-primary
        font-sans
        flex flex-col
        z-[1000000]
      `}>
        <div className="noise-bg game-container-pattern flex flex-1 items-center justify-center relative">
          <GameContainerErrorBoundary>
            <GameContainer />
          </GameContainerErrorBoundary>
          <AnimatedSpacer isOpen={isBuildPanelOpen || isGameStatePanelOpen} />
        </div>
        
        <ErrorBoundaryWrapper componentName="Status Bar">
          <StatusBar />
        </ErrorBoundaryWrapper>
        
        <BuildPanelErrorBoundary>
          <BuildPanel />
        </BuildPanelErrorBoundary>
        
        <PerformanceErrorBoundary>
          <PerformancePanel />
        </PerformanceErrorBoundary>
        
        <ErrorBoundaryWrapper componentName="Game State Panel">
          <GameStatePanel isOpen={isGameStatePanelOpen} />
        </ErrorBoundaryWrapper>
      </div>
    </ErrorBoundaryWrapper>
  )
}

export const RemixDashboard: React.FC<RemixDashboardProps> = () => {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}