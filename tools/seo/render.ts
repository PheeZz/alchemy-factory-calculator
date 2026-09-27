import { copy, type SeoLang } from './copy';

export interface SeoContext {
  /** Canonical absolute URL of the RU entry, with a trailing slash. */
  siteUrl: string;
  /** Vite base: where the built files are served from. */
  base: string;
  version: string;
  build: string;
  googleVerification?: string;
  yandexVerification?: string;
}

export const THEME_COLOR = '#090716';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pageUrl = (ctx: SeoContext, lang: SeoLang) => (lang === 'ru' ? ctx.siteUrl : `${ctx.siteUrl}en/`);
const pagePath = (ctx: SeoContext, lang: SeoLang) => (lang === 'ru' ? ctx.base : `${ctx.base}en/`);
const other = (lang: SeoLang): SeoLang => (lang === 'ru' ? 'en' : 'ru');
// The root has no language of its own (a saved EN choice wins there), so the way back to RU says it.
export const versionLine = (ctx: SeoContext, lang: SeoLang) =>
  copy[lang].version.replace('{version}', ctx.version).replace('{build}', ctx.build);

/** Circle-triangle-square sigil, same geometry as src/shared/ui/Sigil.tsx. */
export const SIGIL_SVG = (size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke-width="1.4"><circle cx="20" cy="20" r="18" stroke="#b574ff"/><path d="M20 5.5 32.6 27.3H7.4Z" stroke="#b574ff"/><rect x="13.2" y="14.2" width="13.6" height="13.1" stroke="#4fe3f1"/><circle cx="20" cy="21" r="4.4" stroke="#ffb547"/></g></svg>`;

export function jsonLd(ctx: SeoContext, lang: SeoLang) {
  const c = copy[lang];
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: c.h1,
    url: pageUrl(ctx, lang),
    description: c.description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    inLanguage: lang,
    isAccessibleForFree: true,
    image: `${ctx.siteUrl}og/og-${lang}.png`,
    releaseNotes: versionLine(ctx, lang),
    about: {
      '@type': 'VideoGame',
      name: 'Alchemy Factory',
      version: ctx.version,
      gamePlatform: 'PC',
      sameAs: 'https://store.steampowered.com/app/3669570/',
    },
  };
}

export function headTags(ctx: SeoContext, lang: SeoLang): string {
  const c = copy[lang];
  const url = pageUrl(ctx, lang);
  const image = `${ctx.siteUrl}og/og-${lang}.png`;
  // `<` escaped so a string in the copy can never close the script element.
  const ld = JSON.stringify(jsonLd(ctx, lang)).replace(/</g, '\\u003c');
  return [
    `<title>${esc(c.title)}</title>`,
    `<meta name="description" content="${esc(c.description)}" />`,
    `<meta name="keywords" content="${esc(c.keywords)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" hreflang="ru" href="${pageUrl(ctx, 'ru')}" />`,
    `<link rel="alternate" hreflang="en" href="${pageUrl(ctx, 'en')}" />`,
    `<link rel="alternate" hreflang="x-default" href="${pageUrl(ctx, 'ru')}" />`,
    `<meta name="theme-color" content="${THEME_COLOR}" />`,
    `<link rel="apple-touch-icon" href="${ctx.base}favicon/apple-touch-icon.png" />`,
    `<link rel="manifest" href="${ctx.base}manifest.webmanifest" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Alchemy Factory Calculator" />`,
    `<meta property="og:title" content="${esc(c.title)}" />`,
    `<meta property="og:description" content="${esc(c.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(c.ogAlt)}" />`,
    `<meta property="og:locale" content="${c.locale}" />`,
    `<meta property="og:locale:alternate" content="${copy[other(lang)].locale}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(c.title)}" />`,
    `<meta name="twitter:description" content="${esc(c.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${esc(c.ogAlt)}" />`,
    ctx.googleVerification && `<meta name="google-site-verification" content="${esc(ctx.googleVerification)}" />`,
    ctx.yandexVerification && `<meta name="yandex-verification" content="${esc(ctx.yandexVerification)}" />`,
    `<script type="application/ld+json">${ld}</script>`,
    `<style>${PRERENDER_CSS}</style>`,
  ]
    .filter(Boolean)
    .join('\n    ');
}

