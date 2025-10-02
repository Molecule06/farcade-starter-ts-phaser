#!/usr/bin/env node

// Import the CLI
import('../dist/cli/index.js').catch((error) => {
  console.error('Error loading remix-dev CLI:', error)
  process.exit(1)
})
