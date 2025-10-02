#!/usr/bin/env node

/**
 * CLI for @insidethesim/remix-dev
 * Provides dev, build, and preview commands
 */

const command = process.argv[2]

switch (command) {
  case 'dev':
    // Pass port from argv[3] or default to 3000
    const port = process.argv[3] || '3000'
    process.argv[2] = port // dev-server.js expects port at argv[2]
    import('./dev-server.js').catch(console.error)
    break

  case 'build':
    import('./build.js').catch(console.error)
    break

  case 'preview':
    // Use vite preview
    import('child_process').then(({ spawn }) => {
      const child = spawn('npx', ['vite', 'preview'], {
        stdio: 'inherit',
        shell: true,
      })
      child.on('error', console.error)
    })
    break

  default:
    console.log(`
Usage: remix-dev <command>

Commands:
  dev       Start development server
  build     Build for production
  preview   Preview production build

Examples:
  remix-dev dev
  remix-dev build
  remix-dev preview
`)
    process.exit(command ? 1 : 0)
}
