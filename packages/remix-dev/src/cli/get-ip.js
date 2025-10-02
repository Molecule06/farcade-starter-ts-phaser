import { networkInterfaces } from "os"

// Get port from command line arguments, default to 3000
const port = process.argv[2] || "3000"

const nets = networkInterfaces()
let ip = null // Start with null to detect if we found an IP

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    // 'IPv4' is in Node <= 17, '4' is in Node >= 18
    if ((net.family === "IPv4" || net.family === 4) && !net.internal) {
      ip = `http://${net.address}:${port}`
      break
    }
  }
  if (ip !== null) break // Stop after finding the first external IPv4 address
}

// Don't fallback to localhost - return error instead
if (ip === null) {
  console.error('No external IP address found')
  process.exit(1)
}

process.stdout.write(ip)
