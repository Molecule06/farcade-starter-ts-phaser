# Remix Game Development Framework

## Overview

A monorepo containing the Remix game development framework for creating mobile games on the Remix/Farcaster platform. Features TypeScript, Phaser.js, 2:3 aspect ratio for mini-apps, and a professional development environment with SDK testing tools.

## Quick Start

Create a new Remix game with one command:

```bash
npx create-remix-game my-awesome-game
cd my-awesome-game
npm run dev
```

That's it! Your development server will start with:
- Live reload and hot module replacement
- **Remix Development Dashboard** with SDK integration testing
- QR code for mobile testing
- Real-time performance monitoring
- Build tools integrated into the dashboard

## What You Get

### Core Features

- 📱 **Mobile-first** - 2:3 aspect ratio (720x1080) for Farcaster mini-apps
- 🎮 **Phaser.js** - HTML5 game framework (CDN-loaded, no imports needed)
- 🔧 **TypeScript** - Full type safety with Phaser type definitions
- ⚡ **Vite 7** - Fast build tool with instant HMR
- 🔄 **Hot Reload** - See changes instantly in browser and mobile

### Professional Development Environment

- 🎛️ **SDK Integration Testing**
  - Visual 2x2 grid status indicators (ready, game_over, play_again, toggle_mute)
  - Real-time event tracking with detailed status panels
  - SDK mock for local development (no platform needed)

- 📊 **Performance Monitoring**
  - Live FPS charts with interactive hover details
  - Memory usage tracking (heap + optional texture memory)
  - Frame timing metrics (update/render split)
  - Rendering statistics (draw calls, game objects, physics bodies)
  - Jank event detection for performance bottlenecks

- 🛠️ **Integrated Build System**
  - One-click builds from the dashboard
  - Instant HTML preview and copy
  - Production-ready single-file output

- 📱 **Mobile Development**
  - QR code generation for instant phone testing
  - Phone frame simulation with game overlay
  - Touch-optimized controls and layout
  - Same Wi-Fi network testing

### Developer Experience

- 🎨 Demo game scene with interactive examples
- 🔍 TypeScript IntelliSense for Phaser (via global types)
- 🎯 Mobile-optimized responsive design
- 🌐 Multi-platform support (npm, pnpm, yarn, bun)
- 📦 Single HTML file output for easy deployment

## Project Structure

After running `npx create-remix-game`, you'll get:

```
my-game/
├── index.html             # Main HTML - loads Phaser and Remix SDK
├── package.json           # Project config and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite + Remix plugin config
├── .gitignore             # Git ignore rules
├── src/
│   ├── main.ts           # Game entry point
│   ├── config/
│   │   └── GameSettings.ts  # Canvas size, debug mode, etc.
│   ├── scenes/
│   │   ├── DemoScene.ts     # Interactive demo (remove when ready)
│   │   └── GameScene.ts     # Your game scene
│   └── utils/            # Utility functions
└── dist/                 # Production build (created by `npm run build`)
```

### Key Files

- **`src/main.ts`** - Creates Phaser game and initializes Remix SDK
- **`src/scenes/DemoScene.ts`** - Full-featured demo with SDK integration examples
- **`src/config/GameSettings.ts`** - Game configuration (720x1080 canvas, etc.)
- **`vite.config.ts`** - Uses `@insidethesim/remix-dev/vite` plugin
- **`index.html`** - Loads Phaser (CDN) and Remix SDK

## Available Commands

```bash
npm run dev      # Start development server with dashboard
npm run build    # Build for production (creates dist/index.html)
npm run preview  # Preview production build locally
```

## Development Workflow

1. **Create a game**: `npx create-remix-game my-game`
2. **Start development**: `npm run dev`
3. **Edit code**: Make changes in `src/` - browser auto-refreshes
4. **Test on mobile**: Scan QR code from terminal
5. **Remove demo**: Ask your AI assistant to remove the demo scene
6. **Build your game**: Implement your game logic in `src/scenes/`
7. **Build for production**: `npm run build`
8. **Deploy**: Copy `dist/index.html` to Remix platform

## Removing the Demo

When ready to build your game, ask your AI assistant (Claude Code, Cursor, etc.):

> "Remove the demo code and create a minimal GameScene for me to start building my game."

