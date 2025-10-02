# @insidethesim/remix-dev

Development framework for Remix games built with Phaser.

## Installation

```bash
npm install @insidethesim/remix-dev
```

## Usage

### Quick Start

Use the CLI to scaffold a new game:

```bash
npx create-remix-game my-awesome-game
cd my-awesome-game
npm run dev
```

### Manual Integration

```ts
import { initRemix } from '@insidethesim/remix-dev'

const game = new Phaser.Game(config)

game.events.once('ready', () => {
  initRemix(game, {
    multiplayer: false
  })
})
```

### Vite Plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { remixPlugin } from '@insidethesim/remix-dev/vite'

export default defineConfig({
  plugins: [
    remixPlugin({
      multiplayer: false
    })
  ]
})
```

## Features

- 🎮 Phaser game framework integration
- 🔧 Development dashboard with live preview
- 🎯 SDK mock for local development
- 📊 Performance monitoring
- 💾 State persistence utilities
- 🎨 Tailwind CSS styling system

## License

ISC
