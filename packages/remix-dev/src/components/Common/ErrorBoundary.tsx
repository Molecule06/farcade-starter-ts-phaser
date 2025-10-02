import React, { Component, ReactNode } from 'react'
import { cn, tw } from '../../utils/tw'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  componentName?: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    
    // Log error details
    console.error(`ErrorBoundary caught an error in ${this.props.componentName || 'component'}:`, error)
    console.error('Error details:', errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className={tw`
          flex items-center justify-center min-h-[200px] p-6
          bg-red-500/5 border border-red-500/20 rounded-lg m-4
        `}>
          <div className="text-center max-w-[500px]">
            <div className="text-red-500 mb-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
              </svg>
            </div>
            
            <h3 className="text-white text-lg font-semibold mb-3 m-0">
              Something went wrong in the {this.props.componentName || 'dashboard'}
            </h3>
            
            <p className="text-gray-400 text-sm leading-relaxed mb-5 m-0">
              An unexpected error occurred while rendering this component. 
              This might be a temporary issue.
            </p>

            {this.state.error && (
              <details className="my-5 text-left">
                <summary className={tw`
                  cursor-pointer text-gray-500 text-xs font-medium mb-3
                  select-none hover:text-gray-400
                `}>
                  Error Details
                </summary>
                <div className={tw`
                  bg-black/30 border border-white/10 rounded p-3 mt-2
                `}>
                  <div className="text-red-500 font-semibold text-sm mb-1">
                    {this.state.error.name}
                  </div>
                  <div className="text-gray-300 text-xs mb-2">
                    {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className={tw`
                      text-gray-400 text-[11px] font-mono overflow-x-auto
                      my-2 p-2 bg-black/20 rounded whitespace-pre-wrap break-all
                    `}>
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex gap-3 justify-center mt-5">
              <button 
                onClick={this.handleRetry}
                className={tw`
                  px-4 py-2 rounded-md text-sm font-medium cursor-pointer
                  transition-all duration-200 border-0 outline-none
                  bg-green-500 text-black hover:bg-green-600 active:bg-green-700
                `}
              >
                Try Again
              </button>
              <button 
                onClick={this.handleReload}
                className={tw`
                  px-4 py-2 rounded-md text-sm font-medium cursor-pointer
                  transition-all duration-200 border border-white/20 outline-none
                  bg-white/10 text-gray-300 hover:bg-white/15 active:bg-white/5
                `}
              >
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Wrapper component for functional component error handling
interface ErrorBoundaryWrapperProps {
  children: ReactNode
  componentName?: string
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  fallback?: (error: Error, retry: () => void) => ReactNode
}

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({ 
  children, 
  componentName, 
  onError,
  fallback 
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Add additional dashboard-specific error handling
    if (onError) {
      onError(error, errorInfo)
    }
    
    // Could add error reporting service here
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }

  const customFallback = fallback ? (
    <ErrorBoundary componentName={componentName} onError={handleError}>
      {children}
    </ErrorBoundary>
  ) : undefined

  return (
    <ErrorBoundary 
      componentName={componentName}
      onError={handleError}
      fallback={customFallback}
    >
      {children}
    </ErrorBoundary>
  )
}

// Specialized error boundaries for different dashboard components
export const GameContainerErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryWrapper componentName="Game Container">
    {children}
  </ErrorBoundaryWrapper>
)

export const PerformanceErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryWrapper 
    componentName="Performance Monitor"
    fallback={(error, retry) => (
      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-md">
        <div className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-500 flex-shrink-0">
            <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
          <div className="flex-1 text-left">
            <strong className="block text-white text-sm mb-1">Performance monitoring unavailable</strong>
            <div className="text-gray-400 text-xs">An error occurred while monitoring performance data.</div>
          </div>
          <button 
            onClick={retry}
            className={tw`
              px-3 py-1.5 bg-green-500 text-black border-0 rounded text-xs
              font-medium cursor-pointer transition-all duration-200 hover:bg-green-600
            `}
          >
            Retry
          </button>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundaryWrapper>
)

export const BuildPanelErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryWrapper 
    componentName="Build Panel"
    fallback={(error, retry) => (
      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-md">
        <div className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-500 flex-shrink-0">
            <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
          <div className="flex-1 text-left">
            <strong className="block text-white text-sm mb-1">Build panel unavailable</strong>
            <div className="text-gray-400 text-xs">An error occurred while loading the build panel.</div>
          </div>
          <button 
            onClick={retry}
            className={tw`
              px-3 py-1.5 bg-green-500 text-black border-0 rounded text-xs
              font-medium cursor-pointer transition-all duration-200 hover:bg-green-600
            `}
          >
            Retry
          </button>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundaryWrapper>
)

export const SettingsPanelErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryWrapper 
    componentName="Settings Panel"
    fallback={(error, retry) => (
      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-md">
        <div className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-500 flex-shrink-0">
            <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
          <div className="flex-1 text-left">
            <strong className="block text-white text-sm mb-1">Settings unavailable</strong>
            <div className="text-gray-400 text-xs">An error occurred while loading settings.</div>
          </div>
          <button 
            onClick={retry}
            className={tw`
              px-3 py-1.5 bg-green-500 text-black border-0 rounded text-xs
              font-medium cursor-pointer transition-all duration-200 hover:bg-green-600
            `}
          >
            Retry
          </button>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundaryWrapper>
)