# Remix Starter → Monorepo Migration Plan

## Overview

Transform this repo from a "clone and eject" starter into a **scaffolding CLI + published npm package** approach, similar to `create-react-app` or `create-vite`.

**User Experience:**
```bash
npx remix-game my-awesome-game
# Interactive wizard
# → Fresh git repo with @insidethesim/remix-dev as npm dependency
```

---

## Current Architecture Analysis

### Integration Points (`.remix` → `src`)

1. **src/main.ts:3** - Imports `initializeSDKMock` from `.remix/mocks/RemixSDKMock`
2. **index.html** - Conditionally loads `.remix/main.css` and `.remix/index.tsx` in dev mode
3. **vite.config.ts:7** - Imports `buildApiPlugin` from `.remix/plugins/vite-plugin-build-api`
4. **Performance plugin** - Dynamically loaded via fetch in `RemixUtils.ts`
5. **safeLocalStorage** - Available as a utility export from `.remix/utils`

---

## Proposed Architecture

### Project Structure

```
remix-starter/
├── packages/
│   ├── remix-dev/                     # Published as @insidethesim/remix-dev
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── mocks/
│   │   │   ├── utils/
│   │   │   ├── plugins/
│   │   │   ├── styles/
│   │   │   ├── index.tsx              # Dashboard entry
│   │   │   ├── dev-init.ts            # Dev environment setup
│   │   │   └── vite-plugin.ts         # Vite plugin
│   │   ├── dist/                      # Built output
│   │   └── README.md
│   │
│   ├── remix-game/                    # Published as @insidethesim/remix-game (npx script)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── cli.ts                 # Main CLI entry
│   │   │   ├── prompts.ts             # Interactive wizard
│   │   │   ├── scaffold.ts            # File generation
│   │   │   └── templates/             # Template files
│   │   │       ├── base/              # Common files
│   │   │       ├── multiplayer/       # MP-specific
│   │   │       └── singleplayer/      # SP-specific
│   │   ├── bin/
│   │   │   └── remix-game.js
│   │   └── README.md
│   │
│   └── game-template/                 # Development template (not published)
│       ├── package.json               # Uses workspace:* for local dev
│       ├── src/
│       ├── index.html
│       ├── vite.config.ts
│       └── scripts/
│
├── pnpm-workspace.yaml
├── package.json                       # Root workspace config
└── README.md                          # Monorepo docs
```

---

## User Experience Flow

### Initial Scaffolding

```bash
npx remix-game my-awesome-game

# Interactive prompts:
? Game name: My Awesome Game
? Multiplayer support? (y/N) N
? Package manager: (pnpm/npm/yarn/bun) pnpm
? Initialize git? (y/N) y

# Output:
✓ Creating project in ./my-awesome-game
✓ Copying template files...
✓ Installing dependencies...
✓ Initializing git repository...

Done! Get started with:
  cd my-awesome-game
  pnpm dev
```

### Generated Project Structure

```
my-awesome-game/
├── package.json              # Their own package.json
├── src/                      # Their game code
│   ├── main.ts
│   ├── scenes/
│   │   └── GameScene.ts
│   ├── config/
│   │   └── GameSettings.ts
│   └── utils/
│       └── RemixUtils.ts
├── index.html
├── vite.config.ts
├── scripts/
│   ├── dev-server.js
│   ├── build.js
│   └── setup.js
├── .gitignore
├── tsconfig.json
└── README.md                 # Custom readme for their game
```

### package.json

```json
{
  "name": "my-awesome-game",
  "version": "1.0.0",
  "type": "module",
  "multiplayer": false,
  "dependencies": {
    "@insidethesim/remix-dev": "^0.3.0",
    "phaser": "^3.90.0"
  },
  "devDependencies": {
    "@farcade/game-sdk": "^0.2",
    "vite": "^6.3.6",
    "typescript": "^5.9.2"
  },
  "scripts": {
    "dev": "node scripts/dev-server.js",
    "build": "node scripts/build.js",
    "preview": "vite preview"
  }
}
```

---

## Integration Strategy

### Minimize Scaffolded Glue Code

**Goal:** Push complexity into the npm package, keep user code minimal and clean.

#### 1. index.html (Simplified)

