/**
 * Development initialization
 * This module handles loading the dashboard or game based on context
 */

// Import CSS through Vite so Tailwind v4 can process it
import './main.css'

// Check if we're in top-level window or iframe
if (window === window.top) {
  // Top-level window - show React dashboard
  import('./dashboard').then(({ initDashboard }) => {
    initDashboard()
  })
}
// If iframe, the game will be loaded by the main script tag
