// Builds a single-file HTML for publishing as an Artifact (no separate asset files).
import { build } from 'vite';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const outDir = 'dist-artifact';
await build({
  configFile: false,
  base: './',
  logLevel: 'warn',
  build: { outDir, target: 'es2022', rollupOptions: { output: { codeSplitting: false } }, modulePreload: false },
});
const html = readFileSync(`${outDir}/index.html`, 'utf8');
const assets = readdirSync(`${outDir}/assets`);
const js = readFileSync(`${outDir}/assets/${assets.find((f) => f.endsWith('.js'))}`, 'utf8');
const css = readFileSync(`${outDir}/assets/${assets.find((f) => f.endsWith('.css'))}`, 'utf8');
const title = /<title>(.*?)<\/title>/.exec(html)[1];
const fonts = /<link[^>]*fonts\.googleapis\.com\/css2[^>]*>/.exec(html)[0];
const body = /<body>([\s\S]*?)<\/body>/.exec(html)[1].replace(/<script[^>]*><\/script>/g, '');
const out = `<title>${title.split(" · ")[0]}</title>\n${fonts}\n<style>\n${css}\n</style>\n${body}\n<script>window.__SANDBOXED_PREVIEW__ = true;</script>\n<script type="module">\n${js.replace(/<\/script>/g, '<\\/script>')}\n</script>\n`;
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/kakha-portfolio.html`, out);
console.log('artifact bytes', out.length);