**Before (current - too much logic):**
```html
<script type="module">
  if (import.meta.env.DEV) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/.remix/main.css';
    document.head.appendChild(link);

    if (window === window.top) {
      import('./.remix/index.tsx');
    } else {
      import('/src/main.ts');
    }
  }
</script>
```

**After (minimal):**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Awesome Game</title>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js"></script>
  </head>
  <body>
    <script type="module">
      // Development: loads dashboard or game based on context
      // Production: replaced by build script
      if (import.meta.env.DEV) {
        import('@insidethesim/remix-dev/dev-init')
        import('/src/main.ts')
      }
    </script>
  </body>
</html>
```

**The `@insidethesim/remix-dev/dev-init` module handles:**
- Loading CSS
- Detecting iframe vs top-level window
- Mounting dashboard or game appropriately

#### 2. src/main.ts (Simplified)

**Before:**
```ts
import { initializeSDKMock } from '../.remix/mocks/RemixSDKMock'
import { initializeDevelopment } from './utils/RemixUtils'

async function initializeApp() {
  if (process.env.NODE_ENV !== 'production') {
    await initializeSDKMock()
  }
  const game = new Phaser.Game(config)
  ;(window as any).game = game

  game.events.once("ready", () => {
    initializeRemixSDK(game)
    if (process.env.NODE_ENV !== 'production') {
      initializeDevelopment()
    }
  })
}
```

**After (cleaner):**
```ts
import { initRemix } from '@insidethesim/remix-dev'
import { GameScene } from './scenes/GameScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  scene: [GameScene],
  // ... rest of config
}

const game = new Phaser.Game(config)

// Single initialization call handles everything
game.events.once("ready", () => {
  initRemix(game, {
    multiplayer: false  // Injected during scaffolding
  })
})
```

#### 3. vite.config.ts

**Before:**
```ts
import { buildApiPlugin } from './.remix/plugins/vite-plugin-build-api'

export default defineConfig({
  define: {
    'GAME_MULTIPLAYER_MODE': JSON.stringify(isMultiplayer),
  },
  plugins: [
    react(),
    tailwindcss(),
    buildApiPlugin(),
    // ... custom middleware
  ]
})
```

**After:**
```ts
import { defineConfig } from 'vite'
import { remixPlugin } from '@insidethesim/remix-dev/vite'

export default defineConfig({
  plugins: [
    remixPlugin({
      multiplayer: false,  // Set during scaffolding
    })
  ]
})
```

**The `remixPlugin` handles:**
- React + Tailwind setup
- Build API
- Multiplayer mode injection
- Setup detection middleware
- Package manager detection
- IP address resolution

---

## Package Exports

### @insidethesim/remix-dev/package.json

```json
{
  "name": "@insidethesim/remix-dev",
  "version": "0.3.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./dev-init": {
      "types": "./dist/dev-init.d.ts",
      "import": "./dist/dev-init.js"
    },
    "./mocks": {
      "types": "./dist/mocks/index.d.ts",
      "import": "./dist/mocks/index.js"
    },
    "./utils": {
      "types": "./dist/utils/index.d.ts",
      "import": "./dist/utils/index.js"
    },
    "./plugins": {
      "types": "./dist/plugins/index.d.ts",
      "import": "./dist/plugins/index.js"
    },
    "./vite": {
      "types": "./dist/vite-plugin.d.ts",
      "import": "./dist/vite-plugin.js"
    },
    "./dashboard": {
      "types": "./dist/dashboard.d.ts",
      "import": "./dist/dashboard.js"
    },
    "./components": {
      "types": "./dist/components/index.d.ts",
      "import": "./dist/components/index.js"
    },
    "./hooks": {
      "types": "./dist/hooks/index.d.ts",
      "import": "./dist/hooks/index.js"
    },
    "./styles/*": "./dist/styles/*"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "styled-components": "^6.1.19",
    "tailwindcss": "^4.1.13"
  },
  "peerDependencies": {
    "vite": "^6.0.0",
    "phaser": "^3.90.0"
  }
}
```

---

## Handling Updates & New Features

### Scenario 1: Simple Addition (Backward Compatible)

**Example: Add new utility helper**

```ts
// @insidethesim/remix-dev v0.3.0 → v0.3.1
export { newHelper } from '@insidethesim/remix-dev/utils'
```

**User update:**
```bash
pnpm update @insidethesim/remix-dev
# Now they can import newHelper if they want
```

### Scenario 2: New Optional Feature

**Example: Add single player save state**

**In @insidethesim/remix-dev v0.3.0 → v0.4.0:**
```ts
// New optional provider
export { SaveStateProvider } from '@insidethesim/remix-dev/providers'
```

**Migration guide:**
```md
# Upgrading to v0.4.0