The demo scene includes comprehensive SDK integration examples, but you can start fresh with a blank canvas.

## Important Notes

⚠️ **Phaser is CDN-loaded** - Never import Phaser in your TypeScript files:

```typescript
// ❌ WRONG - Don't do this!
import Phaser from 'phaser'

// ✅ CORRECT - Phaser is globally available
export class MyScene extends Phaser.Scene {
  // Just use it directly
}
```

⚠️ **Mobile-first design** - This template targets Farcaster mini-apps with 2:3 aspect ratio (720x1080).

⚠️ **SDK Integration** - The development environment includes a mock SDK. In production, the real Farcaster SDK will be loaded by the platform.

## Porting Existing Games

<details>
<summary><strong>Click to expand porting guide</strong></summary>

### Prerequisites
1. Create a new project: `npx create-remix-game my-game`
2. Create `src_prev/` folder: `mkdir src_prev`
3. Copy your existing game files into `src_prev/`

### Migration with AI Assistant

Ask your AI assistant:

> "I have an existing Phaser.js game in `src_prev/` that I want to port to this Remix template. Please help me migrate the code to work with the 2:3 aspect ratio and Remix SDK."

### Reality Check

**Migration will have issues!** This is normal:

- ✅ Compilation errors (TypeScript, imports)
- ✅ Runtime crashes (missing dependencies)
- ✅ Layout issues (aspect ratio changes)
- ✅ Multiple iterations needed

**Be prepared to ask follow-ups:**
- "Fix this TypeScript error: [paste error]"
- "The game crashes: [paste error]"
- "Adjust UI for 2:3 aspect ratio"
- "Touch controls aren't working"

### Cleanup

After successful migration:
```bash
rm -rf src_prev
```

Keep a backup of your original game until confident the migration works!

</details>

## Troubleshooting

**"Command not found: npm"**
- Install [Node.js](https://nodejs.org) (includes npm)
- Restart terminal after installation

**"Port 3000 is in use"**
- Another dev server is running
- Kill other processes or use a different port

**"Game doesn't load on mobile"**
- Check phone and computer are on same Wi-Fi
- Check firewall settings
- Try refreshing or re-scanning QR code

**"TypeScript errors about Phaser"**
- Remove any `import Phaser from 'phaser'` statements
- Phaser is loaded globally via CDN
- Ask your AI assistant to fix it

## Building for Production

```bash
npm run build
```

This creates `dist/index.html` - a single self-contained file with your entire game.

### Deployment to Remix

1. Build: `npm run build`
2. Open: `dist/index.html`
3. Copy: Select all and copy contents
4. Paste: Into Remix platform editor
5. Test: Verify game works on platform
6. Publish: Release to players!

## Development Environment Features

### SDK Integration Testing

Console logging shows SDK events in real-time:
```
[SDK Event] ready
[SDK Event] game_over {"score":3}
[SDK Event] play_again
[SDK Event] toggle_mute {"isMuted":true}
```

Dashboard shows:
- 🔴 Red indicator: Event not triggered yet
- 🟢 Green indicator: Event triggered successfully

### Performance Monitoring

Live metrics available in dashboard:
- **FPS**: Current, average, min/max with sparkline
- **Frame timing**: Update vs render time
- **Memory**: Heap usage with optional texture tracking
- **Rendering**: Draw calls, objects, physics bodies
- **Jank detection**: Performance bottleneck alerts

### Settings Panel

- Canvas scaling (fill screen vs actual size)
- Background pattern toggle
- Device-specific settings (canvas glow on supported devices)

## Monorepo Structure

This repository contains:

- **`@insidethesim/remix-dev`** - Development framework package
- **`create-remix-game`** - CLI scaffolding tool
- **`playground/`** - Internal testing workspace

Users don't interact with the monorepo directly - they use `npx create-remix-game` to scaffold new projects.

## Getting Help

- 💬 Join the [Remix Discord Server](https://discord.com/invite/a3bgdr4RC6)
- 🤖 Ask your AI assistant (Claude Code, Cursor, etc.)
- 📝 Copy/paste error messages to your LLM for help

## License

ISC License - See LICENSE file for details

---

**Ready to build?**

```bash
npx create-remix-game my-awesome-game
```
