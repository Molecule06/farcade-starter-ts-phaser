import React from 'react'
import { cn, tw } from '../../utils/tw'
import '../../styles/app.css'

interface RemixDevContainerProps {
  children: React.ReactNode
  buildPanelOpen?: boolean
  className?: string
}

export const RemixDevContainer: React.FC<RemixDevContainerProps> = ({ 
  children, 
  buildPanelOpen, 
  className 
}) => {
  return (
    <div 
      className={cn(
        tw`
          fixed inset-0 z-[1000000]
          bg-bg-primary flex flex-col
          font-sans
        `,
        buildPanelOpen && 'build-panel-open',
        className
      )}
      style={{
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif'
      }}
    >
      <style>{`
        .build-panel-open .build-panel-spacer {
          width: 400px;
        }
        
        [data-container] button {
          outline: none;
        }
      `}</style>
      <div data-container>{children}</div>
    </div>
  )
}

interface MainContentWrapperProps {
  children: React.ReactNode
  className?: string
}

export const MainContentWrapper: React.FC<MainContentWrapperProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn(
      tw`
        flex-1 flex flex-row
        min-h-0
      `,
      className
    )}>
      {children}
    </div>
  )
}

interface BuildPanelSpacerProps {
  isOpen?: boolean
  className?: string
}

export const BuildPanelSpacer: React.FC<BuildPanelSpacerProps> = ({ 
  isOpen, 
  className 
}) => {
  return (
    <div 
      className={cn(
        tw`
          w-0 flex-shrink-0 pointer-events-none
          bg-transparent transition-[width] duration-normal ease-out
          build-panel-spacer
        `,
        isOpen && 'w-[400px]',
        className
      )}
    />
  )
}

// Global styles component for background patterns and mobile responsiveness
export const GlobalStyles: React.FC = () => {
  return (
    <style>{`
      body.show-background-pattern .game-container::before {
        opacity: var(--background-pattern-opacity, 0);
      }

      body.background-pattern-transitioning .game-container::before {
        transition: opacity 300ms ease-in-out;
      }
      
      @media (pointer: coarse) and (hover: none) {
        #mobile-qr-btn {
          display: none;
        }
      }

      @media (max-width: 500px) {
        .build-toggle-btn,
        .build-toggle-btn-clean,
        #mobile-qr-btn {
          display: none;
        }
      }
    `}</style>
  )
}