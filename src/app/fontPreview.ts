// TEMPORARY: `?font=<key>` previews a heading-font candidate so the player can pick one.
// Remove this file (and its call in main.tsx) once the choice is made and baked into @theme.
const CANDIDATES: Record<string, { family: string; weight: number }> = {
  unbounded: { family: 'Unbounded', weight: 500 },
  exo2: { family: 'Exo 2', weight: 600 },
  tektur: { family: 'Tektur', weight: 500 },
  cormorant: { family: 'Cormorant', weight: 600 },
};

export function applyFontPreview() {
  const c = CANDIDATES[new URLSearchParams(location.search).get('font') ?? ''];
  if (!c) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${c.family.replace(/ /g, '+')}:wght@${c.weight}&display=swap`;
  document.head.append(link);
  document.documentElement.style.setProperty('--font-display', `'${c.family}', Georgia, serif`);
}
