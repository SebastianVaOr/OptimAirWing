export default {
  '*.{ts,tsx}': [
    () => 'tsc --noEmit',
    (files) => `vitest run --passWithNoTests --reporter=verbose ${files.map((f) => JSON.stringify(f)).join(' ')}`,
  ],
};
