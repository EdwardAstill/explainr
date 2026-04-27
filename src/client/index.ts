// Re-export the browser entrypoint so `bun build` users (and tests) can
// reach it. The actual bundle is produced via Bun.build against main.ts
// in src/clientBundle.ts.
export {};
