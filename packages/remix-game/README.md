# create-remix-game

CLI for scaffolding Remix games.

## Usage

```bash
npx create-remix-game my-awesome-game
```

This will:
- Create a new directory with your game project
- Install all dependencies
- Set up the game structure
- Initialize a git repository

## Interactive Prompts

The CLI will ask you:
- **Game display name**: The name shown to players
- **Multiplayer support**: Whether to enable multiplayer features
- **Package manager**: Choose between pnpm, npm, yarn, or bun
- **Git initialization**: Whether to create a git repository

## What's Included

Your scaffolded project includes:
- Phaser 3 game engine
- @insidethesim/remix-dev framework
- Vite for development and building
- TypeScript configuration
- Example game scene
- Development scripts

## Development

After scaffolding:

```bash
cd my-awesome-game
npm run dev
```

This starts the development server with:
- Live reload
- Development dashboard
- SDK mock for testing
- Performance monitoring

## Building

```bash
npm run build
```

Creates a production build in the `dist` directory.

## License

ISC
