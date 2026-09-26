import { useItemCard } from './useItemCard';

test('card history: open resets, push navigates, back returns, the same item is not pushed twice', () => {
  const s = useItemCard.getState();
  s.open('Coal');
  s.push('CoalOre');
  s.push('CoalOre');
  expect(useItemCard.getState().stack).toEqual(['Coal', 'CoalOre']);
  s.back();
  expect(useItemCard.getState().stack).toEqual(['Coal']);
  s.open('Wood');
  expect(useItemCard.getState().stack).toEqual(['Wood']);
  s.close();
  expect(useItemCard.getState().stack).toEqual([]);
});
