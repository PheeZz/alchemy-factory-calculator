import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchVisits, parseCount } from './visits';

const json = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) }) as unknown as typeof fetch;

describe('visit counter', () => {
  beforeEach(() => sessionStorage.clear());

  it('parses the formatted total', () => {
    expect(parseCount({ count: '1 234' })).toBe(1234);
    expect(parseCount({ count: '12,345' })).toBe(12345);
    expect(parseCount({ count: '' })).toBeNull();
    expect(parseCount(null)).toBeNull();
  });

  it('fetches once per session', async () => {
    const f = json(200, { count: '42' });
    expect(await fetchVisits('https://x.test', f)).toBe(42);
    expect(await fetchVisits('https://x.test', f)).toBe(42);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('hides on 403 (public counter disabled) and on network errors', async () => {
    expect(await fetchVisits('https://x.test', json(403, {}))).toBeNull();
    const failing = vi.fn().mockRejectedValue(new TypeError('blocked')) as unknown as typeof fetch;
    expect(await fetchVisits('https://x.test', failing)).toBeNull();
  });
});