## New: Single Player Save State

Install the update:
```bash
pnpm install @insidethesim/remix-dev@0.4.0
```

Enable in your game (optional):
```ts
import { initRemix } from '@insidethesim/remix-dev'

initRemix(game, {
  multiplayer: false,
  saveState: true  // New option
})
```

### Scenario 3: Required Integration Change

**Example: New required wrapper in index.html**

**Migration:**
1. **Automated via CLI:**
```bash
npx @insidethesim/remix-dev migrate 0.4.0
```

2. **Manual migration guide:**
```md
# Breaking Change: v0.4.0

## Updated index.html structure

Add this div to your index.html:
```html
<body>
  <div id="remix-root"></div>  <!-- NEW -->
  <script type="module">...</script>
</body>
```
```

3. **Codemod script:**
```ts
// In @insidethesim/remix-dev
export async function migrate_0_4_0(projectPath: string) {
  const htmlPath = path.join(projectPath, 'index.html')
  const html = await fs.readFile(htmlPath, 'utf-8')

  if (!html.includes('id="remix-root"')) {
    const updated = html.replace(
      '<body>',
      '<body>\n    <div id="remix-root"></div>'
    )
    await fs.writeFile(htmlPath, updated)
    console.log('✓ Updated index.html')
  }
}
```

### Scenario 4: Feature Flags in Config

**Allow gradual migration:**

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    remixPlugin({
      version: '0.4',  // Explicit version targeting
      features: {
        dashboard: true,
        performance: true,
        saveState: true,     // Opt-in to new features
        legacyMode: false    // Disable deprecated features
      }
    })
  ]
})
```

---

## CLI Implementation

### remix-game Package Structure

```
packages/remix-game/
├── src/
│   ├── cli.ts              # Main entry point
│   ├── prompts.ts          # Interactive questions
│   ├── scaffold.ts         # File generation logic
│   ├── install.ts          # Dependency installation
│   ├── templates/          # Template files
│   │   ├── base/           # Common files (always copied)
│   │   │   ├── .gitignore
│   │   │   ├── index.html
│   │   │   ├── tsconfig.json
│   │   │   ├── vite.config.ts.template
│   │   │   ├── package.json.template
│   │   │   ├── src/
│   │   │   │   ├── main.ts.template
│   │   │   │   ├── scenes/
│   │   │   │   └── config/
│   │   │   └── scripts/
│   │   ├── multiplayer/    # Additional files for MP
│   │   └── singleplayer/   # Additional files for SP
│   └── utils/
│       ├── template-processor.ts
│       └── file-utils.ts
├── bin/
│   └── remix-game.js
└── package.json
```

### CLI Implementation

```ts
// src/cli.ts
#!/usr/bin/env node
import prompts from 'prompts'
import { scaffold } from './scaffold'
import { installDependencies } from './install'
import path from 'path'

