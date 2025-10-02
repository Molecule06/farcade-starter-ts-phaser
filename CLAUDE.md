# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **monorepo** for the Remix game development framework. It transforms the original "clone-and-eject" starter template into a **scaffolding CLI + published npm package** approach.

**Architecture:**
- `@insidethesim/remix-dev` - Published npm package containing the development framework
- `create-remix-game` - CLI tool for scaffolding new games via `npx create-remix-game`
- `playground/` - Development workspace for testing the framework (uses `workspace:*`)

## Key Commands

### Monorepo Root
```bash
# Development (runs playground)
pnpm dev

# Build all packages
pnpm build

# Build specific packages
pnpm build:remix-dev
pnpm build:remix-game

# Clean all build outputs
pnpm clean

# Test CLI locally
pnpm test:cli:local

# Version management (using Changesets)
pnpm changeset           # Create a new changeset
pnpm version            # Bump versions based on changesets
pnpm release            # Build and publish all packages
```

### Individual Packages

**remix-dev package:**
```bash
cd packages/remix-dev
pnpm dev      # Watch mode (rebuilds on changes)
pnpm build    # Production build
```

**remix-game CLI:**
```bash
cd packages/remix-game
pnpm dev      # Watch mode (compiles TypeScript)
pnpm build    # Production build
```

**Playground:**
```bash
cd playground
pnpm dev      # Start dev server with dashboard
pnpm build    # Build production game
pnpm preview  # Preview production build
```

## Monorepo Architecture

### Package Structure

```
remix-starter/
├── packages/
│   ├── remix-dev/              # @insidethesim/remix-dev
│   │   ├── src/
│   │   │   ├── cli/            # CLI commands (dev, build, preview)
│   │   │   ├── components/     # React components for dashboard
│   │   │   ├── contexts/       # React contexts
│   │   │   ├── hooks/          # React hooks
│   │   │   ├── mocks/          # SDK mock for local dev
│   │   │   ├── plugins/        # Vite plugins
│   │   │   ├── styles/         # CSS/styling
│   │   │   ├── utils/          # Utilities
│   │   │   ├── index.ts        # Main exports (initRemix)
│   │   │   └── vite-plugin.ts  # Vite plugin (remixPlugin)
│   │   └── bin/
│   │       └── remix-dev.js    # CLI entry point
│   │
│   └── remix-game/             # create-remix-game
│       ├── src/
│       │   ├── cli.ts          # Main CLI logic
│       │   ├── scaffold.ts     # Project scaffolding
│       │   ├── install.ts      # Dependency installation
│       │   └── git.ts          # Git initialization
│       ├── templates/
│       │   └── base/           # Template files for scaffolding
│       └── bin/
│           └── remix-game.js   # CLI entry point
│
├── playground/                 # Dev workspace
│   ├── src/
│   │   ├── main.ts            # Uses @insidethesim/remix-dev
│   │   ├── scenes/            # Game scenes
│   │   └── config/            # Game settings
│   ├── index.html
│   └── vite.config.ts         # Uses remixPlugin
│
└── pnpm-workspace.yaml
```

### Package Exports (@insidethesim/remix-dev)

The remix-dev package has multiple entry points:

```typescript
// Main export
import { initRemix } from '@insidethesim/remix-dev'

// Vite plugin
import { remixPlugin } from '@insidethesim/remix-dev/vite'

// Utilities
import { safeLocalStorage } from '@insidethesim/remix-dev/utils'

// Mocks (for testing)
import { RemixSDKMock } from '@insidethesim/remix-dev/mocks'

// Components (for custom dashboards)
import { GameFrame } from '@insidethesim/remix-dev/components'

// Hooks
import { useGameSDK } from '@insidethesim/remix-dev/hooks'
```

### User-Facing Workflow

When users run `npx create-remix-game my-game`, they get a minimal project structure:

```typescript
// Their main.ts
import { initRemix } from '@insidethesim/remix-dev'

const game = new Phaser.Game(config)
game.events.once("ready", () => {
  initRemix(game, { multiplayer: false })
})

// Their vite.config.ts
import { remixPlugin } from '@insidethesim/remix-dev/vite'

export default defineConfig({
  plugins: [remixPlugin({ multiplayer: false })]
})
```

All complexity (dashboard, dev server, build process, SDK mocks) is handled by the `@insidethesim/remix-dev` package.

## Development Workflow

### Testing Framework Changes

1. Make changes in `packages/remix-dev/src/`
2. Run `pnpm build:remix-dev` or `pnpm dev` (watch mode)
3. Test in playground: `pnpm dev:playground`
4. The playground uses `workspace:*`, so changes are immediately available

### Testing Template Changes

**IMPORTANT**: The `playground/` directory is **transient** - it gets overwritten by the sync command. Never make changes directly in `playground/`.

To update game templates:
1. Edit source files in `packages/remix-game/templates/base/`
2. Run `pnpm sync:playground` to copy template changes to playground
3. Test with `pnpm dev` (from root)

Example:
```bash
# Edit the template
vim packages/remix-game/templates/base/src/scenes/DemoScene.ts

# Sync changes to playground
pnpm sync:playground

# Test in playground
pnpm dev
```

### Testing CLI Changes

