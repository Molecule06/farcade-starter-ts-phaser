import { defineConfig } from "vite"
import { remixPlugin } from "@insidethesim/remix-dev/vite"
import fs from "fs"

// Read multiplayer setting from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
const isMultiplayer = packageJson.multiplayer === true

export default defineConfig({
  plugins: [
    remixPlugin({
      multiplayer: isMultiplayer,
    })
  ],
})
