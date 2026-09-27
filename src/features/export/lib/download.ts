/** Characters Windows/macOS reject in file names, control chars included, plus trailing dots/spaces. */
export function safeFileName(base: string, ext: string, fallback = 'factory'): string {
  const clean = base
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 80);
  return `${clean || fallback}.${ext}`;
}

export function downloadText(text: string, fileName: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}