// Unlayered, so Tailwind's preflight (loaded later, in a layer) cannot flatten it before React mounts.
const PRERENDER_CSS =
  '.pre{box-sizing:border-box;max-width:760px;margin:0 auto;padding:40px 20px 56px;color:#ece9fb;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}' +
  '.pre header{display:flex;align-items:center;gap:14px}.pre h1{margin:0;font-size:30px;line-height:1.2}' +
  '.pre h1,.pre h2{font-weight:600}.pre h2{margin:28px 0 8px;font-size:19px;color:#b574ff}.pre p{margin:12px 0}.pre p,.pre li{color:#c9c5e6}' +
  '.pre ul,.pre ol{padding-left:22px;list-style:disc}.pre ol{list-style:decimal}.pre li{margin:4px 0}' +
  '.pre a{color:#4fe3f1}.pre .ver{margin-top:28px;font-size:13px;color:#7d78a3}' +
  '.pre nav ul{display:flex;flex-wrap:wrap;gap:8px 18px;list-style:none;padding:0}';

/** Placeholder content inside #root: what crawlers and no-JS visitors read; createRoot replaces it. */
export function prerenderedBody(ctx: SeoContext, lang: SeoLang): string {
  const c = copy[lang];
  const path = pagePath(ctx, lang);
  const li = (items: string[]) => items.map((s) => `<li>${esc(s)}</li>`).join('');
  const sections = c.sections
    .map((s) => `<li><a href="${path}${s.view ? `?view=${s.view}` : ''}">${esc(s.label)}</a></li>`)
    .join('');
  return `<main class="pre">
      <header>${SIGIL_SVG(44)}<h1>${esc(c.h1)}</h1></header>
      <p>${esc(c.intro)}</p>
      <noscript><p><strong>${esc(c.noscript)}</strong></p></noscript>
      <h2>${esc(c.featuresTitle)}</h2>
      <ul>${li(c.features)}</ul>
      <h2>${esc(c.howtoTitle)}</h2>
      <ol>${li(c.howto)}</ol>
      <nav aria-label="${esc(c.sectionsTitle)}"><h2>${esc(c.sectionsTitle)}</h2><ul>${sections}<li><a href="${pagePath(ctx, other(lang))}${lang === 'en' ? '?lang=ru' : ''}" hreflang="${other(lang)}">${esc(c.otherLang)}</a></li></ul></nav>
      <p class="ver">${esc(versionLine(ctx, lang))}</p>
    </main>`;
}

/** index.html template → one language's page. The template carries the two placeholders. */
export function renderIndex(template: string, ctx: SeoContext, lang: SeoLang): string {
  return template
    .replace(/<html lang="[a-z]+"/, `<html lang="${lang}"`)
    .replace('<!--seo:head-->', headTags(ctx, lang))
    .replace('<!--seo:body-->', prerenderedBody(ctx, lang));
}

export function notFoundPage(ctx: SeoContext): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <meta name="color-scheme" content="dark" />
    <meta name="theme-color" content="${THEME_COLOR}" />
    <link rel="icon" href="${ctx.base}favicon/icon-192.png" />
    <title>404 — Alchemy Factory</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:${THEME_COLOR} radial-gradient(120% 90% at 50% 0%,rgb(58 34 120/.35),transparent 60%);color:#ece9fb;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
      main{max-width:520px;padding:32px 20px;text-align:center}
      svg{filter:drop-shadow(0 0 8px rgb(181 116 255/.75))}
      h1{margin:12px 0 4px;font-size:64px;line-height:1;color:#b574ff;text-shadow:0 0 24px rgb(181 116 255/.6)}
      p{margin:8px 0;color:#a7a2c9}
      nav{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px}
      a{color:#4fe3f1;border:1px solid rgb(79 227 241/.5);border-radius:12px;padding:8px 16px;text-decoration:none}
      a:hover,a:focus-visible{background:rgb(79 227 241/.12);outline:none}
    </style>
  </head>
  <body>
    <main>
      ${SIGIL_SVG(72)}
      <h1>404</h1>
      <p>Такой страницы нет — возможно, ссылка устарела.</p>
      <p lang="en">This page does not exist — the link may be outdated.</p>
      <nav>
        <a href="${ctx.base}">Открыть калькулятор</a>
        <a href="${ctx.base}en/" lang="en" hreflang="en">Open the calculator</a>
      </nav>
    </main>
  </body>
</html>
`;
}

export function sitemap(ctx: SeoContext): string {
  const alternates = (['ru', 'en'] as const)
    .map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(ctx, l)}"/>`)
    .concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(ctx, 'ru')}"/>`)
    .join('');
  const url = (lang: SeoLang) => `  <url><loc>${pageUrl(ctx, lang)}</loc>${alternates}</url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${url('ru')}
${url('en')}
</urlset>
`;
}

export const robots = (ctx: SeoContext) => `User-agent: *\nAllow: /\n\nSitemap: ${ctx.siteUrl}sitemap.xml\n`;
