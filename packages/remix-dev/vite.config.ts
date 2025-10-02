import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Allow dev-init to import CSS via package path in monorepo dev
      '@insidethesim/remix-dev/styles/remix-dev.css': path.resolve(__dirname, 'src/main.css'),
    },
  },
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'dev-init': path.resolve(__dirname, 'src/dev-init.ts'),
        dashboard: path.resolve(__dirname, 'src/dashboard.ts'),
        'vite-plugin': path.resolve(__dirname, 'src/vite-plugin.ts'),
        'mocks/index': path.resolve(__dirname, 'src/mocks/index.ts'),
        'utils/index': path.resolve(__dirname, 'src/utils/index.ts'),
        'plugins/index': path.resolve(__dirname, 'src/plugins/index.ts'),
        'components/index': path.resolve(__dirname, 'src/components/index.ts'),
        'hooks/index': path.resolve(__dirname, 'src/hooks/index.ts'),
        'cli/index': path.resolve(__dirname, 'src/cli/index.ts'),
        'cli/dev-server': path.resolve(__dirname, 'src/cli/dev-server.js'),
        'cli/build': path.resolve(__dirname, 'src/cli/build.js'),
        'cli/get-ip': path.resolve(__dirname, 'src/cli/get-ip.js'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'styled-components',
        'vite',
        'phaser',
        '@vitejs/plugin-react',
        '@tailwindcss/vite',
        'tailwindcss',
        'child_process',
        'os',
        'fs',
        'path',
        'url',
        'qrcode-terminal',
        'cheerio',
        'esbuild',
      ],
      output: {
        preserveModules: false,
        entryFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'main.css' || assetInfo.name?.endsWith('.css')) {
            return 'styles/[name][extname]'
          }
          return 'assets/[name][extname]'
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
