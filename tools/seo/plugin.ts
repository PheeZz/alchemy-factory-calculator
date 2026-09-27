import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { notFoundPage, renderIndex, robots, sitemap, type SeoContext } from './render';

/** The game version comes from the data the app ships, so it is never typed in by hand. */
export async function gameBuild(publicDir: string): Promise<{ id: string; version: string }> {
  const { current } = JSON.parse(await readFile(join(publicDir, 'data/index.json'), 'utf8')) as { current: string };
  const data = JSON.parse(await readFile(join(publicDir, `data/${current}/gamedata.json`), 'utf8')) as {
    build: { id: string; version: string };
  };
  return data.build;
}

/**
 * Static SEO for a client-rendered SPA: link unfurlers never run JS, so the RU page (index.html),
 * the EN entry (en/index.html), 404, robots and sitemap are all written at build time.
 */
export function seo({ siteUrl }: { siteUrl: string }): Plugin {
  let config: ResolvedConfig;
  let ctx: Promise<SeoContext>;
  let enHtml = '';
  return {
    name: 'afc-seo',
    configResolved(c) {
      config = c;
      ctx = gameBuild(c.publicDir).then((b) => ({
        siteUrl,
        base: c.base,
        version: b.version,
        build: b.id,
        googleVerification: c.env.VITE_GOOGLE_SITE_VERIFICATION || undefined,
        yandexVerification: c.env.VITE_YANDEX_VERIFICATION || undefined,
      }));
    },
    transformIndexHtml: {
      // 'post': the template already carries the hashed asset tags, so the EN copy boots the same bundle.
      order: 'post',
      async handler(html) {
        const c = await ctx;
        enHtml = renderIndex(html, c, 'en');
        return renderIndex(html, c, 'ru');
      },
    },
    async writeBundle() {
      const c = await ctx;
      const out = resolve(config.root, config.build.outDir);
      await mkdir(join(out, 'en'), { recursive: true });
      await Promise.all([
        writeFile(join(out, 'en/index.html'), enHtml),
        writeFile(join(out, '404.html'), notFoundPage(c)),
        writeFile(join(out, 'robots.txt'), robots(c)),
        writeFile(join(out, 'sitemap.xml'), sitemap(c)),
      ]);
    },
  };
}
