import { Plugin } from 'vite'
import { buildGame } from '../cli/build-service.js'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function buildApiPlugin(): Plugin {
  return {
    name: 'build-api',
    configureServer(server) {
      server.middlewares.use('/.remix/api/build', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        try {
          const result = await buildGame()
          
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = result.success ? 200 : 500
          res.end(JSON.stringify(result))
        } catch (error: any) {
          console.error('Build API error:', error)
          
          const errorResult = {
            success: false,
            error: error.message,
            details: [{ text: error.stack || error.message, location: null }],
            buildTime: 0
          }
          
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 500
          res.end(JSON.stringify(errorResult))
        }
      })

      // SDK integration check endpoint - uses same logic as overlay status panel
      server.middlewares.use('/.remix/api/sdk-integration', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        try {
          // Return a message indicating this should use the existing overlay status
          const sdkStatus = {
            integrated: false,
            reason: "Use the SDK integration status from the overlay panel (runtime flags)",
            usesRuntimeFlags: true,
            passedChecks: 0,
            totalChecks: 4,
            note: "SDK integration is tracked by runtime events in the overlay panel"
          }
          
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify(sdkStatus))
        } catch (error: any) {
          console.error('SDK integration check error:', error)
          
          const errorResult = {
            integrated: false,
            reason: `Error checking SDK integration: ${error.message}`
          }
          
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 500
          res.end(JSON.stringify(errorResult))
        }
      })

      // Local IP endpoint - inline logic instead of calling script
      server.middlewares.use('/.remix/api/local-ip', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        try {
          // Get the current server port from the Vite server config
          const port = server.config.server.port || 3000

          // Get local IP address
          const { networkInterfaces } = await import('os')
          const nets = networkInterfaces()
          let ip = null

          for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
              if ((net.family === 'IPv4' || net.family === 4) && !net.internal) {
                ip = `http://${net.address}:${port}`
                break
              }
            }
            if (ip !== null) break
          }

          if (ip === null) {
            res.statusCode = 500
            res.end('No external IP address found')
            return
          }

          res.setHeader('Content-Type', 'text/plain')
          res.statusCode = 200
          res.end(ip)
        } catch (error) {
          console.error('Error getting local IP:', error)
          res.statusCode = 500
          res.end('Error getting local IP')
        }
      })
    }
  }
}