async function main() {
  console.log('🎮 Create Remix Game\n')

  const args = process.argv.slice(2)
  let targetDir = args[0]

  // Get project configuration
  const config = await prompts([
    {
      type: targetDir ? null : 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-remix-game',
      validate: (name) => {
        if (!/^[a-z0-9-_]+$/i.test(name)) {
          return 'Project name can only contain letters, numbers, dashes, and underscores'
        }
        return true
      }
    },
    {
      type: 'text',
      name: 'gameName',
      message: 'Game display name:',
      initial: 'My Remix Game'
    },
    {
      type: 'confirm',
      name: 'multiplayer',
      message: 'Enable multiplayer support?',
      initial: false
    },
    {
      type: 'select',
      name: 'packageManager',
      message: 'Package manager:',
      choices: [
        { title: 'pnpm', value: 'pnpm' },
        { title: 'npm', value: 'npm' },
        { title: 'yarn', value: 'yarn' },
        { title: 'bun', value: 'bun' }
      ],
      initial: 0
    },
    {
      type: 'confirm',
      name: 'initGit',
      message: 'Initialize git repository?',
      initial: true
    }
  ])

  if (!config.gameName) {
    console.log('Cancelled')
    process.exit(0)
  }

  targetDir = targetDir || config.projectName
  const projectPath = path.resolve(process.cwd(), targetDir)

  console.log('\n✓ Creating project in', projectPath)

  // Scaffold the project
  await scaffold(projectPath, config)

  // Install dependencies
  console.log('\n✓ Installing dependencies...')
  await installDependencies(projectPath, config.packageManager)

  // Initialize git
  if (config.initGit) {
    const { initGitRepo } = await import('./git')
    await initGitRepo(projectPath)
  }

  console.log('\n✅ Done!\n')
  console.log('Get started with:\n')
  console.log(`  cd ${targetDir}`)
  console.log(`  ${config.packageManager} dev\n`)
}

main().catch((error) => {
  console.error('Error creating project:', error)
  process.exit(1)
})
```

```ts
// src/scaffold.ts
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface ScaffoldConfig {
  projectName: string
  gameName: string
  multiplayer: boolean
  packageManager: string
  initGit: boolean
}

export async function scaffold(targetPath: string, config: ScaffoldConfig) {
  const templateBase = path.join(__dirname, '../templates/base')
  const templateMode = config.multiplayer
    ? path.join(__dirname, '../templates/multiplayer')
    : path.join(__dirname, '../templates/singleplayer')

  // Ensure target directory exists
  await fs.ensureDir(targetPath)

  // Copy base template
  await fs.copy(templateBase, targetPath, {
    filter: (src) => !src.includes('.template')
  })

  // Copy mode-specific files
  if (await fs.pathExists(templateMode)) {
    await fs.copy(templateMode, targetPath, { overwrite: true })
  }

  // Process template files
  await processTemplates(targetPath, config)

  console.log('✓ Template files copied')
}

async function processTemplates(targetPath: string, config: ScaffoldConfig) {
  const templateFiles = [
    'package.json.template',
    'vite.config.ts.template',
    'src/main.ts.template',
    'README.md.template'
  ]

  for (const templateFile of templateFiles) {
    const filePath = path.join(targetPath, templateFile)

    if (await fs.pathExists(filePath)) {
      let content = await fs.readFile(filePath, 'utf-8')

      // Replace template variables
      content = content
        .replace(/\{\{GAME_NAME\}\}/g, config.gameName)
        .replace(/\{\{PROJECT_NAME\}\}/g, config.projectName)
        .replace(/\{\{MULTIPLAYER\}\}/g, String(config.multiplayer))
        .replace(/\{\{PACKAGE_MANAGER\}\}/g, config.packageManager)

      // Write to actual file (remove .template)
      const outputPath = filePath.replace('.template', '')
      await fs.writeFile(outputPath, content)
      await fs.remove(filePath)
    }
  }
}
```

---

## Development Workflow (For Maintainers)

### Local Development

```bash
# Install dependencies
pnpm install

# Work on remix-dev
cd packages/remix-dev
pnpm dev  # Watch mode

# Work on remix-game CLI
cd packages/remix-game
pnpm dev

# Test scaffolding locally
cd packages/game-template
pnpm dev  # Uses workspace:* version of remix-dev

# Test CLI locally
cd /tmp
node packages/remix-game/bin/remix-game.js test-game
cd test-game
pnpm dev
```

### Testing Changes

```bash
# Link packages globally for testing
cd packages/remix-dev
pnpm link --global

cd packages/remix-game
pnpm link --global @insidethesim/remix-dev
pnpm build

# Test in a fresh directory
cd /tmp
remix-game test-game
cd test-game
pnpm dev
```

### Publishing Flow

```bash
# 1. Bump version in remix-dev
cd packages/remix-dev
pnpm version minor  # 0.3.0 → 0.4.0
pnpm build
pnpm publish --access public

# 2. Update remix-game to use new version
cd packages/remix-game
# Update templates/base/package.json.template dependency
pnpm version patch
pnpm build
pnpm publish --access public

