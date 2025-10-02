#!/usr/bin/env node

/**
 * Test the CLI with local workspace dependencies
 * Creates a test project at ./test-output with workspace:* for @insidethesim/remix-dev
 */

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { scaffold } from '../packages/remix-game/dist/scaffold.js'
import { installDependencies } from '../packages/remix-game/dist/install.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const testOutputDir = path.join(rootDir, 'test-output')

console.log('🧪 Testing CLI with local dependencies...\n')

// Clean up previous test output
if (await fs.pathExists(testOutputDir)) {
  console.log('🗑️  Removing previous test-output...')
  await fs.remove(testOutputDir)
}

// Mock configuration (what the CLI wizard would gather)
const config = {
  projectName: 'test-output',
  gameName: 'Test Game',
  multiplayer: false,
  packageManager: 'pnpm',
  initGit: false,
  useLocalDeps: true, // Use workspace:* for local testing
}

try {
  console.log('📦 Scaffolding project...')
  await scaffold(testOutputDir, config)

  console.log('\n📥 Installing dependencies...')
  await installDependencies(testOutputDir, config.packageManager)

  console.log('\n✅ Test project created successfully!')
  console.log('\n📂 Location: ./test-output')
  console.log('\n🚀 To test:')
  console.log('   cd test-output')
  console.log('   pnpm dev')
  console.log('\n🗑️  To clean up:')
  console.log('   rm -rf test-output')

} catch (error) {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
}
