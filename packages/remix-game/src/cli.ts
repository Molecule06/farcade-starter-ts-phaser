#!/usr/bin/env node

import prompts from 'prompts'
import { scaffold } from './scaffold.js'
import { installDependencies } from './install.js'
import { initGitRepo } from './git.js'
import path from 'path'
import chalk from 'chalk'

async function main() {
  console.log(chalk.bold.blue('\n🎮 Create Remix Game\n'))

  const args = process.argv.slice(2)
  let targetDir = args[0]

  // Get project configuration
  const config = await prompts(
    [
      {
        type: targetDir ? null : 'text',
        name: 'projectName',
        message: 'Project name:',
        initial: 'my-remix-game',
        validate: (name: string) => {
          if (!/^[a-z0-9-_]+$/i.test(name)) {
            return 'Project name can only contain letters, numbers, dashes, and underscores'
          }
          return true
        },
      },
      {
        type: 'text',
        name: 'gameName',
        message: 'Game display name:',
        initial: 'My Remix Game',
      },
      {
        type: 'confirm',
        name: 'multiplayer',
        message: 'Enable multiplayer support?',
        initial: false,
      },
      {
        type: 'select',
        name: 'packageManager',
        message: 'Package manager:',
        choices: [
          { title: 'pnpm', value: 'pnpm' },
          { title: 'npm', value: 'npm' },
          { title: 'yarn', value: 'yarn' },
          { title: 'bun', value: 'bun' },
        ],
        initial: 0,
      },
      {
        type: 'confirm',
        name: 'initGit',
        message: 'Initialize git repository?',
        initial: true,
      },
    ],
    {
      onCancel: () => {
        console.log('\nCancelled')
        process.exit(0)
      },
    }
  )

  if (!config.gameName) {
    console.log('Cancelled')
    process.exit(0)
  }

  targetDir = targetDir || config.projectName
  const projectPath = path.resolve(process.cwd(), targetDir)

  console.log(chalk.cyan(`\n✓ Creating project in ${projectPath}`))

  // Scaffold the project
  await scaffold(projectPath, config)

  // Install dependencies
  console.log(chalk.cyan('\n✓ Installing dependencies...'))
  await installDependencies(projectPath, config.packageManager)

  // Initialize git
  if (config.initGit) {
    await initGitRepo(projectPath)
  }

  console.log(chalk.bold.green('\n✅ Done!\n'))
  console.log('Get started with:\n')
  console.log(chalk.cyan(`  cd ${targetDir}`))
  console.log(chalk.cyan(`  ${config.packageManager} dev\n`))
}

main().catch((error) => {
  console.error(chalk.red('Error creating project:'), error)
  process.exit(1)
})