1. Make changes in `packages/remix-game/src/`
2. Run `pnpm build` in `packages/remix-game`
3. Test locally: `pnpm test:cli:local` (from root)
4. This creates a test project in `/tmp` and runs the CLI

### Local Development with Linked Packages

```bash
# In packages/remix-dev
pnpm link --global

# In packages/remix-game
pnpm link --global @insidethesim/remix-dev

# In a test project
pnpm link --global @insidethesim/remix-dev
```

## Build System

### remix-dev Build Process

- Uses Vite to bundle the package
- Builds TypeScript to `dist/`
- Preserves React components, Vite plugins, and utilities
- Exports multiple entry points (see package.json `exports` field)

### remix-game Build Process

- Uses TypeScript compiler (`tsc`)
- Compiles CLI source to `dist/`
- Templates are copied as-is (not compiled)

## Key Files & Integration Points

### Vite Plugin (`packages/remix-dev/src/vite-plugin.ts`)

The `remixPlugin` handles:
- React + Tailwind setup
- Build API middleware
- Multiplayer mode injection via `define` config
- Setup detection middleware
- IP address resolution for QR codes

### CLI Entry (`packages/remix-dev/bin/remix-dev.js`)

The `remix-dev` CLI provides commands:
- `remix-dev dev` - Start development server
- `remix-dev build` - Build production bundle
- `remix-dev preview` - Preview production build

### initRemix (`packages/remix-dev/src/index.ts`)

Main framework initialization:
- Sets up SDK mock in development
- Initializes performance monitoring
- Registers dashboard communication
- Handles multiplayer vs singleplayer setup

## Important Patterns

### Multiplayer Configuration

Multiplayer mode is set during scaffolding and stored in `package.json`:

```json
{
  "multiplayer": false
}
```

This is read by:
1. `vite.config.ts` to configure the Vite plugin
2. `main.ts` to pass to `initRemix()`

### Development vs Production

- **Development**: Dashboard loads in top-level window, game in iframe
- **Production**: Single HTML file, no dashboard, direct game load
- Controlled via `import.meta.env.DEV` checks

### Template Processing

Template files in `packages/remix-game/templates/base/` use placeholders:
- `{{GAME_NAME}}` - Display name
- `{{PROJECT_NAME}}` - Package name
- `{{MULTIPLAYER}}` - Boolean multiplayer setting
- `{{PACKAGE_MANAGER}}` - User's chosen package manager

Files ending in `.template` are processed and renamed during scaffolding.

## Publishing Workflow (using Changesets)

This project uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

### Creating a Release

1. **Make your changes** and commit them to a feature branch

2. **Create a changeset** to declare which packages changed and how:
   ```bash
   pnpm changeset
   ```

   This will prompt you:
   - Which packages have changed? (select with spacebar)
   - Is this a patch, minor, or major change?
   - What changed? (used for changelog)

3. **Commit the changeset** file:
   ```bash
   git add .changeset/
   git commit -m "Add changeset for X feature"
   ```

4. **Merge to main** branch

5. **Version packages** (updates package.json versions and changelogs):
   ```bash
   pnpm version
   ```

   This will:
   - Update versions in package.json files
   - Update CHANGELOG.md files
   - Delete consumed changeset files
   - Update dependent packages (e.g., template's dependency on remix-dev)

6. **Commit version changes**:
   ```bash
   git add .
   git commit -m "Version packages"
   git push
   ```

7. **Publish to npm**:
   ```bash
   pnpm release
   ```

   This will:
   - Build all packages
   - Publish changed packages to npm
   - Create git tags for published versions

8. **Push tags**:
   ```bash
   git push --tags
   ```

### Quick Release (if you're in a hurry)

```bash
# 1. Create changeset
pnpm changeset

# 2. Commit it
git add . && git commit -m "Add changeset"

# 3. Version and publish
pnpm version
git add . && git commit -m "Version packages"
pnpm release
git push --tags
```

### Changesets Benefits

- **Automatic dependency updates**: When `@insidethesim/remix-dev` version bumps, the template's dependency is automatically updated
- **Changelog generation**: CHANGELOG.md files are generated automatically
- **Monorepo-aware**: Understands package relationships and dependencies
- **Git tags**: Automatically creates version tags
- **Prevents mistakes**: Can't publish without a changeset

## Migration Strategy

This monorepo replaces the old "clone-and-eject" workflow where users cloned the entire repo. See `MONOREPO.md` for detailed migration planning.

**Old workflow:**
```bash
git clone https://github.com/InsideTheSim/remix-starter-ts-phaser
cd remix-starter-ts-phaser
npm run remix-setup
```

**New workflow:**
```bash
npx create-remix-game my-game
cd my-game
pnpm dev
```

Users now get a clean project with `@insidethesim/remix-dev` as a dependency, allowing for seamless updates via `pnpm update`.

## Testing

- **Manual testing**: Use playground workspace
- **CLI testing**: Use `pnpm test:cli:local` or manually test scaffolding
- **Integration testing**: Create test projects and verify build/dev workflow

## Important Notes

- **Phaser is CDN-loaded**: Never add Phaser imports in TypeScript files
- **Mobile-first**: 2:3 aspect ratio (720x1080) for Farcaster mini-apps
- **Single HTML output**: Production builds create one self-contained HTML file
- **Workspace protocol**: Playground uses `workspace:*` to always use local remix-dev
