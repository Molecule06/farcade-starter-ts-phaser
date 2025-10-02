/**
 * Vite plugin for Remix games
 * Combines all necessary plugins and middleware
 */

import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { buildApiPlugin } from './plugins/vite-plugin-build-api'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface RemixPluginOptions {
  multiplayer?: boolean
}

export function remixPlugin(options: RemixPluginOptions = {}): Plugin[] {
  const { multiplayer = false } = options

  const remixDevSrcPath = path.join(__dirname, '../src')

  const contentPaths = [
    // Scan remix-dev source files (published with the package)
    `${remixDevSrcPath}/**/*.{ts,tsx,js,jsx}`,
    // Scan consumer project source files
    `${process.cwd()}/src/**/*.{ts,tsx,js,jsx}`,
    `${process.cwd()}/index.html`,
  ]

  console.log('[Remix Plugin] Tailwind content paths:', contentPaths)

  return [
    react(),
    tailwindcss({
      content: contentPaths,
    }),
    buildApiPlugin(),
    {
      name: 'remix-dev-middleware',
      config() {
        return {
          define: {
            'GAME_MULTIPLAYER_MODE': JSON.stringify(multiplayer),
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
          },
          server: {
            host: true,
            open: true,
            middlewareMode: false,
          },
          resolve: {
            alias: {
              '@': path.resolve(process.cwd(), 'src'),
            },
          },
          publicDir: 'public',
          optimizeDeps: {
            exclude: ['phaser'],
          },
        }
      },
      configureServer(server) {
        // Serve remix-dev assets as static files
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/node_modules/@insidethesim/remix-dev/dist/')) {
            const filePath = path.join(process.cwd(), req.url)
            if (fs.existsSync(filePath)) {
              const ext = path.extname(filePath).toLowerCase()
              const contentType = ext === '.png' ? 'image/png' :
                                ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                                ext === '.svg' ? 'image/svg+xml' :
                                ext === '.css' ? 'text/css' :
                                ext === '.js' ? 'application/javascript' :
                                'application/octet-stream'
              res.setHeader('Content-Type', contentType)
              fs.createReadStream(filePath).pipe(res)
              return
            }
          }
          next()
        })

        // Add middleware to serve package manager info
        server.middlewares.use('/.remix/package-manager', (_req, res) => {
          // Detect package manager
          const userAgent = process.env.npm_config_user_agent || ''
          const execPath = process.env.npm_execpath || ''

          let packageManager = 'npm'

          // Check more specific package managers first (pnpm, yarn, bun) before npm
          if (userAgent.includes('pnpm') || execPath.includes('pnpm')) {
            packageManager = 'pnpm'
          } else if (userAgent.includes('yarn') || execPath.includes('yarn')) {
            packageManager = 'yarn'
          } else if (userAgent.includes('bun') || execPath.includes('bun')) {
            packageManager = 'bun'
          } else if (userAgent.includes('npm') && !userAgent.includes('pnpm')) {
            packageManager = 'npm'
          } else if (fs.existsSync('pnpm-lock.yaml')) {
            packageManager = 'pnpm'
          } else if (fs.existsSync('yarn.lock')) {
            packageManager = 'yarn'
          } else if (fs.existsSync('bun.lockb')) {
            packageManager = 'bun'
          }

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ packageManager }))
        })

        // Add middleware to execute get-ip.js script and return result
        server.middlewares.use('/.remix/get-ip', (_req, res) => {
          const { execSync } = require('child_process')
          try {
            // Use the get-ip script from the package itself
            const packagePath = require.resolve('@insidethesim/remix-dev/package.json')
            const packageDir = path.dirname(packagePath)
            const getIpScript = path.join(packageDir, 'dist/cli/get-ip.js')
            const port = server.config.server.port || 3000

            const result = execSync(`node "${getIpScript}" ${port}`, {
              encoding: 'utf8'
            })
            res.setHeader('Content-Type', 'text/plain')
            res.statusCode = 200
            res.end(result.trim())
          } catch (error) {
            console.error('Error executing get-ip.js:', error)
            res.statusCode = 500
            res.end('Error executing get-ip.js')
          }
        })
      },
    } as Plugin,
  ]
}

export default remixPlugin