# 3. Tag release
git add .
git commit -m "chore: release v0.4.0"
git tag v0.4.0
git push origin main --tags

# 4. Create GitHub release with migration notes
```

---

## Migration Path for Existing Users

### Option 1: Automated Migration Script

```bash
# In their existing project
npx @insidethesim/remix-dev migrate-to-npm

# Script does:
# 1. Backs up current .remix/ folder
# 2. Installs @insidethesim/remix-dev package
# 3. Updates imports from ./.remix/* to @insidethesim/remix-dev/*
# 4. Updates vite.config.ts to use remixPlugin
# 5. Simplifies index.html and main.ts
# 6. Removes .remix/ folder
# 7. Creates migration report
```

### Option 2: Fresh Start (Recommended)

```md
# Migration Guide

## From Clone-and-Eject to NPM Package

We recommend starting fresh with the new CLI:

1. Export your game code:
   - Copy your `src/scenes/` folder
   - Copy your `src/config/` folder
   - Copy any custom utilities

2. Create new project:
   ```bash
   npx remix-game my-game
   ```

3. Import your game code into the new structure

4. Update any imports to use new package exports

Benefits of fresh start:
- Clean git history
- No legacy cruft
- Latest best practices
```

---

## Additional Features

### 1. Health Check Command

```bash
npx @insidethesim/remix-dev doctor

# Checks:
# ✓ @insidethesim/remix-dev version (0.3.0, latest: 0.4.0)
# ⚠ index.html missing recommended structure
# ✓ vite.config.ts using remixPlugin
# ⚠ main.ts using deprecated initializeSDKMock pattern
#
# Run 'npx @insidethesim/remix-dev migrate' to fix issues
```

### 2. Version-Specific Codemods

```bash
# Auto-detect and run necessary migrations
npx @insidethesim/remix-dev migrate

# Or target specific version
npx @insidethesim/remix-dev migrate --to 0.4.0

# Dry run to preview changes
npx @insidethesim/remix-dev migrate --dry-run
```

### 3. Feature Generator

```bash
# Add multiplayer to existing single-player game
npx @insidethesim/remix-dev add multiplayer

# Add save state feature
npx @insidethesim/remix-dev add save-state
```

### 4. Upgrade Wizard

```bash
npx @insidethesim/remix-dev upgrade

# Interactive prompts:
? Current version: 0.3.0
? Target version: 0.4.0 (latest)
? Review changes: (Y/n)

# Shows diff of required changes
# Applies changes automatically
# Runs tests to verify
```

---

## Open Questions / Decisions Needed

1. ✅ **Package naming:** (DECIDED)
   - Package: `@insidethesim/remix-dev`
   - CLI: `@insidethesim/remix-game` (npx script: `remix-game`)

2. **Template hosting:**
   - Bundle templates in npm package?
   - Or fetch from GitHub releases?
   - Or support both?

3. **Versioning strategy:**
   - Should CLI version match remix-dev version?
   - Or independent versioning?

4. **Backward compatibility:**
   - Support old `.remix` folder detection?
   - Automatic migration on first run?

5. **Build output:**
   - Keep current esbuild approach in scripts/build.js?
   - Or move build logic into @insidethesim/remix-dev package?

6. **Game SDK mock:**
   - Keep as part of @insidethesim/remix-dev?
   - Or separate package (@insidethesim/game-sdk-mock)?

7. **TypeScript:**
   - Should CLI be TypeScript or pure Node.js?
   - How to handle TS compilation in templates?

---

## Next Steps

1. Create monorepo structure
2. Extract `.remix` → `packages/remix-dev`
3. Set up build pipeline (tsup/vite/rollup?)
4. Implement `remix-game` CLI
5. Test scaffolding flow end-to-end
6. Write migration guide for existing users
7. Publish to npm under @insidethesim org
8. Update main README

---

## Success Metrics

- ✅ Users can create new game with single command (`npx remix-game`)
- ✅ Generated projects have clean, minimal boilerplate
- ✅ Updates as simple as `pnpm update @insidethesim/remix-dev`
- ✅ Breaking changes can be automated via codemods
- ✅ Local development workflow unchanged (for maintainers)
- ✅ Users own their git history completely
