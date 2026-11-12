// Packs the production build into one self-contained page for publishing as a private claude.ai page.
// Usage: npm run build:artifact  →  dist-artifact/creative-development.html
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const js = html.match(/<script[^>]+src="\.?\/?(assets\/[^"]+\.js)"/)?.[1];
const css = html.match(/<link[^>]+href="\.?\/?(assets\/[^"]+\.css)"/)?.[1];
if (!js || !css) throw new Error('Could not find built assets in dist/index.html — run `npm run build` first.');

// Keep a literal "</script" or "</style" inside the code from closing the inline tag early.
const script = readFileSync(join(dist, js), 'utf8').replace(/<\/script/gi, '<\\/script');
const style = readFileSync(join(dist, css), 'utf8').replace(/<\/style/gi, '<\\/style');

// The publish step adds <!doctype>, <head>, and <body>; this file holds only the page content.
const page = `<title>Creative Development</title>
<meta name="description" content="Learn in the Academy, make in the Studio, with one coach.">
<style>${style}</style>
<div id="root"></div>
<script type="module">${script}</script>
`;
const outDir = new URL('../dist-artifact/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'creative-development.html'), page);
console.log(`dist-artifact/creative-development.html (${(page.length / 1024).toFixed(0)} KB)`);
