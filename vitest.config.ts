import { defineConfig } from 'vitest/config';

const MINIMUM_COVERAGE_PERCENT = 80;

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      // Without `include`, Vitest only measures files the tests import, so an
      // untested file would never lower the percentage.
      include: ['src/**/*.ts'],
      // Bootstrap and module wiring hold no logic worth unit-testing.
      exclude: ['src/main.ts', 'src/**/*.module.ts', 'src/**/*.spec.ts'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: MINIMUM_COVERAGE_PERCENT,
        branches: MINIMUM_COVERAGE_PERCENT,
        functions: MINIMUM_COVERAGE_PERCENT,
        statements: MINIMUM_COVERAGE_PERCENT,
      },
    },
  },
});
