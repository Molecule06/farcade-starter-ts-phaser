# @insidethesim/remix-dev

## 0.1.0

### Minor Changes

- Major updates:
  - Upgrade to Vite 7.1.8
  - Add React 19.2.0 and React-DOM 19.2.0 to scaffolded project templates to fix dependency resolution errors
  - Remove React from Vite optimizeDeps.exclude list (no longer needed with React in template)

## 0.0.4

### Patch Changes

- Fix React dependency issues:
  - Pin React and React-DOM to exact version 19.2.0 to prevent version mismatches
  - Exclude React from Vite's optimizeDeps to avoid resolution errors

## 0.0.3

### Patch Changes

- Fix missing @vitejs/plugin-react dependency - moved from devDependencies to dependencies

## 0.0.2

### Patch Changes

- Update READMEs to reflect new package name `create-remix-game` instead of `npx remix-game`
