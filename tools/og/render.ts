/**
 * Renders the social preview images (public/og/og-{ru,en}.png), the app icons and the web manifest.
 * Run after a game data refresh: `pnpm og`.
 *
 * ponytail: playwright-core is not a dependency — this runs a few times a year, so it borrows any
 * local install: PLAYWRIGHT_CORE=<path to playwright-core> CHROME_PATH=<chromium binary> pnpm og.
 * Add it as a devDependency if this ever runs in CI.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import sharp from 'sharp';
import { gameBuild } from '../seo/plugin';
import { SIGIL_SVG, THEME_COLOR } from '../seo/render';
import { SITE_URL } from '../seo/site';

const ROOT = join(import.meta.dirname, '../..');
const PUBLIC = join(ROOT, 'public');

const dataUrl = async (path: string, mime: string) =>
  `data:${mime};base64,${(await readFile(join(ROOT, path))).toString('base64')}`;

const font = (family: string, file: string) =>
  dataUrl(`node_modules/@fontsource-variable/${family}/files/${file}`, 'font/woff2');

const TEXT = {
  ru: {
    subtitle: 'Калькулятор производственных цепочек',
    chips: ['Цепочки и рецепты', 'Топливо и нагрев', 'Удобрения', 'Конвейеры', 'Исследования', 'Прибыль'],
    version: 'Версия игры',
  },
  en: {
    subtitle: 'Production chain calculator',
    chips: ['Chains & recipes', 'Fuel & heat', 'Fertilizer', 'Conveyors', 'Research', 'Profit'],
    version: 'Game version',
  },
};

// Stylized chain: ores on the left feed a smelter column into one product; positions are in px of the 1200x630 canvas.
const NODES = [
  { item: 'CoalOre', x: 760, y: 150 },
  { item: 'IronOre', x: 760, y: 300 },
  { item: 'Limestone', x: 760, y: 450 },
  { item: 'Coke', x: 910, y: 210 },
  { item: 'IronIngot', x: 910, y: 380 },
  { item: 'PhilosopherStone', x: 1060, y: 295 },
];
const EDGES = [
  [0, 3], [1, 4], [2, 4], [3, 4], [3, 5], [4, 5],
] as const;

async function ogHtml(lang: 'ru' | 'en', version: string) {
  const t = TEXT[lang];
  const icons = await Promise.all(NODES.map((n) => dataUrl(`public/icons/25321648/items/${n.item}.webp`, 'image/webp')));
  const edges = EDGES.map(([a, b]) => {
    const p = NODES[a]!, q = NODES[b]!;
    const mx = (p.x + q.x) / 2;
    return `<path d="M${p.x} ${p.y}C${mx} ${p.y} ${mx} ${q.y} ${q.x} ${q.y}"/>`;
  }).join('');
  const nodes = NODES.map((n, i) => `<div class="node" style="left:${n.x - 44}px;top:${n.y - 44}px"><img src="${icons[i]}"/></div>`).join('');
  return `<!doctype html><html><head><style>
@font-face{font-family:Exo;src:url(${await font('exo-2', 'exo-2-latin-wght-normal.woff2')});unicode-range:U+0000-00FF,U+2014}
@font-face{font-family:Exo;src:url(${await font('exo-2', 'exo-2-cyrillic-wght-normal.woff2')});unicode-range:U+0400-045F}
@font-face{font-family:Inter;src:url(${await font('inter', 'inter-latin-wght-normal.woff2')});unicode-range:U+0000-00FF,U+2014}
@font-face{font-family:Inter;src:url(${await font('inter', 'inter-cyrillic-wght-normal.woff2')});unicode-range:U+0400-045F}
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;position:relative;color:#ece9fb;font-family:Inter;
background:radial-gradient(90% 90% at 20% 0%,rgb(58 34 120/.55),transparent 60%),radial-gradient(60% 70% at 100% 100%,rgb(20 80 110/.35),transparent 70%) ${THEME_COLOR}}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgb(176 164 255/.05) 1px,transparent 1px),linear-gradient(90deg,rgb(176 164 255/.05) 1px,transparent 1px);background-size:40px 40px}
.copy{position:absolute;left:64px;top:84px;width:640px}
.brand{display:flex;align-items:center;gap:22px}.brand svg{filter:drop-shadow(0 0 12px rgb(181 116 255/.8))}
h1{margin:0;font-family:Exo;font-weight:700;font-size:64px;line-height:1;white-space:nowrap;letter-spacing:-.01em;text-shadow:0 0 28px rgb(181 116 255/.55)}
.sub{margin-top:26px;font-family:Exo;font-weight:600;font-size:34px;line-height:1.2;color:#4fe3f1;text-shadow:0 0 18px rgb(79 227 241/.45)}
.chips{display:flex;flex-wrap:wrap;gap:12px;margin-top:34px}
.chip{padding:8px 16px;border-radius:999px;border:1.5px solid rgb(181 116 255/.55);background:rgb(22 18 44/.7);font-size:19px;font-weight:600;color:#ddd8ff}
.chip:nth-child(3n+2){border-color:rgb(79 227 241/.55)}.chip:nth-child(3n){border-color:rgb(255 181 71/.55)}
.foot{position:absolute;left:64px;right:64px;bottom:48px;display:flex;justify-content:space-between;font-size:22px;color:#a7a2c9}
.foot b{color:#ffb547;font-weight:600}
svg.edges{position:absolute;inset:0}svg.edges path{fill:none;stroke:#4fe3f1;stroke-width:3;opacity:.7;filter:drop-shadow(0 0 6px #4fe3f1)}
.node{position:absolute;width:88px;height:88px;border-radius:22px;display:grid;place-items:center;background:rgb(19 15 40/.95);border:2px solid rgb(181 116 255/.7);box-shadow:0 0 26px -4px rgb(181 116 255/.8)}
.node:last-child{border-color:#ffb547;box-shadow:0 0 30px -2px rgb(255 181 71/.8)}.node img{width:60px;height:60px}
</style></head><body><div class="grid"></div>
<svg class="edges" width="1200" height="630">${edges}</svg>${nodes}
<div class="copy"><div class="brand">${SIGIL_SVG(96)}<h1>Alchemy Factory</h1></div>
<div class="sub">${t.subtitle}</div><div class="chips">${t.chips.map((c) => `<span class="chip">${c}</span>`).join('')}</div></div>
<div class="foot"><span>${t.version} <b>${version}</b></span><span>${SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span></div>
</body></html>`;
}

const iconHtml = (size: number) =>
  `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${THEME_COLOR} radial-gradient(circle,rgb(58 34 120/.6),transparent 70%)">
<div style="filter:drop-shadow(0 0 ${size / 30}px rgb(181 116 255/.8))">${SIGIL_SVG(Math.round(size * 0.78))}</div></body></html>`;

// Palette PNG keeps the previews well under the 300 KB most unfurlers accept without re-fetching.
const savePng = (buf: Buffer, path: string) => sharp(buf).png({ palette: true, quality: 90, effort: 10 }).toFile(path);

const req = createRequire(import.meta.url);
// Typed by hand: the package is borrowed at run time, so its declarations are not installed here.
interface Page {
  setContent(html: string, o?: { waitUntil?: 'load' }): Promise<void>;
  evaluate<T>(fn: () => T): Promise<unknown>;
  screenshot(): Promise<Buffer>;
  setViewportSize(s: { width: number; height: number }): Promise<void>;
}
const { chromium } = req(process.env.PLAYWRIGHT_CORE ?? 'playwright-core') as {
  chromium: { launch(o: { executablePath?: string }): Promise<{ newPage(o: object): Promise<Page>; close(): Promise<void> }> };
};
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
try {
  const { version } = await gameBuild(PUBLIC);
  await mkdir(join(PUBLIC, 'og'), { recursive: true });
  await mkdir(join(PUBLIC, 'favicon'), { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const lang of ['ru', 'en'] as const) {
    await page.setContent(await ogHtml(lang, version), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await savePng(await page.screenshot(), join(PUBLIC, `og/og-${lang}.png`));
  }
  for (const [size, name] of [[180, 'apple-touch-icon'], [192, 'icon-192'], [512, 'icon-512']] as const) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(iconHtml(size));
    await savePng(await page.screenshot(), join(PUBLIC, `favicon/${name}.png`));
  }
  // Relative URLs: the manifest resolves them against its own location, whatever the deploy base.
  const manifest = {
    name: 'Alchemy Factory Calculator',
    short_name: 'AF Calculator',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      { src: 'favicon/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'favicon/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
  await writeFile(join(PUBLIC, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  await browser.close();
}
