import { defineConfig } from 'vite';

// M1 builds a status page plus an importable logic entry. No gameplay scene yet.
export default defineConfig({
  build: {
    rolldownOptions: {
      input: { status: 'index.html', logic: 'src/logic/index.ts' },
      preserveEntrySignatures: 'strict',
      output: { entryFileNames: '[name].js' },
    },
    sourcemap: true,
  },
  server: {
    host: '127.0.0.1',
    // Never expose original binaries/reference assets through the development server.
    fs: { deny: ['**/Blobby_Data/**', '**/MonoBleedingEdge/**', '**/reference/**', '**/*.exe', '**/*.dll', '**/gameplay.mp4', '**/.*/**'] },
  },
});
