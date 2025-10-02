#!/usr/bin/env node

/**
 * Sync playground with the latest template from remix-game
 * This ensures playground matches what users will get from npx @insidethesim/remix-game
 */

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const templateDir = path.join(rootDir, 'packages/remix-game/templates/base')
const playgroundDir = path.join(rootDir, 'playground')

// Template variables for playground
const config = {
  gameName: 'Playground Game',
  projectName: 'playground',
  multiplayer: false,
  packageManager: 'pnpm'
}

console.log('🔄 Syncing playground with template...\n')

// Files/dirs to preserve in playground
const preserve = [
  'node_modules',
  '.git',
  'dist',
  'package.json', // We'll update this manually to keep workspace:*
]

// Clear playground (except preserved items)
const playgroundContents = await fs.readdir(playgroundDir)
for (const item of playgroundContents) {
  if (!preserve.includes(item)) {
    const itemPath = path.join(playgroundDir, item)
    await fs.remove(itemPath)
    console.log(`  Removed: ${item}`)
  }
}

// Copy template files
await fs.copy(templateDir, playgroundDir, {
  filter: (src) => {
    // Skip .template files, we'll process them separately
    return !src.endsWith('.template')
  },
})

console.log('\n✓ Template files copied')

// Process template files
const templateFiles = [
  'src/main.ts.template',
  'src/config/GameSettings.ts.template',
  'README.md.template',
  'index.html.template',
]

for (const templateFile of templateFiles) {
  const filePath = path.join(templateDir, templateFile)

  if (!await fs.pathExists(filePath)) {
    console.log(`  ⚠️  Template not found: ${templateFile}`)
    continue
  }

  const content = await fs.readFile(filePath, 'utf-8')

  // Replace template variables
  const processed = content
    .replace(/\{\{GAME_NAME\}\}/g, config.gameName)
    .replace(/\{\{PROJECT_NAME\}\}/g, config.projectName)
    .replace(/\{\{MULTIPLAYER\}\}/g, String(config.multiplayer))
    .replace(/\{\{PACKAGE_MANAGER\}\}/g, config.packageManager)

  // Write to playground (remove .template)
  const outputPath = path.join(playgroundDir, templateFile.replace('.template', ''))
  await fs.ensureDir(path.dirname(outputPath))
  await fs.writeFile(outputPath, processed)
  console.log(`  Processed: ${templateFile}`)
}

// Update package.json to use workspace dependency
const playgroundPkgPath = path.join(playgroundDir, 'package.json')
const playgroundPkg = await fs.readJSON(playgroundPkgPath)

playgroundPkg.name = 'playground'
playgroundPkg.description = 'Development playground for testing Remix framework'
playgroundPkg.private = true
playgroundPkg.devDependencies['@insidethesim/remix-dev'] = 'workspace:*'

// Ensure vite is in devDependencies (read from template to get version)
const templatePkgPath = path.join(templateDir, 'package.json.template')
let templatePkgContent = await fs.readFile(templatePkgPath, 'utf-8')
// Replace template variables before parsing
templatePkgContent = templatePkgContent
  .replace(/\{\{GAME_NAME\}\}/g, config.gameName)
  .replace(/\{\{PROJECT_NAME\}\}/g, config.projectName)
  .replace(/\{\{MULTIPLAYER\}\}/g, String(config.multiplayer))
  .replace(/\{\{PACKAGE_MANAGER\}\}/g, config.packageManager)
const templatePkg = JSON.parse(templatePkgContent)
if (templatePkg.devDependencies.vite) {
  playgroundPkg.devDependencies.vite = templatePkg.devDependencies.vite
}

await fs.writeJSON(playgroundPkgPath, playgroundPkg, { spaces: 2 })
console.log('\n✓ Updated package.json with workspace dependencies')

console.log('\n✅ Playground synced successfully!')
console.log('\nRun: pnpm install\n')
