/**
 * Build configuration (best-effort reconstruction of the DSH client-package
 * build).
 *
 * The canonical, fully-supported build is inside the deepseek-harness
 * monorepo, where the shared build tooling wraps the client entry in
 * `window.__ModuleLoader__.load({ id, factory })` and externalizes every
 * `@deepseek-ai/*` package plus `react`. Drop this package under
 * `packages/client/` there and run `pnpm build`; the repo's shared config
 * handles the wrapper, the `lib/types/` d.ts layout, and CSS modules.
 *
 * This file is a starting point for building with a plain `tsdown`
 * (rolldown-based) install outside the repo. If you use it, you must
 * reproduce the wrapper yourself — see README.md "Build invariants".
 */
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client/index.tsx',
  },
  outDir: 'lib',
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Everything provided by the host/shell stays an import so the module
  // loader resolves it at runtime (do not bundle these in).
  external: ['react', 'react/jsx-runtime', /^@deepseek-ai\//],
});
