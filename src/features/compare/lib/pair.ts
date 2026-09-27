/** Pair shown on first open: A follows the active factory, B the newest other one (duplicates land last). */
export function resolvePair(ids: string[], activeId: string, pick: { a: string | null; b: string | null }) {
  const has = (id: string | null): id is string => id !== null && ids.includes(id);
  const a = has(pick.a) ? pick.a : has(activeId) ? activeId : (ids[0] ?? null);
  const b = has(pick.b) ? pick.b : (ids.findLast((id) => id !== a) ?? null);
  return { a, b };
}
