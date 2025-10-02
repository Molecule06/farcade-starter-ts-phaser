/**
 * Development initialization
 * This module handles loading the dashboard or game based on context
 */

// Import CSS dynamically to work in both dev and production
// In dev (monorepo): resolves to src/main.css
// In production (published): resolves to dist/styles/remix-dev.css via package exports
import '@insidethesim/remix-dev/styles/remix-dev.css'

// Initialize SDK mock for development
import { initializeSDKMock } from './mocks/RemixSDKMock'

async function init() {
  await initializeSDKMock()

  // Check if we're in top-level window or iframe
  if (window === window.top) {
    // Top-level window - show React dashboard
    const { initDashboard } = await import('./dashboard')
    initDashboard()
  }
  // If iframe, the game will be loaded by the main script tag
}

init()
