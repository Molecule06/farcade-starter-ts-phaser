import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface ScaffoldConfig {
  projectName: string
  gameName: string
  multiplayer: boolean
  packageManager: string
  initGit: boolean
  useLocalDeps?: boolean // Use workspace:* for local testing
}

export async function scaffold(targetPath: string, config: ScaffoldConfig): Promise<void> {
  const templateBase = path.join(__dirname, '../templates/base')

  // Ensure target directory doesn't exist or is empty
  if (await fs.pathExists(targetPath)) {
    const files = await fs.readdir(targetPath)
    if (files.length > 0) {
      throw new Error(`Directory ${targetPath} is not empty`)
    }
  }

  // Ensure target directory exists
  await fs.ensureDir(targetPath)

  // Copy base template (including .template files)
  await fs.copy(templateBase, targetPath)

  console.log(chalk.cyan('✓ Template files copied'))

  // Process template files
  await processTemplates(targetPath, config)

  console.log(chalk.cyan('✓ Configuration applied'))
}

async function processTemplates(targetPath: string, config: ScaffoldConfig): Promise<void> {
  const templateFiles = [
    'package.json.template',
    'src/main.ts.template',
    'src/config/GameSettings.ts.template',
    'README.md.template',
    'index.html.template',
  ]

  for (const templateFile of templateFiles) {
    const filePath = path.join(targetPath, templateFile)
    const content = await fs.readFile(filePath, 'utf-8')

    // Replace template variables
    let processed = content
      .replace(/\{\{GAME_NAME\}\}/g, config.gameName)
      .replace(/\{\{PROJECT_NAME\}\}/g, config.projectName)
      .replace(/\{\{MULTIPLAYER\}\}/g, String(config.multiplayer))
      .replace(/\{\{PACKAGE_MANAGER\}\}/g, config.packageManager)

    // If using local deps and this is package.json, replace version with workspace:*
    if (config.useLocalDeps && templateFile === 'package.json.template') {
      processed = processed.replace(
        '"@insidethesim/remix-dev": "^0.1.0"',
        '"@insidethesim/remix-dev": "workspace:*"'
      )
    }

    // Write to actual file (remove .template)
    const outputPath = filePath.replace('.template', '')
    await fs.writeFile(outputPath, processed)
    await fs.remove(filePath)
  }
}
