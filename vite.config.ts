import { defineConfig } from 'vite';

// Keep the pure logic importable alongside the browser game.
export default defineConfig({
  build: {
    rolldownOptions: {
      input: { game: 'index.html', logic: 'src/logic/index.ts' },
      preserveEntrySignatures: 'strict',
      output: { entryFileNames: '[name].js' },
    },
    sourcemap: true,
  },
  server: {
    host: '127.0.0.1',
    // Mounted Windows files did not notify Vite about source edits in this workspace.
    watch: { usePolling: true, ignored: ['**/Blobby_Data/**', '**/reference/**', '**/MonoBleedingEdge/**'] },
    // Never expose original binaries/reference assets through the development server.
    fs: { deny: ['**/Blobby_Data/**', '**/MonoBleedingEdge/**', '**/reference/**', '**/*.exe', '**/*.dll', '**/gameplay.mp4', '**/.*/**'] },
  },
});
