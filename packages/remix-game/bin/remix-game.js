#!/usr/bin/env node

// Import the compiled CLI
import('../dist/cli.js').catch((error) => {
  console.error('Error loading CLI:', error)
  process.exit(1)
})
