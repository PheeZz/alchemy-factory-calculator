import { DataLoadError, loadGameData } from './load';

afterEach(() => vi.unstubAllGlobals());

test('HTTP failure is a typed error and a retry refetches instead of reusing the cached failure', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('nope', { status: 404 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ build: { id: 'x' } }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);

  const err = await loadGameData('x').catch((e: unknown) => e);
  expect(err).toBeInstanceOf(DataLoadError);
  expect((err as DataLoadError).kind).toBe('http');
  expect((err as DataLoadError).status).toBe(404);

  await expect(loadGameData('x')).resolves.toMatchObject({ build: { id: 'x' } });
  await loadGameData('x');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
