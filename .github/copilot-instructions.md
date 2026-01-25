# Copilot Instructions for bsodium.dev

## Architecture Overview

This is a **React Router v7** (formerly Remix v2) application with SSR enabled. React Router v7 is the evolution of Remix, using file-based routing and server-side rendering by default.

### Project Structure
- `app/` - Application code (routes, components, assets)
  - `routes/` - File-based route modules (e.g., `home.tsx`)
  - `routes.ts` - Route configuration using `@react-router/dev/routes`
  - `root.tsx` - Root layout with `<Outlet />` and error boundary
  - `welcome/` - Feature-specific components with co-located assets
  - `components/` - Shared components (currently empty)
- `build/` - Production build output (client + server bundles)
- `public/` - Static assets served as-is
- `.react-router/` - Generated types (ignored in git)

## Key Technologies

- **React Router v7** (7.12.0) - Framework with SSR, data loading, file-based routing
- **Vite** - Build tool and dev server
- **TailwindCSS v4** - Styling via `@tailwindcss/vite` plugin
- **TypeScript** - Strict mode enabled
- **Yarn** - Package manager (with PnP enabled via `.pnp.cjs`)

## Development Workflows

### Commands
```bash
yarn install        # Install dependencies (auto-runs on folder open)
yarn dev           # Start dev server at http://localhost:5173
yarn build         # Production build
yarn start         # Serve production build
yarn typecheck     # Generate route types + TypeScript check
```

### Route Type Generation
React Router generates types automatically. All route modules get type-safe utilities via:
```tsx
import type { Route } from "./+types/home";  // Auto-generated per route

export function meta({}: Route.MetaArgs) { /* ... */ }
export function loader({}: Route.LoaderArgs) { /* ... */ }
```

## React Router v7 Conventions

### Route Modules
Route files in `app/routes/` must be registered in `app/routes.ts`:
```typescript
import { type RouteConfig, index } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Add new routes here
] satisfies RouteConfig;
```

### Route Module Exports
Each route can export:
- `default` - Component to render
- `meta` - Page metadata (title, description, etc.)
- `links` - Stylesheets, preconnect links
- `loader` - Server-side data loading (SSR + hydration)
- `action` - Server-side form/mutation handling

Example from [app/routes/home.tsx](app/routes/home.tsx):
```tsx
export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" }
  ];
}

export default function Home() {
  return <Welcome />;
}
```

### Path Aliases
Use `~/*` to import from `app/`:
```tsx
import { Welcome } from "~/welcome/welcome";
```

### Error Handling
Global error boundary in [app/root.tsx](app/root.tsx) catches all route errors using `isRouteErrorResponse(error)` to distinguish 404s from other errors.

## Styling Patterns

- **TailwindCSS v4** configured via Vite plugin (no separate config file needed)
- **Global styles** in [app/app.css](app/app.css)
- **Dark mode** via `dark:` variant classes (uses system preference)
- **Google Fonts** loaded via links in [app/root.tsx](app/root.tsx)

## Deployment

### Docker
Multi-stage Dockerfile optimized for production:
1. Install deps → 2. Build app → 3. Run with minimal runtime image
Uses `npm` commands internally despite Yarn in development.

### Vercel
Configured for automatic deployment via [vercel.json](vercel.json) with `"framework": "react-router"`.

## Important Notes

- **SSR is ON** - Set `ssr: false` in `react-router.config.ts` for SPA mode
- **No existing tests** - Test setup not configured yet
- **Component structure** - Co-locate assets with components (see `app/welcome/`)
- **Type safety** - Always run `yarn typecheck` after adding/modifying routes
- **Build output** - Both `build/client/` (static) and `build/server/` (Node server) are generated
