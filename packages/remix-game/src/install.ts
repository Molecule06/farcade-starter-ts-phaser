import { spawn } from 'child_process'
import chalk from 'chalk'

export async function installDependencies(
  projectPath: string,
  packageManager: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = packageManager === 'yarn' ? 'yarn' : packageManager
    const args = packageManager === 'yarn' ? [] : ['install']

    const child = spawn(command, args, {
      cwd: projectPath,
      stdio: 'inherit',
      shell: true,
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${packageManager} install failed with code ${code}`))
      } else {
        console.log(chalk.cyan('✓ Dependencies installed'))
        resolve()
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}
