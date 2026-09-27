import { copy } from './copy';
import { headTags, jsonLd, renderIndex, sitemap, type SeoContext } from './render';

const ctx: SeoContext = { siteUrl: 'https://x.io/afc/', base: '/afc/', version: '1.0.1', build: '42' };

test.each(['ru', 'en'] as const)('%s copy fits search snippets and the copies match in shape', (lang) => {
  expect(copy[lang].title.length).toBeLessThanOrEqual(60);
  expect(copy[lang].description.length).toBeLessThanOrEqual(160);
  expect(copy[lang].features.length).toBe(copy.ru.features.length);
});

test('the EN page is English everywhere a crawler looks, with hreflang back to RU', () => {
  const html = renderIndex('<html lang="ru"><head><!--seo:head--></head><div id="root"><!--seo:body--></div>', ctx, 'en');
  expect(html).toContain('<html lang="en"');
  expect(html).toContain('<link rel="canonical" href="https://x.io/afc/en/" />');
  expect(html).toContain('hreflang="x-default" href="https://x.io/afc/"');
  expect(html).toContain('og-en.png');
  expect(html).toContain('Game data: v1.0.1 (build 42)');
  expect(html).toContain('href="/afc/en/?view=fuel"');
});

test('JSON-LD is valid JSON inside the script tag and verification tags appear only when set', () => {
  const head = headTags({ ...ctx, yandexVerification: 'abc' }, 'ru');
  const ld = head.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1]!;
  expect(JSON.parse(ld)).toEqual(jsonLd(ctx, 'ru'));
  expect(head).toContain('name="yandex-verification" content="abc"');
  expect(head).not.toContain('google-site-verification');
});

test('sitemap lists both entries with alternates', () => {
  const xml = sitemap(ctx);
  expect(xml.match(/<loc>/g)).toHaveLength(2);
  expect(xml).toContain('<loc>https://x.io/afc/en/</loc>');
});
