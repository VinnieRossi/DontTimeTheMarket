# Dont Time The Market

A tongue-in-cheek market-timing game.
Replay historical market data, trade against the clock, and see how you stack up against the Bogle NPC (a disciplined buy-and-hold benchmark).

This is a Next.js (App Router) + TypeScript project.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

### `npm run build`

Builds the app for production.

### `npm start`

Runs the production build (run `npm run build` first).

### `npm run lint`

Runs ESLint over the project.

### `npm run typecheck`

Runs the TypeScript compiler in check-only mode (`tsc --noEmit`).

### `npm test`

Runs the Vitest test suite once.

### `npm run test:watch`

Runs the Vitest test suite in watch mode.

### `npm run bake-data`

Refreshes the baked market data in `data/baked/` from FRED's public CSV endpoint.
This is a manual, occasional step, not part of the build or any CI job; the deployed app only reads the committed JSON.
