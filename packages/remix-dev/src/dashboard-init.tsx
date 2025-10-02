import React from 'react'
import { createRoot } from 'react-dom/client'
import { RemixDashboard } from './RemixDashboard'
import { IsolatedView } from './IsolatedView'
import { ensureDevHost } from './mocks/RemixSDKMock'
import { isDevEnvironment } from './utils/environment'

// Initialize React Dashboard
export function initializeReactDashboard(): void {
  // Check if we're in isolated mode
  const urlParams = new URLSearchParams(window.location.search)
  const isIsolated = urlParams.has('isolated')

  // Find the container or create one
  let container = document.getElementById('react-dashboard-root')

  if (!container) {
    container = document.createElement('div')
    container.id = 'react-dashboard-root'
    document.body.appendChild(container)
  }

  // Create React root and render appropriate view
  const root = createRoot(container)
  if (isIsolated) {
    root.render(<IsolatedView />)
  } else {
    root.render(<RemixDashboard />)
  }
}

// Note: Auto-initialization is handled by dev-init.ts
// This file only exports the initialization function
