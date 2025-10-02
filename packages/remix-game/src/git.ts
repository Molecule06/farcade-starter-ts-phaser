import { execSync } from 'child_process'
import chalk from 'chalk'

export async function initGitRepo(projectPath: string): Promise<void> {
  try {
    execSync('git init', { cwd: projectPath, stdio: 'ignore' })
    execSync('git add .', { cwd: projectPath, stdio: 'ignore' })
    execSync('git commit -m "Initial commit from remix-game"', {
      cwd: projectPath,
      stdio: 'ignore',
    })
    console.log(chalk.cyan('✓ Git repository initialized'))
  } catch (error) {
    console.warn(chalk.yellow('⚠ Failed to initialize git repository'))
  }
}
